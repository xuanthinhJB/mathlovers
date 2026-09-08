import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

const EDITABLE = [
  "topic_id",
  "code",
  "title",
  "statement",
  "difficulty",
  "keywords",
  "hint_system_prompt",
  "expected_approach",
  "common_mistakes",
  "final_answer",
  "is_active",
] as const;

export async function PATCH(req: Request, { params }: Ctx) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const b = await req.json();

  const patch: Record<string, unknown> = {};
  for (const k of EDITABLE) if (b[k] !== undefined) patch[k] = b[k];
  if (patch.code === "") patch.code = null;
  if (patch.topic_id === "") patch.topic_id = null;

  const { error } = await supabaseAdmin().from("problems").update(patch).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await params;
  const { error } = await supabaseAdmin().from("problems").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
