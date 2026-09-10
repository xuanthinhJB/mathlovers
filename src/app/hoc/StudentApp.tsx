"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import ThemeToggle from "@/components/ThemeToggle";
import SignOutButton from "@/components/SignOutButton";
import {
  IconCamera,
  IconClose,
  IconImage,
  IconLightbulb,
  IconLogo,
  IconMenu,
  IconPlus,
  IconSend,
  IconShapes,
  IconSliders,
  IconTrash,
} from "@/components/icons";
import CameraCapture, { fileToDataUrl } from "./CameraCapture";
import FigureBoard from "@/components/FigureBoard";
import type { FigureSpec } from "@/lib/figure";

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

interface SessionRow {
  id: string;
  title: string;
  created_at: string;
}

const DIFF_LABEL: Record<string, string> = { easy: "Dễ", medium: "Vừa", hard: "Khó" };

const LEVEL_LABEL = [
  "Hiểu đề",
  "Nhớ kiến thức",
  "Chiến lược",
  "Bước đầu tiên",
  "Sâu hơn nữa",
  "Sâu hơn nữa",
  "Sâu hơn nữa",
  "Sâu hơn nữa",
];

function groupByDay(sessions: SessionRow[]) {
  const now = Date.now();
  const day = 86_400_000;
  const buckets: { label: string; items: SessionRow[] }[] = [
    { label: "Hôm nay", items: [] },
    { label: "7 ngày qua", items: [] },
    { label: "Trước đó", items: [] },
  ];
  for (const s of sessions) {
    const age = now - new Date(s.created_at).getTime();
    if (age < day) buckets[0].items.push(s);
    else if (age < day * 7) buckets[1].items.push(s);
    else buckets[2].items.push(s);
  }
  return buckets.filter((b) => b.items.length > 0);
}

