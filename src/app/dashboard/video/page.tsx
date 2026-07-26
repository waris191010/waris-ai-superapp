// src/app/dashboard/video/page.tsx
"use client";

import { useState, useRef } from "react";
import { Video, Image as ImageIcon, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Mode = "text" | "image";
type JobState = "idle" | "submitting" | "processing" | "done" | "error";

export default function VideoStudioPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [prompt, setPrompt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [duration, setDuration] = useState(6);
  const [state, setState] = useState<JobState>("idle");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  async function handleGenerate() {
    setError(null);
    setVideoUrl(null);

    if (!prompt.trim()) {
      setError("Deskripsi video tidak boleh kosong.");
      return;
    }
    if (mode === "image" && !imageUrl.trim()) {
      setError("Masukkan URL gambar untuk mode image-to-video.");
      return;
    }

    setState("submitting");

    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          imageUrl: mode === "image" ? imageUrl : undefined,
          durationSeconds: duration,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal memulai pembuatan video.");
        setState("error");
        return;
      }

      setState("processing");

      pollRef.current = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `/api/video/status?jobId=${encodeURIComponent(data.jobId)}&prompt=${encodeURIComponent(prompt)}`
          );
          const statusData = await statusRes.json();

          if (!statusRes.ok) {
            setError(statusData.error ?? "Gagal memeriksa status video.");
            setState("error");
            stopPolling();
            return;
          }

          if (statusData.status === "completed") {
            setVideoUrl(statusData.videoUrl);
            setState("done");
            stopPolling();
          } else if (statusData.status === "error") {
            setError(statusData.errorMessage ?? "Video gagal dibuat.");
            setState("error");
            stopPolling();
          }
        } catch {
          setError("Koneksi terputus saat memeriksa status.");
          setState("error");
          stopPolling();
        }
      }, 5000);
    } catch {
      setError("Tidak bisa terhubung ke server.");
      setState("error");
    }
  }

  const isBusy = state === "submitting" || state === "processing";

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Video Studio</h1>
        <p className="text-slate-400 text-sm mt-1">
          Buat video dari teks atau gambar menggunakan Grok Imagine (xAI). Setiap generate memotong 50 kredit.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setMode("text")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            mode === "text"
              ? "bg-brand-electric/10 border-brand-electric text-brand-electric"
              : "border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <Video className="w-4 h-4" /> Text to Video
        </button>
        <button
          onClick={() => setMode("image")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
            mode === "image"
              ? "bg-brand-electric/10 border-brand-electric text-brand-electric"
              : "border-slate-800 text-slate-400 hover:border-slate-700"
          }`}
        >
          <ImageIcon className="w-4 h-4" /> Image to Video
        </button>
      </div>

      <div className="space-y-4 p-5 rounded-2xl bg-card border border-card-border">
        {mode === "image" && (
          <div>
            <label className="block text-xs text-slate-400 mb-1">URL Gambar Sumber</label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://contoh.com/gambar.jpg"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-electric/50"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Tempel URL gambar yang bisa diakses publik (upload dulu ke layanan seperti Imgur, lalu tempel link-nya di sini).
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1">Deskripsi Video</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder="Contoh: Kucing oranye bermain piano di ruangan hangat, gaya sinematik"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-electric/50 resize-none"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">Durasi (detik)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-electric/50"
          >
            {[6, 8, 10, 15].map((s) => (
              <option key={s} value={s}>{s} detik</option>
            ))}
          </select>
        </div>

        <Button onClick={handleGenerate} disabled={isBusy} className="w-full">
          {isBusy ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              {state === "submitting" ? "Mengirim permintaan..." : "Sedang membuat video (bisa 1-2 menit)..."}
            </span>
          ) : (
            "Generate Video"
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {videoUrl && (
        <div className="p-5 rounded-2xl bg-card border border-card-border">
          <p className="text-sm text-slate-400 mb-3">Video kamu sudah jadi:</p>
          <video src={videoUrl} controls className="w-full rounded-xl" />
        </div>
      )}
    </div>
  );
}
