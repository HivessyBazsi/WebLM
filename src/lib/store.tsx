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
  type Stats,
  type ThemeChoice,
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

function reviveStats(raw: unknown): Stats | undefined {
  // `typeof [] === "object"`, and an array would otherwise be reported as a
  // real-looking "0.0 tok/s · 0ms · 0 tok" row.
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const s = raw as Record<string, unknown>;
  const num = (v: unknown) => (Number.isFinite(v) ? (v as number) : 0);
  const stats: Stats = {
    tokens: num(s.tokens),
    tokensPerSecond: num(s.tokensPerSecond),
    firstTokenMs: num(s.firstTokenMs),
    totalMs: num(s.totalMs),
  };
  if (Number.isFinite(s.promptTokens)) stats.promptTokens = s.promptTokens as number;
  return stats;
}

/** Shape-guard a stored message. Anything that fails the schema is dropped
 *  rather than left to throw inside a render. */
function reviveMessage(raw: unknown): Message | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  if (typeof m.id !== "string" || typeof m.content !== "string") return null;
  if (m.role !== "user" && m.role !== "assistant" && m.role !== "system") return null;

  const message: Message = {
    id: m.id,
    role: m.role,
    content: m.content,
    createdAt: Number.isFinite(m.createdAt) ? (m.createdAt as number) : Date.now(),
  };

  // Optional fields are copied only when they hold the shape the UI renders:
  // a `model` or `error` of the wrong type reaches JSX as a React child and
  // throws. `streaming` is never carried over at all — a stream cannot survive
  // a reload, and restoring it would blink a caret forever with copy /
  // regenerate / delete hidden behind it.
  if (typeof m.model === "string") message.model = m.model;
  if (typeof m.error === "string") message.error = m.error;
  if (m.stopped === true) message.stopped = true;
  const stats = reviveStats(m.stats);
  if (stats) message.stats = stats;
  return message;
}

function reviveConversation(raw: unknown): Conversation | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (typeof c.id !== "string") return null;
  const createdAt = Number.isFinite(c.createdAt) ? (c.createdAt as number) : Date.now();
  return {
    id: c.id,
    title: typeof c.title === "string" && c.title.trim() ? c.title : "New chat",
    model: typeof c.model === "string" ? c.model : null,
    messages: Array.isArray(c.messages)
      ? c.messages.map(reviveMessage).filter((m): m is Message => m !== null)
      : [],
    createdAt,
    // NaN timestamps would silently poison sorting and date bucketing.
    updatedAt: Number.isFinite(c.updatedAt) ? (c.updatedAt as number) : createdAt,
    pinned: c.pinned === true,
  };
}

function loadConversations(): Conversation[] {
  const raw = load<unknown>(KEY_CONVERSATIONS, []);
  if (!Array.isArray(raw)) return [];
  return raw.map(reviveConversation).filter((c): c is Conversation => c !== null);
}

const THEMES: readonly ThemeChoice[] = ["light", "dark", "system"];

function loadSettings(): Settings {
  const raw = load<unknown>(KEY_SETTINGS, {});
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { ...DEFAULT_SETTINGS };
  const s = raw as Record<string, unknown>;
  const str = (v: unknown, fallback: string) => (typeof v === "string" ? v : fallback);
  const num = (v: unknown, fallback: number) => (Number.isFinite(v) ? (v as number) : fallback);
  const bool = (v: unknown, fallback: boolean) => (typeof v === "boolean" ? v : fallback);
  return {
    theme: THEMES.includes(s.theme as ThemeChoice) ? (s.theme as ThemeChoice) : DEFAULT_SETTINGS.theme,
    serverUrl: str(s.serverUrl, DEFAULT_SETTINGS.serverUrl),
    defaultModel: typeof s.defaultModel === "string" ? s.defaultModel : null,
    systemPrompt: str(s.systemPrompt, DEFAULT_SETTINGS.systemPrompt),
    temperature: num(s.temperature, DEFAULT_SETTINGS.temperature),
    topP: num(s.topP, DEFAULT_SETTINGS.topP),
    contextLength: num(s.contextLength, DEFAULT_SETTINGS.contextLength),
    maxTokens: num(s.maxTokens, DEFAULT_SETTINGS.maxTokens),
    showStats: bool(s.showStats, DEFAULT_SETTINGS.showStats),
    sendOnEnter: bool(s.sendOnEnter, DEFAULT_SETTINGS.sendOnEnter),
  };
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
  const [conversations, setConversations] = useState<Conversation[]>(loadConversations);
  const [activeId, setActiveId] = useState<string | null>(() => {
    const stored = load<unknown>(KEY_ACTIVE, null);
    return typeof stored === "string" ? stored : null;
  });
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [connection, setConnection] = useState<Connection>({ state: "checking" });
  const [streamingId, setStreamingId] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  /** Mirrors `streamingId` for async callbacks, which must not read stale state. */
  const streamingIdRef = useRef<string | null>(null);
  /** Conversation the current generation is writing into. */
  const streamingConvRef = useRef<string | null>(null);
  /** Latest conversations, readable from async callbacks without stale closures. */
  const convRef = useRef(conversations);
  convRef.current = conversations;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const setStreaming = useCallback((id: string | null) => {
    streamingIdRef.current = id;
    setStreamingId(id);
  }, []);

  /** Abort whatever is generating and forget it, without waiting for the
   *  provider's rejection to make its way back through `settle`. */
  const cancelStream = useCallback(() => {
    const controller = abortRef.current;
    abortRef.current = null;
    streamingConvRef.current = null;
    setStreaming(null);
    controller?.abort();
  }, [setStreaming]);

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

  const deleteChat = useCallback(
    (id: string) => {
      // Otherwise the request keeps running against a thread that no longer
      // exists, and settles by clearing a `streamingId` that may by then
      // belong to a newer send.
      if (streamingConvRef.current === id) cancelStream();
      const next = convRef.current.filter((c) => c.id !== id);
      setConversations(next);
      setActiveId((current) => (current === id ? (next[0]?.id ?? null) : current));
    },
    [cancelStream],
  );

  const renameChat = useCallback(
    (id: string, title: string) => patchConversation(id, (c) => ({ ...c, title: title.trim() || c.title })),
    [patchConversation],
  );

  const togglePin = useCallback(
    (id: string) => patchConversation(id, (c) => ({ ...c, pinned: !c.pinned })),
    [patchConversation],
  );

  const clearAll = useCallback(() => {
    if (streamingConvRef.current) cancelStream();
    setConversations([]);
    setActiveId(null);
  }, [cancelStream]);

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

      // A second generation must never orphan the first: replacing the
      // controller without aborting leaves the old stream running, and its
      // settle() would then clear the *new* generation's streaming state.
      abortRef.current?.abort();

      patchConversation(convId, (c) => ({ ...c, messages: [...history, assistant], updatedAt: Date.now() }));
      setStreaming(assistantId);

      const controller = new AbortController();
      abortRef.current = controller;
      streamingConvRef.current = convId;

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
        // Only stand down if this generation is still the current one.
        if (streamingIdRef.current === assistantId) setStreaming(null);
        if (abortRef.current === controller) abortRef.current = null;
        if (streamingConvRef.current === convId && abortRef.current === null) {
          streamingConvRef.current = null;
        }
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
    [patchConversation, setStreaming],
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
      if (streamingIdRef.current) return;
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
      if (streamingIdRef.current) return;
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
