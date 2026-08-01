// src/app/api/video/avatar-generate/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export const maxDuration = 60;

const DID_API_BASE = "https://api.d-id.com";

function getDidAuthHeader(): string {
  const key = process.env.DID_API_KEY;
  if (!key) {
    throw new Error("DID_API_KEY belum di-set di Vercel Environment Variables.");
  }
  return `Basic ${key}`;
}

// Upload gambar (data URL base64 atau URL biasa) ke D-ID supaya dapat source_url
// yang bisa dipakai untuk generate video avatar.
async function ensurePublicImageUrl(image: string): Promise<string> {
  // Kalau sudah berupa URL http(s), D-ID bisa langsung pakai itu sebagai source_url.
  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  // Parse data URL base64, contoh: data:image/png;base64,xxxxx
  const match = image.match(/^data:(image\/[a-zA-Z]+);base64,(.+)$/);
  if (!match) {
    throw new Error(
      "Format gambar tidak dikenali. Harus berupa URL gambar atau data URL base64 (image/jpeg atau image/png)."
    );
  }
  const mimeType = match[1];
  const base64Data = match[2];
  const buffer = Buffer.from(base64Data, "base64");
  const ext = mimeType.split("/")[1] || "png";

  // D-ID Images API wajib pakai multipart/form-data, bukan JSON.
  const formData = new FormData();
  const blob = new Blob([buffer], { type: mimeType });
  formData.append("image", blob, `avatar.${ext}`);

  const res = await fetch(`${DID_API_BASE}/images`, {
    method: "POST",
    headers: {
      Authorization: getDidAuthHeader(),
}

async function createTalk(sourceUrl: string, script: string, voiceId: string) {
  const res = await fetch(`${DID_API_BASE}/talks`, {
    method: "POST",
    headers: {
      Authorization: getDidAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source_url: sourceUrl,
      script: {
        type: "text",
        input: script,
        provider: {
          type: "microsoft",
          voice_id: voiceId,
        },
      },
      config: { fluent: true, pad_audio: 0 },
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.description || data?.message || "Gagal membuat talk di D-ID.");
  }
  return data.id as string;
}

async function pollTalkResult(talkId: string, maxAttempts = 25, delayMs = 2000) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const res = await fetch(`${DID_API_BASE}/talks/${talkId}`, {
      headers: { Authorization: getDidAuthHeader() },
    });
    const data = await res.json();

    if (data.status === "done") {
      return data.result_url as string;
    }
    if (data.status === "error" || data.status === "rejected") {
      throw new Error(data?.error?.description || "D-ID gagal generate video avatar.");
    }

    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(
    "Video avatar belum selesai dalam waktu yang wajar. Coba cek status manual pakai talkId yang dikembalikan."
  );
}

export async function POST(req: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }

    const { image, script, voiceId } = await req.json();

    if (!image || typeof image !== "string") {
      return NextResponse.json(
        { error: "Gambar avatar wajib diisi (upload foto atau pakai hasil Generate Gambar AI)." },
        { status: 400 }
      );
    }
    if (!script || typeof script !== "string" || !script.trim()) {
      return NextResponse.json(
        { error: "Naskah/narasi avatar tidak boleh kosong." },
        { status: 400 }
      );
    }

    const sourceUrl = await ensurePublicImageUrl(image);
    const talkId = await createTalk(
      sourceUrl,
      script.trim(),
      voiceId || "id-ID-GadisNeural"
    );
    const videoUrl = await pollTalkResult(talkId);

    return NextResponse.json({ videoUrl, talkId });
  } catch (error) {
    console.error("Avatar generate error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
