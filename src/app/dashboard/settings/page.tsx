"use client";

import { useEffect, useState } from "react";
import {
  User,
  Lock,
  Palette,
  Bell,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Tab = "profile" | "password" | "theme" | "notifications";

interface UserProfile {
  id: string;
  name: string;
  email: string;
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("profile");

  return (
    <div className="max-w-3xl">
      <h1 className="text-2xl font-bold mb-1">Pengaturan</h1>
      <p className="text-sm text-slate-400 mb-6">
        Kelola profil, keamanan, tampilan, dan notifikasi akun kamu.
      </p>

      <div className="flex gap-2 mb-6 border-b border-card-border overflow-x-auto">
        <TabButton
          active={tab === "profile"}
          onClick={() => setTab("profile")}
          icon={<User className="w-4 h-4" />}
          label="Profil"
        />
        <TabButton
          active={tab === "password"}
          onClick={() => setTab("password")}
          icon={<Lock className="w-4 h-4" />}
          label="Password"
        />
        <TabButton
          active={tab === "theme"}
          onClick={() => setTab("theme")}
          icon={<Palette className="w-4 h-4" />}
          label="Tema"
        />
        <TabButton
          active={tab === "notifications"}
          onClick={() => setTab("notifications")}
          icon={<Bell className="w-4 h-4" />}
          label="Notifikasi"
        />
      </div>

      {tab === "profile" && <ProfileSection />}
      {tab === "password" && <PasswordSection />}
      {tab === "theme" && <ThemeSection />}
      {tab === "notifications" && <NotificationsSection />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition ${
        active
          ? "border-cyan-400 text-cyan-400"
          : "border-transparent text-slate-400 hover:text-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function Alert({
  type,
  message,
}: {
  type: "error" | "success";
  message: string;
}) {
  const isError = type === "error";
  return (
    <div
      className={`flex items-start gap-2 rounded-xl border px-4 py-3 mb-4 ${
        isError
          ? "border-red-500/30 bg-red-500/10"
          : "border-emerald-500/30 bg-emerald-500/10"
      }`}
    >
      {isError ? (
        <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      ) : (
        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
      )}
      <span className="text-sm">{message}</span>
    </div>
  );
}

/* ---------------- Profile ---------------- */

function ProfileSection() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Gagal memuat profil.");
        return res.json();
      })
      .then((data: { user: UserProfile | null }) => {
        setName(data.user?.name ?? "");
        setEmail(data.user?.email ?? "");
      })
      .catch(() => setError("Gagal memuat data profil."))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setError(null);
    setSuccess(null);
    if (!name.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Gagal menyimpan profil.");
      }
      setSuccess("Profil berhasil diperbarui.");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        Memuat profil...
      </div>
    );
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-card-border space-y-4 max-w-lg">
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div>
        <label className="text-sm mb-2 block">Nama</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-black/20 border border-card-border text-sm"
          placeholder="Nama lengkap"
        />
      </div>

      <div>
        <label className="text-sm mb-2 block">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-black/20 border border-card-border text-sm"
          placeholder="email@contoh.com"
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Menyimpan..." : "Simpan Perubahan"}
      </Button>
    </div>
  );
}

/* ---------------- Password ---------------- */

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSuccess(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Semua kolom wajib diisi.");
      return;
    }
    if (newPassword.length < 8) {
      setError("Password baru minimal 8 karakter.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Gagal mengubah password.");
      }
      setSuccess("Password berhasil diubah.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan pada server.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-card-border space-y-4 max-w-lg">
      {error && <Alert type="error" message={error} />}
      {success && <Alert type="success" message={success} />}

      <div>
        <label className="text-sm mb-2 block">Password Saat Ini</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-black/20 border border-card-border text-sm"
        />
      </div>

      <div>
        <label className="text-sm mb-2 block">Password Baru</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-black/20 border border-card-border text-sm"
        />
      </div>

      <div>
        <label className="text-sm mb-2 block">Konfirmasi Password Baru</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full px-3 py-2 rounded-xl bg-black/20 border border-card-border text-sm"
        />
      </div>

      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? "Menyimpan..." : "Ubah Password"}
      </Button>
    </div>
  );
}

/* ---------------- Theme ---------------- */

const THEMES = [
  { id: "dark", label: "Gelap", swatch: "#0b1220" },
  { id: "light", label: "Terang", swatch: "#f4f5f7" },
  { id: "system", label: "Ikuti Sistem", swatch: "linear-gradient(90deg, #0b1220 50%, #f4f5f7 50%)" },
];

function ThemeSection() {
  const [theme, setTheme] = useState<string>("dark");

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("waris-theme") : null;
    if (saved) setTheme(saved);
  }, []);

  function selectTheme(id: string) {
    setTheme(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("waris-theme", id);
    }
  }

  return (
    <div className="p-5 rounded-2xl bg-card border border-card-border max-w-lg">
      <p className="text-sm text-slate-400 mb-4">
        Pilih tampilan yang kamu suka. Perubahan disimpan otomatis di browser ini.
      </p>
      <div className="grid grid-cols-3 gap-3">
        {THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => selectTheme(t.id)}
            className={`rounded-xl border p-3 text-left transition ${
              theme === t.id
                ? "border-cyan-400 ring-1 ring-cyan-400"
                : "border-card-border hover:border-slate-500"
            }`}
          >
            <div
              className="w-full h-12 rounded-lg mb-2 border border-white/10"
              style={{ background: t.swatch }}
            />
            <span className="text-sm">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Notifications ---------------- */

interface NotifPrefs {
  emailUpdates: boolean;
  productNews: boolean;
  usageAlerts: boolean;
}

const DEFAULT_PREFS: NotifPrefs = {
  emailUpdates: true,
  productNews: false,
  usageAlerts: true,
};

function NotificationsSection() {
  const [prefs, setPrefs] = useState<NotifPrefs>(DEFAULT_PREFS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("waris-notif-prefs");
    if (raw) {
      try {
        setPrefs(JSON.parse(raw));
      } catch {
        // ignore malformed data
      }
    }
  }, []);

  function toggle(key: keyof NotifPrefs) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaved(false);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("waris-notif-prefs", JSON.stringify(next));
    }
    setSaved(true);
  }

  const items: { key: keyof NotifPrefs; label: string; desc: string }[] = [
    {
      key: "emailUpdates",
      label: "Update Email",
      desc: "Dapatkan email saat ada aktivitas penting di akun kamu.",
    },
    {
      key: "productNews",
      label: "Berita Produk",
      desc: "Info fitur baru dan pembaruan WARIS AI.",
    },
    {
      key: "usageAlerts",
      label: "Peringatan Pemakaian",
      desc: "Notifikasi saat kuota atau kredit hampir habis.",
    },
  ];

  return (
    <div className="p-5 rounded-2xl bg-card border border-card-border space-y-4 max-w-lg">
      {saved && <Alert type="success" message="Preferensi notifikasi disimpan." />}
      {items.map((item) => (
        <div
          key={item.key}
          className="flex items-center justify-between gap-4 py-2 border-b border-card-border last:border-0"
        >
          <div>
            <p className="text-sm font-medium">{item.label}</p>
            <p className="text-xs text-slate-400">{item.desc}</p>
          </div>
          <button
            onClick={() => toggle(item.key)}
            className={`w-11 h-6 rounded-full flex-shrink-0 transition relative ${
              prefs[item.key] ? "bg-cyan-500" : "bg-slate-700"
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                prefs[item.key] ? "left-5" : "left-0.5"
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
