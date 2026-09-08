import { NextResponse } from "next/server";
import { streamAi } from "@/lib/ai";
import { getDefaultProvider, getProblem, getSettings } from "@/lib/data";
import { buildSystemPrompt } from "@/lib/prompt";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/guard";
import type { ChatTurn } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Body {
  sessionId?: string | null;
  problemId?: string | null;
  problemText: string;
  history: ChatTurn[];
  hintLevel: number;
}

/**
 * Trả về một stream NDJSON:
 *   {"type":"meta","sessionId":"…"}
 *   {"type":"delta","text":"…"}   (nhiều dòng)
 *   {"type":"done"} | {"type":"error","message":"…"}
 */
export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const problemText = (body.problemText ?? "").slice(0, 6000);
  const history = (body.history ?? []).slice(-16);
  if (!problemText.trim() && !body.problemId) {
    return NextResponse.json({ error: "Chưa có đề bài." }, { status: 400 });
  }

  let settings, provider, problem;
  try {
    [settings, provider, problem] = await Promise.all([
      getSettings(),
      getDefaultProvider("text"),
      body.problemId ? getProblem(body.problemId) : Promise.resolve(null),
    ]);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không đọc được cấu hình." },
      { status: 500 }
    );
  }

  if (!provider) {
    return NextResponse.json(
      { error: "Chưa cấu hình AI provider cho gợi ý. Vào /admin/providers để thêm." },
      { status: 400 }
    );
  }

  const hintLevel = body.hintLevel || 1;
  const systemPrompt = buildSystemPrompt({ settings, problem, problemText, hintLevel });
  const messages: ChatTurn[] =
    history.length > 0
      ? history
      : [
          {
            role: "user",
            content: `Đề bài của em:\n${problemText}\n\nEm chưa biết bắt đầu từ đâu, mình gợi ý giúp em nhé.`,
          },
        ];

  const db = supabaseAdmin();

  // Tạo phiên trước khi stream để client có sessionId ngay từ đầu
  let sessionId = body.sessionId ?? null;
  if (!sessionId) {
    const { data } = await db
      .from("study_sessions")
      .insert({
        user_id: user!.id,
        student_label: user!.full_name ?? user!.email,
        problem_id: body.problemId ?? null,
        input_mode: "text",
        problem_text: problemText,
      })
      .select("id")
      .single();
    sessionId = data?.id ?? null;
  }

  const encoder = new TextEncoder();
  const send = (obj: unknown) => encoder.encode(`${JSON.stringify(obj)}\n`);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(send({ type: "meta", sessionId }));
      let full = "";
      try {
        for await (const piece of streamAi({ provider, systemPrompt, messages })) {
          full += piece;
          controller.enqueue(send({ type: "delta", text: piece }));
        }
        if (!full.trim()) throw new Error(`Model ${provider.model} không trả về nội dung.`);
        controller.enqueue(send({ type: "done" }));
      } catch (e) {
        controller.enqueue(
          send({
            type: "error",
            message: e instanceof Error ? e.message : "Không lấy được gợi ý.",
          })
        );
      } finally {
        controller.close();
        if (sessionId && full.trim()) {
          const last = messages[messages.length - 1];
          await db
            .from("hint_messages")
            .insert([
              {
                session_id: sessionId,
                role: "student",
                content: last.content,
                hint_level: hintLevel,
              },
              {
                session_id: sessionId,
                role: "assistant",
                content: full,
                hint_level: hintLevel,
                provider_id: provider.id,
              },
            ])
            .then(
              () => undefined,
              () => undefined
            );
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
