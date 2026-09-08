"use client";

import { useCallback, useEffect, useState } from "react";

interface Topic {
  id: string;
  name: string;
  grade: string | null;
  sort_order: number;
}

interface Problem {
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
  topic?: { id: string; name: string } | null;
}

const BLANK: {
  topic_id: string;
  code: string;
  title: string;
  statement: string;
  difficulty: "easy" | "medium" | "hard";
  hint_system_prompt: string;
  expected_approach: string;
  common_mistakes: string;
  final_answer: string;
  is_active: boolean;
} = {
  topic_id: "",
  code: "",
  title: "",
  statement: "",
  difficulty: "medium",
  hint_system_prompt: "",
  expected_approach: "",
  common_mistakes: "",
  final_answer: "",
  is_active: true,
};

const DIFF: Record<string, string> = { easy: "Dễ", medium: "Vừa", hard: "Khó" };

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [form, setForm] = useState<typeof BLANK>({ ...BLANK });
  const [editing, setEditing] = useState<string | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/problems");
    const data = await res.json();
    setProblems(data.problems ?? []);
    setTopics(data.topics ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setError(null);
    const res = await fetch(
      editing ? `/api/admin/problems/${editing}` : "/api/admin/problems",
      {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, topic_id: form.topic_id || null }),
      }
    );
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Không lưu được.");
      return;
    }
    setMsg(editing ? "Đã cập nhật bài toán." : "Đã thêm bài toán.");
    setForm({ ...BLANK });
    setEditing(null);
    load();
  }

  function edit(p: Problem) {
    setEditing(p.id);
    setForm({
      topic_id: p.topic_id ?? "",
      code: p.code ?? "",
      title: p.title,
      statement: p.statement,
      difficulty: p.difficulty,
      hint_system_prompt: p.hint_system_prompt,
      expected_approach: p.expected_approach,
      common_mistakes: p.common_mistakes,
      final_answer: p.final_answer,
      is_active: p.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/admin/problems/${id}`, { method: "DELETE" });
    setBusy(false);
    load();
  }

  async function addTopic() {
    const name = newTopic.trim();
    if (!name) return;
    await fetch("/api/admin/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sort_order: topics.length + 1 }),
    });
    setNewTopic("");
    load();
  }

  return (
    <div>
      <h1 className="text-[26px] font-semibold tracking-tight">Bài toán &amp; prompt gợi ý</h1>
      <p className="mt-1.5 max-w-2xl text-[var(--muted)]">
        Mỗi bài có system prompt gợi ý riêng. Đáp án chỉ dùng để AI tự đối chiếu — không bao giờ
        được đưa cho học sinh.
      </p>

      <form onSubmit={save} className="card mt-6 p-5">
        <h2 className="text-[15px] font-semibold">{editing ? "Sửa bài toán" : "Thêm bài toán"}</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">Tiêu đề</label>
            <input
              id="title"
              className="field"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Phương trình bậc hai có tham số m"
            />
          </div>
          <div>
            <label className="label" htmlFor="topic">Chủ đề</label>
            <select
              id="topic"
              className="field"
              value={form.topic_id}
              onChange={(e) => setForm({ ...form, topic_id: e.target.value })}
            >
              <option value="">— Không phân loại —</option>
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="difficulty">Độ khó</label>
            <select
              id="difficulty"
              className="field"
              value={form.difficulty}
              onChange={(e) =>
                setForm({ ...form, difficulty: e.target.value as typeof form.difficulty })
              }
            >
              <option value="easy">Dễ</option>
              <option value="medium">Vừa</option>
              <option value="hard">Khó</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="code">Mã bài (tuỳ chọn)</label>
            <input
              id="code"
              className="field"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
              placeholder="DS-12-01"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="statement">Đề bài (hỗ trợ LaTeX trong $…$)</label>
            <textarea
              id="statement"
              className="field"
              rows={5}
              value={form.statement}
              onChange={(e) => setForm({ ...form, statement: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="hsp">
              System prompt gợi ý riêng cho bài này
            </label>
            <textarea
              id="hsp"
              className="field font-mono !text-[13px]"
              rows={8}
              value={form.hint_system_prompt}
              onChange={(e) => setForm({ ...form, hint_system_prompt: e.target.value })}
              placeholder={
                "Ví dụ:\nBậc 1: hỏi em điều kiện để phương trình có hai nghiệm phân biệt là gì.\nBậc 2: gợi nhớ định lý Vi-ét.\nBậc 3: gợi ý biểu diễn tổng và tích nghiệm theo m.\nKhông được nêu giá trị m cuối cùng."
              }
            />
          </div>
          <div>
            <label className="label" htmlFor="approach">Hướng tiếp cận mong muốn</label>
            <textarea
              id="approach"
              className="field"
              rows={4}
              value={form.expected_approach}
              onChange={(e) => setForm({ ...form, expected_approach: e.target.value })}
            />
          </div>
          <div>
            <label className="label" htmlFor="mistakes">Lỗi học sinh hay mắc</label>
            <textarea
              id="mistakes"
              className="field"
              rows={4}
              value={form.common_mistakes}
              onChange={(e) => setForm({ ...form, common_mistakes: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="answer">
              Đáp án (chỉ AI thấy để đối chiếu — không hiển thị cho học sinh)
            </label>
            <input
              id="answer"
              className="field"
              value={form.final_answer}
              onChange={(e) => setForm({ ...form, final_answer: e.target.value })}
            />
          </div>
        </div>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          Hiển thị cho học sinh
        </label>

        {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
        {msg && <p className="mt-4 text-sm text-[var(--accent)]">{msg}</p>}

        <div className="mt-5 flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editing ? "Cập nhật" : "Thêm bài toán"}
          </button>
          {editing && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                setEditing(null);
                setForm({ ...BLANK });
              }}
            >
              Huỷ
            </button>
          )}
        </div>
      </form>

      <section className="card mt-6 p-5">
        <h2 className="text-[15px] font-semibold">Chủ đề</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {topics.map((t) => (
            <span
              key={t.id}
              className="rounded-full bg-[var(--surface-2)] px-3 py-1 text-sm"
            >
              {t.name}
            </span>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            className="field max-w-xs"
            placeholder="Tên chủ đề mới"
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
          />
          <button type="button" className="btn btn-ghost" onClick={addTopic}>
            Thêm
          </button>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold">Danh sách bài toán ({problems.length})</h2>
        <div className="mt-3 space-y-3">
          {problems.map((p) => (
            <div key={p.id} className="card flex flex-wrap items-start gap-3 p-4">
              <div className="min-w-[220px] flex-1">
                <div className="font-semibold">
                  {p.title}
                  {!p.is_active && (
                    <span className="ml-2 text-xs text-[var(--muted)]">(ẩn)</span>
                  )}
                </div>
                <div className="mt-0.5 text-xs text-[var(--muted)]">
                  {p.topic?.name ?? "Không phân loại"} · {DIFF[p.difficulty]} ·{" "}
                  {p.hint_system_prompt ? "có prompt riêng" : "dùng prompt chung"}
                </div>
                {p.statement && (
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--muted)]">{p.statement}</p>
                )}
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => edit(p)}>
                Sửa
              </button>
              <button
                type="button"
                className="btn btn-danger btn-sm"
                onClick={() => remove(p.id)}
                disabled={busy}
              >
                Xoá
              </button>
            </div>
          ))}
          {problems.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Chưa có bài toán nào.</p>
          )}
        </div>
      </section>
    </div>
  );
}
