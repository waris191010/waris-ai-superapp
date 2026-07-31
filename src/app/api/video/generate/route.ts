// src/app/api/video/generate/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { createGrokVideoTask } from "@/lib/video-provider";

export const maxDuration = 60;

const VIDEO_GENERATION_COST = 50;

async function resolveImageUrl(rawImageUrl: unknown): Promise<string | undefined> {
  if (typeof rawImageUrl !== "string" || !rawImageUrl.trim()) return undefined;
  const value = rawImageUrl.trim();

  if (value.startsWith("data:")) {
    const match = value.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      throw new Error("Format gambar tidak dikenali.");
    }
    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");
    const ext = mimeType.split("/")[1] || "png";
    const blob = await put(`video-refs/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`, buffer, {
      access: "public",
      contentType: mimeType,
    });
    return blob.url;
  }

  return value;
}

export async function POST(req: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }

    const { prompt, imageUrl, durationSeconds } = await req.json();
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "Prompt tidak boleh kosong." }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: "User tidak ditemukan." }, { status: 404 });
    }
    if (user.credits < VIDEO_GENERATION_COST) {
      return NextResponse.json(
        { error: `Kredit tidak cukup. Butuh ${VIDEO_GENERATION_COST} kredit.` },
        { status: 403 }
      );
    }

    const resolvedImageUrl = await resolveImageUrl(imageUrl);

    const job = await createGrokVideoTask({
      prompt: prompt.trim(),
      imageUrl: resolvedImageUrl,
      durationSeconds: typeof durationSeconds === "number" ? durationSeconds : 6,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: VIDEO_GENERATION_COST } },
    });

    return NextResponse.json({ jobId: job.taskId, creditsCharged: VIDEO_GENERATION_COST });
  } catch (error) {
    console.error("Video generate error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
