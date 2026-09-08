import "server-only";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { AiProvider, AppSettings, Problem, ProviderRole, Topic } from "@/lib/types";

export async function getSettings(): Promise<AppSettings> {
  const { data, error } = await supabaseAdmin()
    .from("app_settings")
    .select("*")
    .eq("id", true)
    .single();
  if (error) throw new Error(`Không đọc được cấu hình chung: ${error.message}`);
  return data as AppSettings;
}

export async function getDefaultProvider(role: ProviderRole): Promise<AiProvider | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from("ai_providers")
    .select("*")
    .eq("role", role)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(1);
  return (data?.[0] as AiProvider) ?? null;
}

export async function getProblem(id: string): Promise<Problem | null> {
  const { data } = await supabaseAdmin()
    .from("problems")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Problem) ?? null;
}

export async function listActiveProblems(): Promise<(Problem & { topic: Topic | null })[]> {
  const { data } = await supabaseAdmin()
    .from("problems")
    .select("*, topic:topics(*)")
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  return (data as (Problem & { topic: Topic | null })[]) ?? [];
}

export async function listTopics(): Promise<Topic[]> {
  const { data } = await supabaseAdmin()
    .from("topics")
    .select("*")
    .order("sort_order", { ascending: true });
  return (data as Topic[]) ?? [];
}
