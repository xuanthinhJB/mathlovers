import { NextResponse } from "next/server";
import { callAi } from "@/lib/ai";
import { getDefaultProvider, getProblem, getSettings } from "@/lib/data";
import { buildSystemPrompt } from "@/lib/prompt";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ChatTurn } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  anonId: string;
  sessionId?: string | null;
  problemId?: string | null;
  problemText: string;
  history: ChatTurn[];
  hintLevel: number;
  studentLabel?: string | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const problemText = (body.problemText ?? "").slice(0, 6000);
    const history = (body.history ?? []).slice(-16);

    if (!problemText.trim() && !body.problemId) {
      return NextResponse.json({ error: "Chưa có đề bài." }, { status: 400 });
    }

    const [settings, provider, problem] = await Promise.all([
      getSettings(),
      getDefaultProvider("text"),
      body.problemId ? getProblem(body.problemId) : Promise.resolve(null),
    ]);

    if (!provider) {
      return NextResponse.json(
        { error: "Chưa cấu hình AI provider cho gợi ý. Vào /admin/providers để thêm." },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt({
      settings,
      problem,
      problemText,
      hintLevel: body.hintLevel || 1,
    });

    const messages: ChatTurn[] =
      history.length > 0
        ? history
        : [
            {
              role: "user",
              content: `Đề bài của em:\n${problemText}\n\nEm chưa biết bắt đầu từ đâu, mình gợi ý giúp em nhé.`,
            },
          ];

    const result = await callAi({ provider, systemPrompt, messages });

    // Ghi log (best-effort, không chặn phản hồi)
    const db = supabaseAdmin();
    let sessionId = body.sessionId ?? null;
    try {
      if (!sessionId) {
        const { data } = await db
          .from("study_sessions")
          .insert({
            anon_id: body.anonId || "unknown",
            student_label: body.studentLabel ?? null,
            problem_id: body.problemId ?? null,
            input_mode: "text",
            problem_text: problemText,
          })
          .select("id")
          .single();
        sessionId = data?.id ?? null;
      }
      if (sessionId) {
        const last = messages[messages.length - 1];
        await db.from("hint_messages").insert([
          {
            session_id: sessionId,
            role: "student",
            content: last.content,
            hint_level: body.hintLevel || 1,
          },
          {
            session_id: sessionId,
            role: "assistant",
            content: result.text,
            hint_level: body.hintLevel || 1,
            provider_id: provider.id,
            tokens_in: result.tokensIn ?? null,
            tokens_out: result.tokensOut ?? null,
          },
        ]);
      }
    } catch {
      /* bỏ qua lỗi ghi log */
    }

    return NextResponse.json({ hint: result.text, sessionId });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi không xác định" },
      { status: 500 }
    );
  }
}
