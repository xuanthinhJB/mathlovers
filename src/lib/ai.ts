import type { AiProvider, ChatTurn } from "@/lib/types";

export interface AiResult {
  text: string;
  tokensIn?: number;
  tokensOut?: number;
}

function joinUrl(base: string, path: string) {
  return `${base.replace(/\/+$/, "")}${path}`;
}

/**
 * Gọi model chat. Hỗ trợ:
 *  - Mọi provider OpenAI-compatible (DeepSeek, OpenAI, Gemini OpenAI-endpoint, OpenRouter, custom)
 *  - Anthropic Messages API (khác chuẩn nên xử lý riêng)
 * imageDataUrl (tuỳ chọn) dùng cho provider role = 'vision'.
 */
export async function callAi(opts: {
  provider: AiProvider;
  systemPrompt: string;
  messages: ChatTurn[];
  imageDataUrl?: string | null;
  signal?: AbortSignal;
}): Promise<AiResult> {
  const { provider, systemPrompt, messages, imageDataUrl, signal } = opts;
  if (!provider.api_key) {
    throw new Error(
      `Provider "${provider.name}" chưa có API key. Vào trang quản trị để bổ sung.`
    );
  }

  if (provider.provider === "anthropic") {
    return callAnthropic({ provider, systemPrompt, messages, imageDataUrl, signal });
  }
  return callOpenAiCompatible({ provider, systemPrompt, messages, imageDataUrl, signal });
}

async function callOpenAiCompatible(opts: {
  provider: AiProvider;
  systemPrompt: string;
  messages: ChatTurn[];
  imageDataUrl?: string | null;
  signal?: AbortSignal;
}): Promise<AiResult> {
  const { provider, systemPrompt, messages, imageDataUrl, signal } = opts;

  type Part =
    | { type: "text"; text: string }
    | { type: "image_url"; image_url: { url: string } };

  const body: Record<string, unknown> = {
    model: provider.model,
    temperature: Number(provider.temperature),
    max_tokens: provider.max_tokens,
    messages: [
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
    ],
  };

  const res = await fetch(joinUrl(provider.base_url, "/chat/completions"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.api_key}`,
    },
    body: JSON.stringify(body),
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

async function callAnthropic(opts: {
  provider: AiProvider;
  systemPrompt: string;
  messages: ChatTurn[];
  imageDataUrl?: string | null;
  signal?: AbortSignal;
}): Promise<AiResult> {
  const { provider, systemPrompt, messages, imageDataUrl, signal } = opts;

  type Block =
    | { type: "text"; text: string }
    | {
        type: "image";
        source: { type: "base64"; media_type: string; data: string };
      };

  const anthMessages = messages.map((m, i) => {
    const isLastUser = i === messages.length - 1 && m.role === "user";
    if (isLastUser && imageDataUrl) {
      const match = /^data:(.+?);base64,(.*)$/.exec(imageDataUrl);
      if (match) {
        const blocks: Block[] = [
          { type: "image", source: { type: "base64", media_type: match[1], data: match[2] } },
          { type: "text", text: m.content },
        ];
        return { role: m.role, content: blocks };
      }
    }
    return { role: m.role, content: m.content };
  });

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
      messages: anthMessages,
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

  return {
    text,
    tokensIn: json.usage?.input_tokens,
    tokensOut: json.usage?.output_tokens,
  };
}
