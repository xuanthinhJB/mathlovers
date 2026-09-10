"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { autoBounds, type FigureObject, type FigureSpec } from "@/lib/figure";

/* JSXGraph không có kiểu TS đầy đủ cho API tạo phần tử — dùng kiểu tối thiểu. */
type JxgElement = { setAttribute?: (a: Record<string, unknown>) => void };
type JxgBoard = {
  create: (kind: string, parents: unknown[], attrs?: Record<string, unknown>) => JxgElement;
  on: (evt: string, fn: () => void) => void;
  update: () => void;
};
type Jxg = {
  JSXGraph: {
    initBoard: (id: string, attrs: Record<string, unknown>) => JxgBoard;
    freeBoard: (b: JxgBoard) => void;
  };
};

function palette() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  return dark
    ? {
        stroke: "#c3c4c2",
        point: "#4bb193",
        pointFill: "#4bb193",
        accent: "#4bb193",
        fill: "#4bb19322",
        label: "#ececeb",
        bg: "none",
      }
    : {
        stroke: "#4a4945",
        point: "#1a6b58",
        pointFill: "#1a6b58",
        accent: "#1a6b58",
        fill: "#1a6b5818",
        label: "#1c1c19",
        bg: "none",
      };
}

export default function FigureBoard({ spec }: { spec: FigureSpec }) {
  const rid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const containerId = `jxg-${rid}`;
  const boardRef = useRef<JxgBoard | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const draw = useCallback(async () => {
    const mod = (await import("jsxgraph")) as unknown as { default?: Jxg } & Jxg;
    const JXG: Jxg = mod.default ?? mod;

    if (boardRef.current) {
      try {
        JXG.JSXGraph.freeBoard(boardRef.current);
      } catch {
        /* board đã bị gỡ */
      }
      boardRef.current = null;
    }

    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";

    const c = palette();
    const bounds = autoBounds(spec);

    const board = JXG.JSXGraph.initBoard(containerId, {
      boundingbox: bounds,
      keepaspectratio: true,
      axis: false,
      grid: false,
      showCopyright: false,
      showNavigation: false,
      pan: { enabled: true, needShift: false },
      zoom: { wheel: true, needShift: true, pinchHorizontal: false, pinchVertical: false },
    });
    boardRef.current = board;

    const refs = new Map<string, JxgElement>();
    const get = (id: string) => {
      const e = refs.get(id);
      if (!e) throw new Error(`Thiếu đối tượng "${id}".`);
      return e;
    };

    const lineAttrs = (dash?: boolean) => ({
      strokeColor: c.stroke,
      strokeWidth: 1.6,
      dash: dash ? 2 : 0,
      highlight: false,
      fixed: true,
    });
    const labelAttrs = { fontSize: 14, color: c.label, offset: [6, 6] };

    for (const o of spec.objects as FigureObject[]) {
      switch (o.t) {
        case "point":
          refs.set(
            o.id,
            board.create("point", [o.x, o.y], {
              name: o.label ?? o.id,
              size: 3,
              strokeColor: c.point,
              fillColor: c.pointFill,
              fixed: o.fixed === true,
              showInfobox: false,
              label: labelAttrs,
            })
          );
          break;

        case "midpoint":
          refs.set(
            o.id,
            board.create("midpoint", [get(o.of[0]), get(o.of[1])], {
              name: o.label ?? o.id,
              size: 2.5,
              strokeColor: c.accent,
              fillColor: c.accent,
              showInfobox: false,
              label: labelAttrs,
            })
          );
          break;

        case "intersection":
          refs.set(
            o.id,
            board.create("intersection", [get(o.of[0]), get(o.of[1]), o.which ?? 0], {
              name: o.label ?? o.id,
              size: 2.5,
              strokeColor: c.accent,
              fillColor: c.accent,
              showInfobox: false,
              label: labelAttrs,
            })
          );
          break;

        case "segment": {
          const e = board.create("segment", [get(o.from), get(o.to)], {
            ...lineAttrs(o.dash),
            ...(o.label ? { name: o.label, withLabel: true, label: labelAttrs } : {}),
          });
          if (o.id) refs.set(o.id, e);
          break;
        }

        case "line": {
          const e = board.create("line", [get(o.from), get(o.to)], lineAttrs(o.dash));
          if (o.id) refs.set(o.id, e);
          break;
        }

        case "ray": {
          const e = board.create("line", [get(o.from), get(o.to)], {
            ...lineAttrs(o.dash),
            straightFirst: false,
          });
          if (o.id) refs.set(o.id, e);
          break;
        }

        case "circle": {
          const parents = o.through ? [get(o.center), get(o.through)] : [get(o.center), o.r];
          const e = board.create("circle", parents, lineAttrs(o.dash));
          if (o.id) refs.set(o.id, e);
          break;
        }

        case "polygon": {
          const e = board.create(
            "polygon",
            o.points.map(get),
            {
              borders: { strokeColor: c.stroke, strokeWidth: 1.6, highlight: false },
              fillColor: c.accent,
              fillOpacity: 0.09,
              highlight: false,
              vertices: { visible: false },
              withLines: true,
            }
          );
          if (o.id) refs.set(o.id, e);
          break;
        }

        case "angle":
          board.create("angle", [get(o.from), get(o.at), get(o.to)], {
            radius: o.right ? 0.45 : 0.7,
            type: o.right ? "square" : "sector",
            strokeColor: c.accent,
            fillColor: c.accent,
            fillOpacity: 0.16,
            highlight: false,
            name: o.label ?? "",
            withLabel: Boolean(o.label),
            label: { fontSize: 13, color: c.label },
          });
          break;

        case "perpendicular": {
          const e = board.create("perpendicular", [get(o.line), get(o.through)], lineAttrs(o.dash));
          if (o.id) refs.set(o.id, e);
          break;
        }

        case "parallel": {
          const e = board.create("parallel", [get(o.line), get(o.through)], lineAttrs(o.dash));
          if (o.id) refs.set(o.id, e);
          break;
        }

        case "text":
          board.create("text", [o.x, o.y, o.text], {
            fontSize: 13,
            color: c.label,
            fixed: true,
            highlight: false,
          });
          break;
      }
    }

    board.update();
    setFailed(null);
  }, [containerId, spec]);

  useEffect(() => {
    let cancelled = false;
    // draw() là async: mọi setState bên trong chỉ chạy sau khi promise settle,
    // không phải cập nhật đồng bộ trong thân effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    draw().catch((e: unknown) => {
      if (cancelled) return;
      setFailed(e instanceof Error ? e.message : "Không dựng được hình.");
    });
    return () => {
      cancelled = true;
    };
  }, [draw, nonce]);

  // Vẽ lại khi đổi sáng/tối để màu khớp giao diện
  useEffect(() => {
    const observer = new MutationObserver(() => setNonce((n) => n + 1));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const board = boardRef.current;
    return () => {
      if (!board) return;
      import("jsxgraph")
        .then((mod) => {
          const JXG = ((mod as unknown as { default?: Jxg }).default ??
            (mod as unknown as Jxg)) as Jxg;
          try {
            JXG.JSXGraph.freeBoard(board);
          } catch {
            /* đã gỡ */
          }
        })
        .catch(() => {});
    };
  }, []);

  if (failed) {
    return (
      <div className="card p-4 text-sm text-[var(--danger)]">
        Không dựng được hình: {failed}
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-3 py-2">
        <span className="text-[12px] font-semibold text-[var(--ink-2)]">
          {spec.title || "Hình minh hoạ"}
        </span>
        <span className="text-[11.5px] text-[var(--faint)]">Kéo các điểm để quan sát</span>
        <button
          type="button"
          className="btn btn-quiet btn-sm ml-auto"
          onClick={() => setNonce((n) => n + 1)}
        >
          Đặt lại
        </button>
      </div>
      <div
        id={containerId}
        className="jxgbox h-[320px] w-full touch-none sm:h-[380px]"
        style={{ background: "transparent" }}
      />
    </div>
  );
}
