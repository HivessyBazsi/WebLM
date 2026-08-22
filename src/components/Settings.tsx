import { useState, type ReactNode } from "react";
import { useStore } from "../lib/store";
import { DEFAULT_SETTINGS, type ThemeChoice } from "../lib/types";
import { cn } from "../lib/utils";
import { MonitorIcon, MoonIcon, RefreshIcon, SunIcon, TrashIcon } from "./Icons";
import { Button, Field, Modal, Segmented, Slider, Switch, TextArea, TextInput } from "./ui";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="border-b border-line py-5 first:pt-1 last:border-0 last:pb-1">
      <h3 className="text-[0.86rem] font-semibold tracking-[-0.01em]">{title}</h3>
      {description && <p className="mt-0.5 mb-3.5 text-[0.78rem] leading-relaxed text-muted">{description}</p>}
      <div className={cn("flex flex-col gap-4", !description && "mt-3.5")}>{children}</div>
    </section>
  );
}

export function SettingsDialog({ open, onClose }: { open: boolean; onClose(): void }) {
  const { settings, updateSettings, connection, models, refreshModels, clearAll, conversations } = useStore();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Settings"
      description="Stored on this machine only."
      footer={
        <>
          <Button variant="ghost" onClick={() => updateSettings(DEFAULT_SETTINGS)}>
            Reset to defaults
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <Section title="Appearance">
        <div className="flex items-center justify-between gap-4">
          <span className="text-[0.82rem] font-medium">Theme</span>
          <Segmented<ThemeChoice>
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={[
              { value: "light", label: "Light", icon: <SunIcon /> },
              { value: "dark", label: "Dark", icon: <MoonIcon /> },
              { value: "system", label: "System", icon: <MonitorIcon /> },
            ]}
          />
        </div>
      </Section>

      <Section title="Backend" description="Where the app looks for a local inference server.">
        <Field label="Server URL">
          <div className="flex gap-2">
            <TextInput
              value={settings.serverUrl}
              spellCheck={false}
              onChange={(e) => updateSettings({ serverUrl: e.target.value })}
              placeholder="http://localhost:8080"
            />
            <Button onClick={refreshModels} className="shrink-0">
              <RefreshIcon className={cn("size-4", connection.state === "checking" && "animate-spin")} />
              Test
            </Button>
          </div>
        </Field>

        <div className="flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[0.78rem]">
          <span
            className={cn(
              "size-2 shrink-0 rounded-full",
              connection.state === "online" ? "bg-success" : connection.state === "checking" ? "bg-warn" : "bg-danger",
            )}
          />
          <span className="min-w-0 flex-1 truncate text-muted">
            {connection.state === "online"
              ? `Connected · ${models.length} model${models.length === 1 ? "" : "s"} available`
              : connection.state === "checking"
                ? "Checking…"
                : (connection.error ?? "Not reachable")}
          </span>
        </div>
      </Section>

      <Section title="Generation" description="Defaults applied to every new message.">
        <Field
          label="System prompt"
          hint="Prepended to every conversation. Leave empty to let the model use its own default."
        >
          <TextArea
            rows={3}
            value={settings.systemPrompt}
            placeholder="You are a concise, practical assistant…"
            onChange={(e) => updateSettings({ systemPrompt: e.target.value })}
          />
        </Field>

        <Field label="Temperature" hint="Lower is more deterministic, higher is more inventive.">
          <Slider
            value={settings.temperature}
            min={0}
            max={2}
            step={0.05}
            onChange={(temperature) => updateSettings({ temperature })}
            format={(v) => v.toFixed(2)}
          />
        </Field>

        <Field label="Top P">
          <Slider
            value={settings.topP}
            min={0.05}
            max={1}
            step={0.05}
            onChange={(topP) => updateSettings({ topP })}
            format={(v) => v.toFixed(2)}
          />
        </Field>

        <Field label="Context window" hint="Tokens of history the model sees. Larger costs more memory.">
          <Slider
            value={settings.contextLength}
            min={1024}
            max={32768}
            step={1024}
            onChange={(contextLength) => updateSettings({ contextLength })}
            format={(v) => `${v / 1024}k`}
          />
        </Field>
      </Section>

      <Section title="Behaviour">
        <Switch
          label="Enter sends the message"
          checked={settings.sendOnEnter}
          onChange={(sendOnEnter) => updateSettings({ sendOnEnter })}
        />
        <Switch
          label="Show speed and token counts"
          checked={settings.showStats}
          onChange={(showStats) => updateSettings({ showStats })}
        />
      </Section>

      <Section title="Data" description={`${conversations.length} conversation${conversations.length === 1 ? "" : "s"} saved in this browser profile.`}>
        {confirmClear ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-danger/25 bg-danger/8 px-3 py-2.5">
            <span className="text-[0.8rem] text-danger">Delete every conversation? This cannot be undone.</span>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="ghost" onClick={() => setConfirmClear(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  clearAll();
                  setConfirmClear(false);
                }}
              >
                Delete all
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="danger"
            size="sm"
            className="self-start"
            disabled={conversations.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            <TrashIcon className="size-3.5" />
            Clear all chats
          </Button>
        )}
      </Section>
    </Modal>
  );
}
