import { createClient } from "@supabase/supabase-js";

/**
 * Client dùng service_role — CHỈ được import trong code chạy phía server.
 * Bỏ qua toàn bộ RLS, nên không bao giờ được lộ ra trình duyệt.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong biến môi trường."
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
