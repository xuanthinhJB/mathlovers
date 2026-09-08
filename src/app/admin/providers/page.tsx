"use client";

import { useCallback, useEffect, useState } from "react";
import { VENDOR_PRESETS, type ProviderRole, type ProviderVendor } from "@/lib/types";

interface Row {
  id: string;
  name: string;
  role: ProviderRole;
  provider: ProviderVendor;
  base_url: string;
  model: string;
  temperature: number;
  max_tokens: number;
  is_default: boolean;
  is_active: boolean;
  has_key: boolean;
  key_preview: string;
}

const BLANK = {
  name: "",
  role: "text" as ProviderRole,
  provider: "deepseek" as ProviderVendor,
  base_url: VENDOR_PRESETS.deepseek.base_url,
  model: "deepseek-chat",
  api_key: "",
  temperature: 0.4,
  max_tokens: 1200,
  is_default: true,
  is_active: true,
};

export default function ProvidersPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState({ ...BLANK });
  const [editing, setEditing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/providers");
    const data = await res.json();
    setRows(data.providers ?? []);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  function setVendor(vendor: ProviderVendor) {
    const preset = VENDOR_PRESETS[vendor];
    setForm((f) => ({
      ...f,
      provider: vendor,
      base_url: preset.base_url || f.base_url,
      model: preset.models[0] ?? f.model,
    }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMsg(null);
    const url = editing ? `/api/admin/providers/${editing}` : "/api/admin/providers";
    const res = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "Không lưu được.");
      return;
    }
    setMsg(editing ? "Đã cập nhật." : "Đã thêm provider.");
    setForm({ ...BLANK });
    setEditing(null);
    load();
  }

  function edit(r: Row) {
    setEditing(r.id);
    setForm({
      name: r.name,
      role: r.role,
      provider: r.provider,
      base_url: r.base_url,
      model: r.model,
      api_key: "",
      temperature: r.temperature,
      max_tokens: r.max_tokens,
      is_default: r.is_default,
      is_active: r.is_active,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function test(id: string) {
    setMsg(null);
    setError(null);
    setBusy(true);
    const res = await fetch(`/api/admin/providers/${id}`, { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (data.ok) setMsg(`Kết nối OK — model trả lời: “${data.sample}”`);
    else setError(data.error ?? "Kết nối thất bại.");
  }

  async function remove(id: string) {
    setBusy(true);
    await fetch(`/api/admin/providers/${id}`, { method: "DELETE" });
    setBusy(false);
    load();
  }

  const byRole = (role: ProviderRole) => rows.filter((r) => r.role === role);

  return (
    <div>
      <h1 className="text-2xl font-bold">AI provider</h1>
      <p className="mt-1 max-w-2xl text-sm text-[var(--muted)]">
        <strong>Gợi ý (text)</strong> sinh gợi ý cho học sinh — mặc định DeepSeek.{" "}
        <strong>Đọc ảnh (vision)</strong> dùng cho chức năng chụp đề. DeepSeek hiện chủ yếu là
        model text, nên nếu muốn dùng camera hãy thêm một provider vision như Gemini hoặc OpenAI.
      </p>

      <form onSubmit={save} className="card mt-6 p-5">
        <h2 className="font-bold">{editing ? "Sửa provider" : "Thêm provider"}</h2>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="p-name">Tên hiển thị</label>
            <input
              id="p-name"
              className="field"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="DeepSeek Chat"
            />
          </div>
          <div>
            <label className="label" htmlFor="p-role">Vai trò</label>
            <select
              id="p-role"
              className="field"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value as ProviderRole })}
            >
              <option value="text">Gợi ý (text)</option>
              <option value="vision">Đọc ảnh (vision)</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-vendor">Nhà cung cấp</label>
            <select
              id="p-vendor"
              className="field"
              value={form.provider}
              onChange={(e) => setVendor(e.target.value as ProviderVendor)}
            >
              {Object.entries(VENDOR_PRESETS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="p-model">Model</label>
            <input
              id="p-model"
              className="field"
              required
              list="model-list"
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
            />
            <datalist id="model-list">
              {VENDOR_PRESETS[form.provider].models.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="p-url">Base URL</label>
            <input
              id="p-url"
              className="field"
              required
              value={form.base_url}
              onChange={(e) => setForm({ ...form, base_url: e.target.value })}
              placeholder="https://api.deepseek.com/v1"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="p-key">
              API key {editing && "(để trống nếu không đổi)"}
            </label>
            <input
              id="p-key"
              type="password"
              className="field"
              autoComplete="off"
              value={form.api_key}
              onChange={(e) => setForm({ ...form, api_key: e.target.value })}
              placeholder="sk-…"
            />
          </div>
          <div>
            <label className="label" htmlFor="p-temp">Temperature</label>
            <input
              id="p-temp"
              type="number"
              step="0.1"
              min="0"
              max="2"
              className="field"
              value={form.temperature}
              onChange={(e) => setForm({ ...form, temperature: Number(e.target.value) })}
            />
          </div>
          <div>
            <label className="label" htmlFor="p-max">Max tokens</label>
            <input
              id="p-max"
              type="number"
              min="128"
              max="8192"
              className="field"
              value={form.max_tokens}
              onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) })}
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm({ ...form, is_default: e.target.checked })}
            />
            Đặt làm mặc định cho vai trò này
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            />
            Đang bật
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-[var(--danger)]">{error}</p>}
        {msg && <p className="mt-4 text-sm text-[var(--accent)]">{msg}</p>}

        <div className="mt-5 flex gap-2">
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {editing ? "Cập nhật" : "Thêm provider"}
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

      {(["text", "vision"] as ProviderRole[]).map((role) => (
        <section key={role} className="mt-8">
          <h2 className="font-bold">
            {role === "text" ? "Provider gợi ý" : "Provider đọc ảnh"}
          </h2>
          {byRole(role).length === 0 ? (
            <p className="mt-2 text-sm text-[var(--muted)]">Chưa có provider nào.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {byRole(role).map((r) => (
                <div key={r.id} className="card flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-[200px] flex-1">
                    <div className="font-semibold">
                      {r.name}
                      {r.is_default && (
                        <span className="ml-2 rounded-full bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-bold text-[var(--accent)]">
                          mặc định
                        </span>
                      )}
                      {!r.is_active && (
                        <span className="ml-2 text-xs text-[var(--muted)]">(tắt)</span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-[var(--muted)]">
                      {r.model} · {r.base_url} ·{" "}
                      {r.has_key ? `key ${r.key_preview}` : "chưa có API key"}
                    </div>
                  </div>
                  <button type="button" className="btn btn-ghost !py-1.5 !text-sm" onClick={() => test(r.id)} disabled={busy}>
                    Kiểm tra
                  </button>
                  <button type="button" className="btn btn-ghost !py-1.5 !text-sm" onClick={() => edit(r)}>
                    Sửa
                  </button>
                  <button type="button" className="btn btn-danger !py-1.5 !text-sm" onClick={() => remove(r.id)} disabled={busy}>
                    Xoá
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
