"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  autoBounds,
  autoBounds3,
  type FigureObject,
  type FigureSpec,
} from "@/lib/figure";

/* JSXGraph không có kiểu TS đầy đủ cho API tạo phần tử — dùng kiểu tối thiểu. */
type JxgElement = { setAttribute?: (a: Record<string, unknown>) => void };
type JxgCreator = {
  create: (kind: string, parents: unknown[], attrs?: Record<string, unknown>) => JxgElement;
};
type JxgBoard = JxgCreator & { update: () => void };
type JxgView = JxgCreator & { setView?: (az: number, el: number) => void };
type Jxg = {
  JSXGraph: {
    initBoard: (id: string, attrs: Record<string, unknown>) => JxgBoard;
    freeBoard: (b: JxgBoard) => void;
  };
};

function palette() {
  const dark = document.documentElement.getAttribute("data-theme") === "dark";
  return dark
    ? { stroke: "#c3c4c2", point: "#4bb193", accent: "#4bb193", label: "#ececeb" }
    : { stroke: "#4a4945", point: "#1a6b58", accent: "#1a6b58", label: "#1c1c19" };
}

/** Các cạnh không trùng lặp của một danh sách mặt. */
function uniqueEdges(faces: string[][]): [string, string][] {
  const seen = new Set<string>();
  const edges: [string, string][] = [];
  for (const face of faces) {
    for (let i = 0; i < face.length; i++) {
      const a = face[i];
      const b = face[(i + 1) % face.length];
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      edges.push([a, b]);
    }
  }
  return edges;
}

