import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "다온 - AI 공부 성장 게임",
  description: "공부하고, 다온이와 함께 성장하는 AI 공부 게임",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full">
      <body className="min-h-full font-sans antialiased">{children}</body>
    </html>
  );
}
