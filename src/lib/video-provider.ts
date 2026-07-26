// src/lib/video-provider.ts
const PROVIDER_BASE_URL = "https://api.aimlapi.com/v2/video/generations";

function getApiKey(): string {
  const key = process.env.XAI_VIDEO_API_KEY;
  if (!key) {
    throw new Error(
      "XAI_VIDEO_API_KEY belum di-set. Daftar dulu di https://aimlapi.com untuk dapat API key, lalu tambahkan sebagai environment variable."
    );
  }
  return key;
}

export interface CreateVideoJobInput {
  prompt: string;
  imageUrl?: string;
  durationSeconds?: number;
}

export interface CreateVideoJobResult {
  jobId: string;
}

export interface VideoJobStatus {
  status: "queued" | "generating" | "completed" | "error";
  videoUrl?: string;
  errorMessage?: string;
}

export async function createVideoJob(
  input: CreateVideoJobInput
): Promise<CreateVideoJobResult> {
  const res = await fetch(PROVIDER_BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "x-ai/grok-imagine-video",
      prompt: input.prompt,
      image_url: input.imageUrl || undefined,
      duration: String(input.durationSeconds ?? 6),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Gagal membuat permintaan video ke provider (status ${res.status}). ${errorText}`
    );
  }

  const data = await res.json();
  const jobId = data.id ?? data.generation_id ?? data.request_id;
  if (!jobId) {
    throw new Error("Provider tidak mengembalikan ID tugas video.");
  }
  return { jobId };
}

export async function getVideoJobStatus(
  jobId: string
): Promise<VideoJobStatus> {
  const res = await fetch(`${PROVIDER_BASE_URL}/${jobId}`, {
    headers: { Authorization: `Bearer ${getApiKey()}` },
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Gagal mengambil status video (status ${res.status}). ${errorText}`
    );
  }

  const data = await res.json();
  const rawStatus = String(data.status ?? "").toLowerCase();

  if (rawStatus === "completed" || rawStatus === "succeeded") {
    return {
      status: "completed",
      videoUrl: data.video?.url ?? data.output?.video_url ?? data.url,
    };
  }
  if (rawStatus === "error" || rawStatus === "failed") {
    return {
      status: "error",
      errorMessage: data.error ?? "Video gagal dibuat oleh provider.",
    };
  }
  if (rawStatus === "generating" || rawStatus === "processing") {
    return { status: "generating" };
  }
  return { status: "queued" };
}
