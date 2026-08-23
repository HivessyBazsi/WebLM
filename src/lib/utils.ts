/** Join class names, dropping falsy entries. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** i;
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "—";
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  return `${m}m ${Math.round((ms % 60_000) / 1000)}s`;
}

export function formatCount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n >= 10_000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
}

/** The modifier the send shortcut actually accepts on this platform. */
export function modKeyLabel(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  const ua = navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/i.test(ua) ? "⌘" : "Ctrl";
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.round(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Calendar day index, counted in UTC so the arithmetic is immune to DST.
 *  The *fields* are local, so "today" still means the user's today. */
function localDayNumber(d: Date): number {
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** Buckets used by the sidebar's conversation list. */
export function dateBucket(ts: number): string {
  const now = new Date();
  const then = new Date(ts);
  // Subtracting local midnights and dividing by a fixed 24h mislabels the day
  // either side of a DST change, when two midnights are only 23h apart.
  const days = localDayNumber(now) - localDayNumber(then);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "Previous 7 days";
  if (days < 30) return "Previous 30 days";
  return then.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/** Split a model tag into its display name and variant, e.g. `qwen2.5:7b`. */
export function splitTag(name: string): { base: string; tag: string | null } {
  const i = name.indexOf(":");
  if (i === -1) return { base: name, tag: null };
  const tag = name.slice(i + 1);
  return { base: name.slice(0, i), tag: tag === "latest" ? null : tag };
}

/** First line of the first user message, trimmed into a thread title. */
export function deriveTitle(text: string): string {
  const line = text.trim().split("\n").find((l) => l.trim().length > 0) ?? "";
  const clean = line.replace(/^#+\s*/, "").trim();
  if (!clean) return "New chat";
  return clean.length > 52 ? `${clean.slice(0, 52).trimEnd()}…` : clean;
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
