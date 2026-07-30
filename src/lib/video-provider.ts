// src/lib/video-provider.ts
const KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs";

function getApiKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    throw new Error(
      "KIE_API_KEY belum di-set. Tambahkan sebagai environment variable di Netlify."
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
  // Pakai Grok Imagine: text-to-video kalau tidak ada gambar,
  // image-to-video kalau ada imageUrl.
  const model = input.imageUrl
    ? "grok-imagine/image-to-video"
    : "grok-imagine/text-to-video";

  const res = await fetch(`${KIE_BASE_URL}/createTask`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: {
        prompt: input.prompt,
        ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
        duration: String(input.durationSeconds ?? 6),
      },
    }),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Gagal membuat permintaan video ke provider (status ${res.status}). ${errorText}`
    );
  }

  const data = await res.json();
  const jobId = data?.data?.taskId;
  if (!jobId) {
    throw new Error("Provider tidak mengembalikan ID tugas video.");
  }
  return { jobId };
}

export async function getVideoJobStatus(
  jobId: string
): Promise<VideoJobStatus> {
  const res = await fetch(
    `${KIE_BASE_URL}/recordInfo?taskId=${encodeURIComponent(jobId)}`,
    {
      headers: { Authorization: `Bearer ${getApiKey()}` },
    }
  );

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Gagal mengambil status video (status ${res.status}). ${errorText}`
    );
  }

  const data = await res.json();
  const state = String(data?.data?.state ?? "").toLowerCase();

  if (state === "success") {
    let videoUrl: string | undefined;
    try {
      const result = JSON.parse(data?.data?.resultJson ?? "{}");
      videoUrl = result?.resultUrls?.[0];
    } catch {
      // resultJson tidak valid, biarkan videoUrl undefined
    }
    return { status: "completed", videoUrl };
  }

  if (state === "fail") {
    return {
      status: "error",
      errorMessage: data?.data?.failMsg || "Video gagal dibuat oleh provider.",
    };
  }

  if (state === "generating") {
    return { status: "generating" };
  }

  // "waiting" / "queuing" / lainnya
  return { status: "queued" };
}
