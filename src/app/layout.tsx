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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfbfa" },
    { media: "(prefers-color-scheme: dark)", color: "#17181a" },
  ],
};

/** Đặt theme trước khi paint để không bị nháy trắng. */
const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('ml-theme');if(!t){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" data-theme="light" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
