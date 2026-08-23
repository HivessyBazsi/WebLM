import { useEffect, useState } from "react";
import { ChatView } from "./components/ChatView";
import { SettingsDialog } from "./components/Settings";
import { Sidebar } from "./components/Sidebar";
import { StoreProvider, useStore } from "./lib/store";

const KEY_SIDEBAR = "weblm.sidebar";

const NARROW = "(max-width: 767px)";

function Shell() {
  const { createChat } = useStore();
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  const [sidebarOpen, setSidebarOpen] = useState(
    () => !window.matchMedia(NARROW).matches && localStorage.getItem(KEY_SIDEBAR) !== "closed",
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Collapsing to a narrow window tucks the sidebar away rather than letting
  // it eat the thread; widening restores whatever the user last chose.
  useEffect(() => {
    const media = window.matchMedia(NARROW);
    const onChange = (e: MediaQueryListEvent) => {
      setNarrow(e.matches);
      setSidebarOpen(e.matches ? false : localStorage.getItem(KEY_SIDEBAR) !== "closed");
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (!narrow) localStorage.setItem(KEY_SIDEBAR, sidebarOpen ? "open" : "closed");
  }, [narrow, sidebarOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      // Ctrl+Shift+N and friends belong to the browser / OS, not to us.
      if (!mod || e.altKey || e.shiftKey) return;
      // The settings dialog owns the keyboard while it is up, and a rename or
      // filter field must not have a new chat created out from under it.
      if (settingsOpen) return;
      const target = e.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "SELECT" || target.isContentEditable) return;
        // The composer deliberately keeps its shortcuts; the edit-in-place box
        // in a message is also a <textarea>, and holds an unsaved draft.
        if (tag === "TEXTAREA" && !target.closest("[data-composer]")) return;
      }
      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        createChat();
      }
      if (e.key === "\\") {
        e.preventDefault();
        setSidebarOpen((v) => !v);
      }
      if (e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [createChat, settingsOpen]);

  return (
    <div className="relative flex h-full w-full overflow-hidden">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onOpenSettings={() => setSettingsOpen(true)}
        onNavigate={() => narrow && setSidebarOpen(false)}
      />
      {narrow && sidebarOpen && (
        <div
          className="absolute inset-0 z-30 animate-fade bg-black/30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <ChatView
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
