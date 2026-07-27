"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Square, RotateCcw, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = 16;

interface Track {
  id: string;
  name: string;
  color: string;
}

const TRACKS: Track[] = [
  { id: "kick", name: "Kick", color: "bg-orange-500" },
  { id: "snare", name: "Snare", color: "bg-cyan-500" },
  { id: "hihat", name: "Hi-Hat", color: "bg-yellow-500" },
  { id: "clap", name: "Clap", color: "bg-pink-500" },
];

type Pattern = Record<string, boolean[]>;

function emptyPattern(): Pattern {
  const p: Pattern = {};
  TRACKS.forEach((t) => {
    p[t.id] = Array(STEPS).fill(false);
  });
  return p;
}

export default function MusicStudioPage() {
  const [pattern, setPattern] = useState<Pattern>(emptyPattern());
  const [bpm, setBpm] = useState(120);
  const [playing, setPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [error, setError] = useState<string | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stepRef = useRef(0);
  const patternRef = useRef(pattern);

  useEffect(() => {
    patternRef.current = pattern;
  }, [pattern]);

  function getCtx(): AudioContext | null {
    if (typeof window === "undefined") return null;
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) {
      setError("Browser kamu tidak mendukung Web Audio API.");
      return null;
    }
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AC();
    }
    return audioCtxRef.current;
  }

  function playKick(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  }

  function playNoise(
    ctx: AudioContext,
    duration: number,
    filterType: BiquadFilterType,
    freq: number
  ) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  function playSnare(ctx: AudioContext) {
    playNoise(ctx, 0.2, "highpass", 1000);
  }

  function playHiHat(ctx: AudioContext) {
    playNoise(ctx, 0.08, "highpass", 7000);
  }

  function playClap(ctx: AudioContext) {
    playNoise(ctx, 0.15, "bandpass", 1500);
  }

  function triggerTrack(ctx: AudioContext, trackId: string) {
    if (trackId === "kick") playKick(ctx);
    if (trackId === "snare") playSnare(ctx);
    if (trackId === "hihat") playHiHat(ctx);
    if (trackId === "clap") playClap(ctx);
  }

  const stepOnce = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const step = stepRef.current;
    TRACKS.forEach((t) => {
      if (patternRef.current[t.id][step]) {
        triggerTrack(ctx, t.id);
      }
    });
    setCurrentStep(step);
    stepRef.current = (step + 1) % STEPS;
  }, []);

  function handlePlay() {
    setError(null);
    const ctx = getCtx();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    if (playing) return;
    setPlaying(true);
    stepRef.current = 0;
    const intervalMs = (60 / bpm / 4) * 1000; // 16th notes
    stepOnce();
    intervalRef.current = setInterval(stepOnce, intervalMs);
  }

  function handleStop() {
    setPlaying(false);
    setCurrentStep(-1);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handleClear() {
    handleStop();
    setPattern(emptyPattern());
  }

  function toggleCell(trackId: string, idx: number) {
    setPattern((prev) => {
      const next = { ...prev, [trackId]: [...prev[trackId]] };
      next[trackId][idx] = !next[trackId][idx];
      return next;
    });
  }

  useEffect(() => {
    if (playing && intervalRef.current) {
      clearInterval(intervalRef.current);
      const intervalMs = (60 / bpm / 4) * 1000;
      intervalRef.current = setInterval(stepOnce, intervalMs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpm]);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Music Studio</h1>
      <p className="text-sm text-slate-400 mb-5">
        Beat maker / drum machine gratis langsung di browser, tanpa API key,
        tanpa batas.
      </p>

      <div className="p-5 rounded-2xl bg-card border border-card-border space-y-5">
        <div className="flex items-center gap-4">
          <Button onClick={playing ? handleStop : handlePlay} className="gap-2">
            {playing ? (
              <>
                <Square className="w-4 h-4" /> Berhenti
              </>
            ) : (
              <>
                <Play className="w-4 h-4" /> Putar
              </>
            )}
          </Button>
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-card-border hover:bg-white/5 text-sm"
          >
            <RotateCcw className="w-4 h-4" />
            Hapus Semua
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <Music2 className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-400">{bpm} BPM</span>
            <input
              type="range"
              min={60}
              max={200}
              value={bpm}
              onChange={(e) => setBpm(Number(e.target.value))}
              className="w-32"
            />
          </div>
        </div>

        <div className="space-y-2">
          {TRACKS.map((track) => (
            <div key={track.id} className="flex items-center gap-2">
              <div className="w-16 text-sm text-slate-300 flex-shrink-0">
                {track.name}
              </div>
              <div className="grid grid-cols-16 gap-1 flex-1" style={{ gridTemplateColumns: "repeat(16, minmax(0, 1fr))" }}>
                {pattern[track.id].map((active, idx) => (
                  <button
                    key={idx}
                    onClick={() => toggleCell(track.id, idx)}
                    className={`aspect-square rounded-md border transition ${
                      active
                        ? `${track.color} border-transparent`
                        : "bg-black/20 border-card-border hover:bg-white/5"
                    } ${
                      currentStep === idx
                        ? "ring-2 ring-white/80"
                        : ""
                    } ${idx % 4 === 0 ? "ml-1" : ""}`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="text-sm text-red-400 border border-red-500/30 bg-red-500/10 rounded-xl px-4 py-3">
            {error}
          </div>
        )}

        <p className="text-xs text-slate-500">
          Klik kotak untuk menyalakan ketukan, lalu klik "Putar". Semua suara
          dibuat langsung oleh browser (synthesized), jadi bisa dipakai
          sepuasnya tanpa batas dan tanpa koneksi internet.
        </p>
      </div>
    </div>
  );
}
