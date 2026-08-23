import { useMemo } from "react";
import { TOKEN_COLOR, shouldHighlight, tokenize } from "../lib/highlight";
import { copyText } from "../lib/utils";
import { CheckIcon, CopyIcon } from "./Icons";
import { useCopied } from "./ui";

const LANG_LABEL: Record<string, string> = {
  js: "JavaScript",
  jsx: "JSX",
  ts: "TypeScript",
  tsx: "TSX",
  py: "Python",
  rs: "Rust",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  yml: "YAML",
  md: "Markdown",
  cpp: "C++",
  cs: "C#",
};

function label(lang: string): string {
  if (!lang) return "code";
  return LANG_LABEL[lang.toLowerCase()] ?? lang;
}

export function CodeBlock({ lang, code, streaming }: { lang: string; code: string; streaming?: boolean }) {
  const [copied, markCopied] = useCopied();
  const tokens = useMemo(() => (shouldHighlight(lang) ? tokenize(code) : null), [lang, code]);

  return (
    <figure className="group/code my-4 overflow-hidden rounded-xl border border-code-line bg-code">
      <figcaption className="flex items-center justify-between border-b border-code-line px-3 py-1.5">
        <span className="font-mono text-[0.7rem] tracking-wide text-faint uppercase">{label(lang)}</span>
        <button
          onClick={() => copyText(code).then((ok) => ok && markCopied())}
          className="flex items-center gap-1.5 rounded-md px-1.5 py-1 text-[0.7rem] font-medium text-muted opacity-0 transition-all hover:bg-surface-2 hover:text-ink group-hover/code:opacity-100 focus-visible:opacity-100"
        >
          {copied ? <CheckIcon className="size-3.5 text-success" /> : <CopyIcon className="size-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>

      <pre className="overflow-x-auto px-4 py-3.5 text-[0.82rem] leading-[1.65] scrollbar-thin">
        <code className="font-mono">
          {tokens
            ? tokens.map((token, i) => (
                <span key={i} className={TOKEN_COLOR[token.kind]}>
                  {token.text}
                </span>
              ))
            : code}
          {streaming && (
            <span className="ml-0.5 inline-block h-[1.05em] w-[0.5em] translate-y-[0.15em] animate-blink bg-accent/70" />
          )}
        </code>
      </pre>
    </figure>
  );
}
