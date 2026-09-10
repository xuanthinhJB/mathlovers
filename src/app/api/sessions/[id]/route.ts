import { NextResponse } from "next/server";
import { requireUser } from "@/lib/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** Nội dung một phiên học — chỉ chủ nhân phiên đó mới đọc được. */
export async function GET(_req: Request, { params }: Ctx) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: session } = await db
    .from("study_sessions")
    .select("id, user_id, problem_id, problem_text, figure_spec, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!session || session.user_id !== user!.id) {
    return NextResponse.json({ error: "Không tìm thấy phiên học." }, { status: 404 });
  }

  const { data: messages } = await db
    .from("hint_messages")
    .select("role, content, hint_level, created_at")
    .eq("session_id", id)
    .order("created_at", { ascending: true });

  const turns = (messages ?? [])
    .filter((m) => m.role === "student" || m.role === "assistant")
    .map((m) => ({
      role: m.role === "student" ? ("user" as const) : ("assistant" as const),
      content: m.content as string,
    }));

  const lastLevel =
    (messages ?? []).reduce<number>((max, m) => Math.max(max, m.hint_level ?? 1), 1) || 1;

  return NextResponse.json({
    session: {
      id: session.id,
      problemId: session.problem_id,
      problemText: session.problem_text,
      figureSpec: session.figure_spec ?? null,
      hintLevel: lastLevel,
    },
    turns,
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { user, response } = await requireUser();
  if (response) return response;
  const { id } = await params;

  const db = supabaseAdmin();
  const { data: session } = await db
    .from("study_sessions")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!session || session.user_id !== user!.id) {
    return NextResponse.json({ error: "Không tìm thấy phiên học." }, { status: 404 });
  }

  const { error } = await db.from("study_sessions").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
