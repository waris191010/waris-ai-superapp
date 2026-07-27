// src/app/api/user/password/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  AUTH_COOKIE_NAME,
  verifySessionToken,
  verifyPassword,
  hashPassword,
} from "@/lib/auth";

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

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: "Semua kolom wajib diisi." },
        { status: 400 }
      );
    }
    if (typeof newPassword !== "string" || newPassword.length < 6) {
      return NextResponse.json(
        { message: "Kata sandi baru minimal 6 karakter." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });
    if (!user) {
      return NextResponse.json({ message: "Akun tidak ditemukan." }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { message: "Password saat ini salah." },
        { status: 401 }
      );
    }

    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newPasswordHash },
    });

    return NextResponse.json({ message: "Password berhasil diubah." });
  } catch (error) {
    console.error("Update password error:", error);
    return NextResponse.json(
      { message: "Terjadi kesalahan pada server. Coba lagi." },
      { status: 500 }
    );
  }
}
