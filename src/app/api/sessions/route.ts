import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Lịch sử các phiên học của chính người đang đăng nhập. */
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const { data, error } = await supabaseAdmin()
    .from("study_sessions")
    .select("id, problem_text, problem_id, created_at, problems(title)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const sessions = (data ?? []).map((s) => {
    const rel = (s as { problems?: { title?: string } | { title?: string }[] }).problems;
    const problemTitle = Array.isArray(rel) ? rel[0]?.title : rel?.title;
    const raw = (s.problem_text ?? "").replace(/\s+/g, " ").trim();
    return {
      id: s.id as string,
      title: problemTitle || (raw ? raw.slice(0, 70) : "Bài chưa đặt tên"),
      created_at: s.created_at as string,
    };
  });

  return NextResponse.json({ sessions });
}
