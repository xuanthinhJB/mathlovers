export type ProviderRole = "text" | "vision";

export type ProviderVendor =
  | "deepseek"
  | "openai"
  | "google"
  | "anthropic"
  | "openrouter"
  | "custom";

export interface AiProvider {
  id: string;
  name: string;
  role: ProviderRole;
  provider: ProviderVendor;
  base_url: string;
  model: string;
  api_key: string | null;
  temperature: number;
  max_tokens: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AppSettings {
  id: boolean;
  base_system_prompt: string;
  vision_ocr_prompt: string;
  hint_levels: number;
  updated_at: string;
}

export interface Topic {
  id: string;
  name: string;
  grade: string | null;
  sort_order: number;
  created_at: string;
}

export interface Problem {
  id: string;
  topic_id: string | null;
  code: string | null;
  title: string;
  statement: string;
  difficulty: "easy" | "medium" | "hard";
  keywords: string[];
  hint_system_prompt: string;
  expected_approach: string;
  common_mistakes: string;
  final_answer: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HintMessage {
  id: string;
  session_id: string;
  role: "student" | "assistant" | "system";
  content: string;
  hint_level: number | null;
  created_at: string;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export const VENDOR_PRESETS: Record<
  ProviderVendor,
  { label: string; base_url: string; models: string[] }
> = {
  deepseek: {
    label: "DeepSeek",
    base_url: "https://api.deepseek.com/v1",
    models: ["deepseek-chat", "deepseek-reasoner"],
  },
  openai: {
    label: "OpenAI",
    base_url: "https://api.openai.com/v1",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4.1-mini"],
  },
  google: {
    label: "Google Gemini",
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-2.5-flash", "gemini-2.5-pro"],
  },
  anthropic: {
    label: "Anthropic Claude",
    base_url: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-4-5", "claude-haiku-4-5"],
  },
  openrouter: {
    label: "OpenRouter",
    base_url: "https://openrouter.ai/api/v1",
    models: ["deepseek/deepseek-chat", "google/gemini-2.5-flash"],
  },
  custom: {
    label: "Khác (OpenAI-compatible)",
    base_url: "",
    models: [],
  },
};
