import Link from "next/link";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { IconBook, IconChip, IconSliders, IconUsers } from "@/components/icons";

export const dynamic = "force-dynamic";

async function stats() {
  const db = supabaseAdmin();
  const [problems, sessions, students, textProvider, visionProvider] = await Promise.all([
    db.from("problems").select("*", { count: "exact", head: true }).eq("is_active", true),
    db.from("study_sessions").select("*", { count: "exact", head: true }),
    db.from("profiles").select("*", { count: "exact", head: true }).eq("role", "student"),
    db
      .from("ai_providers")
      .select("name, model, api_key")
      .eq("role", "text")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1),
    db
      .from("ai_providers")
      .select("name, model, api_key")
      .eq("role", "vision")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1),
  ]);

  const text = textProvider.data?.[0];
  const vision = visionProvider.data?.[0];
  return {
    problems: problems.count ?? 0,
    sessions: sessions.count ?? 0,
    students: students.count ?? 0,
    text: text ? { label: `${text.name} · ${text.model}`, ready: Boolean(text.api_key) } : null,
    vision: vision
      ? { label: `${vision.name} · ${vision.model}`, ready: Boolean(vision.api_key) }
      : null,
  };
}

export default async function AdminHome() {
  const s = await stats();

  const cards = [
    { label: "Bài toán đang hiển thị", value: s.problems, href: "/admin/problems", icon: <IconBook /> },
    { label: "Học sinh đã đăng ký", value: s.students, href: "/admin/students", icon: <IconUsers /> },
    { label: "Lượt xin gợi ý", value: s.sessions, href: "/admin/students", icon: <IconSliders /> },
  ];

  const checks = [
    {
      title: "Provider gợi ý",
      ok: Boolean(s.text?.ready),
      detail: s.text
        ? s.text.ready
          ? s.text.label
          : `${s.text.label} — thiếu API key`
        : "Chưa cấu hình",
      href: "/admin/providers",
    },
    {
      title: "Provider đọc ảnh",
      ok: Boolean(s.vision?.ready),
      detail: s.vision
        ? s.vision.ready
          ? s.vision.label
          : `${s.vision.label} — thiếu API key`
        : "Chưa cấu hình — nút chụp ảnh sẽ báo lỗi",
      href: "/admin/providers",
    },
    {
      title: "Bài toán",
      ok: s.problems > 0,
      detail: s.problems > 0 ? `${s.problems} bài đang hiển thị` : "Chưa soạn bài nào",
      href: "/admin/problems",
    },
  ];

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight">Tổng quan</h1>
      <p className="mt-1.5 text-[var(--muted)]">Tình trạng hệ thống và số liệu sử dụng.</p>

      <div className="mt-7 grid gap-3 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="card p-5 transition-colors hover:border-[var(--accent-line)]"
          >
            <span className="text-[var(--muted)]">{c.icon}</span>
            <div className="mt-2 text-[30px] font-semibold leading-none tracking-tight">
              {c.value}
            </div>
            <div className="mt-1.5 text-[13.5px] text-[var(--muted)]">{c.label}</div>
          </Link>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold tracking-tight">Sẵn sàng hoạt động?</h2>
      <div className="card mt-3 divide-y divide-[var(--line)]">
        {checks.map((c) => (
          <Link
            key={c.title}
            href={c.href}
            className="flex items-center gap-3 p-4 transition-colors hover:bg-[var(--surface-2)]"
          >
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                c.ok
                  ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                  : "bg-[var(--danger-soft)] text-[var(--danger)]"
              }`}
              aria-hidden
            >
              {c.ok ? "✓" : "!"}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[14.5px] font-medium">{c.title}</div>
              <div className="truncate text-[13px] text-[var(--muted)]">{c.detail}</div>
            </div>
            <IconChip className="shrink-0 text-[var(--faint)]" size={16} />
          </Link>
        ))}
      </div>
    </div>
  );
}
