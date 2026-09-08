import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { callAi } from "@/lib/ai";
import type { AiProvider } from "@/lib/types";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: Ctx) {
  const { response } = await requireAdmin();
  if (response) return response;

  const { id } = await params;
  const body = await req.json();
  const db = supabaseAdmin();

  const patch: Record<string, unknown> = {};
  for (const k of [
    "name",
    "role",
    "provider",
    "base_url",
    "model",
    "temperature",
    "max_tokens",
    "is_default",
    "is_active",
  ]) {
    if (body[k] !== undefined) patch[k] = body[k];
  }
  // Chỉ ghi đè api_key khi người dùng thực sự nhập key mới
  if (typeof body.api_key === "string" && body.api_key.trim().length > 0) {
    patch.api_key = body.api_key.trim();
  }
  if (body.clear_api_key === true) patch.api_key = null;

  if (patch.is_default === true) {
    const role = (patch.role as string) ?? body.currentRole ?? "text";
    await db
      .from("ai_providers")
      .update({ is_default: false })
      .eq("role", role)
      .eq("is_default", true);
  }

  const { error } = await db.from("ai_providers").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const { error } = await supabaseAdmin().from("ai_providers").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

/** Gọi thử provider để kiểm tra key/model. */
export async function POST(_req: Request, { params }: Ctx) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;

  const { data, error } = await supabaseAdmin()
    .from("ai_providers")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Không tìm thấy provider." }, { status: 404 });
  }

  try {
    const result = await callAi({
      provider: data as AiProvider,
      systemPrompt: "Bạn là trợ lý kiểm tra kết nối. Trả lời đúng một từ.",
      messages: [{ role: "user", content: "Trả lời đúng một từ: OK" }],
    });
    return NextResponse.json({ ok: true, sample: result.text.slice(0, 120) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "Lỗi không xác định" },
      { status: 200 }
    );
  }
}
