"use client";

import { useState, useRef } from "react";
import { Upload, Video, Trash2, Download, AlertCircle, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SlideImage {
  id: string;
  url: string;
  file: File;
  duration: number; // seconds
}

export default function VideoStudioPage() {
  const [slides, setSlides] = useState<SlideImage[]>([]);
  const [narration, setNarration] = useState("");
  const [rendering, setRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files) return;
    const newSlides: SlideImage[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      url: URL.createObjectURL(file),
      file,
      duration: 3,
    }));
    setSlides((prev) => [...prev, ...newSlides]);
    setError(null);
  }

  function removeSlide(id: string) {
    setSlides((prev) => prev.filter((s) => s.id !== id));
  }

  function updateDuration(id: string, duration: number) {
    setSlides((prev) =>
      prev.map((s) => (s.id === id ? { ...s, duration } : s))
    );
  }

  async function handleCreateVideo() {
    if (slides.length === 0) {
      setError("Tambahkan minimal 1 gambar dulu.");
      return;
    }
    if (typeof window === "undefined" || !("MediaRecorder" in window)) {
      setError("Browser kamu tidak mendukung pembuatan video.");
      return;
    }

    setError(null);
    setWarning(null);
    setRendering(true);
    setProgress(0);
    setVideoUrl(null);

    let displayStream: MediaStream | null = null;

    try {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error("Canvas tidak ditemukan.");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Tidak bisa membuat context canvas.");

      canvas.width = 1280;
      canvas.height = 720;

      const canvasStream = (canvas as any).captureStream(30);
      let combinedStream: MediaStream = canvasStream;

      const wantsNarration = narration.trim().length > 0;

      if (wantsNarration) {
        if (
          !("mediaDevices" in navigator) ||
          !(navigator.mediaDevices as any).getDisplayMedia
        ) {
          setWarning(
            "Browser kamu tidak mendukung perekaman suara narasi. Video akan dibuat tanpa suara."
          );
        } else {
          try {
            displayStream = await (navigator.mediaDevices as any).getDisplayMedia(
              { video: true, audio: true }
            );
            const audioTracks = displayStream?.getAudioTracks() ?? [];
            if (audioTracks.length === 0) {
              setWarning(
                "Kamu tidak mencentang 'Bagikan audio tab ini', jadi video dibuat tanpa suara."
              );
            } else {
              combinedStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioTracks,
              ]);
            }
          } catch (permErr) {
            setWarning(
              "Izin berbagi tab dibatalkan, video dibuat tanpa suara."
            );
          }
        }
      }

      const recorder = new MediaRecorder(combinedStream, {
        mimeType: "video/webm;codecs=vp9,opus",
      });

      const chunks: Blob[] = [];
      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) chunks.push(ev.data);
      };

      const stopped = new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
      });

      recorder.start();

      if (wantsNarration && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(narration);
        window.speechSynthesis.speak(utterance);
      }

      const images: HTMLImageElement[] = await Promise.all(
        slides.map(
          (s) =>
            new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = s.url;
            })
        )
      );

      for (let i = 0; i < slides.length; i++) {
        const img = images[i];
        const durationMs = slides[i].duration * 1000;

        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (canvas.width - w) / 2;
        const y = (canvas.height - h) / 2;
        ctx.drawImage(img, x, y, w, h);

        await new Promise((r) => setTimeout(r, durationMs));
        setProgress(Math.round(((i + 1) / slides.length) * 100));
      }

      if (wantsNarration && "speechSynthesis" in window) {
        while (window.speechSynthesis.speaking) {
          await new Promise((r) => setTimeout(r, 200));
        }
      }

      recorder.stop();
      await stopped;

      if (displayStream) {
        displayStream.getTracks().forEach((t) => t.stop());
      }

      const blob = new Blob(chunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setVideoUrl(url);
    } catch (err) {
      console.error(err);
      setError("Gagal membuat video. Coba lagi.");
      if (displayStream) {
        displayStream.getTracks().forEach((t) => t.stop());
      }
    } finally {
      setRendering(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-1">Video Studio</h1>
      <p className="text-sm text-slate-400 mb-5">
        Buat video slideshow dari gambar, gratis langsung di browser, tanpa API key.
      </p>

      <div className="p-5 rounded-2xl bg-card border border-card-border space-y-4">
        <div>
          <label className="text-sm mb-2 block">Upload Gambar</label>
          <label className="flex items-center justify-center gap-2 border border-dashed border-card-border rounded-xl p-6 cursor-pointer hover:bg-white/5 transition">
            <Upload className="w-5 h-5" />
            <span>Pilih gambar (bisa lebih dari satu)</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFiles}
            />
          </label>
        </div>

        {slides.length > 0 && (
          <div className="space-y-3">
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className="flex items-center gap-3 p-2 rounded-xl border border-card-border"
              >
                <img
                  src={slide.url}
                  alt={`slide-${i}`}
                  className="w-16 h-16 object-cover rounded-lg"
                />
                <div className="flex-1">
                  <p className="text-xs text-slate-400 mb-1">
                    Slide {i + 1} — durasi (detik)
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={slide.duration}
                    onChange={(e) =>
                      updateDuration(slide.id, Number(e.target.value))
                    }
                    className="w-20 px-2 py-1 rounded-lg bg-black/20 border border-card-border text-sm"
                  />
                </div>
                <button
                  onClick={() => removeSlide(slide.id)}
                  className="p-2 hover:bg-white/10 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div>
          <label className="text-sm mb-2 flex items-center gap-2">
            <Mic className="w-4 h-4" />
            Narasi (opsional — eksperimental)
          </label>
          <textarea
            value={narration}
            onChange={(e) => setNarration(e.target.value)}
            placeholder="Tulis narasi yang mau diucapkan selama video diputar..."
            className="w-full px-3 py-2 rounded-xl bg-black/20 border border-card-border text-sm min-h-[80px]"
          />
          <p className="text-xs text-slate-500 mt-1">
            Kalau diisi, saat klik "Buat Video" akan muncul pop-up minta izin
            berbagi tab — centang "Bagikan audio tab ini" agar suara narasi
            ikut terekam. Hanya berfungsi di Chrome/Edge.
          </p>
        </div>

        <Button
          className="w-full"
          onClick={handleCreateVideo}
          disabled={rendering || slides.length === 0}
        >
          <span className="flex items-center justify-center gap-2">
            <Video className="w-4 h-4" />
            {rendering ? `Membuat video... ${progress}%` : "Buat Video"}
          </span>
        </Button>

        {warning && (
          <div className="mt-2 flex items-start gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{warning}</span>
          </div>
        )}

        {videoUrl && (
          <div className="mt-4 p-4 rounded-xl bg-card border border-card-border space-y-3">
            <p className="text-sm text-slate-400">Video kamu sudah siap:</p>
            <video src={videoUrl} controls className="w-full rounded-lg" />
            <a
              href={videoUrl}
              download="video-studio.webm"
              className="inline-flex items-center gap-2 text-sm text-cyan-400 hover:underline"
            >
              <Download className="w-4 h-4" />
              Download video (.webm)
            </a>
          </div>
        )}

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
