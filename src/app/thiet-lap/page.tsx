"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <Link href="/" className="mb-6 text-sm font-bold text-[var(--accent)]">
        ← MathLovers
      </Link>
      <div className="card p-6">
        <h1 className="text-xl font-bold">Thiết lập tài khoản quản trị</h1>

        {hasAdmin === true && !msg && (
          <p className="mt-3 text-sm text-[var(--muted)]">
            Hệ thống đã có quản trị viên.{" "}
            <Link href="/dang-nhap" className="underline">
              Đăng nhập tại đây
            </Link>
            .
          </p>
        )}

        {hasAdmin === false && (
          <form onSubmit={submit} className="mt-5 space-y-4">
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
            <div>
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
            <div>
              <label className="label" htmlFor="password">
                Mật khẩu (tối thiểu 8 ký tự)
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
            </div>
            <div>
              <label className="label" htmlFor="setupCode">
                Mã thiết lập (biến môi trường ADMIN_SETUP_CODE)
              </label>
              <input
                id="setupCode"
                className="field"
                required
                value={form.setupCode}
                onChange={(e) => setForm({ ...form, setupCode: e.target.value })}
              />
            </div>

            {error && <p className="text-sm text-[var(--danger)]">{error}</p>}

            <button type="submit" className="btn btn-primary w-full" disabled={loading}>
              {loading ? "Đang tạo…" : "Tạo tài khoản"}
            </button>
          </form>
        )}

        {msg && (
          <p className="mt-4 text-sm text-[var(--accent)]">
            {msg}{" "}
            <Link href="/dang-nhap" className="underline">
              Đăng nhập
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
