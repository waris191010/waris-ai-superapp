import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WARIS AI Super App",
  description: "Semua AI terbaik dunia dalam satu ekosistem terpadu.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
