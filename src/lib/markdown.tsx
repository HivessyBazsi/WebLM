import { Fragment, useMemo, type ReactNode } from "react";
import { CodeBlock } from "../components/CodeBlock";

/**
 * A compact CommonMark-ish renderer that emits React nodes directly.
 *
 * Rendering to elements rather than HTML means there is no
 * `dangerouslySetInnerHTML` anywhere in the app — model output can never
 * inject markup — and it keeps the dependency list at zero.
 */

type Block =
  | { kind: "code"; lang: string; code: string; open: boolean }
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; ordered: boolean; start: number; items: ListItem[] }
  | { kind: "quote"; text: string }
  | { kind: "rule" }
  | { kind: "table"; header: string[]; align: Array<"left" | "center" | "right">; rows: string[][] }
  | { kind: "para"; text: string };

interface ListItem {
  text: string;
  children: ListItem[];
  /** Nested lists carry their own numbering, independent of the parent. */
  ordered: boolean;
  /** `- [ ]` / `- [x]` task items. */
  checked?: boolean;
}

const RE_FENCE = /^ {0,3}(`{3,}|~{3,})\s*([\w+-]*)/;
const RE_HEADING = /^ {0,3}(#{1,6})\s+(.*)$/;
const RE_RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const RE_QUOTE = /^ {0,3}>\s?(.*)$/;
const RE_BULLET = /^(\s*)([-*+])\s+(.*)$/;
const RE_ORDERED = /^(\s*)(\d{1,9})[.)]\s+(.*)$/;
const RE_TASK = /^\[([ xX])\]\s+(.*)$/;
const RE_TABLE_DIV = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/;

function splitRow(line: string): string[] {
  return line.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|").map((c) => c.trim());
}

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // ── fenced code ──────────────────────────────────────────────────────
    const fence = RE_FENCE.exec(line);
    if (fence) {
      // CommonMark lets the closer be *longer* than the opener, and a fence
      // opened with four backticks is not closed by an inner three.
      const marker = fence[1][0];
      const openLength = fence[1].length;
      const body: string[] = [];
      i += 1;
      let closed = false;
      while (i < lines.length) {
        const candidate = lines[i].trim();
        if (candidate.length >= openLength && candidate === marker.repeat(candidate.length)) {
          closed = true;
          i += 1;
          break;
        }
        body.push(lines[i]);
        i += 1;
      }
      blocks.push({ kind: "code", lang: fence[2] ?? "", code: body.join("\n"), open: !closed });
      continue;
    }

    if (RE_RULE.test(line)) {
      blocks.push({ kind: "rule" });
      i += 1;
      continue;
    }

    const heading = RE_HEADING.exec(line);
    if (heading) {
      blocks.push({ kind: "heading", level: heading[1].length, text: heading[2].replace(/\s+#+\s*$/, "") });
      i += 1;
      continue;
    }

    // ── blockquote ───────────────────────────────────────────────────────
    if (RE_QUOTE.test(line)) {
      const body: string[] = [];
      while (i < lines.length) {
        const quoted = RE_QUOTE.exec(lines[i]);
        if (!quoted) break;
        body.push(quoted[1]);
        i += 1;
      }
      blocks.push({ kind: "quote", text: body.join("\n") });
      continue;
    }

    // ── table ────────────────────────────────────────────────────────────
    if (line.includes("|") && i + 1 < lines.length && RE_TABLE_DIV.test(lines[i + 1])) {
      const header = splitRow(line);
      const align = splitRow(lines[i + 1]).map((cell) => {
        const left = cell.startsWith(":");
        const right = cell.endsWith(":");
        return left && right ? "center" : right ? "right" : "left";
      }) as Array<"left" | "center" | "right">;
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|") && lines[i].trim()) {
        rows.push(splitRow(lines[i]));
        i += 1;
      }
      blocks.push({ kind: "table", header, align, rows });
      continue;
    }

    // ── lists ────────────────────────────────────────────────────────────
    const bullet = RE_BULLET.exec(line);
    const ordered = RE_ORDERED.exec(line);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const start = ordered ? Number(ordered[2]) : 1;
      const items: ListItem[] = [];

      while (i < lines.length) {
        const row = lines[i];

        if (!row.trim()) {
          // A blank line only ends the list if no item follows it.
          const next = lines[i + 1] ?? "";
          if (RE_BULLET.test(next) || RE_ORDERED.test(next)) {
            i += 1;
            continue;
          }
          break;
        }

        const match = RE_BULLET.exec(row) ?? RE_ORDERED.exec(row);
        if (!match) break;

        const indent = match[1].length;
        const rowOrdered = !RE_BULLET.test(row);
        // A top-level item of the other kind starts a list of its own.
        if (indent < 2 && rowOrdered !== isOrdered) break;

        const raw = match[3];
        const task = RE_TASK.exec(raw);
        const item: ListItem = {
          text: task ? task[2] : raw,
          children: [],
          ordered: rowOrdered,
          checked: task ? task[1].toLowerCase() === "x" : undefined,
        };
        if (indent >= 2 && items.length) items[items.length - 1].children.push(item);
        else items.push(item);
        i += 1;
      }
      blocks.push({ kind: "list", ordered: isOrdered, start, items });
      continue;
    }

    // ── paragraph ────────────────────────────────────────────────────────
    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim()) {
      const row = lines[i];
      if (RE_FENCE.test(row) || RE_HEADING.test(row) || RE_QUOTE.test(row) || RE_RULE.test(row)) break;
      if (RE_BULLET.test(row) || RE_ORDERED.test(row)) break;
      paragraph.push(row);
      i += 1;
    }
    if (paragraph.length) blocks.push({ kind: "para", text: paragraph.join("\n") });
    else i += 1; // never leave the cursor parked on a line we did not consume
  }

  return blocks;
}

/* ── Inline ──────────────────────────────────────────────────────────── */

/* The inline scanner is recursive (bold can contain links, and so on), so the
   pattern is kept as a source string and a fresh, independent regex is built
   per call — a single shared `g` regex would have its `lastIndex` clobbered by
   nested calls and never terminate. Alternatives are ordered longest-marker
   first so `***x***` is not eaten by the `**` rule. */
const INLINE_SOURCE = [
  "(?<fence>`+)(?<code>[\\s\\S]*?)\\k<fence>",
  "\\*\\*\\*(?<bolditalic>[\\s\\S]+?)\\*\\*\\*",
  "\\*\\*(?<bold>[\\s\\S]+?)\\*\\*",
  "__(?<boldAlt>[\\s\\S]+?)__",
  "~~(?<strike>[\\s\\S]+?)~~",
  "\\*(?<italic>[^*\\n]+?)\\*",
  "_(?<italicAlt>[^_\\n]+?)_",
  "!\\[(?<imageAlt>[^\\]]*)\\]\\((?<imageSrc>[^)\\s]+)[^)]*\\)",
  "\\[(?<linkText>[^\\]]*)\\]\\((?<linkHref>[^)\\s]+)[^)]*\\)",
  "<(?<autolink>https?://[^>\\s]+)>",
  "(?<bare>https?://[^\\s<>()\\[\\]]+)",
].join("|");

