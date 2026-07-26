// src/app/api/video/status/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";
import { getVideoJobStatus } from "@/lib/video-provider";

export async function GET(req: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    const session = token ? await verifySessionToken(token) : null;
    if (!session) {
      return NextResponse.json({ error: "Silakan masuk terlebih dahulu." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const jobId = searchParams.get("jobId");
    const prompt = searchParams.get("prompt") ?? "";
    if (!jobId) {
      return NextResponse.json({ error: "jobId wajib disertakan." }, { status: 400 });
    }

    const result = await getVideoJobStatus(jobId);

    if (result.status === "completed" && result.videoUrl) {
      await prisma.aIHistoryLog.create({
        data: {
          userId: session.userId,
          studioType: "VIDEO",
          modelUsed: "grok-imagine-video",
          promptInput: prompt,
          outputData: result.videoUrl,
          creditsUsed: 50,
        },
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Video status error:", error);
    const message = error instanceof Error ? error.message : "Terjadi kesalahan pada server.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
