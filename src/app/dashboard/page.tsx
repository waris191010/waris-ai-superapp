// src/app/dashboard/page.tsx
import { MessageSquare, Image as ImageIcon, Video, Mic, Music, Code } from "lucide-react";

const quickActions = [
  { name: "AI Chat", href: "/dashboard/chat", icon: MessageSquare, color: "text-brand-electric" },
  { name: "Image Studio", href: "/dashboard/image", icon: ImageIcon, color: "text-purple-400" },
  { name: "Video Studio", href: "/dashboard/video", icon: Video, color: "text-emerald-400" },
  { name: "Voice Studio", href: "/dashboard/voice", icon: Mic, color: "text-pink-400" },
  { name: "Music Studio", href: "/dashboard/music", icon: Music, color: "text-amber-400" },
  { name: "Coding Studio", href: "/dashboard/coding", icon: Code, color: "text-brand-gold" },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Selamat Datang di WARIS AI</h1>
        <p className="text-slate-400 text-sm mt-1">
          Pilih salah satu studio di bawah untuk mulai bekerja dengan AI.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {quickActions.map((action) => (
          <a
            key={action.name}
            href={action.href}
            className="p-5 rounded-2xl bg-card border border-card-border hover:border-brand-electric/40 transition-colors flex items-center gap-4"
          >
            <div className="w-11 h-11 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-center">
              <action.icon className={`w-5 h-5 ${action.color}`} />
            </div>
            <span className="font-semibold text-white">{action.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