/** Only protocols that are safe to hand to the OS from a chat transcript. */
function safeHref(href: string): string | null {
  const url = href.trim();
  return /^(https?:|mailto:)/i.test(url) ? url : null;
}

function Link({ href, children }: { href: string; children: ReactNode }) {
  const safe = safeHref(href);
  if (!safe) return <>{children}</>;
  return (
    <a
      href={safe}
      target="_blank"
      rel="noreferrer noopener"
      className="text-accent underline decoration-accent/30 underline-offset-2 transition-colors hover:decoration-accent"
    >
      {children}
    </a>
  );
}

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = new RegExp(INLINE_SOURCE, "g");
  let last = 0;
  let key = 0;

  const pushText = (value: string) => {
    if (!value) return;
    // Two trailing spaces before a newline is a hard break.
    const parts = value.split(/ {2,}\n|\n/);
    parts.forEach((part, index) => {
      if (index) out.push(<br key={`br${key++}`} />);
      if (part) out.push(part);
    });
  };

  for (let m = re.exec(text); m; m = re.exec(text)) {
    pushText(text.slice(last, m.index));
    last = m.index + m[0].length;

    const g = m.groups ?? {};

    if (g.code !== undefined) {
      out.push(
        <code
          key={key++}
          className="rounded-[5px] border border-code-line bg-code px-[0.34em] py-[0.12em] font-mono text-[0.87em] text-ink/90"
        >
          {g.code.trim()}
        </code>,
      );
    } else if (g.bolditalic) {
      out.push(
        <strong key={key++} className="font-semibold text-ink">
          <em>{inline(g.bolditalic)}</em>
        </strong>,
      );
    } else if (g.bold ?? g.boldAlt) {
      out.push(
        <strong key={key++} className="font-semibold text-ink">
          {inline((g.bold ?? g.boldAlt) as string)}
        </strong>,
      );
    } else if (g.strike) {
      out.push(<del key={key++} className="text-muted">{inline(g.strike)}</del>);
    } else if (g.italic ?? g.italicAlt) {
      out.push(<em key={key++}>{inline((g.italic ?? g.italicAlt) as string)}</em>);
    } else if (g.imageSrc) {
      out.push(<Link key={key++} href={g.imageSrc}>{g.imageAlt || g.imageSrc}</Link>);
    } else if (g.linkHref) {
      out.push(<Link key={key++} href={g.linkHref}>{inline(g.linkText || g.linkHref)}</Link>);
    } else if (g.autolink ?? g.bare) {
      const url = (g.autolink ?? g.bare) as string;
      out.push(<Link key={key++} href={url}>{url}</Link>);
    }
  }

  pushText(text.slice(last));
  return out;
}

