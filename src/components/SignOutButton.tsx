"use client";

import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

export default function SignOutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="btn btn-ghost !py-1.5 !text-sm"
      onClick={async () => {
        await supabaseBrowser().auth.signOut();
        router.push("/dang-nhap");
        router.refresh();
      }}
    >
      Đăng xuất
    </button>
  );
}
