"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Không tạo được tài khoản.");
      setLoading(false);
      return;
    }

    const { error: signInError } = await supabaseBrowser().auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });
    if (signInError) {
      router.push("/dang-nhap");
      return;
    }
    router.push("/hoc");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-6 text-sm font-bold text-[var(--accent)]">
        ← MathLovers
      </Link>
      <form onSubmit={submit} className="card p-6">
        <h1 className="text-xl font-bold">Đăng ký tài khoản học sinh</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Có tài khoản để em lưu lại các bài đã hỏi và thầy cô theo dõi được tiến độ.
        </p>

        <div className="mt-5">
          <label className="label" htmlFor="fullName">
            Họ và tên
          </label>
          <input
            id="fullName"
            className="field"
            required
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
            autoComplete="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
        <div className="mt-4">
          <label className="label" htmlFor="password">
            Mật khẩu (tối thiểu 8 ký tự)
          </label>
          <input
            id="password"
            type="password"
            className="field"
            autoComplete="new-password"
            minLength={8}
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>

        {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

        <button type="submit" className="btn btn-primary mt-6 w-full" disabled={loading}>
          {loading ? "Đang tạo tài khoản…" : "Đăng ký và bắt đầu học"}
        </button>

        <p className="mt-5 text-center text-sm text-[var(--muted)]">
          Đã có tài khoản?{" "}
          <Link href="/dang-nhap" className="font-semibold text-[var(--accent)] underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </main>
  );
}
