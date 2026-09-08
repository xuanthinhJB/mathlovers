import "server-only";
import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/supabase/server";

export async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) {
    return {
      user: null,
      response: NextResponse.json({ error: "Không có quyền truy cập." }, { status: 401 }),
    };
  }
  return { user, response: null };
}