/* ── Rendering ───────────────────────────────────────────────────────── */

const HEADING_CLASS = [
  "text-[1.5rem] font-semibold tracking-[-0.02em] mt-7 mb-3",
  "text-[1.28rem] font-semibold tracking-[-0.015em] mt-7 mb-2.5",
  "text-[1.1rem] font-semibold mt-6 mb-2",
  "text-[1rem] font-semibold mt-5 mb-2",
  "text-[0.94rem] font-semibold mt-4 mb-1.5",
  "text-[0.88rem] font-semibold uppercase tracking-wide text-muted mt-4 mb-1.5",
];

function renderItems(items: ListItem[]): ReactNode {
  return items.map((item, index) => (
    <li key={index} className={item.checked === undefined ? "" : "list-none -ml-5 flex gap-2"}>
      {item.checked !== undefined && (
        <span
          className={`mt-[0.32em] flex size-[1.05em] shrink-0 items-center justify-center rounded-[4px] border text-[0.68em] ${
            item.checked ? "border-accent bg-accent text-accent-ink" : "border-line-strong bg-surface"
          }`}
        >
          {item.checked ? "✓" : ""}
        </span>
      )}
      <span className={item.checked === undefined ? "" : "flex-1"}>
        {inline(item.text)}
        {item.children.length > 0 &&
          (item.children[0].ordered ? (
            <ol className="mt-1.5 ml-5 list-decimal space-y-1.5 marker:text-faint marker:tabular-nums">
              {renderItems(item.children)}
            </ol>
          ) : (
            <ul className="mt-1.5 ml-5 list-disc space-y-1.5 marker:text-faint">
              {renderItems(item.children)}
            </ul>
          ))}
      </span>
    </li>
  ));
}

function renderBlock(block: Block, index: number): ReactNode {
  switch (block.kind) {
    case "code":
      return <CodeBlock key={index} lang={block.lang} code={block.code} streaming={block.open} />;

    case "heading": {
      const Tag = `h${Math.min(block.level, 6)}` as "h1";
      return (
        <Tag key={index} className={`${HEADING_CLASS[block.level - 1]} first:mt-0 text-balance`}>
          {inline(block.text)}
        </Tag>
      );
    }

    case "rule":
      return <hr key={index} className="my-6 border-0 border-t border-line" />;

    case "quote":
      return (
        <blockquote
          key={index}
          className="my-4 border-l-2 border-accent/45 pl-4 text-muted [&>*:first-child]:mt-0 [&>*:last-child]:mb-0"
        >
          {parseBlocks(block.text).map(renderBlock)}
        </blockquote>
      );

    case "list":
      return block.ordered ? (
        <ol
          key={index}
          start={block.start}
          className="my-3.5 ml-5 list-decimal space-y-1.5 marker:text-faint marker:tabular-nums"
        >
          {renderItems(block.items)}
        </ol>
      ) : (
        <ul key={index} className="my-3.5 ml-5 list-disc space-y-1.5 marker:text-faint">
          {renderItems(block.items)}
        </ul>
      );

    case "table":
      return (
        <div key={index} className="my-5 overflow-x-auto rounded-xl border border-line scrollbar-thin">
          <table className="w-full border-collapse text-[0.9em]">
            <thead>
              <tr className="bg-surface-2">
                {block.header.map((cell, c) => (
                  <th
                    key={c}
                    style={{ textAlign: block.align[c] ?? "left" }}
                    className="border-b border-line px-3.5 py-2.5 font-semibold whitespace-nowrap"
                  >
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, r) => (
                <tr key={r} className="border-b border-line/70 last:border-0">
                  {row.map((cell, c) => (
                    <td key={c} style={{ textAlign: block.align[c] ?? "left" }} className="px-3.5 py-2.5 align-top">
                      {inline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "para":
      return (
        <p key={index} className="my-3.5 leading-[1.72] first:mt-0 last:mb-0 text-pretty">
          {inline(block.text)}
        </p>
      );
  }
}

export function Markdown({ text }: { text: string }) {
  const blocks = useMemo(() => parseBlocks(text), [text]);
  return <Fragment>{blocks.map(renderBlock)}</Fragment>;
}
