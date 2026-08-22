import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { cn, greeting } from "../lib/utils";
import { Composer, type Seed } from "./Composer";
import {
  BookIcon,
  ChevronDownIcon,
  CompassIcon,
  MoonIcon,
  PanelIcon,
  PenIcon,
  SlidersIcon,
  SunIcon,
  TerminalIcon,
} from "./Icons";
import { MessageRow } from "./Message";
import { ModelPicker } from "./ModelPicker";
import { IconButton } from "./ui";

const SUGGESTIONS = [
  { icon: <TerminalIcon />, label: "Explain this code", prompt: "Explain what this code does, step by step:\n\n" },
  { icon: <PenIcon />, label: "Rewrite for clarity", prompt: "Rewrite the following so it is clearer and tighter, keeping my voice:\n\n" },
  { icon: <BookIcon />, label: "Summarise notes", prompt: "Summarise these notes into the key points and the decisions made:\n\n" },
  { icon: <CompassIcon />, label: "Plan an approach", prompt: "Help me plan an approach to " },
];

function ThemeToggle() {
  const { settings, updateSettings } = useStore();
  const next = settings.theme === "dark" ? "light" : "dark";
  return (
    <IconButton label={`Switch to ${next} theme`} onClick={() => updateSettings({ theme: next })}>
      {settings.theme === "dark" ? <SunIcon className="size-[18px]" /> : <MoonIcon className="size-[18px]" />}
    </IconButton>
  );
}

function TopBar({
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
}: {
  sidebarOpen: boolean;
  onToggleSidebar(): void;
  onOpenSettings(): void;
}) {
  const { active } = useStore();
  return (
    <header className="drag flex h-14 shrink-0 items-center gap-2 border-b border-line px-3">
      {!sidebarOpen && (
        <span className="no-drag">
          <IconButton label="Show sidebar" onClick={onToggleSidebar}>
            <PanelIcon className="size-[18px]" />
          </IconButton>
        </span>
      )}

      <span className="no-drag">
        <ModelPicker />
      </span>

      {active && active.messages.length > 0 && (
        <>
          <span className="h-4 w-px bg-line" />
          <h1 className="min-w-0 truncate text-[0.82rem] text-muted">{active.title}</h1>
        </>
      )}

      <div className="no-drag ml-auto flex items-center gap-0.5">
        <ThemeToggle />
        <IconButton label="Settings" onClick={onOpenSettings}>
          <SlidersIcon className="size-[18px]" />
        </IconButton>
      </div>
    </header>
  );
}

function EmptyState({ seed, onPick }: { seed: Seed; onPick(prompt: string): void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
      <div className="w-full max-w-3xl animate-rise">
        <h2 className="text-center text-[2.1rem] leading-tight font-semibold tracking-[-0.03em] text-balance">
          <span className="text-accent">{greeting()}.</span>{" "}
          <span className="text-muted">What are we working on?</span>
        </h2>
        <p className="mt-2.5 mb-7 text-center text-[0.85rem] text-muted">
          Every token is generated on your own hardware. Nothing is uploaded, nothing is logged.
        </p>

        <Composer autoFocus centered seed={seed} />

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {SUGGESTIONS.map((item) => (
            <button
              key={item.label}
              onClick={() => onPick(item.prompt)}
              className="group inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-2 text-[0.78rem] font-medium text-muted transition-all duration-150 hover:-translate-y-0.5 hover:border-line-strong hover:text-ink hover:shadow-card"
            >
              <span className="text-accent [&>svg]:size-[15px]">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ChatView({
  sidebarOpen,
  onToggleSidebar,
  onOpenSettings,
}: {
  sidebarOpen: boolean;
  onToggleSidebar(): void;
  onOpenSettings(): void;
}) {
  const { active, streamingId } = useStore();
  const [seed, setSeed] = useState<Seed>({ text: "", n: 0 });
  const [atBottom, setAtBottom] = useState(true);

  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  const messages = active?.messages ?? [];
  const lastContent = messages[messages.length - 1]?.content ?? "";

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scroller.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior });
  }, []);

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    stick.current = distance < 80;
    setAtBottom(distance < 80);
  };

  // Follow the stream unless the reader has scrolled away from the bottom.
  useLayoutEffect(() => {
    if (stick.current) scrollToBottom(streamingId ? "auto" : "smooth");
  }, [lastContent, messages.length, streamingId, scrollToBottom]);

  // Jump straight to the end when switching threads.
  useEffect(() => {
    stick.current = true;
    setAtBottom(true);
    scrollToBottom("auto");
  }, [active?.id, scrollToBottom]);

  return (
    <div className="flex min-w-0 flex-1 flex-col bg-elev">
      <TopBar sidebarOpen={sidebarOpen} onToggleSidebar={onToggleSidebar} onOpenSettings={onOpenSettings} />

      {messages.length === 0 ? (
        <EmptyState seed={seed} onPick={(prompt) => setSeed((s) => ({ text: prompt, n: s.n + 1 }))} />
      ) : (
        <>
          <div
            ref={scroller}
            onScroll={onScroll}
            className="min-h-0 flex-1 overflow-y-auto scroll-pt-6 scrollbar-thin"
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8">
              {messages.map((message) => (
                <MessageRow key={message.id} message={message} />
              ))}
            </div>
          </div>

          <div className="relative">
            <button
              onClick={() => scrollToBottom()}
              aria-label="Jump to latest"
              className={cn(
                "absolute -top-11 left-1/2 grid size-8 -translate-x-1/2 place-items-center rounded-full",
                "border border-line bg-elev text-muted shadow-card transition-all duration-200",
                "hover:text-ink",
                atBottom ? "pointer-events-none translate-y-1 opacity-0" : "opacity-100",
              )}
            >
              <ChevronDownIcon className="size-4" />
            </button>
            <Composer seed={seed} />
          </div>
        </>
      )}
    </div>
  );
}
