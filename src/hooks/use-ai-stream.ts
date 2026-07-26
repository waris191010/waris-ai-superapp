"use client";

import { useState } from "react";

export function useAIStream() {
  const [streamedText, setStreamedText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startStreamingSimulation = async (prompt: string) => {
    setIsStreaming(true);
    setStreamedText("");
    setError(null);

    const fullResponse = `Analisis Arsitektur WARIS AI untuk prompt: "${prompt}". Sistem mendeteksi pemrosesan node terdistribusi berhasil dilakukan melalui struktur modular...`;
    const tokens = fullResponse.split(" ");
    let currentIdx = 0;

    const interval = setInterval(() => {
      // Simulasi Interupsi Jaringan Acak (Skenario Error Test)
      if (Math.random() < 0.03) { 
        setError("Koneksi ke gateway AI terputus. Menghentikan stream otomatis.");
        setIsStreaming(false);
        clearInterval(interval);
        return;
      }

      if (currentIdx < tokens.length) {
        setStreamedText((prev) => prev + (prev ? " " : "") + tokens[currentIdx]);
        currentIdx++;
      } else {
        setIsStreaming(false);
        clearInterval(interval);
      }
    }, 120); // Kecepatan render token teks
  };

  return { streamedText, isStreaming, error, startStreamingSimulation };
}
