// src/app/dashboard/layout.tsx
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, MessageSquare, Image, Video, Mic, Music, Code, 
  FileText, Bot, Library, ShoppingCart, Users, Database, Settings, Menu, X, Wallet, LogOut 
} from "lucide-react";

interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  credits: number;
  currentPlan: string;
}

const navigationItems = [
  { group: "Core Studio", items: [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "AI Chat", href: "/dashboard/chat", icon: MessageSquare },
    { name: "Image Studio", href: "/dashboard/image", icon: Image },
    { name: "Video Studio", href: "/dashboard/video", icon: Video },
    { name: "Voice Studio", href: "/dashboard/voice", icon: Mic },
    { name: "Music Studio", href: "/dashboard/music", icon: Music },
    { name: "Coding Studio", href: "/dashboard/coding", icon: Code },
  ]},
  { group: "Enterprise Modules", items: [
    { name: "Office & PDF AI", href: "/dashboard/office", icon: FileText },
    { name: "AI Agents Hub", href: "/dashboard/agents", icon: Bot },
    { name: "Prompt Library", href: "/dashboard/prompts", icon: Library },
    { name: "Marketplace", href: "/dashboard/marketplace", icon: ShoppingCart },
  ]},
  { group: "Management", items: [
    { name: "Team Workspace", href: "/dashboard/team", icon: Users },
    { name: "Storage & Logs", href: "/dashboard/storage", icon: Database },
    { name: "Settings", href: "/dashboard/settings", icon: Settings },
  ]}
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? "..";

  return (
    <div className="flex h-screen bg-[#020617] text-slate-100 overflow-hidden">
      {/* SIDEBAR COMPONENT */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#090d20] border-r border-slate-900 transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:inset-0 transition-transform duration-300 ease-in-out flex flex-col`}>
        {/* LOGO AREA */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-900 bg-brand-navy">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black bg-gradient-to-r from-brand-electric to-brand-gold bg-clip-text text-transparent tracking-widest">WARIS AI</span>
          </Link>
          <button className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SIDEBAR MENU SCROLLABLE */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {navigationItems.map((group, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="px-3 text-[10px] font-bold tracking-widest text-slate-500 uppercase">{group.group}</h4>
              {group.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                      isActive 
                        ? "bg-brand-electric/10 text-brand-electric border border-brand-electric/20 font-semibold" 
                        : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${isActive ? "text-brand-electric" : "text-slate-400"}`} />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* PROFILE / FOOTER DATA SIDEBAR */}
        <div className="p-4 border-t border-slate-900 bg-[#060a1a]">
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-brand-gold" />
              <div className="text-xs">
                <p className="text-slate-400">Sisa Kredit</p>
                <p className="font-bold text-brand-gold">
                  {user ? `${user.credits.toLocaleString("id-ID")} Cr` : "..."}
                </p>
              </div>
            </div>
            <span className="text-[10px] bg-brand-electric/10 text-brand-electric px-2 py-0.5 rounded-md border border-brand-electric/20">
              {user?.currentPlan ?? "..."}
            </span>
          </div>
        </div>
      </aside>

      {/* RENDER BODY DASHBOARD */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* HEADER TOPBAR */}
        <header className="h-16 border-b border-slate-900 bg-[#040817] flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <button className="lg:hidden text-slate-400" onClick={() => setSidebarOpen(true)}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden md:flex max-w-md w-80 relative">
              <input 
                type="text" 
                placeholder="Cari AI Model, template, atau prompt..." 
                className="w-full bg-slate-950 border border-slate-900 rounded-xl px-4 py-1.5 text-xs focus:outline-none focus:border-brand-electric/50 text-slate-300"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-brand-gold/20 border border-brand-gold flex items-center justify-center text-xs font-bold text-brand-gold">
              {initials}
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-red-400 transition-colors"
              title="Keluar"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* INTERFACE CONTENT CONTAINER */}
        <main className="flex-1 overflow-y-auto bg-background p-6 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
