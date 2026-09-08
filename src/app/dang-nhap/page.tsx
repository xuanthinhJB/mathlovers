"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email hoặc mật khẩu không đúng.");
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-5">
      <Link href="/" className="mb-6 text-sm font-bold text-[var(--accent)]">
        ← MathLovers
      </Link>
      <form onSubmit={submit} className="card p-6">
        <h1 className="text-xl font-bold">Đăng nhập quản trị</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Dành cho giáo viên.</p>

        <div className="mt-5">
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="field"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}

        <button type="submit" className="btn btn-primary mt-6 w-full" disabled={loading}>
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>

        <p className="mt-4 text-center text-xs text-[var(--muted)]">
          Chưa có tài khoản nào?{" "}
          <Link href="/thiet-lap" className="underline">
            Thiết lập lần đầu
          </Link>
        </p>
      </form>
    </main>
  );
}