export default function FigureBoard({ spec }: { spec: FigureSpec }) {
  const rid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const containerId = `jxg-${rid}`;
  const boardRef = useRef<JxgBoard | null>(null);
  const viewRef = useRef<JxgView | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const is3d = spec.dim === "3d";

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
      viewRef.current = null;
    }

    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = "";

    const c = palette();
    const spec3d = spec.dim === "3d";

    const board = JXG.JSXGraph.initBoard(containerId, {
      boundingbox: spec3d ? [-8, 8, 8, -8] : autoBounds(spec),
      keepaspectratio: true,
      axis: false,
      grid: false,
      showCopyright: false,
      showNavigation: false,
      pan: { enabled: !spec3d, needShift: false },
      zoom: spec3d
        ? { wheel: false }
        : { wheel: true, needShift: true, pinchHorizontal: false, pinchVertical: false },
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
    const pointAttrs = (name: string, fixed: boolean) => ({
      name,
      size: 3,
      strokeColor: c.point,
      fillColor: c.point,
      fixed,
      showInfobox: false,
      label: labelAttrs,
    });

    /* ---------------- 3D ---------------- */
    if (spec3d) {
      const [xr, yr, zr] = autoBounds3(spec);
      const view = board.create(
        "view3d",
        [
          [-7.2, -7.2],
          [14.4, 14.4],
          [xr, yr, zr],
        ],
        {
          projection: "central",
          trackball: { enabled: true },
          depthOrder: { enabled: true },
          axesPosition: "none",
          xPlaneRear: { visible: false },
          yPlaneRear: { visible: false },
          zPlaneRear: { visible: false },
          az: { slider: { visible: false } },
          el: { slider: { visible: false } },
          bank: { slider: { visible: false } },
        }
      ) as JxgView;
      viewRef.current = view;

      const edge = (a: string, b: string, dash?: boolean) =>
        view.create("line3d", [get(a), get(b)], {
          ...lineAttrs(dash),
          straightFirst: false,
          straightLast: false,
        });

      for (const o of spec.objects as FigureObject[]) {
        switch (o.t) {
          case "point3":
            refs.set(
              o.id,
              view.create("point3d", [o.x, o.y, o.z], pointAttrs(o.label ?? o.id, o.fixed === true))
            );
            break;

          case "midpoint3": {
            const [a, b] = o.of;
            const pa = get(a) as unknown as { X(): number; Y(): number; Z(): number };
            const pb = get(b) as unknown as { X(): number; Y(): number; Z(): number };
            refs.set(
              o.id,
              view.create(
                "point3d",
                [
                  () => (pa.X() + pb.X()) / 2,
                  () => (pa.Y() + pb.Y()) / 2,
                  () => (pa.Z() + pb.Z()) / 2,
                ],
                { ...pointAttrs(o.label ?? o.id, true), size: 2.5, strokeColor: c.accent, fillColor: c.accent }
              )
            );
            break;
          }

          case "segment3": {
            const e = edge(o.from, o.to, o.dash);
            if (o.id) refs.set(o.id, e);
            break;
          }

          case "line3": {
            const e = view.create("line3d", [get(o.from), get(o.to)], {
              ...lineAttrs(o.dash),
              straightFirst: true,
              straightLast: true,
            });
            if (o.id) refs.set(o.id, e);
            break;
          }

          case "face": {
            const e = view.create("polygon3d", [o.points.map(get)], {
              fillColor: c.accent,
              fillOpacity: 0.2,
              strokeColor: c.stroke,
              strokeWidth: 1.6,
              highlight: false,
              vertices: { visible: false },
            });
            if (o.id) refs.set(o.id, e);
            for (const [a, b] of uniqueEdges([o.points])) edge(a, b);
            break;
          }

          case "solid": {
            for (const face of o.faces) {
              view.create("polygon3d", [face.map(get)], {
                fillColor: c.accent,
                fillOpacity: 0.16,
                strokeColor: c.stroke,
                strokeWidth: 1.4,
                highlight: false,
                vertices: { visible: false },
              });
            }
            for (const [a, b] of uniqueEdges(o.faces)) edge(a, b);
            break;
          }

          case "sphere3": {
            const parents = o.through ? [get(o.center), get(o.through)] : [get(o.center), o.r];
            const e = view.create("sphere3d", parents, {
              strokeColor: c.stroke,
              strokeWidth: 1.2,
              fillColor: c.accent,
              fillOpacity: 0.12,
              highlight: false,
            });
            if (o.id) refs.set(o.id, e);
            break;
          }

          case "plane3": {
            const [p1, p2, p3] = o.points;
            const e = view.create("plane3d", [get(p1), get(p2), get(p3)], {
              strokeColor: c.accent,
              strokeWidth: 1,
              fillColor: c.accent,
              fillOpacity: 0.12,
              highlight: false,
              threepoints: true,
            });
            if (o.id) refs.set(o.id, e);
            break;
          }

          case "text3":
            view.create("text3d", [[o.x, o.y, o.z], o.text], {
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
      return;
    }

    /* ---------------- 2D ---------------- */
    for (const o of spec.objects as FigureObject[]) {
      switch (o.t) {
        case "point":
          refs.set(
            o.id,
            board.create("point", [o.x, o.y], pointAttrs(o.label ?? o.id, o.fixed === true))
          );
          break;

        case "midpoint":
          refs.set(
            o.id,
            board.create("midpoint", [get(o.of[0]), get(o.of[1])], {
              ...pointAttrs(o.label ?? o.id, false),
              size: 2.5,
              strokeColor: c.accent,
              fillColor: c.accent,
            })
          );
          break;

        case "intersection":
          refs.set(
            o.id,
            board.create("intersection", [get(o.of[0]), get(o.of[1]), o.which ?? 0], {
              ...pointAttrs(o.label ?? o.id, false),
              size: 2.5,
              strokeColor: c.accent,
              fillColor: c.accent,
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
          const e = board.create("polygon", o.points.map(get), {
            borders: { strokeColor: c.stroke, strokeWidth: 1.6, highlight: false },
            fillColor: c.accent,
            fillOpacity: 0.09,
            highlight: false,
            vertices: { visible: false },
            withLines: true,
          });
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

  function setAngle(az: number, elv: number) {
    viewRef.current?.setView?.((az * Math.PI) / 180, (elv * Math.PI) / 180);
    boardRef.current?.update();
  }

  if (failed) {
    return (
      <div className="card p-4 text-sm text-[var(--danger)]">Không dựng được hình: {failed}</div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--line)] px-3 py-2">
        <span className="text-[12px] font-semibold text-[var(--ink-2)]">
          {spec.title || (is3d ? "Hình không gian" : "Hình minh hoạ")}
        </span>
        <span className="text-[11.5px] text-[var(--faint)]">
          {is3d ? "Kéo để xoay khối" : "Kéo các điểm để quan sát"}
        </span>
        <div className="ml-auto flex items-center gap-1">
          {is3d && (
            <>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setAngle(-60, 20)}>
                Góc nghiêng
              </button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setAngle(-90, 0)}>
                Nhìn thẳng
              </button>
              <button type="button" className="btn btn-quiet btn-sm" onClick={() => setAngle(-90, 89)}>
                Nhìn từ trên
              </button>
            </>
          )}
          <button
            type="button"
            className="btn btn-quiet btn-sm"
            onClick={() => setNonce((n) => n + 1)}
          >
            Đặt lại
          </button>
        </div>
      </div>
      <div
        id={containerId}
        className="jxgbox h-[340px] w-full touch-none sm:h-[420px]"
        style={{ background: "transparent" }}
      />
    </div>
  );
}
