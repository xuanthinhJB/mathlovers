import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const { data, error } = await supabaseAdmin()
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ settings: data });
}

export async function PATCH(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const b = await req.json();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (b.base_system_prompt !== undefined) patch.base_system_prompt = String(b.base_system_prompt);
  if (b.vision_ocr_prompt !== undefined) patch.vision_ocr_prompt = String(b.vision_ocr_prompt);
  if (b.hint_levels !== undefined) patch.hint_levels = Number(b.hint_levels);

  const { error } = await supabaseAdmin().from("app_settings").update(patch).eq("id", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
