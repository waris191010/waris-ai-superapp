import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME = "waris_session";

// Umur sesi login: 7 hari
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

function getJwtSecretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET belum di-set di environment variables. Tambahkan JWT_SECRET di .env (lokal) dan di Vercel Project Settings."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
  name: string | null;
}

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plainPassword, salt);
}

export async function verifyPassword(
  plainPassword: string,
  passwordHash: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export const AUTH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};
