import { NextResponse } from "next/server";
import { listActiveProblems, listTopics } from "@/lib/data";
import { requireUser } from "@/lib/guard";

export const dynamic = "force-dynamic";

/** Danh sách bài toán cho học sinh đã đăng nhập — KHÔNG trả về prompt/đáp án. */
export async function GET() {
  try {
    const { response } = await requireUser();
    if (response) return response;

    const [problems, topics] = await Promise.all([listActiveProblems(), listTopics()]);
    return NextResponse.json({
      topics,
      problems: problems.map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        statement: p.statement,
        difficulty: p.difficulty,
        topic_id: p.topic_id,
        topic_name: p.topic?.name ?? null,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi không xác định" },
      { status: 500 }
    );
  }
}
