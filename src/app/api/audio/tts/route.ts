import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const maxDuration = 30;

async function generateSpeech(text: string, lang: string): Promise<string> {
  // Layanan TTS gratis (tanpa API key). Batas ~200 karakter per permintaan.
  const cleanText = text.slice(0, 200);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&q=${encodeURIComponent(
    cleanText
  )}&tl=${lang}`;

  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Referer: "https://translate.google.com/",
    },
  });

  if (!res.ok) {
    throw new Error("Layanan TTS gagal merespons. Coba lagi beberapa saat lagi.");
  }

  const arrayBuffer = await res.arrayBuffer();
  if (arrayBuffer.byteLength < 200) {
    throw new Error("Layanan TTS tidak mengembalikan audio yang valid.");
  }
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  return `data:audio/mpeg;base64,${base64}`;
}

export async function POST(req: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }

    const { text, lang } = await req.json();
    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Teks tidak boleh kosong." }, { status: 400 });
    }

    const targetLang = lang === "en" ? "en" : "id";
    const audioUrl = await generateSpeech(text.trim(), targetLang);

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error("TTS generate error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
