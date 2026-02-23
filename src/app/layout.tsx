import "./globals.css"; // 👈 これが CSS を読み込む重要な一行です！
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mini Message Board",
  description: "Next.js + Supabase 掲示板",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}