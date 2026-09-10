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
{"dim":"2d"|"3d", "title":"...", "objects":[ ... ]}

Chọn "dim":
- "2d" cho hình học phẳng (tam giác, đường tròn, tứ giác…)
- "3d" cho hình học không gian (hình chóp, lăng trụ, hình hộp, tứ diện, mặt cầu…)
KHÔNG được trộn đối tượng 2D và 3D trong cùng một hình.

=== ĐỐI TƯỢNG 2D (chỉ dùng khi dim = "2d") ===
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

=== ĐỐI TƯỢNG 3D (chỉ dùng khi dim = "3d") ===
- {"t":"point3","id":"S","x":0,"y":0,"z":4,"label":"S"}
- {"t":"midpoint3","id":"M","of":["B","C"],"label":"M"}
- {"t":"segment3","id":"SA","from":"S","to":"A","dash":false}
- {"t":"line3","id":"d","from":"A","to":"B"}          (đường thẳng kéo dài vô hạn)
- {"t":"face","id":"f1","points":["A","B","C"]}       (một mặt phẳng hữu hạn)
- {"t":"solid","id":"khoi","faces":[["A","B","C","D"],["S","A","B"],["S","B","C"],
                                    ["S","C","D"],["S","D","A"]]}
- {"t":"sphere3","id":"mc","center":"O","through":"A"}  hoặc  "r": 3
- {"t":"plane3","id":"mp","points":["S","B","C"]}      (mặt phẳng cắt, vô hạn)
- {"t":"text3","x":1,"y":0,"z":2,"text":"..."}

Với hình chóp / lăng trụ / hình hộp: dùng MỘT đối tượng "solid" liệt kê đủ các mặt.
Cạnh được vẽ tự động từ các mặt, không cần thêm "segment3" cho từng cạnh.
Chỉ thêm "segment3" cho các đường phụ (đường cao, trung tuyến, đường nối đặc biệt);
đường khuất hoặc đường dựng thêm nên đặt "dash": true.

Quy ước toạ độ 3D: mặt phẳng đáy nằm ở z = 0, chiều cao theo trục z dương.

QUY TẮC BẮT BUỘC:
1. Mọi id phải bắt đầu bằng chữ cái, không trùng nhau.
2. Chỉ được tham chiếu tới id đã khai báo TRƯỚC ĐÓ trong mảng objects.
3. Điểm tự do ("point" / "point3") phải có toạ độ số cụ thể, trong khoảng -20 đến 20,
   đặt sao cho hình cân đối và dễ nhìn.
4. Dựng hình phản ánh đúng dữ kiện đề bài. Nếu đề nói tam giác vuông tại A,
   hãy chọn toạ độ thực sự vuông tại A và đánh dấu {"t":"angle",...,"right":true}.
   Nếu đề nói SA vuông góc với đáy, hãy đặt S ngay phía trên A.
5. Với đường cao, trung tuyến, đường trung trực (2D): dùng "perpendicular", "midpoint"
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
