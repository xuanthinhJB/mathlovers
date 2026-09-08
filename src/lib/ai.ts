import type { AiProvider, ChatTurn } from "@/lib/types";

export interface AiResult {
  text: string;
  tokensIn?: number;
  tokensOut?: number;
}

type Part =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string } };

type AnthropicBlock =
  | { type: "text"; text: string }
  | { type: "image"; source: { type: "base64"; media_type: string; data: string } };

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}${path}`;
}

function assertKey(provider: AiProvider) {
  if (!provider.api_key) {
    throw new Error(
      `Provider "${provider.name}" chưa có API key. Vào trang quản trị để bổ sung.`
    );
  }
}

/** Dựng mảng messages theo chuẩn OpenAI, đính ảnh vào lượt user cuối nếu có. */
function openAiMessages(
  systemPrompt: string,
  messages: ChatTurn[],
  imageDataUrl?: string | null
) {
  return [
    { role: "system", content: systemPrompt },
    ...messages.map((m, i) => {
      const isLastUser = i === messages.length - 1 && m.role === "user";
      if (isLastUser && imageDataUrl) {
        const parts: Part[] = [
          { type: "text", text: m.content },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ];
        return { role: m.role, content: parts };
      }
      return { role: m.role, content: m.content };
    }),
  ];
}

function anthropicMessages(messages: ChatTurn[], imageDataUrl?: string | null) {
  return messages.map((m, i) => {
    const isLastUser = i === messages.length - 1 && m.role === "user";
    if (isLastUser && imageDataUrl) {
      const match = /^data:(.+?);base64,(.*)$/.exec(imageDataUrl);
      if (match) {
        const blocks: AnthropicBlock[] = [
          { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } },
          { type: "text", text: m.content },
        ];
        return { role: m.role, content: blocks };
      }
    }
    return { role: m.role, content: m.content };
  });
}

/**
 * Gọi model chat, trả về toàn bộ nội dung một lần.
 * Hỗ trợ mọi provider OpenAI-compatible và Anthropic Messages API.
 */
export async function callAi(opts: {
  provider: AiProvider;
  systemPrompt: string;
  messages: ChatTurn[];
  imageDataUrl?: string | null;
  signal?: AbortSignal;
}): Promise<AiResult> {
  const { provider, systemPrompt, messages, imageDataUrl, signal } = opts;
  assertKey(provider);

  if (provider.provider === "anthropic") {
    const res = await fetch(joinUrl(provider.base_url, "/messages"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": provider.api_key!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: provider.model,
        system: systemPrompt,
        max_tokens: provider.max_tokens,
        temperature: Number(provider.temperature),
        messages: anthropicMessages(messages, imageDataUrl),
      }),
      signal,
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new Error(`Lỗi từ ${provider.name} (${res.status}): ${raw.slice(0, 400)}`);
    }
    const json = JSON.parse(raw) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (json.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n")
      .trim();
    if (!text) throw new Error(`Model ${provider.model} không trả về nội dung.`);
    return { text, tokensIn: json.usage?.input_tokens, tokensOut: json.usage?.output_tokens };
  }

  const res = await fetch(joinUrl(provider.base_url, "/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.api_key}`,
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: Number(provider.temperature),
      max_tokens: provider.max_tokens,
      messages: openAiMessages(systemPrompt, messages, imageDataUrl),
    }),
    signal,
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Lỗi từ ${provider.name} (${res.status}): ${raw.slice(0, 400)}`);
  }
  let json: {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`Phản hồi không hợp lệ từ ${provider.name}: ${raw.slice(0, 200)}`);
  }
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error(`Model ${provider.model} không trả về nội dung.`);
  return {
    text,
    tokensIn: json.usage?.prompt_tokens,
    tokensOut: json.usage?.completion_tokens,
  };
}

/**
 * Gọi model ở chế độ stream, yield từng mẩu văn bản khi model sinh ra.
 * Dùng cho trang học sinh để chữ hiện dần thay vì chờ trọn câu trả lời.
 */
export async function* streamAi(opts: {
  provider: AiProvider;
  systemPrompt: string;
  messages: ChatTurn[];
  signal?: AbortSignal;
}): AsyncGenerator<string, void, unknown> {
  const { provider, systemPrompt, messages, signal } = opts;
  assertKey(provider);

  const isAnthropic = provider.provider === "anthropic";
  const url = isAnthropic
    ? joinUrl(provider.base_url, "/messages")
    : joinUrl(provider.base_url, "/chat/completions");

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (isAnthropic) {
    headers["x-api-key"] = provider.api_key!;
    headers["anthropic-version"] = "2023-06-01";
  } else {
    headers.Authorization = `Bearer ${provider.api_key}`;
  }

  const body = isAnthropic
    ? {
        model: provider.model,
        system: systemPrompt,
        max_tokens: provider.max_tokens,
        temperature: Number(provider.temperature),
        messages: anthropicMessages(messages),
        stream: true,
      }
    : {
        model: provider.model,
        temperature: Number(provider.temperature),
        max_tokens: provider.max_tokens,
        messages: openAiMessages(systemPrompt, messages),
        stream: true,
      };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal,
  });

  if (!res.ok || !res.body) {
    const raw = await res.text().catch(() => "");
    throw new Error(`Lỗi từ ${provider.name} (${res.status}): ${raw.slice(0, 400)}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE: các event cách nhau bằng dòng trống
    const chunks = buffer.split("\n\n");
    buffer = chunks.pop() ?? "";

    for (const chunk of chunks) {
      for (const line of chunk.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const evt = JSON.parse(payload);
          if (isAnthropic) {
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              const piece = evt.delta.text as string;
              if (piece) yield piece;
            }
          } else {
            const piece = evt.choices?.[0]?.delta?.content;
            if (typeof piece === "string" && piece) yield piece;
          }
        } catch {
          // mẩu JSON chưa trọn vẹn — bỏ qua, vòng sau sẽ có đủ
        }
      }
    }
  }
}
