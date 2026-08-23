import { useState } from "react";
import { Markdown } from "../lib/markdown";
import { useStore } from "../lib/store";
import type { Message as ChatMessage } from "../lib/types";
import { cn, copyText, formatCount, formatDuration } from "../lib/utils";
import { BoltIcon, CheckIcon, ClockIcon, CopyIcon, LayersIcon, PencilIcon, RetryIcon, TrashIcon, WarnIcon } from "./Icons";
import { Button, IconButton, TextArea, useCopied } from "./ui";

function Thinking() {
  return (
    <div className="flex items-center gap-2 py-1 text-muted">
      <span className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="size-1.5 animate-bounce rounded-full bg-accent/70"
            style={{ animationDelay: `${i * 120}ms`, animationDuration: "900ms" }}
          />
        ))}
      </span>
      <span className="text-[0.8rem]">Thinking…</span>
    </div>
  );
}

function rate(value: number | undefined): string {
  return Number.isFinite(value) ? `${(value as number).toFixed(1)} tok/s` : "—";
}

function StatChip({ icon, value, title }: { icon: React.ReactNode; value: string; title: string }) {
  return (
    <span title={title} className="inline-flex items-center gap-1 tabular-nums">
      <span className="[&>svg]:size-3 [&>svg]:opacity-70">{icon}</span>
      {value}
    </span>
  );
}

function UserMessage({ message }: { message: ChatMessage }) {
  const { editAndResend, streamingId } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [copied, markCopied] = useCopied();

  if (editing) {
    return (
      <div className="group ml-auto flex w-full max-w-[46rem] flex-col gap-2">
        <TextArea
          autoFocus
          value={draft}
          rows={Math.min(12, draft.split("\n").length + 1)}
          onChange={(e) => setDraft(e.target.value)}
          className="bg-surface-2"
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => { setDraft(message.content); setEditing(false); }}>
            Cancel
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={!draft.trim() || draft === message.content || Boolean(streamingId)}
            onClick={() => { setEditing(false); editAndResend(message.id, draft.trim()); }}
          >
            Send
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex flex-col items-end gap-1">
      <div className="max-w-[min(46rem,85%)] rounded-2xl rounded-br-md border border-line bg-surface-2 px-4 py-2.5 text-[0.925rem] leading-[1.65] whitespace-pre-wrap">
        {message.content}
      </div>
      <div className="flex gap-0.5 pr-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <IconButton
          label="Edit"
          tip="bottom"
          compact
          disabled={Boolean(streamingId)}
          onClick={() => { setDraft(message.content); setEditing(true); }}
        >
          <PencilIcon className="size-3.5" />
        </IconButton>
        <IconButton
          label={copied ? "Copied" : "Copy"}
          tip="bottom"
          compact
          onClick={() => copyText(message.content).then((ok) => ok && markCopied())}
        >
          {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
        </IconButton>
      </div>
    </div>
  );
}

function AssistantMessage({ message }: { message: ChatMessage }) {
  const { retry, deleteMessage, settings, streamingId } = useStore();
  const [copied, markCopied] = useCopied();
  const empty = !message.content.trim();

  return (
    <div className="group flex flex-col gap-1.5">
      <div className="max-w-none text-[0.925rem] leading-[1.72] text-ink">
        {message.streaming && empty ? (
          <Thinking />
        ) : (
          <>
            <Markdown text={message.content} />
            {message.streaming && (
              <span className="ml-0.5 inline-block h-[0.95em] w-[0.45em] translate-y-[0.1em] animate-blink rounded-[1px] bg-accent" />
            )}
          </>
        )}
      </div>

      {message.stopped && (
        <p className="text-[0.75rem] text-muted italic">Stopped by you.</p>
      )}

      {message.error && (
        <div className="flex items-start gap-2 rounded-xl border border-danger/25 bg-danger/8 px-3 py-2.5 text-[0.8rem] text-danger">
          <WarnIcon className="mt-px size-4 shrink-0" />
          <span className="min-w-0 flex-1">{message.error}</span>
        </div>
      )}

      {!message.streaming && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-0.5 text-[0.72rem] text-faint">
          {settings.showStats && message.stats && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono">
              {message.model && <span className="text-muted">{message.model}</span>}
              <StatChip icon={<BoltIcon />} title="Generation speed" value={rate(message.stats.tokensPerSecond)} />
              <StatChip
                icon={<ClockIcon />}
                title="Time to first token"
                value={formatDuration(message.stats.firstTokenMs)}
              />
              <StatChip
                icon={<LayersIcon />}
                title="Tokens generated"
                value={`${formatCount(message.stats.tokens)} tok`}
              />
            </div>
          )}

          <div className="ml-auto flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <IconButton
              label={copied ? "Copied" : "Copy"}
              tip="top"
              compact
              onClick={() => copyText(message.content).then((ok) => ok && markCopied())}
            >
              {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
            </IconButton>
            <IconButton label="Regenerate" tip="top" compact disabled={Boolean(streamingId)} onClick={() => retry(message.id)}>
              <RetryIcon className="size-3.5" />
            </IconButton>
            <IconButton label="Delete" tip="top" compact onClick={() => deleteMessage(message.id)}>
              <TrashIcon className="size-3.5" />
            </IconButton>
          </div>
        </div>
      )}
    </div>
  );
}

export function MessageRow({ message }: { message: ChatMessage }) {
  return (
    <article className={cn("animate-rise px-1", message.role === "user" ? "pt-2" : "")}>
      {message.role === "user" ? <UserMessage message={message} /> : <AssistantMessage message={message} />}
    </article>
  );
}
