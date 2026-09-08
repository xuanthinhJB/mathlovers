import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

async function counts() {
  const db = supabaseAdmin();
  const [problems, sessions, providers] = await Promise.all([
    db.from("problems").select("*", { count: "exact", head: true }),
    db.from("study_sessions").select("*", { count: "exact", head: true }),
    db.from("ai_providers").select("*", { count: "exact", head: true }).eq("is_active", true),
  ]);
  return {
    problems: problems.count ?? 0,
    sessions: sessions.count ?? 0,
    providers: providers.count ?? 0,
  };
}

export default async function AdminHome() {
  const c = await counts();
  const cards = [
    { label: "Bài toán đã soạn", value: c.problems, href: "/admin/problems" },
    { label: "Lượt học sinh dùng", value: c.sessions, href: "/admin/students" },
    { label: "AI provider đang bật", value: c.providers, href: "/admin/providers" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold">Tổng quan</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        {cards.map((x) => (
          <Link key={x.label} href={x.href} className="card p-5 transition hover:border-[var(--accent)]">
            <div className="text-3xl font-bold">{x.value}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">{x.label}</div>
          </Link>
        ))}
      </div>

      <div className="card mt-8 p-5">
        <h2 className="font-bold">Bắt đầu từ đâu</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>
            <Link href="/admin/providers" className="underline">
              Cấu hình AI provider
            </Link>{" "}
            — dán API key DeepSeek cho phần gợi ý, và thêm một provider “Đọc ảnh” nếu muốn dùng camera.
          </li>
          <li>
            <Link href="/admin/settings" className="underline">
              Chỉnh prompt chung
            </Link>{" "}
            — quy tắc “không đưa lời giải” áp dụng cho mọi bài.
          </li>
          <li>
            <Link href="/admin/problems" className="underline">
              Soạn bài toán
            </Link>{" "}
            — mỗi bài có system prompt gợi ý riêng.
          </li>
        </ol>
      </div>
    </div>
  );
}
