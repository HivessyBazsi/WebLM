import type { Message, ModelInfo, Settings, Stats } from "./types";

/**
 * The single seam between the UI and whatever runs the model.
 *
 * Everything above this file is pure frontend: it only knows how to list
 * models and how to consume a stream of tokens. Swap `activeProvider` for a
 * real implementation (a Tauri command bridge, an HTTP client, …) and the
 * rest of the app is unchanged.
 */
export interface ChatRequest {
  model: string;
  messages: Array<Pick<Message, "role" | "content">>;
  settings: Settings;
  signal: AbortSignal;
}

export interface ChatHandlers {
  /** Called for every token / chunk of text. */
  onToken(text: string): void;
  /** Called once when the response finishes cleanly. */
  onDone(stats: Stats): void;
}

export interface Provider {
  readonly id: string;
  listModels(settings: Settings): Promise<ModelInfo[]>;
  chat(req: ChatRequest, handlers: ChatHandlers): Promise<void>;
}

/* ── Stub provider ────────────────────────────────────────────────────────
   Stands in for the backend so the interface can be exercised end to end:
   streaming, cancellation, timing and token accounting all behave the way
   the real thing will. Replace with the real provider when it lands. */

const STUB_MODELS: ModelInfo[] = [
  { name: "qwen3:8b", sizeBytes: 5_200_000_000, family: "qwen3", parameters: "8.2B", quantization: "Q4_K_M" },
  { name: "llama3.2:3b", sizeBytes: 2_000_000_000, family: "llama", parameters: "3.2B", quantization: "Q4_K_M" },
  { name: "mistral-small:24b", sizeBytes: 14_300_000_000, family: "mistral", parameters: "23.6B", quantization: "Q4_K_M" },
  { name: "deepseek-r1:14b", sizeBytes: 9_000_000_000, family: "deepseek", parameters: "14.8B", quantization: "Q4_K_M" },
  { name: "nomic-embed-text", sizeBytes: 274_000_000, family: "nomic-bert", parameters: "137M", quantization: "F16" },
];

const STUB_REPLY = `That request reached the UI layer, but no inference backend is wired up yet.

Here is what the frontend already does with a response:

- **streams** it token by token, with a live caret
- renders \`inline code\`, lists, quotes and tables
- reports speed, latency and token counts underneath
- lets you stop, copy, edit or retry a turn

\`\`\`ts
// src/lib/provider.ts — the only file a backend needs to touch
export const activeProvider: Provider = myBackend;
\`\`\`

> Swap \`activeProvider\` and every screen in the app lights up for real.`;

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });

export const stubProvider: Provider = {
  id: "stub",

  async listModels() {
    await new Promise((r) => setTimeout(r, 220));
    return STUB_MODELS;
  },

  async chat({ signal }, { onToken, onDone }) {
    const started = performance.now();
    await sleep(340, signal);
    const firstTokenMs = performance.now() - started;

    // Chunk on word boundaries so streaming looks the way real output does.
    const chunks = STUB_REPLY.match(/\s*\S+/g) ?? [];
    for (const chunk of chunks) {
      await sleep(14, signal);
      onToken(chunk);
    }

    const totalMs = performance.now() - started;
    onDone({
      tokens: chunks.length,
      tokensPerSecond: chunks.length / ((totalMs - firstTokenMs) / 1000),
      firstTokenMs,
      totalMs,
      promptTokens: 0,
    });
  },
};

export const activeProvider: Provider = stubProvider;
