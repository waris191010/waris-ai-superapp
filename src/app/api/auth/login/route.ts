// src/app/api/auth/login/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  AUTH_COOKIE_OPTIONS,
  signSessionToken,
  verifyPassword,
} from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email dan kata sandi wajib diisi." },
        { status: 400 }
      );
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Pesan error sengaja dibuat generik (tidak bilang "email tidak ditemukan"
    // vs "password salah") supaya tidak membocorkan email mana yang terdaftar.
    if (!user) {
      return NextResponse.json(
        { error: "Email atau kata sandi salah." },
        { status: 401 }
      );
    }

    const isPasswordValid = await verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Email atau kata sandi salah." },
        { status: 401 }
      );
    }

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
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan pada server. Coba lagi." },
      { status: 500 }
    );
  }
}
