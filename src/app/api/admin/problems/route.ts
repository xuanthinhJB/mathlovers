import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const db = supabaseAdmin();
  const [problems, topics] = await Promise.all([
    db.from("problems").select("*, topic:topics(id,name)").order("created_at", { ascending: false }),
    db.from("topics").select("*").order("sort_order", { ascending: true }),
  ]);
  if (problems.error) return NextResponse.json({ error: problems.error.message }, { status: 400 });
  return NextResponse.json({ problems: problems.data ?? [], topics: topics.data ?? [] });
}

export async function POST(req: Request) {
  const { response } = await requireAdmin();
  if (response) return response;

  const b = await req.json();
  const payload = {
    topic_id: b.topic_id || null,
    code: b.code?.trim() || null,
    title: String(b.title ?? "").trim(),
    statement: String(b.statement ?? ""),
    difficulty: ["easy", "medium", "hard"].includes(b.difficulty) ? b.difficulty : "medium",
    keywords: Array.isArray(b.keywords) ? b.keywords : [],
    hint_system_prompt: String(b.hint_system_prompt ?? ""),
    expected_approach: String(b.expected_approach ?? ""),
    common_mistakes: String(b.common_mistakes ?? ""),
    final_answer: String(b.final_answer ?? ""),
    is_active: b.is_active !== false,
  };
  if (!payload.title) {
    return NextResponse.json({ error: "Tiêu đề không được để trống." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin()
    .from("problems")
    .insert(payload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ problem: data });
}
