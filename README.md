# WebLM

A desktop chat client for models running on your own machine. Tauri + React + TypeScript.

## Frontend

Everything under `src/` is provider-agnostic — it knows how to list models and
how to consume a stream of tokens, nothing more.

```
src/
  lib/
    provider.ts   the single seam between the UI and whatever runs the model
    store.tsx     conversations, settings and generation state (localStorage-backed)
    markdown.tsx  markdown → React nodes, no innerHTML, no dependencies
    highlight.ts  small language-agnostic code tokenizer
    types.ts      shared shapes
    utils.ts      formatting helpers
  components/     sidebar, chat view, composer, model picker, settings, primitives
  index.css       design tokens (light + dark) and Tailwind theme mapping
```

### Wiring up a backend

`src/lib/provider.ts` exports a `Provider` interface and ships a stub that
streams a canned response so the UI can be developed end to end. Implement the
interface against a real backend and point `activeProvider` at it — nothing
else in the app needs to change.

```ts
export interface Provider {
  listModels(settings: Settings): Promise<ModelInfo[]>;
  chat(req: ChatRequest, handlers: ChatHandlers): Promise<void>;
}
```

`chat` receives an `AbortSignal` (the Stop button) and reports tokens through
`onToken`, then timing and token counts through `onDone`.

### Design tokens

Colours, shadows and fonts are declared once in `src/index.css` as CSS
variables, with a `.dark` override, and mapped into Tailwind via `@theme inline`.
Components reference tokens (`bg-surface`, `text-muted`, `border-line`) rather
than raw colours, so retheming is a single-file change.

## Keyboard

| Shortcut | Action |
|---|---|
| `Ctrl/⌘ + N` | New chat |
| `Ctrl/⌘ + \` | Toggle sidebar |
| `Ctrl/⌘ + ,` | Settings |
| `/` | Focus the composer |
| `Enter` | Send (configurable) |
| `Shift + Enter` | New line |

## Development

```sh
npm install
npm run dev      # frontend only, in a browser
npm run tauri dev  # full desktop app
npm run build    # typecheck + production bundle
```
