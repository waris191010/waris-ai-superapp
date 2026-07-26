# WARIS AI Super App

Aplikasi Next.js 14 (App Router + TypeScript + Tailwind + Prisma) hasil rakitan dari
potongan-potongan kode yang sebelumnya diberikan secara terpisah (landing page, layout
dashboard, API route chat, schema Prisma, rate limiter, hook streaming, Dockerfile, dll).
Bagian yang belum ada di potongan kode asli (package.json, root layout, halaman-halaman
studio, komponen Button, dsb.) dilengkapi seperlunya agar proyek ini bisa langsung
di-`npm install` dan di-deploy.

## Struktur proyek

```
waris-ai-superapp/
├── prisma/schema.prisma        # Model User, Workspace, AIHistoryLog, Transaction, dll
├── public/brand/                # Logo & aset statis
├── src/
│   ├── app/
│   │   ├── (landing)/page.tsx   # Landing page publik
│   │   ├── (auth)/login|register/page.tsx
│   │   ├── dashboard/           # layout.tsx (sidebar+topbar) + halaman tiap studio AI
│   │   └── api/chat/route.ts    # Endpoint chat multi-model (potong kredit + log)
│   ├── components/ui/button.tsx # Komponen Button ala shadcn/ui
│   ├── hooks/use-ai-stream.ts   # Hook simulasi streaming respons AI
│   └── lib/
│       ├── prisma.ts            # Prisma client singleton
│       ├── rate-limit.ts        # Rate limiter in-memory per user
│       └── utils.ts             # Helper cn() untuk merge class Tailwind
├── tests/billing.test.ts        # Contoh unit test skenario potong kredit
├── Dockerfile                   # Opsional, untuk self-hosting di luar Vercel
└── .env.example
```

## Menjalankan secara lokal

```bash
npm install
cp .env.example .env      # isi DATABASE_URL dan variabel lain
npx prisma db push        # sinkronkan schema ke database PostgreSQL
npm run dev
```

Buka http://localhost:3000.

## Environment variables

| Variabel | Keterangan |
|---|---|
| `DATABASE_URL` | Connection string PostgreSQL (Prisma) |
| `NEXT_PUBLIC_APP_URL` | Base URL publik aplikasi |
| `STRIPE_SECRET_KEY` | Secret key Stripe (jika memakai pembayaran Stripe) |
| `MIDTRANS_SERVER_KEY` | Server key Midtrans (jika memakai pembayaran Midtrans) |

**Jangan commit file `.env`** — hanya `.env.example` yang boleh masuk git.

## Deploy ke Vercel

1. Push folder ini ke sebuah repo Git (GitHub/GitLab/Bitbucket).
2. Di Vercel, klik **Add New Project** dan pilih repo tersebut. Vercel otomatis
   mendeteksi framework Next.js — tidak perlu setting build command khusus
   (`npm run build` sudah otomatis, dan `postinstall` akan menjalankan
   `prisma generate`).
3. Di **Project Settings → Environment Variables**, tambahkan variabel yang sama
   seperti di `.env.example` (gunakan database production, bukan `localhost`).
   Disarankan memakai provider Postgres serverless seperti Neon, Supabase, atau
   Vercel Postgres.
4. Setelah database production siap, jalankan sinkronisasi schema sekali dari
   lokal (mengarah ke `DATABASE_URL` production) atau lewat CI:
   ```bash
   npx prisma db push
   ```
5. Klik **Deploy**.

> Dockerfile yang disertakan bersifat opsional — dipakai hanya jika Anda ingin
> self-host di luar Vercel (misalnya di VPS/registry container). Untuk deploy
> ke Vercel, Dockerfile ini tidak digunakan sama sekali.

## Catatan implementasi

- Endpoint `POST /api/chat` saat ini mengembalikan respons **mock** untuk setiap
  model (`gpt-4o`, `claude-3-5-sonnet`, `deepseek-r1`) — ganti bagian tersebut
  dengan pemanggilan SDK/API asli masing-masing provider saat siap produksi.
- Rate limiting di `src/lib/rate-limit.ts` memakai `Map` in-memory, sehingga
  hanya efektif per instance server. Untuk deployment serverless multi-instance
  di Vercel, ganti dengan store terpusat (mis. Upstash Redis) jika traffic tinggi.
- Halaman studio (`chat`, `image`, `video`, `voice`, `music`, `coding`,
  `marketplace`) masih berupa placeholder — siap dikembangkan lebih lanjut.
- Jalankan `npm test` untuk menjalankan `tests/billing.test.ts` (skenario potong
  kredit & validasi saldo minimum).
