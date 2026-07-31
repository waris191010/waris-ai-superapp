const KIE_BASE_URL = "https://api.kie.ai/api/v1/jobs";

function getApiKey(): string {
  const key = process.env.KIE_API_KEY;
  if (!key) {
    throw new Error(
      "KIE_API_KEY belum di-set. Tambahkan sebagai environment variable di Vercel."
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

export async function createGrokVideoTask(input: CreateVideoJobInput): Promise<{ taskId: string }> {
  const key = getApiKey();

  const response = await fetch("https://api.kie.ai/api/v1/jobs/createTask", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-imagine-video-1-5-preview",
      input: {
        prompt: input.prompt,
        image_urls: input.imageUrl ? [input.imageUrl] : [],
        aspect_ratio: "16:9",
        resolution: "480p",
      },
    }),
  });

  const data = await response.json();

  if (data.code !== 200) {
    throw new Error(`Grok video task gagal dibuat: ${data.msg}`);
  }

  return { taskId: data.data.taskId };
}

export async function getGrokVideoTaskStatus(taskId: string): Promise<VideoJobStatus> {
  const key = getApiKey();

  const response = await fetch(`https://api.kie.ai/api/v1/jobs/getTaskDetails?taskId=${taskId}`, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${key}`,
    },
  });

  const data = await response.json();

  if (!data || data.code !== 200 || !data.data) {
    return {
      status: "error",
      errorMessage: (data && (data.msg || data.message)) || `Respons tidak valid dari kie.ai (kode: ${data?.code}).`,
    };
  }

  const taskData = data.data;
  const rawStatus = String(taskData.status || taskData.state || "").toLowerCase();

  let status: VideoJobStatus["status"] = "generating";
  if (rawStatus.includes("complete") || rawStatus.includes("success")) status = "completed";
  else if (rawStatus.includes("fail") || rawStatus.includes("error")) status = "error";
  else if (rawStatus.includes("queue") || rawStatus.includes("wait")) status = "queued";

  return {
    status,
    videoUrl: taskData.videoUrl || taskData.resultUrl || taskData.outputUrl,
    errorMessage: taskData.errorMessage || taskData.failMsg || taskData.msg,
  };
}
