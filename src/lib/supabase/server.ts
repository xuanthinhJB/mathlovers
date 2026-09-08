import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export type Role = "admin" | "student";

export interface SessionUser {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
}

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
            // được gọi từ Server Component — proxy sẽ làm mới session
          }
        },
      },
    }
  );
}

/** Người dùng đang đăng nhập kèm role, hoặc null nếu chưa đăng nhập. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("user_id, email, full_name, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    id: user.id,
    email: user.email ?? data.email,
    full_name: data.full_name,
    role: data.role as Role,
  };
}

/** Đường dẫn mặc định theo role. */
export function homeFor(role: Role) {
  return role === "admin" ? "/admin" : "/hoc";
}
