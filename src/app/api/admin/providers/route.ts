import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const FIELDS =
  "id,name,role,provider,base_url,model,temperature,max_tokens,is_default,is_active,created_at,updated_at,api_key";

/** Che API key trước khi gửi ra trình duyệt. */
function mask<T extends { api_key?: string | null }>(row: T) {
  const key = row.api_key ?? "";
  return {
    ...row,
    api_key: undefined,
    has_key: key.length > 0,
    key_preview: key ? `${key.slice(0, 5)}…${key.slice(-4)}` : "",
  };
}

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const { data, error } = await supabaseAdmin()
    .from("ai_providers")
    .select(FIELDS)
    .order("role", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ providers: (data ?? []).map(mask) });
}

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const body = await req.json();
  const db = supabaseAdmin();

  const payload = {
    name: String(body.name ?? "").trim() || "Provider mới",
    role: body.role === "vision" ? "vision" : "text",
    provider: body.provider ?? "deepseek",
    base_url: String(body.base_url ?? "").trim(),
    model: String(body.model ?? "").trim(),
    api_key: body.api_key ? String(body.api_key) : null,
    temperature: Number(body.temperature ?? 0.4),
    max_tokens: Number(body.max_tokens ?? 1200),
    is_default: Boolean(body.is_default),
    is_active: body.is_active !== false,
  };

  if (payload.is_default) {
    await db
      .from("ai_providers")
      .update({ is_default: false })
      .eq("role", payload.role)
      .eq("is_default", true);
  }

  const { data, error } = await db.from("ai_providers").insert(payload).select(FIELDS).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ provider: mask(data) });
}
