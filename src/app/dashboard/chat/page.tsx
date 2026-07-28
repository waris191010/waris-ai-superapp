// src/app/dashboard/chat/page.tsx
"use client";

import { useState, useRef, useEffect } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const MODELS = [
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "claude-3-5-sonnet", label: "Claude 3.5 Sonnet" },
  { value: "deepseek-r1", label: "DeepSeek R1" },
];

export default function Page() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState(MODELS[0].value);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage() {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const newMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelSelected: model,
          messages,
          prompt: trimmed,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Terjadi kesalahan.");
        return;
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.text }]);
      if (typeof data.creditsRemaining === "number") {
        setCredits(data.creditsRemaining);
      }
    } catch {
      setError("Gagal terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">AI Chat Multi-Model</h1>
          <p className="text-slate-400 text-sm max-w-xl">
            Percakapan dengan GPT-4o, Claude 3.5 Sonnet, DeepSeek R1, dan model lainnya dalam
            satu antarmuka.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {credits !== null && (
            <span className="text-xs text-slate-400">Kredit: {credits.toFixed(1)}</span>
          )}
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="bg-card border border-card-border rounded-lg px-3 py-2 text-sm text-white"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-2 rounded-2xl bg-card border border-card-border h-[55vh] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="h-full flex items-center justify-center text-slate-500 text-sm text-center">
              Mulai percakapan dengan mengetik pesan di bawah.
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2 whitespace-pre-wrap text-sm ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-100 border border-card-border"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-slate-800 border border-card-border text-slate-400 rounded-2xl px-4 py-2 text-sm animate-pulse">
                Sedang mengetik...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {error && <p className="text-red-400 text-xs px-4 pb-1">{error}</p>}

        <div className="flex gap-2 p-3 border-t border-card-border">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik pesan Anda..."
            rows={1}
            className="flex-1 resize-none rounded-xl bg-black/30 border border-card-border px-4 py-2 text-sm text-white outline-none focus:border-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Kirim
          </button>
        </div>
      </div>
    </div>
  );
}
