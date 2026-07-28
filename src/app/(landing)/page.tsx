// src/app/(landing)/page.tsx
"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Bot, Image, Video, Code, Music, ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
      {/* Background Effect: Simulated Neural Network Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f293710_1px,transparent_1px),linear-gradient(to_bottom,#1f293710_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      
      {/* Glow Ambient */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-brand-electric/10 blur-[150px] rounded-full pointer-events-none" />

      {/* HERO SECTION */}
      <header className="container mx-auto px-6 pt-24 pb-16 text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-navy/80 border border-brand-electric/30 mb-6 backdrop-blur-md"
        >
          <span className="w-2 h-2 rounded-full bg-brand-electric animate-ping" />
          <span className="text-xs font-semibold tracking-wider uppercase text-brand-electric">⚡ AI Super App — Satu Platform</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-r from-white via-slate-200 to-brand-electric bg-clip-text text-transparent"
        >
          WARIS AI
          <span className="block text-2xl md:text-3xl font-medium mt-4 text-slate-400">
            Semua AI Terbaik Dunia Dalam Satu Ekosistem Terpadu
          </span>
        </motion.h1>

        <p className="max-w-2xl mx-auto text-slate-400 md:text-lg mb-10">
          Akses GPT, Claude, Gemini, DeepSeek, Flux, Runway, hingga Suno secara instan melalui satu akun dan satu tagihan terpusat.
        </p>

        <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button asChild size="lg" className="bg-brand-electric text-black hover:bg-brand-electric/90 shadow-neon font-bold px-8">
            <Link href="/register">Mulai Gratis <ArrowRight className="ml-2 w-5 h-5" /></Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="border-slate-700 bg-card hover:bg-slate-900/50">
            <Link href="#demo">Lihat Demo Dashboard</Link>
          </Button>
        </div>
      </header>

      {/* STATS SECTION */}
      <section className="container mx-auto px-6 py-12 relative z-10 border-y border-slate-900 bg-brand-navy/30 backdrop-blur-sm">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
          {[
            { value: "500+", label: "AI Tools Integrated" },
            { value: "100+", label: "Koleksi Model Utama" },
            { value: "50+", label: "AI Autonomous Agents" },
            { value: "10K+", label: "Pengguna Global" },
            { value: "99.9%", label: "Uptime Sistem Guaranteed" }
          ].map((stat, i) => (
            <div key={i} className="p-4">
              <div className="text-2xl md:text-3xl font-bold text-brand-gold">{stat.value}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CORE HUB / LAYANAN MATRIX */}
      <section className="container mx-auto px-6 py-20 relative z-10">
        <h2 className="text-3xl font-bold text-center mb-12">Modular Hub Studio Utama</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ServiceCard icon={<Bot className="text-brand-electric" />} title="AI Chat Multi-Model" items={["GPT-4o", "Claude 3.5 Sonnet", "DeepSeek R1", "Gemini Pro"]} />
          <ServiceCard icon={<Image className="text-purple-400" />} title="Image Creator Studio" items={["Text to Image", "Flux.1 Premium", "Inpainting & Expand", "Face Swap"]} />
          <ServiceCard icon={<Video className="text-emerald-400" />} title="Video Engine & Subtitle" items={["Text to Video", "Runway Gen-3", "Lipsync Avatar", "Auto Subtitle"]} />
          <ServiceCard icon={<Code className="text-brand-gold" />} title="Coding Workspace" items={["React/NextJS Builder", "Database Designer", "API Generator", "GitHub Sync"]} />
          <ServiceCard icon={<Music className="text-pink-400" />} title="Audio & Music Laboratory" items={["Text to Music (Suno)", "Voice Cloning", "Podcast Engine", "AI Dubbing"]} />
          <ServiceCard icon={<Zap className="text-amber-500" />} title="AI Agents & Automation" items={["Marketplace Agent", "SaaS Automation Workflow", "Prompt Library Pack", "Team Space"]} />
        </div>
      </section>
      {/* DEMO SECTION */}
        <section id="demo" className="container mx-auto px-6 py-20 relative z-10 text-center">
          <h2 className="text-3xl font-bold mb-6">Demo Dashboard</h2>
          <div className="max-w-3xl mx-auto p-10 rounded-2xl bg-card border border-card-border">
            <p className="text-slate-400">
              Demo dashboard akan segera hadir di sini. Nantikan tampilan lengkapnya!
            </p>
          </div>
        </section>
    </div>
  );
}

function ServiceCard({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-card-border backdrop-blur-md hover:border-brand-electric/40 transition-all duration-300 group hover:shadow-neon">
      <div className="w-12 h-12 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-white">{title}</h3>
      <ul className="space-y-2">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm text-slate-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-brand-electric shrink-0" /> {item}
          </li>
        ))}
      </ul>
    </div>
  );
}
