// src/app/api/auth/register/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  hashPassword,
  signSessionToken,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email tidak valid." }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 6) {
      return NextResponse.json(
        { error: "Kata sandi minimal 6 karakter." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email sudah terdaftar. Silakan masuk." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: typeof name === "string" && name.trim() ? name.trim() : null,
        passwordHash,
      },
    });

    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        currentPlan: user.currentPlan,
      },
    });
    response.cookies.set(AUTH_COOKIE_NAME, token, AUTH_COOKIE_OPTIONS);
    return response;
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi." },
      { status: 500 }
    );
  }
}
