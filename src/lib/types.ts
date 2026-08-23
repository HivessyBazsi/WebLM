export type Role = "user" | "assistant" | "system";

/** Per-response telemetry. The whole point of running locally is knowing
 *  what your machine is actually doing, so we surface it on every reply. */
export interface Stats {
  /** Tokens produced by the model. */
  tokens: number;
  /** Sustained generation speed. */
  tokensPerSecond: number;
  /** Milliseconds until the first token arrived. */
  firstTokenMs: number;
  /** Wall-clock time for the whole response. */
  totalMs: number;
  /** Tokens consumed from the prompt (context + history). */
  promptTokens?: number;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  createdAt: number;
  /** Model that produced an assistant message. */
  model?: string;
  stats?: Stats;
  /** Set when generation failed; `content` may still hold partial output. */
  error?: string;
  /** True while tokens are still streaming in. */
  streaming?: boolean;
  /** True when the user stopped generation early. */
  stopped?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  /** Model this thread last used; new turns default to it. */
  model: string | null;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
}

export interface ModelInfo {
  /** Fully qualified tag, e.g. `llama3.2:3b`. */
  name: string;
  sizeBytes: number;
  family?: string;
  /** e.g. `8.0B` */
  parameters?: string;
  /** e.g. `Q4_K_M` */
  quantization?: string;
  modifiedAt?: string;
}

export type ThemeChoice = "light" | "dark" | "system";

export interface Settings {
  theme: ThemeChoice;
  /** Base URL of the local inference server the app talks to. */
  serverUrl: string;
  defaultModel: string | null;
  systemPrompt: string;
  temperature: number;
  topP: number;
  /** `num_ctx` — context window in tokens. */
  contextLength: number;
  /** `num_predict` — response cap; -1 means unlimited. */
  maxTokens: number;
  showStats: boolean;
  /** Enter sends, Shift+Enter newlines — or the reverse. */
  sendOnEnter: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  serverUrl: "http://localhost:8080",
  defaultModel: null,
  systemPrompt: "",
  temperature: 0.7,
  topP: 0.9,
  contextLength: 4096,
  maxTokens: -1,
  showStats: true,
  sendOnEnter: true,
};

export type ConnectionState = "checking" | "online" | "offline";

export interface Connection {
  state: ConnectionState;
  /** Server version string, when the server reports one. */
  version?: string;
  error?: string;
}
