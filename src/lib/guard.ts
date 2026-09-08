import "server-only";
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/supabase/server";

/** Bắt buộc là quản trị viên — dùng trong các API route của /admin. */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") {
    return {
      user: null,
      response: NextResponse.json({ error: "Không có quyền truy cập." }, { status: 401 }),
    };
  }
  return { user, response: null };
}

/** Bắt buộc đã đăng nhập (học sinh hoặc quản trị viên). */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Em cần đăng nhập trước." }, { status: 401 }),
    };
  }
  return { user, response: null };
}
