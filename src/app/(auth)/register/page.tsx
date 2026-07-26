// src/app/(auth)/register/page.tsx
"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Gagal mendaftar. Coba lagi.");
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Tidak bisa terhubung ke server. Periksa koneksi internet kamu.");
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm p-8 rounded-2xl bg-card border border-card-border backdrop-blur-md">
        <h1 className="text-2xl font-bold text-white mb-1">Buat Akun WARIS AI</h1>
        <p className="text-sm text-slate-400 mb-6">Mulai gratis dengan 1000 kredit awal.</p>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nama</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-electric/50"
              placeholder="Nama lengkap"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-electric/50"
              placeholder="nama@email.com"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Kata Sandi</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-electric/50"
              placeholder="Minimal 6 karakter"
            />
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Memproses..." : "Daftar"}
          </Button>
        </form>

        <p className="text-xs text-slate-500 text-center mt-6">
          Sudah punya akun?{" "}
          <Link href="/login" className="text-brand-electric hover:underline">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
