import { NextResponse } from "next/server";
import { callAi } from "@/lib/ai";
import { getDefaultProvider, getSettings } from "@/lib/data";
import { requireUser } from "@/lib/guard";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Nhận ảnh (data URL) → trích xuất đề bài toán bằng provider role = 'vision'. */
export async function POST(req: Request) {
  try {
    const { response } = await requireUser();
    if (response) return response;

    const { imageDataUrl } = (await req.json()) as { imageDataUrl?: string };
    if (!imageDataUrl?.startsWith("data:image/")) {
      return NextResponse.json({ error: "Ảnh không hợp lệ." }, { status: 400 });
    }
    // ~8MB base64 ≈ 6MB ảnh
    if (imageDataUrl.length > 8_000_000) {
      return NextResponse.json(
        { error: "Ảnh quá lớn. Hãy chụp lại với độ phân giải thấp hơn." },
        { status: 413 }
      );
    }

    const [settings, provider] = await Promise.all([
      getSettings(),
      getDefaultProvider("vision"),
    ]);

    if (!provider) {
      return NextResponse.json(
        {
          error:
            "Chưa cấu hình AI provider đọc ảnh. Giáo viên vào /admin/providers thêm một provider có role 'Đọc ảnh' (ví dụ Gemini hoặc OpenAI).",
        },
        { status: 400 }
      );
    }

    const result = await callAi({
      provider,
      systemPrompt: settings.vision_ocr_prompt,
      messages: [{ role: "user", content: "Hãy chép lại đề bài toán trong ảnh này." }],
      imageDataUrl,
    });

    return NextResponse.json({ text: result.text });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Lỗi không xác định" },
      { status: 500 }
    );
  }
}