export default function StudentApp({
  displayName,
  isAdmin,
}: {
  displayName: string;
  isAdmin: boolean;
}) {
  const [problems, setProblems] = useState<PublicProblem[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState("");
  const [problemText, setProblemText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

  const [turns, setTurns] = useState<Turn[]>([]);
  const [streaming, setStreaming] = useState("");
  const [reply, setReply] = useState("");
  const [hintLevel, setHintLevel] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [figure, setFigure] = useState<FigureSpec | null>(null);
  const [figureLoading, setFigureLoading] = useState(false);
  const [figureNote, setFigureNote] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const started = turns.length > 0;
  const firstName = displayName.trim().split(/\s+/).pop() ?? displayName;

  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(data.sessions ?? []);
    } catch {
      /* im lặng — lịch sử không phải chức năng cốt lõi */
    }
  }, []);

  useEffect(() => {
    fetch("/api/problems")
      .then((r) => r.json())
       
      .then((d) => setProblems(d.problems ?? []))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [turns, streaming, loading]);

  // Textarea tự cao dần, tối đa ~7 dòng
  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 176)}px`;
  }, [reply, problemText, started]);

  const grouped = useMemo(() => groupByDay(sessions), [sessions]);

  function newChat() {
    abortRef.current?.abort();
    setTurns([]);
    setStreaming("");
    setSessionId(null);
    setHintLevel(1);
    setProblemText("");
    setSelectedId("");
    setImagePreview(null);
    setReply("");
    setError(null);
    setFigure(null);
    setFigureNote(null);
    setSidebarOpen(false);
  }

  async function openSession(id: string) {
    abortRef.current?.abort();
    setSidebarOpen(false);
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Không mở được phiên học.");
      setSessionId(id);
      setProblemText(data.session.problemText ?? "");
      setSelectedId(data.session.problemId ?? "");
      setHintLevel(data.session.hintLevel ?? 1);
      setTurns(data.turns ?? []);
      setStreaming("");
      setImagePreview(null);
      setFigure((data.session.figureSpec as FigureSpec | null) ?? null);
      setFigureNote(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không mở được phiên học.");
    } finally {
      setLoading(false);
    }
  }

  async function removeSession(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (sessionId === id) newChat();
    await fetch(`/api/sessions/${id}`, { method: "DELETE" }).catch(() => {});
  }

  function pickProblem(id: string) {
    setSelectedId(id);
    const p = problems.find((x) => x.id === id);
    if (p) setProblemText(p.statement || p.title);
    setShowPicker(false);
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
    const nextTurns: Turn[] = [...turns, { role: "user", content: userText }];
    setTurns(nextTurns);
    setStreaming("");
    setLoading(true);
    setError(null);

    const controller = new AbortController();
    abortRef.current = controller;
    let acc = "";
    let newSessionId = sessionId;

    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          sessionId,
          problemId: selectedId || null,
          problemText,
          history: nextTurns,
          hintLevel: level,
        }),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Không lấy được gợi ý.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line) as {
            type: string;
            text?: string;
            sessionId?: string | null;
            message?: string;
          };
          if (evt.type === "meta" && evt.sessionId) {
            newSessionId = evt.sessionId;
            setSessionId(evt.sessionId);
          } else if (evt.type === "delta" && evt.text) {
            acc += evt.text;
            setStreaming(acc);
          } else if (evt.type === "error") {
            throw new Error(evt.message ?? "Không lấy được gợi ý.");
          }
        }
      }

      if (!acc.trim()) throw new Error("Trợ giảng chưa trả lời được, em thử lại nhé.");
      setTurns([...nextTurns, { role: "assistant", content: acc }]);
      setStreaming("");
      if (!sessionId && newSessionId) loadSessions();
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setTurns(turns);
      setStreaming("");
      setError(e instanceof Error ? e.message : "Không lấy được gợi ý.");
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  async function drawFigure() {
    if (!problemText.trim()) {
      setFigureNote("Em nhập đề bài trước nhé.");
      return;
    }
    setFigureLoading(true);
    setFigureNote(null);
    try {
      const res = await fetch("/api/figure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemText,
          problemId: selectedId || null,
          sessionId,
        }),
      });
      const data = await res.json();
      if (data.notGeometry) {
        setFigure(null);
        setFigureNote(data.error ?? "Bài này không phải bài hình học.");
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Không vẽ được hình.");
      setFigure(data.figure as FigureSpec);
    } catch (e) {
      setFigure(null);
      setFigureNote(e instanceof Error ? e.message : "Không vẽ được hình.");
    } finally {
      setFigureLoading(false);
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

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--bg)]">
      {/* ---------------- Sidebar ---------------- */}
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Đóng thanh bên"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[272px] flex-col border-r border-[var(--line)] bg-[var(--sidebar)] transition-transform duration-200 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2 px-3 py-3">
          <IconLogo size={26} />
          <span className="font-semibold tracking-tight">MathLovers</span>
          <button
            type="button"
            className="btn btn-quiet btn-icon ml-auto md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Đóng"
          >
            <IconClose />
          </button>
        </div>

        <div className="px-3 pb-2">
          <button type="button" onClick={newChat} className="btn btn-ghost w-full !justify-start">
            <IconPlus />
            Bài mới
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-[13px] text-[var(--faint)]">
              Các bài em đã hỏi sẽ hiện ở đây.
            </p>
          ) : (
            grouped.map((bucket) => (
              <div key={bucket.label} className="mb-3">
                <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                  {bucket.label}
                </div>
                {bucket.items.map((s) => (
                  <div
                    key={s.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openSession(s.id)}
                    onKeyDown={(e) => e.key === "Enter" && openSession(s.id)}
                    className={`group flex cursor-pointer items-center gap-1 rounded-lg px-2 py-2 text-[13.5px] transition-colors ${
                      sessionId === s.id
                        ? "bg-[var(--surface-3)] text-[var(--ink)]"
                        : "text-[var(--ink-2)] hover:bg-[var(--surface-2)]"
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate">{s.title}</span>
                    <button
                      type="button"
                      onClick={(e) => removeSession(s.id, e)}
                      className="btn btn-quiet btn-icon opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                      aria-label={`Xoá ${s.title}`}
                    >
                      <IconTrash />
                    </button>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-[var(--line)] p-2">
          {isAdmin && (
            <Link href="/admin" className="btn btn-quiet w-full !justify-start">
              <IconSliders />
              Trang quản trị
            </Link>
          )}
          <div className="mt-1 flex items-center gap-2 rounded-lg px-2 py-1.5">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[12px] font-bold text-[var(--accent)]">
              {firstName.charAt(0).toUpperCase()}
            </div>
            <span className="min-w-0 flex-1 truncate text-[13px] text-[var(--ink-2)]">
              {displayName}
            </span>
            <ThemeToggle />
            <SignOutButton compact />
          </div>
        </div>
      </aside>

      {/* ---------------- Khu chính ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2 md:hidden">
          <button
            type="button"
            className="btn btn-quiet btn-icon"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở thanh bên"
          >
            <IconMenu />
          </button>
          <span className="font-semibold tracking-tight">MathLovers</span>
          <button type="button" onClick={newChat} className="btn btn-quiet btn-icon ml-auto" aria-label="Bài mới">
            <IconPlus />
          </button>
        </header>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto">
          {!started ? (
            <div className="mx-auto flex min-h-full max-w-2xl flex-col justify-center px-4 py-10">
              <div className="animate-in">
                <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">
                  Chào {firstName}, em đang vướng bài nào?
                </h1>
                <p className="mt-2 text-[var(--muted)]">
                  Mình không đưa đáp án — mình gợi ý để em tự làm được.
                </p>
              </div>

              <div className="mt-7 animate-in">
                <div className="card-raised p-2">
                  <textarea
                    ref={composerRef}
                    className="w-full resize-none border-0 bg-transparent px-3 py-2.5 text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--faint)]"
                    rows={3}
                    placeholder="Gõ đề bài vào đây, hoặc chụp ảnh đề…"
                    value={problemText}
                    onChange={(e) => setProblemText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        start();
                      }
                    }}
                  />

                  {imagePreview && (
                    <div className="px-3 pb-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imagePreview}
                        alt="Ảnh đề bài"
                        className="max-h-40 rounded-lg border border-[var(--line)] object-contain"
                      />
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-1.5 px-1.5 pb-1.5">
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => setShowCamera(true)}>
                      <IconCamera size={15} />
                      Chụp đề
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={() => fileRef.current?.click()}
                    >
                      <IconImage size={15} />
                      Tải ảnh
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet btn-sm"
                      onClick={drawFigure}
                      disabled={figureLoading || !problemText.trim()}
                    >
                      <IconShapes size={15} />
                      {figureLoading ? "Đang vẽ…" : "Vẽ hình"}
                    </button>
                    {problems.length > 0 && (
                      <button
                        type="button"
                        className="btn btn-quiet btn-sm"
                        onClick={() => setShowPicker((v) => !v)}
                      >
                        <IconLightbulb size={15} />
                        Bài của thầy cô
                      </button>
                    )}
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={onFile}
                    />
                    <button
                      type="button"
                      className="btn btn-primary btn-icon ml-auto"
                      onClick={start}
                      disabled={loading || ocrLoading || !problemText.trim()}
                      aria-label="Xin gợi ý"
                    >
                      <IconSend />
                    </button>
                  </div>
                </div>

                {ocrLoading && (
                  <p className="mt-3 flex items-center gap-2 text-sm text-[var(--muted)]">
                    <span className="typing-dot" />
                    Đang đọc đề trong ảnh…
                  </p>
                )}

                {figureNote && (
                  <p className="mt-3 text-sm text-[var(--muted)]">{figureNote}</p>
                )}

                {figure && (
                  <div className="mt-4 animate-in">
                    <FigureBoard spec={figure} />
                  </div>
                )}

                {showPicker && problems.length > 0 && (
                  <div className="card mt-3 max-h-72 overflow-y-auto p-1.5 animate-in">
                    {problems.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => pickProblem(p.id)}
                        className="block w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--surface-2)]"
                      >
                        <div className="text-sm font-medium">{p.title}</div>
                        <div className="mt-0.5 text-[12.5px] text-[var(--muted)]">
                          {p.topic_name ?? "Chưa phân loại"} · {DIFF_LABEL[p.difficulty] ?? p.difficulty}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-6 flex flex-wrap gap-2">
                  {["Đọc hiểu đề", "Nhớ lại kiến thức", "Chiến lược tiếp cận", "Bước biến đổi đầu"].map(
                    (label, i) => (
                      <span key={label} className="badge">
                        Bậc {i + 1} · {label}
                      </span>
                    )
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="mx-auto max-w-3xl px-4 py-6">
              {problemText && (
                <div className="card mb-4 bg-[var(--surface-2)] p-4">
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--faint)]">
                    Đề bài
                  </div>
                  <Markdown>{problemText}</Markdown>
                </div>
              )}

              {figure && (
                <div className="mb-6 animate-in">
                  <FigureBoard spec={figure} />
                </div>
              )}

              {figureNote && !figure && (
                <p className="mb-6 text-sm text-[var(--muted)]">{figureNote}</p>
              )}

              <div className="space-y-6">
                {turns.map((t, i) =>
                  t.role === "assistant" ? (
                    <div key={i} className="flex gap-3 animate-in">
                      <div className="mt-0.5 shrink-0">
                        <IconLogo size={26} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <Markdown>{t.content}</Markdown>
                      </div>
                    </div>
                  ) : i === 0 ? null : (
                    <div key={i} className="flex justify-end animate-in">
                      <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[var(--accent-soft)] px-4 py-2.5 text-[14.5px] text-[var(--ink)]">
                        {t.content}
                      </div>
                    </div>
                  )
                )}

                {(streaming || loading) && (
                  <div className="flex gap-3">
                    <div className="mt-0.5 shrink-0">
                      <IconLogo size={26} />
                    </div>
                    <div className="min-w-0 flex-1">
                      {streaming ? (
                        <div className="stream-caret">
                          <Markdown>{streaming}</Markdown>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 py-1.5">
                          <span className="typing-dot" />
                          <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                          <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {error && (
                <div className="mt-6 rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                  {error}
                </div>
              )}
            </div>
          )}

          {!started && error && (
            <div className="mx-auto max-w-2xl px-4 pb-6">
              <div className="rounded-xl border border-[var(--danger)] bg-[var(--danger-soft)] px-4 py-3 text-sm text-[var(--danger)]">
                {error}
              </div>
            </div>
          )}
        </div>

        {/* ---------------- Composer khi đã bắt đầu ---------------- */}
        {started && (
          <div className="border-t border-[var(--line)] bg-[var(--bg)] px-4 py-3">
            <div className="mx-auto max-w-3xl">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="badge badge-accent">
                  Bậc {hintLevel} · {LEVEL_LABEL[Math.min(hintLevel, LEVEL_LABEL.length) - 1]}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={deeper}
                  disabled={loading}
                >
                  <IconLightbulb size={15} />
                  Gợi ý sâu hơn
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={drawFigure}
                  disabled={figureLoading}
                >
                  <IconShapes size={15} />
                  {figureLoading ? "Đang vẽ…" : figure ? "Vẽ lại hình" : "Vẽ hình"}
                </button>
                <button type="button" className="btn btn-quiet btn-sm ml-auto" onClick={newChat}>
                  <IconPlus size={15} />
                  Bài mới
                </button>
              </div>

              <div className="card-raised flex items-end gap-1.5 p-1.5">
                <textarea
                  ref={composerRef}
                  className="max-h-44 flex-1 resize-none border-0 bg-transparent px-2.5 py-2 text-[15px] leading-relaxed text-[var(--ink)] outline-none placeholder:text-[var(--faint)]"
                  rows={1}
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
                <button
                  type="button"
                  className="btn btn-primary btn-icon"
                  onClick={send}
                  disabled={loading || !reply.trim()}
                  aria-label="Gửi"
                >
                  <IconSend />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[11.5px] text-[var(--faint)]">
                Trợ giảng chỉ đưa gợi ý, không đưa lời giải hay đáp số.
              </p>
            </div>
          </div>
        )}
      </div>

      {showCamera && (
        <CameraCapture onCapture={handleImage} onCancel={() => setShowCamera(false)} />
      )}
    </div>
  );
}
