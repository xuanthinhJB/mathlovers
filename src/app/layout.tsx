import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MathLovers — Gợi ý tư duy giải Toán",
  description:
    "Trợ giảng Toán gợi mở tư duy: không đưa lời giải, chỉ dẫn dắt để học sinh tự tìm ra đáp án.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f6f5c",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
