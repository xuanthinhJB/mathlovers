import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Tạo tài khoản quản trị đầu tiên. Chỉ chạy được khi bảng admins đang rỗng. */
export async function POST(req: Request) {
  try {
    const { email, password, setupCode, fullName } = (await req.json()) as {
      email?: string;
      password?: string;
      setupCode?: string;
      fullName?: string;
    };

    const expected = process.env.ADMIN_SETUP_CODE;
    if (!expected) {
      return NextResponse.json(
        { error: "Chưa cấu hình ADMIN_SETUP_CODE trên máy chủ." },
        { status: 500 }
      );
    }
    if (setupCode !== expected) {
      return NextResponse.json({ error: "Mã thiết lập không đúng." }, { status: 403 });
    }
    if (!email || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Email hợp lệ và mật khẩu tối thiểu 8 ký tự là bắt buộc." },
        { status: 400 }
      );
    }

    const db = supabaseAdmin();
    const { count } = await db.from("admins").select("*", { count: "exact", head: true });
    if ((count ?? 0) > 0) {
      return NextResponse.json(
        { error: "Đã có quản trị viên. Hãy đăng nhập thay vì thiết lập lại." },
        { status: 409 }
      );
    }

    const { data: created, error: createErr } = await db.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createErr || !created.user) {
      return NextResponse.json(
        { error: createErr?.message ?? "Không tạo được tài khoản." },
        { status: 400 }
      );
    }

    const { error: insErr } = await db.from("admins").insert({
      user_id: created.user.id,
      email,
      full_name: fullName ?? null,
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi không xác định" },
      { status: 500 }
    );
  }
}

/** Cho UI biết đã có admin hay chưa. */
export async function GET() {
  try {
    const { count } = await supabaseAdmin()
      .from("admins")
      .select("*", { count: "exact", head: true });
    return NextResponse.json({ hasAdmin: (count ?? 0) > 0 });
  } catch {
    return NextResponse.json({ hasAdmin: true });
  }
}
