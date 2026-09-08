"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignOutButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.push("/dang-nhap");
    router.refresh();
  }

  if (compact) {
    return (
      <button
        type="button"
        onClick={signOut}
        className="btn btn-quiet btn-icon"
        aria-label="Đăng xuất"
        title="Đăng xuất"
      >
        <svg
          width="17"
          height="17"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 20H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h8M17 15l3-3-3-3M20 12H10" />
        </svg>
      </button>
    );
  }

  return (
    <button type="button" onClick={signOut} className="btn btn-ghost btn-sm">
      Đăng xuất
    </button>
  );
}
