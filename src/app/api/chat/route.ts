// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rate-limit";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

async function callGemini(prompt: string, messages: { role: string; content: string }[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY belum diatur di server.");
  }

  const contents = [
    ...(Array.isArray(messages) ? messages : []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
    { role: "user", parts: [{ text: prompt }] },
  ];

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  );

  if (!response.ok) {
    const errText = await response.text();
    console.error("Gemini API error:", errText);
    throw new Error("Gagal menghubungi Gemini API.");
  }

  const data = await response.json();
  return (
    data?.candidates?.[0]?.content?.parts?.map((p: { text: string }) => p.text).join("") ??
    "Maaf, tidak ada respons dari AI."
  );
}

// Integrasi Grok (xAI). Endpoint-nya kompatibel dengan format OpenAI
// (chat/completions), jadi strukturnya mirip callGemini di atas tapi
// pakai skema messages: [{ role, content }] langsung tanpa "parts".
async function callGrok(prompt: string, messages: { role: string; content: string }[]) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY belum diatur di server.");
  }

  const chatMessages = [
    ...(Array.isArray(messages) ? messages : []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: prompt },
  ];

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.3",
      messages: chatMessages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Grok API error:", errText);
    throw new Error("Gagal menghubungi Grok API.");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "Maaf, tidak ada respons dari AI.";
}

// Integrasi Groq (GroqCloud) — beda dengan Grok (xAI) di atas. Groq adalah
// penyedia inference super cepat untuk model open-source (Llama, GPT-OSS, dll).
// Endpoint-nya juga kompatibel format OpenAI, jadi strukturnya sama persis
// dengan callGrok, hanya beda base URL, model, dan env variable key-nya.
async function callGroq(prompt: string, messages: { role: string; content: string }[]) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY belum diatur di server.");
  }

  const chatMessages = [
    ...(Array.isArray(messages) ? messages : []).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: m.content,
    })),
    { role: "user", content: prompt },
  ];

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-120b",
      messages: chatMessages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Groq API error:", errText);
    throw new Error("Gagal menghubungi Groq API.");
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content ?? "Maaf, tidak ada respons dari AI.";
}

// Daftar provider untuk fallback otomatis. Urutan menentukan prioritas: kalau
// provider pertama gagal (limit habis, error server, key belum diatur, dll),
// otomatis coba provider berikutnya sampai salah satu berhasil.
type ProviderName = "gemini" | "groq" | "grok";

const FALLBACK_ORDER: { name: ProviderName; call: typeof callGemini; cost: number }[] = [
  { name: "gemini", call: callGemini, cost: 2.0 },
  { name: "groq", call: callGroq, cost: 1.5 },
  { name: "grok", call: callGrok, cost: 3.0 },
];

async function callWithFallback(
  preferred: ProviderName | undefined,
  prompt: string,
  messages: { role: string; content: string }[]
) {
  // Urutkan supaya provider yang diminta user (preferred) dicoba lebih dulu,
  // baru sisanya sebagai cadangan, tanpa mengubah urutan default di atas.
  const order = preferred
    ? [
        ...FALLBACK_ORDER.filter((p) => p.name === preferred),
        ...FALLBACK_ORDER.filter((p) => p.name !== preferred),
      ]
    : FALLBACK_ORDER;

  let lastError: unknown = null;

  for (const provider of order) {
    try {
      const text = await provider.call(prompt, messages);
      return { text, modelUsed: provider.name, cost: provider.cost };
    } catch (err) {
      console.error(`Provider ${provider.name} gagal, mencoba provider berikutnya:`, err);
      lastError = err;
      continue;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Semua provider AI gagal merespons.");
}

export async function POST(req: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }
    const userId = session.userId;

    const { modelSelected, messages, prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Pesan tidak boleh kosong." }, { status: 400 });
    }

    // 0. Rate limiting per user untuk mencegah abuse endpoint AI
    const rateLimit = applyRateLimit(userId);
    if (!rateLimit.success) {
      return rateLimit.errorResponse!;
    }

    // 1. Validasi Kredit User di DB
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.credits < 5) {
      return NextResponse.json(
        { error: "Kredit tidak mencukupi atau user tidak ditemukan." },
        { status: 403 }
      );
    }

    // 2. Petakan pilihan model dari frontend ke nama provider internal.
    // gpt-4o / claude-3-5-sonnet / deepseek-r1 masih dipetakan ke Gemini
    // sampai API key masing-masing tersedia.
    const modelKey = modelSelected?.toLowerCase();
    const preferredMap: Record<string, ProviderName> = {
      gemini: "gemini",
      groq: "groq",
      "groq-llama": "groq",
      "gpt-oss": "groq",
      grok: "grok",
      "grok-4.3": "grok",
    };
    const preferred: ProviderName | undefined = preferredMap[modelKey] ?? "gemini";

    // 3. Panggil provider yang dipilih; kalau gagal, otomatis fallback
    // ke provider lain sampai berhasil.
    const { text: aiResponseText, modelUsed, cost: calculatedCost } = await callWithFallback(
      preferred,
      prompt,
      messages
    );

    // 4. Potong Kredit dan Masukkan ke Riwayat Log Menggunakan Prisma Transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: calculatedCost } },
      }),
      prisma.aIHistoryLog.create({
        data: {
          userId,
          studioType: "CHAT",
          modelUsed, // dicatat provider yang BENAR-BENAR dipakai (bisa beda dari yang diminta kalau ada fallback)
          promptInput: prompt || JSON.stringify(messages),
          outputData: aiResponseText,
          creditsUsed: calculatedCost,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      text: aiResponseText,
      modelUsed,
      creditsRemaining: user.credits - calculatedCost,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
