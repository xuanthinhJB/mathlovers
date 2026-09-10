import { NextResponse } from "next/server";
import { callAi } from "@/lib/ai";
import { getDefaultProvider, getProblem } from "@/lib/data";
import { FigureError, validateFigure } from "@/lib/figure";
import { requireUser } from "@/lib/guard";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FIGURE_PROMPT = `
Bạn là công cụ dựng hình hình học. Nhiệm vụ: đọc đề bài và trả về MỘT đối tượng JSON
mô tả hình minh hoạ. KHÔNG viết code, KHÔNG giải bài, KHÔNG nêu đáp án.

CHỈ trả về JSON thuần, không bọc trong markdown, không thêm lời dẫn.

Cấu trúc:
{"title":"...", "objects":[ ... ]}

Các loại đối tượng cho phép (đúng chính tả trường "t"):
- {"t":"point","id":"A","x":0,"y":0,"label":"A","fixed":false}
- {"t":"midpoint","id":"M","of":["B","C"],"label":"M"}
- {"t":"intersection","id":"I","of":["d1","d2"],"which":0,"label":"I"}
- {"t":"segment","id":"AB","from":"A","to":"B","label":"","dash":false}
- {"t":"line","id":"d1","from":"A","to":"B","dash":false}
- {"t":"ray","id":"r1","from":"A","to":"B"}
- {"t":"circle","id":"c1","center":"O","through":"A"}      hoặc  "r": 3
- {"t":"polygon","id":"p1","points":["A","B","C"]}
- {"t":"angle","at":"B","from":"A","to":"C","label":"β","right":false}
- {"t":"perpendicular","id":"h","line":"BC","through":"A"}
- {"t":"parallel","id":"k","line":"BC","through":"A"}
- {"t":"text","x":1,"y":2,"text":"..."}

QUY TẮC BẮT BUỘC:
1. Mọi id phải bắt đầu bằng chữ cái, không trùng nhau.
2. Chỉ được tham chiếu tới id đã khai báo TRƯỚC ĐÓ trong mảng objects.
3. Điểm tự do ("point") phải có toạ độ số cụ thể, trong khoảng -20 đến 20,
   đặt sao cho hình cân đối và dễ nhìn.
4. Dựng hình phản ánh đúng dữ kiện đề bài. Nếu đề nói tam giác vuông tại A,
   hãy chọn toạ độ thực sự vuông tại A và đánh dấu {"t":"angle",...,"right":true}.
5. Với đường cao, trung tuyến, đường trung trực: dùng "perpendicular", "midpoint"
   thay vì tự tính toạ độ, để hình còn đúng khi học sinh kéo điểm.
6. Tối đa 40 đối tượng.
7. KHÔNG đưa vào hình bất cứ thứ gì tiết lộ đáp án (độ dài cần tìm, số đo cần tính).
   Chỉ vẽ dữ kiện đã cho.
8. Nếu đề bài KHÔNG phải bài hình học, trả về đúng: {"notGeometry":true}
`.trim();

function extractJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new FigureError("Model không trả về JSON hợp lệ.");
  }
}

export async function POST(req: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  let body: { problemText?: string; problemId?: string | null; sessionId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const problemText = (body.problemText ?? "").slice(0, 4000).trim();
  if (!problemText && !body.problemId) {
    return NextResponse.json({ error: "Chưa có đề bài để vẽ." }, { status: 400 });
  }

  try {
    const [provider, problem] = await Promise.all([
      getDefaultProvider("text"),
      body.problemId ? getProblem(body.problemId) : Promise.resolve(null),
    ]);
    if (!provider) {
      return NextResponse.json(
        { error: "Chưa cấu hình AI provider. Vào /admin/providers để thêm." },
        { status: 400 }
      );
    }

    const statement = problem?.statement?.trim() || problemText;
    const result = await callAi({
      provider: { ...provider, temperature: 0.1, max_tokens: 1800 },
      systemPrompt: FIGURE_PROMPT,
      messages: [{ role: "user", content: `Đề bài:\n${statement}` }],
    });

    const parsed = extractJson(result.text) as Record<string, unknown>;
    if (parsed?.notGeometry === true) {
      return NextResponse.json(
        { notGeometry: true, error: "Bài này không phải bài hình học nên chưa vẽ được hình." },
        { status: 200 }
      );
    }

    const spec = validateFigure(parsed);

    if (body.sessionId) {
      const db = supabaseAdmin();
      const { data: session } = await db
        .from("study_sessions")
        .select("id, user_id")
        .eq("id", body.sessionId)
        .maybeSingle();
      if (session && session.user_id === user!.id) {
        await db
          .from("study_sessions")
          .update({ figure_spec: spec })
          .eq("id", body.sessionId);
      }
    }

    return NextResponse.json({ figure: spec });
  } catch (e) {
    if (e instanceof FigureError) {
      return NextResponse.json(
        { error: `Hình dựng ra chưa hợp lệ (${e.message}). Em thử lại nhé.` },
        { status: 422 }
      );
    }
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Không vẽ được hình." },
      { status: 500 }
    );
  }
}
