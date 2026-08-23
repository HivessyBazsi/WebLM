import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { activeProvider } from "./provider";
import {
  DEFAULT_SETTINGS,
  type Connection,
  type Conversation,
  type Message,
  type ModelInfo,
  type Settings,
} from "./types";
import { deriveTitle, uid } from "./utils";

const KEY_CONVERSATIONS = "weblm.conversations";
const KEY_SETTINGS = "weblm.settings";
const KEY_ACTIVE = "weblm.active";

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or unavailable — the app still works, just unsaved */
  }
}

function newConversation(model: string | null): Conversation {
  const now = Date.now();
  return { id: uid(), title: "New chat", model, messages: [], createdAt: now, updatedAt: now, pinned: false };
}

interface Store {
  conversations: Conversation[];
  activeId: string | null;
  active: Conversation | null;
  settings: Settings;
  models: ModelInfo[];
  connection: Connection;
  /** Id of the assistant message currently streaming, if any. */
  streamingId: string | null;

  createChat(): void;
  selectChat(id: string): void;
  deleteChat(id: string): void;
  renameChat(id: string, title: string): void;
  togglePin(id: string): void;
  clearAll(): void;

  send(text: string): void;
  stop(): void;
  retry(messageId: string): void;
  editAndResend(messageId: string, content: string): void;
  deleteMessage(messageId: string): void;

