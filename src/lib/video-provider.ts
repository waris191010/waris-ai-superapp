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

interface ProviderAttempt {
  name: string;
  model: string;
  body: Record<string, unknown>;
}

function buildAttempts(input: CreateVideoJobInput): ProviderAttempt[] {
  const duration = input.durationSeconds ?? 6;

  return [
    {
      name: "Grok Imagine",
      model: input.imageUrl
        ? "grok-imagine/image-to-video"
        : "grok-imagine/text-to-video",
      body: {
        prompt: input.prompt,
        ...(input.imageUrl ? { image_url: input.imageUrl } : {}),
        duration: String(duration),
      },
    },
    {
      name: "Bytedance Seedance 2.0 Fast",
      model: "bytedance/seedance-2-fast",
      body: {
        prompt: input.prompt,
        ...(input.imageUrl ? { first_frame_url: input.imageUrl } : {}),
        resolution: "720p",
        aspect_ratio: "16:9",
        duration,
        generate_audio: false,
      },
    },
  ];
}

export async function createVideoJob(
  input: CreateVideoJobInput
): Promise<CreateVideoJobResult> {
  const attempts = buildAttempts(input);
  const errors: string[] = [];

  for (const attempt of attempts) {
    try {
      const res = await fetch(`${KIE_BASE_URL}/createTask`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getApiKey()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: attempt.model,
          input: attempt.body,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text().catch(() => "");
        errors.push(`${attempt.name} (status ${res.status}): ${errorText}`);
        continue;
      }

      const data = await res.json();
      const jobId = data?.data?.taskId;
      if (!jobId) {
        errors.push(`${attempt.name}: tidak mengembalikan ID tugas.`);
        continue;
      }

      return { jobId };
    } catch (err) {
      errors.push(
        `${attempt.name}: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  throw new Error(
    `Semua provider video gagal.\n${errors.join("\n")}`
  );
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
