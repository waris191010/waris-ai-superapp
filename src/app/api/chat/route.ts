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

    let aiResponseText = "";
    let calculatedCost = 2.0; // Biaya default per hit token

    // 2. Semua pilihan model untuk sementara diarahkan ke Gemini (satu-satunya API key yang aktif).
    // Nanti kalau sudah punya API key OpenAI/Anthropic/DeepSeek, tinggal tambahkan pemanggilan
    // SDK masing-masing di dalam case yang sesuai, menggantikan pemanggilan Gemini di bawah ini.
    switch (modelSelected?.toLowerCase()) {
      case "gpt-4o":
        aiResponseText = await callGemini(prompt, messages);
        calculatedCost = 5.0;
        break;

      case "claude-3-5-sonnet":
        aiResponseText = await callGemini(prompt, messages);
        calculatedCost = 6.0;
        break;

      case "deepseek-r1":
        aiResponseText = await callGemini(prompt, messages);
        calculatedCost = 1.0;
        break;

      case "gemini":
      default:
        aiResponseText = await callGemini(prompt, messages);
        calculatedCost = 2.0;
        break;
    }

    // 3. Potong Kredit dan Masukkan ke Riwayat Log Menggunakan Prisma Transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: calculatedCost } },
      }),
      prisma.aIHistoryLog.create({
        data: {
          userId,
          studioType: "CHAT",
          modelUsed: modelSelected || "gemini",
          promptInput: prompt || JSON.stringify(messages),
          outputData: aiResponseText,
          creditsUsed: calculatedCost,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      text: aiResponseText,
      creditsRemaining: user.credits - calculatedCost,
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
