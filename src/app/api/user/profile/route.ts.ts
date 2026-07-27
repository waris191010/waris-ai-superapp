// src/app/api/user/profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const token = cookies().get(AUTH_COOKIE_NAME)?.value;
    if (!token) {
      return NextResponse.json({ message: "Belum masuk." }, { status: 401 });
    }

    const session = await verifySessionToken(token);
    if (!session) {
      return NextResponse.json({ message: "Sesi tidak valid." }, { status: 401 });
    }

    const { name, email } = await req.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { message: "Nama tidak boleh kosong." },
        { status: 400 }
      );
    }
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { message: "Email tidak valid." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Kalau email diganti, pastikan belum dipakai user lain.
    if (normalizedEmail !== session.email) {
      const existing = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existing && existing.id !== session.userId) {
        return NextResponse.json(
          { message: "Email sudah dipakai akun lain." },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        name: name.trim(),
        email: normalizedEmail,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({ user: updated });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server. Coba lagi." },
      { status: 500 }
    );
  }
}
