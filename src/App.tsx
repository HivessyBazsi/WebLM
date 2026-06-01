import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css"; // <-- this is where Tailwind gets loaded

function App() {
  const [reply, setReply] = useState("");

  async function askRust() {
    // invoke() sends a message to Rust and waits for the response
    const result = await invoke<string>("greet", { name: "World" });
    setReply(result);
  }
  async function streamRust(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const result = await invoke<string>("appendtext", { text: e.target.value, append: " extra" });
    setReply(result);
  }

  return (
    // Tailwind classes go in className=""
    // bg-gray-900 = dark background, min-h-screen = full height, etc.
    <main className="bg-blue-900 min-h-screen flex flex-col items-center justify-center gap-6 text-white font-geist">

      {/* This text is big, bold, and purple */}
      <h1 className="text-4xl font-bold text-purple-400">
        Hello from React!
      </h1>

      {/* This paragraph is smaller and gray */}
      <p className="text-gray-400 text-sm">
        This text is styled with Tailwind — no CSS file needed.
      </p>

      {/* This button calls Rust when clicked */}
      <button
        onClick={askRust}
        className="bg-purple-600 hover:bg-purple-500 px-6 py-2 rounded-lg font-semibold transition-colors"
      >
        Ask Rust a question
      </button>

      <textarea
        onChange={streamRust}
        className=""
      />

      {/* This only shows up after Rust replies */}                                               
      {reply && (
        <p className="bg-gray-800 border border-purple-500 rounded-lg px-4 py-2 text-green-400">
          Rust says: {reply}
        </p>
      )}

    </main>
  );
}

export default App;
