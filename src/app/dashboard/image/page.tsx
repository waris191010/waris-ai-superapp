"use client";

import { useState } from "react";
import { Loader2, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const STYLES = [
  { label: "Realistis", value: "realistic, photorealistic, highly detailed" },
  { label: "Anime", value: "anime style, vibrant colors" },
  { label: "Lukisan Cat Air", value: "watercolor painting, soft colors" },
  { label: "3D Render", value: "3d render, octane render, cinematic lighting" },
];

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState(STYLES[0].value);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [error, setError] = useState("");

  function handleGenerate() {
    if (!prompt.trim()) {
      setError("Deskripsi gambar tidak boleh kosong.");
      return;
    }

    setError("");
    setImageUrl("");
    setLoading(true);

    const fullPrompt = `${prompt}, ${style}`;
    const seed = Math.floor(Math.random() * 1000000);
    const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(
      fullPrompt
    )}?width=1024&height=1024&seed=${seed}&nologo=true`;

    const img = new window.Image();
    img.onload = function () {
      setImageUrl(url);
      setLoading(false);
    };
    img.onerror = function () {
      setError("Gagal memuat gambar dari provider.");
      setLoading(false);
    };
    img.src = url;
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Image Creator Studio</h1>
      <p className="text-sm text-slate-400 mb-6">
        Buat gambar dari teks menggunakan Flux (gratis, tanpa API key).
      </p>

      <div className="p-5 rounded-2xl bg-card border border-card-border space-y-4">
        <div>
          <label className="text-sm text-slate-400 mb-1 block">
            Deskripsi Gambar
          </label>
          <textarea
            className="w-full min-h-[90px] rounded-xl bg-black/20 border border-card-border p-3 text-sm"
            placeholder="Contoh: Kucing oranye duduk di jendela saat senja, gaya sinematik"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1 block">
            Gaya Visual
          </label>
          <select
            className="w-full rounded-xl bg-black/20 border border-card-border p-3 text-sm"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            {STYLES.map((s) => (
              <option key={s.label} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        <Button onClick={handleGenerate} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Membuat gambar...
            </>
          ) : (
            "Generate Gambar"
          )}
        </Button>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {imageUrl && (
          <div className="mt-4 p-5 rounded-2xl bg-card border border-card-border">
            <p className="text-sm text-slate-400 mb-3">Gambar kamu sudah jadi:</p>
            <img src={imageUrl} alt={prompt} className="w-full rounded-xl" />
            <a
              href={imageUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline"
            >
              <Download className="w-4 h-4" />
              Download gambar
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
