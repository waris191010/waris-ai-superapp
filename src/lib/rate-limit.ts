import { NextResponse } from "next/server";

// Simulasi in-memory cache/Redis untuk melacak hit rate-limiting secara real-time
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export function applyRateLimit(userId: string, maxRequests: number = 60, windowMs: number = 60000) {
  const now = Date.now();
  const userRecord = rateLimitMap.get(userId);

  if (!userRecord || now > userRecord.resetTime) {
    // Inisialisasi ulang jika data user belum ada atau masa window waktu sudah habis
    rateLimitMap.set(userId, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxRequests - 1 };
  }

  if (userRecord.count >= maxRequests) {
    return {
      success: false,
      remaining: 0,
      errorResponse: NextResponse.json(
        { error: "Terlalu banyak permintaan (Too Many Requests). Silakan coba beberapa saat lagi." },
        { 
          status: 429,
          headers: { "Retry-After": Math.ceil((userRecord.resetTime - now) / 1000).toString() }
        }
      )
    };
  }

  userRecord.count += 1;
  return { success: true, remaining: maxRequests - userRecord.count };
}
