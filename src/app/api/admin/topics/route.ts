import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const b = await req.json();
  const name = String(b.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Tên chủ đề trống." }, { status: 400 });

  const { data, error } = await supabaseAdmin()
    .from("topics")
    .insert({ name, grade: b.grade ?? null, sort_order: Number(b.sort_order ?? 0) })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ topic: data });
}

export async function DELETE(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  const { error } = await supabaseAdmin().from("topics").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
