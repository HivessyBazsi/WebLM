import { useMemo, useState } from "react";
import { useStore } from "../lib/store";
import { cn, formatBytes, splitTag } from "../lib/utils";
import { ChevronDownIcon, LayersIcon, RefreshIcon, SearchIcon, WarnIcon } from "./Icons";
import { MenuDivider, Popover } from "./ui";

export function ModelPicker() {
  const { models, settings, setModel, connection, refreshModels } = useStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const current = settings.defaultModel;
  const { base, tag } = current ? splitTag(current) : { base: "No model", tag: null };

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return needle ? models.filter((m) => m.name.toLowerCase().includes(needle)) : models;
  }, [models, query]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "no-drag flex h-8 max-w-[15rem] items-center gap-1.5 rounded-lg px-2 text-[0.82rem] transition-colors",
          "hover:bg-surface-2",
          open && "bg-surface-2",
        )}
      >
        <span className="truncate font-medium">{base}</span>
        {tag && (
          <span className="shrink-0 rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[0.65rem] text-muted">
            {tag}
          </span>
        )}
        <ChevronDownIcon className={cn("size-3.5 shrink-0 text-faint transition-transform", open && "rotate-180")} />
      </button>

      <Popover open={open} onClose={() => setOpen(false)} align="left" className="w-[19rem]">
        <div className="border-b border-line p-2">
          <div className="relative">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-faint" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter models"
              className="h-8 w-full rounded-lg bg-surface-2 pr-2.5 pl-8 text-[0.78rem] outline-none placeholder:text-faint"
            />
          </div>
        </div>

        <div className="max-h-[19rem] overflow-y-auto p-1 scrollbar-thin">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
              {connection.state === "offline" ? (
                <>
                  <WarnIcon className="size-5 text-warn" />
                  <p className="text-[0.78rem] text-muted">No backend reachable.</p>
                  <p className="max-w-[15rem] text-[0.72rem] text-faint">{connection.error}</p>
                </>
              ) : (
                <>
                  <LayersIcon className="size-5 text-faint" />
                  <p className="text-[0.78rem] text-muted">
                    {models.length ? "Nothing matches that filter." : "No models installed."}
                  </p>
                </>
              )}
            </div>
          ) : (
            filtered.map((model) => {
              const selected = model.name === current;
              const parts = splitTag(model.name);
              return (
                <button
                  key={model.name}
                  onClick={() => {
                    setModel(model.name);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors",
                    selected ? "bg-accent-soft" : "hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "mt-px size-1.5 shrink-0 rounded-full",
                      selected ? "bg-accent" : "bg-transparent",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-1.5">
                      <span className="truncate text-[0.82rem] font-medium">{parts.base}</span>
                      {parts.tag && (
                        <span className="shrink-0 font-mono text-[0.66rem] text-muted">{parts.tag}</span>
                      )}
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-faint">
                      <span>{formatBytes(model.sizeBytes)}</span>
                      {model.parameters && (
                        <>
                          <span className="opacity-50">·</span>
                          <span>{model.parameters}</span>
                        </>
                      )}
                      {model.quantization && (
                        <>
                          <span className="opacity-50">·</span>
                          <span className="font-mono">{model.quantization}</span>
                        </>
                      )}
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <MenuDivider />
        <div className="p-1">
          <button
            onClick={() => {
              refreshModels();
              setQuery("");
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-[0.78rem] text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <RefreshIcon className={cn("size-4", connection.state === "checking" && "animate-spin")} />
            Rescan models
          </button>
        </div>
      </Popover>
    </div>
  );
}
