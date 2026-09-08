import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Học sinh tự đăng ký. Tạo user qua service_role với email_confirm = true
 * để không phụ thuộc vào cấu hình gửi email của Supabase.
 */
export async function POST(req: Request) {
  try {
    const { email, password, fullName } = (await req.json()) as {
      email?: string;
      password?: string;
      fullName?: string;
    };

    if (!email?.includes("@") || !password || password.length < 8) {
      return NextResponse.json(
        { error: "Email hợp lệ và mật khẩu tối thiểu 8 ký tự là bắt buộc." },
        { status: 400 }
      );
    }
    if (!fullName?.trim()) {
      return NextResponse.json({ error: "Vui lòng nhập họ tên." }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: created, error } = await db.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName.trim() },
    });

    if (error || !created.user) {
      const msg = error?.message ?? "";
      return NextResponse.json(
        {
          error: /already|registered|exists/i.test(msg)
            ? "Email này đã được đăng ký. Em đăng nhập nhé."
            : msg || "Không tạo được tài khoản.",
        },
        { status: 400 }
      );
    }

    const { error: profileErr } = await db.from("profiles").insert({
      user_id: created.user.id,
      email: email.trim().toLowerCase(),
      full_name: fullName.trim(),
      role: "student",
    });
    if (profileErr) {
      // Không để lại user mồ côi nếu tạo hồ sơ thất bại
      await db.auth.admin.deleteUser(created.user.id);
      return NextResponse.json({ error: profileErr.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi không xác định" },
      { status: 500 }
    );
  }
}
