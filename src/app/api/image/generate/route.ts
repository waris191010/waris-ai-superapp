// src/app/api/image/generate/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const maxDuration = 30;

async function generateWithPollinations(prompt: string): Promise<string> {
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1280&height=720&nologo=true`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Gagal generate gambar dari Pollinations.");
  const arrayBuffer = await res.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const contentType = res.headers.get("content-type") || "image/jpeg";
  return `data:${contentType};base64,${base64}`;
}

async function generateWithGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY belum di-set di Vercel.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-preview-image-generation:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    }
  );
  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData);
  if (!imagePart) {
    throw new Error(data?.error?.message || "Gemini tidak mengembalikan gambar.");
  }
  const mimeType = imagePart.inlineData.mimeType || "image/png";
  const base64 = imagePart.inlineData.data;
  return `data:${mimeType};base64,${base64}`;
}

export async function POST(req: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }

    const { prompt, provider } = await req.json();
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt tidak boleh kosong." }, { status: 400 });
    }

    let imageUrl: string;
    if (provider === "gemini") {
      imageUrl = await generateWithGemini(prompt.trim());
    } else {
      imageUrl = await generateWithPollinations(prompt.trim());
    }

    return NextResponse.json({ imageUrl });
  } catch (error) {
    console.error("Image generate error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
