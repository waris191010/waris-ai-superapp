// src/app/api/chat/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { applyRateLimit } from "@/lib/rate-limit";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }
    const userId = session.userId;

    const { modelSelected, messages, prompt } = await req.json();

    // 0. Rate limiting per user untuk mencegah abuse endpoint AI
    const rateLimit = applyRateLimit(userId);
    if (!rateLimit.success) {
      return rateLimit.errorResponse!;
    }

    // 1. Validasi Kredit User di DB
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.credits < 5) {
      return NextResponse.json({ error: "Kredit tidak mencukupi atau user tidak ditemukan." }, { status: 403 });
    }

    let aiResponseText = "";
    let calculatedCost = 2.0; // Biaya default per hit token

    // 2. Dynamic Routing API Berdasarkan Pilihan Model User (Sesuai Konsep V3/V4)
    switch (modelSelected.toLowerCase()) {
      case "gpt-4o":
        // Panggil endpoint SDK OpenAI
        // const openaiResponse = await openai.chat.completions.create({...})
        aiResponseText = "[Mock Respon OpenAI] Ini adalah hasil jawaban terstruktur dari GPT-4o.";
        calculatedCost = 5.0;
        break;
        
      case "claude-3-5-sonnet":
        // Panggil SDK Anthropic
        aiResponseText = "[Mock Respon Anthropic] Ini adalah hasil respon analitis mendalam dari Claude 3.5.";
        calculatedCost = 6.0;
        break;

      case "deepseek-r1":
        // Panggil endpoint deepseek router API
        aiResponseText = "<thought>Proses berpikir logika</thought>[Mock Respon DeepSeek] Hasil komputasi final.";
        calculatedCost = 1.0; // DeepSeek jauh lebih hemat
        break;

      default:
        return NextResponse.json({ error: "Model AI tidak didukung" }, { status: 400 });
    }

    // 3. Potong Kredit dan Masukkan ke Riwayat Log Menggunakan Prisma Transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { credits: { decrement: calculatedCost } }
      }),
      prisma.aIHistoryLog.create({
        data: {
          userId,
          studioType: "CHAT",
          modelUsed: modelSelected,
          promptInput: prompt || JSON.stringify(messages),
          outputData: aiResponseText,
          creditsUsed: calculatedCost
        }
      })
    ]);

    return NextResponse.json({ 
      success: true, 
      text: aiResponseText, 
      creditsRemaining: user.credits - calculatedCost 
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