  setModel(model: string): void;
  updateSettings(patch: Partial<Settings>): void;
  refreshModels(): void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(() =>
    load<Conversation[]>(KEY_CONVERSATIONS, []),
  );
  const [activeId, setActiveId] = useState<string | null>(() => load<string | null>(KEY_ACTIVE, null));
  const [settings, setSettings] = useState<Settings>(() => ({
    ...DEFAULT_SETTINGS,
    ...load<Partial<Settings>>(KEY_SETTINGS, {}),
  }));
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [connection, setConnection] = useState<Connection>({ state: "checking" });
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  /** Latest conversations, readable from async callbacks without stale closures. */
  const convRef = useRef(conversations);
  convRef.current = conversations;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => save(KEY_CONVERSATIONS, conversations), [conversations]);
  useEffect(() => save(KEY_SETTINGS, settings), [settings]);
  useEffect(() => save(KEY_ACTIVE, activeId), [activeId]);

  /* ── Theme ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = settings.theme === "dark" || (settings.theme === "system" && media.matches);
      document.documentElement.classList.toggle("dark", dark);
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [settings.theme]);

  /* ── Models ────────────────────────────────────────────────────────── */
  const refreshModels = useCallback(() => {
    setConnection({ state: "checking" });
    activeProvider
      .listModels(settingsRef.current)
      .then((list) => {
        setModels(list);
        setConnection({ state: "online" });
        setSettings((s) => (s.defaultModel || !list.length ? s : { ...s, defaultModel: list[0].name }));
      })
      .catch((err: unknown) => {
        setModels([]);
        setConnection({ state: "offline", error: err instanceof Error ? err.message : String(err) });
      });
  }, []);

  useEffect(refreshModels, [refreshModels]);

  /* ── Conversation helpers ──────────────────────────────────────────── */
  const patchConversation = useCallback((id: string, patch: (c: Conversation) => Conversation) => {
    setConversations((list) => list.map((c) => (c.id === id ? patch(c) : c)));
  }, []);

  const createChat = useCallback(() => {
    const conv = newConversation(settingsRef.current.defaultModel);
    setConversations((list) => [conv, ...list]);
    setActiveId(conv.id);
  }, []);

  const selectChat = useCallback((id: string) => setActiveId(id), []);

  const deleteChat = useCallback((id: string) => {
    const next = convRef.current.filter((c) => c.id !== id);
    setConversations(next);
    setActiveId((current) => (current === id ? (next[0]?.id ?? null) : current));
  }, []);

  const renameChat = useCallback(
    (id: string, title: string) => patchConversation(id, (c) => ({ ...c, title: title.trim() || c.title })),
    [patchConversation],
  );

  const togglePin = useCallback(
    (id: string) => patchConversation(id, (c) => ({ ...c, pinned: !c.pinned })),
    [patchConversation],
  );

  const clearAll = useCallback(() => {
    setConversations([]);
    setActiveId(null);
  }, []);

  const setModel = useCallback(
    (model: string) => {
      setSettings((s) => ({ ...s, defaultModel: model }));
      const id = activeId;
      if (id) patchConversation(id, (c) => ({ ...c, model }));
    },
    [activeId, patchConversation],
  );

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...patch }));
  }, []);

  /* ── Generation ────────────────────────────────────────────────────── */

  /** Runs a completion for `convId` given the history already stored on it. */
  const generate = useCallback(
    (convId: string, history: Message[], model: string) => {
      const assistantId = uid();
      const assistant: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: Date.now(),
        model,
        streaming: true,
      };

      patchConversation(convId, (c) => ({ ...c, messages: [...history, assistant], updatedAt: Date.now() }));
      setStreamingId(assistantId);

      const controller = new AbortController();
      abortRef.current = controller;

      // Tokens arrive far faster than React should re-render, so they are
      // buffered and flushed once per animation frame.
      let buffer = "";
      let frame = 0;
      const flush = () => {
        frame = 0;
        if (!buffer) return;
        const chunk = buffer;
        buffer = "";
        patchConversation(convId, (c) => ({
          ...c,
          messages: c.messages.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        }));
      };

      const settle = (patch: Partial<Message>) => {
        if (frame) cancelAnimationFrame(frame);
        flush();
        patchConversation(convId, (c) => ({
          ...c,
          updatedAt: Date.now(),
          messages: c.messages.map((m) => (m.id === assistantId ? { ...m, streaming: false, ...patch } : m)),
        }));
        setStreamingId(null);
        abortRef.current = null;
      };

      activeProvider
        .chat(
          {
            model,
            messages: history.map(({ role, content }) => ({ role, content })),
            settings: settingsRef.current,
            signal: controller.signal,
          },
          {
            onToken: (text) => {
              buffer += text;
              if (!frame) frame = requestAnimationFrame(flush);
            },
            onDone: (stats) => settle({ stats }),
          },
        )
        .catch((err: unknown) => {
          if (controller.signal.aborted) settle({ stopped: true });
          else settle({ error: err instanceof Error ? err.message : String(err) });
        });
    },
    [patchConversation],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content) return;

      const model = settingsRef.current.defaultModel;
      if (!model) return;

      let conv = activeId ? convRef.current.find((c) => c.id === activeId) ?? null : null;
      if (!conv) {
        conv = newConversation(model);
        setConversations((list) => [conv as Conversation, ...list]);
        setActiveId(conv.id);
      }

      const userMessage: Message = { id: uid(), role: "user", content, createdAt: Date.now() };
      const history = [...conv.messages, userMessage];
      const title = conv.messages.length === 0 ? deriveTitle(content) : conv.title;

      patchConversation(conv.id, (c) => ({ ...c, title, messages: history, updatedAt: Date.now() }));
      generate(conv.id, history, conv.model ?? model);
    },
    [activeId, generate, patchConversation],
  );

  const stop = useCallback(() => abortRef.current?.abort(), []);

  /** Re-run the turn that produced `messageId`, discarding it and anything after. */
  const retry = useCallback(
    (messageId: string) => {
      const conv = convRef.current.find((c) => c.id === activeId);
      if (!conv) return;
      const index = conv.messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;
      const history = conv.messages.slice(0, index);
      if (!history.length) return;
      patchConversation(conv.id, (c) => ({ ...c, messages: history }));
      generate(conv.id, history, conv.model ?? settingsRef.current.defaultModel ?? "");
    },
    [activeId, generate, patchConversation],
  );

  const editAndResend = useCallback(
    (messageId: string, content: string) => {
      const conv = convRef.current.find((c) => c.id === activeId);
      if (!conv) return;
      const index = conv.messages.findIndex((m) => m.id === messageId);
      if (index === -1) return;
      const history = [...conv.messages.slice(0, index), { ...conv.messages[index], content }];
      patchConversation(conv.id, (c) => ({ ...c, messages: history }));
      generate(conv.id, history, conv.model ?? settingsRef.current.defaultModel ?? "");
    },
    [activeId, generate, patchConversation],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      if (!activeId) return;
      patchConversation(activeId, (c) => ({ ...c, messages: c.messages.filter((m) => m.id !== messageId) }));
    },
    [activeId, patchConversation],
  );

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const value: Store = {
    conversations,
    activeId,
    active,
    settings,
    models,
    connection,
    streamingId,
    createChat,
    selectChat,
    deleteChat,
    renameChat,
    togglePin,
    clearAll,
    send,
    stop,
    retry,
    editAndResend,
    deleteMessage,
    setModel,
    updateSettings,
    refreshModels,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside <StoreProvider>");
  return store;
}
