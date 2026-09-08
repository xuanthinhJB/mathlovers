import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface ProfileRow {
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface SessionRow {
  user_id: string | null;
  created_at: string;
}

export default async function StudentsPage() {
  const db = supabaseAdmin();
  const [{ data: profiles }, { data: sessions }] = await Promise.all([
    db
      .from("profiles")
      .select("user_id,email,full_name,role,created_at")
      .order("created_at", { ascending: false }),
    db.from("study_sessions").select("user_id,created_at"),
  ]);

  const stats = new Map<string, { count: number; last: string }>();
  for (const s of (sessions ?? []) as SessionRow[]) {
    if (!s.user_id) continue;
    const cur = stats.get(s.user_id);
    if (!cur) stats.set(s.user_id, { count: 1, last: s.created_at });
    else {
      cur.count += 1;
      if (s.created_at > cur.last) cur.last = s.created_at;
    }
  }

  const rows = ((profiles ?? []) as ProfileRow[]).filter((p) => p.role === "student");
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight">Học sinh</h1>
      <p className="mt-1.5 text-[var(--muted)]">
        Tài khoản học sinh đã đăng ký và số lượt các em xin gợi ý.
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          Chưa có học sinh nào đăng ký. Gửi các em đường dẫn <code>/dang-ky</code>.
        </p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--muted)]">
                <th className="p-3">Họ tên</th>
                <th className="p-3">Email</th>
                <th className="p-3">Số lượt hỏi</th>
                <th className="p-3">Lần gần nhất</th>
                <th className="p-3">Ngày đăng ký</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => {
                const st = stats.get(p.user_id);
                return (
                  <tr key={p.user_id} className="border-b border-[var(--border)] last:border-0">
                    <td className="p-3 font-semibold">{p.full_name ?? "—"}</td>
                    <td className="p-3 text-[var(--muted)]">{p.email}</td>
                    <td className="p-3">{st?.count ?? 0}</td>
                    <td className="p-3 text-[var(--muted)]">
                      {st ? fmt(st.last) : "chưa dùng"}
                    </td>
                    <td className="p-3 text-[var(--muted)]">{fmt(p.created_at)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
