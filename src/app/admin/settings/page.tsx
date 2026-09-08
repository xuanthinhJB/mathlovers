"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    base_system_prompt: "",
    vision_ocr_prompt: "",
    hint_levels: 4,
  });
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) {
          setForm({
            base_system_prompt: d.settings.base_system_prompt ?? "",
            vision_ocr_prompt: d.settings.vision_ocr_prompt ?? "",
            hint_levels: d.settings.hint_levels ?? 4,
          });
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setError(null);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) setError(data.error ?? "Không lưu được.");
    else setMsg("Đã lưu.");
  }

  if (!loaded) return <p className="text-sm text-[var(--muted)]">Đang tải…</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold">Prompt chung</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
        Áp dụng cho mọi bài toán. Prompt riêng của từng bài sẽ được nối thêm phía sau. Hệ thống
        luôn tự động chèn một lớp rào chắn cấm đưa lời giải, không thể tắt.
      </p>

      <form onSubmit={save} className="card mt-6 space-y-5 p-5">
        <div>
          <label className="label" htmlFor="base">
            System prompt gợi ý (áp dụng toàn hệ thống)
          </label>
          <textarea
            id="base"
            className="field font-mono !text-[13px]"
            rows={20}
            value={form.base_system_prompt}
            onChange={(e) => setForm({ ...form, base_system_prompt: e.target.value })}
          />
        </div>

        <div>
          <label className="label" htmlFor="ocr">
            Prompt đọc ảnh đề bài (provider vision)
          </label>
          <textarea
            id="ocr"
            className="field font-mono !text-[13px]"
            rows={6}
            value={form.vision_ocr_prompt}
            onChange={(e) => setForm({ ...form, vision_ocr_prompt: e.target.value })}
          />
        </div>

        <div className="max-w-[200px]">
          <label className="label" htmlFor="levels">
            Số bậc gợi ý tối đa
          </label>
          <input
            id="levels"
            type="number"
            min={1}
            max={8}
            className="field"
            value={form.hint_levels}
            onChange={(e) => setForm({ ...form, hint_levels: Number(e.target.value) })}
          />
        </div>

        {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        {msg && <p className="text-sm text-[var(--accent)]">{msg}</p>}

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Đang lưu…" : "Lưu thay đổi"}
        </button>
      </form>
    </div>
  );
}
