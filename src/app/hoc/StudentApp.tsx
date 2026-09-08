"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import CameraCapture, { fileToDataUrl } from "./CameraCapture";

interface PublicProblem {
  id: string;
  code: string | null;
  title: string;
  statement: string;
  difficulty: string;
  topic_name: string | null;
}

interface Turn {
  role: "user" | "assistant";
  content: string;
}

function anonId() {
  const KEY = "ml_anon_id";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

const DIFF_LABEL: Record<string, string> = {
  easy: "Dễ",
  medium: "Vừa",
  hard: "Khó",
};

export default function StudentApp() {
  const [problems, setProblems] = useState<PublicProblem[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [problemText, setProblemText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [reply, setReply] = useState("");
  const [hintLevel, setHintLevel] = useState(1);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/problems")
      .then((r) => r.json())
      .then((d) => setProblems(d.problems ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns, loading]);

  function pickProblem(id: string) {
    setSelectedId(id);
    const p = problems.find((x) => x.id === id);
    if (p) setProblemText(p.statement || p.title);
    resetConversation();
  }

  function resetConversation() {
    setTurns([]);
    setSessionId(null);
    setHintLevel(1);
    setError(null);
  }

  async function handleImage(dataUrl: string) {
    setImagePreview(dataUrl);
    setShowCamera(false);
    setOcrLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageDataUrl: dataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không đọc được ảnh.");
      setProblemText(data.text ?? "");
      setSelectedId("");
      resetConversation();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không đọc được ảnh.");
    } finally {
      setOcrLoading(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      handleImage(await fileToDataUrl(file));
    } catch {
      setError("Không xử lý được ảnh này.");
    }
  }

  async function ask(userText: string, level: number) {
    if (!problemText.trim()) {
      setError("Em nhập đề bài trước nhé.");
      return;
    }
    setLoading(true);
    setError(null);
    const nextTurns: Turn[] = [...turns, { role: "user", content: userText }];
    setTurns(nextTurns);

    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonId: anonId(),
          sessionId,
          problemId: selectedId || null,
          problemText,
          history: nextTurns,
          hintLevel: level,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không lấy được gợi ý.");
      setSessionId(data.sessionId ?? sessionId);
      setTurns([...nextTurns, { role: "assistant", content: data.hint }]);
    } catch (e) {
      setTurns(turns);
      setError(e instanceof Error ? e.message : "Không lấy được gợi ý.");
    } finally {
      setLoading(false);
    }
  }

  function start() {
    ask(
      `Đề bài của em:\n${problemText}\n\nEm chưa biết bắt đầu từ đâu, mình gợi ý giúp em nhé.`,
      1
    );
  }

  function deeper() {
    const next = hintLevel + 1;
    setHintLevel(next);
    ask("Em vẫn chưa nghĩ ra, mình gợi ý sâu hơn một chút được không?", next);
  }

  function send() {
    const text = reply.trim();
    if (!text) return;
    setReply("");
    ask(text, hintLevel);
  }

  const started = turns.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-4 pb-32 pt-6">
      <header className="mb-6 flex items-center justify-between">
        <Link href="/" className="text-sm font-bold text-[var(--accent)]">
          ← MathLovers
        </Link>
        {started && (
          <button type="button" className="btn btn-ghost !py-1.5 !text-sm" onClick={resetConversation}>
            Bài mới
          </button>
        )}
      </header>

      {!started && (
        <section className="card p-5">
          <h1 className="text-xl font-bold">Em đang vướng bài nào?</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Mình sẽ không đưa đáp án — mình gợi ý để em tự làm được.
          </p>

          {problems.length > 0 && (
            <div className="mt-5">
              <label className="label" htmlFor="problem-select">
                Chọn bài thầy cô đã soạn (không bắt buộc)
              </label>
              <select
                id="problem-select"
                className="field"
                value={selectedId}
                onChange={(e) => pickProblem(e.target.value)}
              >
                <option value="">— Tự nhập đề khác —</option>
                {problems.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.topic_name ? `[${p.topic_name}] ` : ""}
                    {p.title}
                    {p.difficulty ? ` · ${DIFF_LABEL[p.difficulty] ?? p.difficulty}` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="mt-5">
            <label className="label" htmlFor="statement">
              Đề bài
            </label>
            <textarea
              id="statement"
              className="field"
              rows={6}
              placeholder="Gõ đề bài vào đây, hoặc chụp ảnh đề bên dưới…"
              value={problemText}
              onChange={(e) => setProblemText(e.target.value)}
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-ghost" onClick={() => setShowCamera(true)}>
              Chụp ảnh đề
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => fileRef.current?.click()}
            >
              Tải ảnh lên
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={onFile}
            />
          </div>

          {ocrLoading && (
            <p className="mt-3 text-sm text-[var(--muted)]">Đang đọc đề trong ảnh…</p>
          )}

          {imagePreview && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imagePreview}
              alt="Ảnh đề bài"
              className="mt-4 max-h-56 rounded-xl border border-[var(--border)] object-contain"
            />
          )}

          <button
            type="button"
            className="btn btn-primary mt-5 w-full"
            onClick={start}
            disabled={loading || ocrLoading || !problemText.trim()}
          >
            {loading ? "Đang nghĩ…" : "Xin gợi ý đầu tiên"}
          </button>
        </section>
      )}

      {started && (
        <section className="space-y-4">
          <div className="card bg-[var(--surface-2)] p-4">
            <div className="label !mb-1">Đề bài</div>
            <div className="text-sm">
              <Markdown>{problemText}</Markdown>
            </div>
          </div>

          {turns.map((t, i) =>
            t.role === "assistant" ? (
              <div key={i} className="card border-l-4 border-l-[var(--accent)] p-4">
                <div className="mb-1 text-xs font-bold uppercase tracking-wide text-[var(--accent)]">
                  Gợi ý
                </div>
                <Markdown>{t.content}</Markdown>
              </div>
            ) : i === 0 ? null : (
              <div key={i} className="ml-auto max-w-[85%] rounded-xl bg-[var(--accent-soft)] p-3 text-sm">
                {t.content}
              </div>
            )
          )}

          {loading && <p className="text-sm text-[var(--muted)]">Đang nghĩ…</p>}
          <div ref={bottomRef} />
        </section>
      )}

      {error && (
        <p className="mt-4 rounded-xl border border-[var(--danger)] bg-[#fbeeee] p-3 text-sm text-[var(--danger)]">
          {error}
        </p>
      )}

      {started && (
        <div className="fixed inset-x-0 bottom-0 border-t border-[var(--border)] bg-[var(--surface)] p-3">
          <div className="mx-auto flex max-w-3xl gap-2">
            <input
              className="field flex-1"
              placeholder="Trả lời câu hỏi của trợ giảng…"
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={loading}
            />
            <button type="button" className="btn btn-primary" onClick={send} disabled={loading}>
              Gửi
            </button>
            <button
              type="button"
              className="btn btn-ghost whitespace-nowrap"
              onClick={deeper}
              disabled={loading}
              title="Xin gợi ý ở bậc sâu hơn"
            >
              Gợi ý sâu hơn
            </button>
          </div>
        </div>
      )}

      {showCamera && (
        <CameraCapture onCapture={handleImage} onCancel={() => setShowCamera(false)} />
      )}
    </main>
  );
}
