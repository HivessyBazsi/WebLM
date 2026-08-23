/**
 * A deliberately small, language-agnostic tokenizer.
 *
 * It is not a parser and does not try to be correct for every grammar — it
 * recognises the handful of shapes (comments, strings, numbers, keywords,
 * call sites) that carry almost all of the visual signal in a code block,
 * across the languages people actually paste into a chat.
 */
export type TokenKind = "plain" | "comment" | "string" | "number" | "keyword" | "fn" | "punct";

export interface Token {
  text: string;
  kind: TokenKind;
}

const KEYWORDS = new Set([
  // control flow & declarations, pooled across mainstream languages
  "abstract","and","as","async","await","begin","bool","break","case","catch","char","class","const","constexpr",
  "continue","crate","def","default","defer","del","delete","do","dyn","elif","else","end","enum","except","export",
  "extends","extern","false","final","finally","fn","for","from","func","function","go","goto","if","impl","implements",
  "import","in","instanceof","int","interface","is","lambda","let","loop","match","mod","module","move","mut","namespace",
  "new","nil","none","not","null","or","package","pass","private","protected","pub","public","raise","readonly","record",
  "ref","return","select","self","static","struct","super","switch","template","then","this","throw","throws","trait",
  "true","try","type","typedef","typeof","union","unsafe","use","using","var","virtual","void","when","where","while",
  "with","yield",
]);

const PATTERN = new RegExp(
  [
    // block comments: /* … */, <!-- … -->, python docstrings
    "\\/\\*[\\s\\S]*?(?:\\*\\/|$)",
    "<!--[\\s\\S]*?(?:-->|$)",
    "\"\"\"[\\s\\S]*?(?:\"\"\"|$)",
    "'''[\\s\\S]*?(?:'''|$)",
    // line comments: // and #
    "\\/\\/[^\\n]*",
    "#[^\\n]*",
    // strings, escape-aware
    '"(?:\\\\.|[^"\\\\\\n])*"',
    "'(?:\\\\.|[^'\\\\\\n])*'",
    "`(?:\\\\.|[^`\\\\])*`",
    // numbers, including hex and suffixes
    "\\b0[xXbBoO][0-9a-fA-F_]+\\b",
    "\\b\\d[\\d_]*(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\w*\\b",
    // identifiers
    "[A-Za-z_$][\\w$]*",
    // punctuation & operators
    "[{}()\\[\\];,.:!?=+\\-*/%<>&|^~@]+",
  ].join("|"),
  "g",
);

function classify(text: string, rest: string): TokenKind {
  const head = text[0];
  if (text.startsWith("/*") || text.startsWith("//") || text.startsWith("<!--")) return "comment";
  if (head === "#") return "comment";
  if (text.startsWith('"""') || text.startsWith("'''")) return "comment";
  if (head === '"' || head === "'" || head === "`") return "string";
  if (head >= "0" && head <= "9") return "number";
  if (/[A-Za-z_$]/.test(head)) {
    if (KEYWORDS.has(text)) return "keyword";
    // A bare identifier immediately followed by `(` reads as a call site.
    return /^\s*\(/.test(rest) ? "fn" : "plain";
  }
  return "punct";
}

export function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let last = 0;
  PATTERN.lastIndex = 0;

  for (let match = PATTERN.exec(code); match; match = PATTERN.exec(code)) {
    if (match.index > last) tokens.push({ text: code.slice(last, match.index), kind: "plain" });
    const text = match[0];
    tokens.push({ text, kind: classify(text, code.slice(match.index + text.length)) });
    last = match.index + text.length;
  }
  if (last < code.length) tokens.push({ text: code.slice(last), kind: "plain" });
  return tokens;
}

export const TOKEN_COLOR: Record<TokenKind, string> = {
  plain: "",
  comment: "text-[var(--tok-com)] italic",
  string: "text-[var(--tok-str)]",
  number: "text-[var(--tok-num)]",
  keyword: "text-[var(--tok-key)]",
  fn: "text-[var(--tok-fn)]",
  punct: "text-[var(--tok-punct)]",
};

/** Languages we do not want to pretend to highlight. */
const PLAIN_LANGS = new Set(["", "text", "txt", "plain", "log", "output"]);

export function shouldHighlight(lang: string): boolean {
  return !PLAIN_LANGS.has(lang.toLowerCase());
}
