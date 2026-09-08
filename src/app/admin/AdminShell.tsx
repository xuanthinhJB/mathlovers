"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import SignOutButton from "@/components/SignOutButton";
import ThemeToggle from "@/components/ThemeToggle";
import {
  IconBook,
  IconChip,
  IconClose,
  IconHome,
  IconLogo,
  IconMenu,
  IconSliders,
  IconUsers,
} from "@/components/icons";

const NAV = [
  { href: "/admin", label: "Tổng quan", icon: <IconHome /> },
  { href: "/admin/problems", label: "Bài toán & prompt", icon: <IconBook /> },
  { href: "/admin/students", label: "Học sinh", icon: <IconUsers /> },
  { href: "/admin/providers", label: "AI provider", icon: <IconChip /> },
  { href: "/admin/settings", label: "Prompt chung", icon: <IconSliders /> },
];

export default function AdminShell({
  email,
  name,
  children,
}: {
  email: string;
  name: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--bg)]">
      {open && (
        <button
          type="button"
          aria-label="Đóng thanh bên"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[254px] flex-col border-r border-[var(--line)] bg-[var(--sidebar)] transition-transform duration-200 md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-3">
          <IconLogo size={26} />
          <span className="font-semibold tracking-tight">MathLovers</span>
          <span className="badge ml-1">Quản trị</span>
          <button
            type="button"
            className="btn btn-quiet btn-icon ml-auto md:hidden"
            onClick={() => setOpen(false)}
            aria-label="Đóng"
          >
            <IconClose />
          </button>
        </div>

        <nav className="flex-1 space-y-0.5 px-2 py-2">
          {NAV.map((n) => {
            const active = n.href === "/admin" ? pathname === "/admin" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[14px] transition-colors ${
                  active
                    ? "bg-[var(--surface-3)] font-medium text-[var(--ink)]"
                    : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
                }`}
              >
                <span className={active ? "text-[var(--accent)]" : "text-[var(--muted)]"}>
                  {n.icon}
                </span>
                {n.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--line)] p-2">
          <Link href="/hoc" className="btn btn-quiet w-full !justify-start">
            <IconBook />
            Xem như học sinh
          </Link>
          <div className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[12px] font-bold text-[var(--accent)]">
              {name.trim().charAt(0).toUpperCase()}
            </div>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink-2)]" title={email}>
              {email}
            </span>
            <ThemeToggle />
            <SignOutButton compact />
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2 md:hidden">
          <button
            type="button"
            className="btn btn-quiet btn-icon"
            onClick={() => setOpen(true)}
            aria-label="Mở thanh bên"
          >
            <IconMenu />
          </button>
          <span className="font-semibold tracking-tight">Quản trị</span>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-4xl px-5 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
