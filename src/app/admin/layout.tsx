import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/supabase/server";
import SignOutButton from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Tổng quan" },
  { href: "/admin/problems", label: "Bài toán & prompt" },
  { href: "/admin/students", label: "Học sinh" },
  { href: "/admin/providers", label: "AI provider" },
  { href: "/admin/settings", label: "Prompt chung" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/dang-nhap");
  if (user.role !== "admin") redirect("/hoc");

  return (
    <div className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-5 gap-y-2 px-5 py-3">
          <Link href="/admin" className="font-bold text-[var(--accent)]">
            MathLovers
          </Link>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-[var(--muted)] hover:text-[var(--text)]">
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-[var(--muted)]">
            <span className="hidden sm:inline">{user.email}</span>
            <Link href="/hoc" className="btn btn-ghost !py-1.5 !text-sm">
              Xem như học sinh
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>
    </div>
  );
}
