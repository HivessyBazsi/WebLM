import { useMemo, useRef, useState } from "react";
import { useStore } from "../lib/store";
import type { Conversation } from "../lib/types";
import { cn, dateBucket } from "../lib/utils";
import {
  ChatIcon,
  DotsIcon,
  PanelIcon,
  PencilIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  SlidersIcon,
  TrashIcon,
} from "./Icons";
import { IconButton, MenuDivider, MenuItem, Popover } from "./ui";

function Wordmark() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="grid size-7 shrink-0 place-items-center rounded-[9px] bg-accent text-accent-ink shadow-sm">
        <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
          <path
            d="M6 7.5 3 12l3 4.5M18 7.5 21 12l-3 4.5M14 5.5 10 18.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span className="text-[0.95rem] font-semibold tracking-[-0.02em]">WebLM</span>
    </div>
  );
}

function ConnectionPill() {
  const { connection, models, refreshModels } = useStore();
  const tone =
    connection.state === "online" ? "bg-success" : connection.state === "checking" ? "bg-warn" : "bg-danger";
  const text =
    connection.state === "online"
      ? `${models.length} model${models.length === 1 ? "" : "s"} local`
      : connection.state === "checking"
        ? "Connecting…"
        : "Backend offline";

  return (
    <button
      onClick={refreshModels}
      title={connection.error ?? "Click to reconnect"}
      className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-surface-2"
    >
      <span className="relative flex size-2 shrink-0">
        {connection.state === "online" && (
          <span className={cn("absolute inline-flex size-full animate-ping rounded-full opacity-60", tone)} />
        )}
        <span className={cn("relative inline-flex size-2 rounded-full", tone)} />
      </span>
      <span className="truncate text-[0.75rem] text-muted">{text}</span>
    </button>
  );
}

function Row({ conversation, onNavigate }: { conversation: Conversation; onNavigate(): void }) {
  const { activeId, selectChat, deleteChat, renameChat, togglePin } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isActive = conversation.id === activeId;

  const commit = () => {
    const value = inputRef.current?.value ?? "";
    renameChat(conversation.id, value);
    setEditing(false);
  };

  return (
    <div
      className={cn(
        "group relative flex items-center rounded-lg transition-colors",
        isActive ? "bg-surface-2" : "hover:bg-surface-2/60",
      )}
    >
      {editing ? (
        <input
          ref={inputRef}
          autoFocus
          defaultValue={conversation.title}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
          className="w-full rounded-lg border border-accent bg-surface px-2.5 py-2 text-[0.8rem] outline-none"
        />
      ) : (
        <>
          <button
            onClick={() => {
              selectChat(conversation.id);
              onNavigate();
            }}
            onDoubleClick={() => setEditing(true)}
            className="flex min-w-0 flex-1 items-center gap-2 py-2 pr-1 pl-2.5 text-left"
          >
            {conversation.pinned && <PinIcon className="size-3 shrink-0 text-accent" />}
            <span
              className={cn(
                "truncate text-[0.8rem] transition-colors",
                isActive ? "text-ink" : "text-muted group-hover:text-ink",
              )}
            >
              {conversation.title}
            </span>
          </button>

          <div className="relative pr-1">
            <IconButton
              label="Chat options"
              tip="left"
              onClick={() => setMenuOpen((v) => !v)}
              className={cn(
                "size-7 opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                menuOpen && "opacity-100",
              )}
            >
              <DotsIcon className="size-4" />
            </IconButton>

            <Popover open={menuOpen} onClose={() => setMenuOpen(false)} align="right">
              <MenuItem icon={<PencilIcon />} onClick={() => { setMenuOpen(false); setEditing(true); }}>
                Rename
              </MenuItem>
              <MenuItem icon={<PinIcon />} onClick={() => { setMenuOpen(false); togglePin(conversation.id); }}>
                {conversation.pinned ? "Unpin" : "Pin to top"}
              </MenuItem>
              <MenuDivider />
              <MenuItem danger icon={<TrashIcon />} onClick={() => { setMenuOpen(false); deleteChat(conversation.id); }}>
                Delete chat
              </MenuItem>
            </Popover>
          </div>
        </>
      )}
    </div>
  );
}

export function Sidebar({
  open,
  onToggle,
  onOpenSettings,
  onNavigate,
}: {
  open: boolean;
  onToggle(): void;
  onOpenSettings(): void;
  /** Called after picking a chat, so narrow layouts can dismiss the overlay. */
  onNavigate(): void;
}) {
  const { conversations, createChat } = useStore();
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = needle
      ? conversations.filter(
          (c) =>
            c.title.toLowerCase().includes(needle) ||
            c.messages.some((m) => m.content.toLowerCase().includes(needle)),
        )
      : conversations;

    const sorted = [...matched].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    });

    const result: Array<{ label: string; items: Conversation[] }> = [];
    for (const conv of sorted) {
      const bucket = conv.pinned ? "Pinned" : dateBucket(conv.updatedAt);
      const last = result[result.length - 1];
      if (last?.label === bucket) last.items.push(conv);
      else result.push({ label: bucket, items: [conv] });
    }
    return result;
  }, [conversations, query]);

  return (
    <aside
      className={cn(
        "z-40 flex h-full shrink-0 flex-col overflow-hidden border-r border-line bg-bg",
        "transition-[width] duration-250 ease-out",
        // Below the breakpoint the sidebar floats over the thread instead of
        // squeezing it into an unusable column.
        "max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:shadow-pop",
        open ? "w-[268px]" : "w-0 border-r-0",
      )}
    >
      <div className="flex w-[268px] flex-1 flex-col overflow-hidden">
        <header className="drag flex h-14 items-center justify-between px-3">
          <Wordmark />
          <span className="no-drag">
            <IconButton label="Hide sidebar" tip="left" onClick={onToggle}>
              <PanelIcon className="size-[18px]" />
            </IconButton>
          </span>
        </header>

        <div className="flex flex-col gap-2 px-3 pb-3">
          <button
            onClick={() => {
              createChat();
              onNavigate();
            }}
            className="flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[0.82rem] font-medium shadow-sm transition-all hover:border-line-strong hover:bg-surface-2 active:translate-y-px"
          >
            <PlusIcon className="size-4 text-accent" />
            New chat
          </button>

          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search chats"
              className="h-9 w-full rounded-xl border border-transparent bg-surface-2 pr-3 pl-8.5 text-[0.8rem] transition-colors outline-none hover:bg-surface-3/60 focus:border-line-strong focus:bg-surface"
            />
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto px-3 pb-2 scrollbar-thin">
          {groups.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
              <ChatIcon className="size-5 text-faint" />
              <p className="text-[0.78rem] text-muted">
                {query ? "No chats match that search." : "No chats yet."}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.label} className="mb-4">
                <h3 className="px-2.5 pb-1.5 text-[0.68rem] font-semibold tracking-[0.06em] text-faint uppercase">
                  {group.label}
                </h3>
                <div className="flex flex-col gap-0.5">
                  {group.items.map((conversation) => (
                    <Row key={conversation.id} conversation={conversation} onNavigate={onNavigate} />
                  ))}
                </div>
              </section>
            ))
          )}
        </nav>

        <footer className="flex items-center gap-1 border-t border-line px-2.5 py-2">
          <ConnectionPill />
          <IconButton label="Settings" tip="top" onClick={onOpenSettings}>
            <SlidersIcon className="size-[18px]" />
          </IconButton>
        </footer>
      </div>
    </aside>
  );
}
