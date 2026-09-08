import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // được gọi từ Server Component — bỏ qua, middleware sẽ làm mới session
          }
        },
      },
    }
  );
}

/** Trả về user nếu đang đăng nhập VÀ có trong bảng admins, ngược lại null. */
export async function getAdminUser() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("admins")
    .select("user_id, email, full_name")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return { id: user.id, email: user.email ?? data.email, full_name: data.full_name };
}
