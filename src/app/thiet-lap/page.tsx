"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AuthShell from "@/components/AuthShell";

export default function SetupPage() {
  const [hasAdmin, setHasAdmin] = useState<boolean | null>(null);
  const [form, setForm] = useState({ email: "", password: "", setupCode: "", fullName: "" });
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/setup")
      .then((r) => r.json())
      .then((d) => setHasAdmin(Boolean(d.hasAdmin)))
      .catch(() => setHasAdmin(true));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMsg(null);
    const res = await fetch("/api/admin/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error ?? "Không tạo được tài khoản.");
      return;
    }
    setMsg("Đã tạo tài khoản quản trị. Bạn có thể đăng nhập ngay.");
    setHasAdmin(true);
  }

  return (
    <AuthShell title="Thiết lập quản trị" subtitle="Chỉ chạy được khi hệ thống chưa có admin nào.">
      {hasAdmin === null && <p className="text-sm text-[var(--muted)]">Đang kiểm tra…</p>}

      {hasAdmin === true && (
        <p className="text-sm text-[var(--muted)]">
          {msg ? (
            <span className="text-[var(--accent)]">{msg} </span>
          ) : (
            "Hệ thống đã có quản trị viên. "
          )}
          <Link href="/dang-nhap" className="font-medium text-[var(--accent)] underline underline-offset-2">
            Đăng nhập tại đây
          </Link>
          .
        </p>
      )}

      {hasAdmin === false && (
        <form onSubmit={submit}>
          <div>
            <label className="label" htmlFor="fullName">
              Họ tên
            </label>
            <input
              id="fullName"
              className="field"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="field"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="password">
              Mật khẩu
            </label>
            <input
              id="password"
              type="password"
              className="field"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="hint-text">Tối thiểu 8 ký tự.</p>
          </div>
          <div className="mt-4">
            <label className="label" htmlFor="setupCode">
              Mã thiết lập
            </label>
            <input
              id="setupCode"
              className="field"
              required
              value={form.setupCode}
              onChange={(e) => setForm({ ...form, setupCode: e.target.value })}
            />
            <p className="hint-text">Giá trị của biến môi trường ADMIN_SETUP_CODE.</p>
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-[var(--danger-soft)] px-3 py-2 text-sm text-[var(--danger)]">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-primary mt-6 w-full !rounded-lg" disabled={loading}>
            {loading ? "Đang tạo…" : "Tạo tài khoản quản trị"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
