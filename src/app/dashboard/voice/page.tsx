"use client";

import { useEffect, useState } from "react";
import { Play, Square, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function VoiceStudioPage() {
  const [text, setText] = useState("");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceIndex, setVoiceIndex] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    function loadVoices() {
      const v = window.speechSynthesis.getVoices();
      if (v.length) setVoices(v);
    }

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  function handleSpeak() {
    if (!text.trim()) {
      setError("Teks tidak boleh kosong.");
      return;
    }
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setError("Browser kamu tidak mendukung fitur suara ini.");
      return;
    }

    setError(null);
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    if (voices[voiceIndex]) utterance.voice = voices[voiceIndex];
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => {
      setSpeaking(false);
      setError("Gagal memutar suara.");
    };

    window.speechSynthesis.speak(utterance);
  }

  function handleStop() {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Voice Studio</h1>
      <p className="text-sm text-slate-400 mb-6">
        Ubah teks jadi suara langsung di browser kamu, sepenuhnya gratis.
      </p>

      <div className="p-5 rounded-2xl bg-card border border-card-border space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">Teks</label>
          <textarea
            className="w-full min-h-[100px] rounded-xl bg-black/20 border border-card-border p-3 text-sm"
            placeholder="Ketik teks yang mau diucapkan..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">Suara</label>
          <select
            className="w-full rounded-xl bg-black/20 border border-card-border p-3 text-sm"
            value={voiceIndex}
            onChange={(e) => setVoiceIndex(Number(e.target.value))}
          >
            {voices.length === 0 && <option>Memuat daftar suara...</option>}
            {voices.map((v, i) => (
              <option key={i} value={i}>
                {v.name} ({v.lang})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={handleSpeak} disabled={speaking}>
            <span className="flex items-center justify-center gap-2">
              <Play className="w-4 h-4" />
              Putar Suara
            </span>
          </Button>
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleStop}
            disabled={!speaking}
          >
            <span className="flex items-center justify-center gap-2">
              <Square className="w-4 h-4" />
              Berhenti
            </span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}