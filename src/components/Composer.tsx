import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useStore } from "../lib/store";
import { cn, modKeyLabel } from "../lib/utils";
import { ArrowUpIcon, StopIcon } from "./Icons";

const MAX_HEIGHT = 220;

/** A prompt pushed in from outside (a suggestion card); `n` forces re-apply. */
export interface Seed {
  text: string;
  n: number;
}

export function Composer({
  autoFocus,
  seed,
  onSeedConsumed,
  centered,
}: {
  autoFocus?: boolean;
  seed?: Seed;
  /** Fired once the seed has been written into the box, so it is not re-applied. */
  onSeedConsumed?(): void;
  /** Centered under the greeting on an empty thread, rather than docked at the bottom. */
  centered?: boolean;
}) {
  const { send, stop, streamingId, settings, models, connection } = useStore();
  const [value, setValue] = useState("");
  const [focused, setFocused] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Held in a ref so re-created callbacks never re-trigger the seed effect.
  const onSeedConsumedRef = useRef(onSeedConsumed);
  onSeedConsumedRef.current = onSeedConsumed;

  const streaming = Boolean(streamingId);
  const blocked = !settings.defaultModel || models.length === 0 || connection.state !== "online";
  const canSend = value.trim().length > 0 && !streaming && !blocked;

  // Grow with the content, then scroll.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [value]);

  useEffect(() => {
    if (!seed?.text) return;
    setValue(seed.text);
    ref.current?.focus();
    onSeedConsumedRef.current?.();
  }, [seed?.n, seed?.text]);

  // "/" anywhere focuses the composer, the way a chat app should behave.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA)$/.test(target.tagName);
      if (e.key === "/" && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const submit = () => {
    if (!canSend) return;
    send(value);
    setValue("");
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const enterSends = settings.sendOnEnter ? !e.shiftKey : e.metaKey || e.ctrlKey;
    if (e.key === "Enter" && !e.nativeEvent.isComposing && enterSends) {
      e.preventDefault();
      submit();
    }
  };

  const hint = settings.sendOnEnter
    ? "Enter to send · Shift + Enter for a new line"
    : `${modKeyLabel()} + Enter to send`;

  return (
    <div className={cn("mx-auto w-full max-w-3xl", centered ? "px-0" : "px-4 pb-4")}>
      <div
        className={cn(
          "rounded-[1.35rem] border bg-surface shadow-card transition-all duration-200",
          focused ? "border-accent/55 shadow-pop" : "border-line hover:border-line-strong",
        )}
      >
        <textarea
          ref={ref}
          rows={1}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={blocked ? "Connect a backend to start chatting…" : "Ask anything — it never leaves this machine"}
          className="block max-h-[220px] w-full resize-none bg-transparent px-4 pt-3.5 pb-1 text-[0.925rem] leading-[1.6] outline-none scrollbar-thin"
        />

        <div className="flex items-center justify-between gap-3 px-3 pb-2.5">
          <p className="truncate pl-1 text-[0.7rem] text-faint">
            {connection.state === "offline" ? (
              <span className="text-warn">Backend offline — messages can’t be sent.</span>
            ) : (
              hint
            )}
          </p>

          {streaming ? (
            <button
              onClick={stop}
              className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-surface-2 pr-3 pl-2.5 text-[0.78rem] font-medium transition-colors hover:border-line-strong hover:bg-surface-3"
            >
              <StopIcon className="size-3.5" />
              Stop
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={!canSend}
              aria-label="Send message"
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-full transition-all duration-150",
                canSend
                  ? "bg-accent text-accent-ink shadow-sm hover:bg-accent-hover active:scale-95"
                  : "bg-surface-3 text-faint",
              )}
            >
              <ArrowUpIcon className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
