/**
 * Đặc tả hình hình học.
 *
 * Model KHÔNG sinh code — chỉ sinh dữ liệu theo đúng schema dưới đây, rồi máy chủ
 * kiểm tra lại trước khi gửi cho trình duyệt vẽ. Nhờ vậy không có đường nào để
 * output của model chạy như mã.
 */

export type PointLike = { id: string };

export type FigureObject =
  | { t: "point"; id: string; x: number; y: number; label?: string; fixed?: boolean }
  | { t: "midpoint"; id: string; of: [string, string]; label?: string }
  | { t: "intersection"; id: string; of: [string, string]; which?: 0 | 1; label?: string }
  | { t: "segment"; id?: string; from: string; to: string; label?: string; dash?: boolean }
  | { t: "line"; id?: string; from: string; to: string; dash?: boolean }
  | { t: "ray"; id?: string; from: string; to: string; dash?: boolean }
  | {
      t: "circle";
      id?: string;
      center: string;
      through?: string;
      r?: number;
      dash?: boolean;
    }
  | { t: "polygon"; id?: string; points: string[]; label?: string }
  | { t: "angle"; at: string; from: string; to: string; label?: string; right?: boolean }
  | { t: "perpendicular"; id?: string; line: string; through: string; dash?: boolean }
  | { t: "parallel"; id?: string; line: string; through: string; dash?: boolean }
  | { t: "text"; x: number; y: number; text: string };

export interface FigureSpec {
  title?: string;
  bounds?: [number, number, number, number];
  objects: FigureObject[];
}

const MAX_OBJECTS = 60;
const MAX_COORD = 1000;
const MAX_LABEL = 24;
const MAX_TEXT = 80;

/** Loại đối tượng có thể dùng làm điểm. */
const POINT_KINDS = new Set(["point", "midpoint", "intersection"]);
/** Loại đối tượng có thể dùng làm đường (để dựng vuông góc / song song / giao điểm). */
const LINEAR_KINDS = new Set(["segment", "line", "ray", "perpendicular", "parallel"]);
const CURVE_KINDS = new Set([...LINEAR_KINDS, "circle"]);

export class FigureError extends Error {}

function num(v: unknown, what: string): number {
  if (typeof v !== "number" || !Number.isFinite(v)) {
    throw new FigureError(`${what} phải là số hữu hạn.`);
  }
  if (Math.abs(v) > MAX_COORD) {
    throw new FigureError(`${what} vượt quá giới hạn ±${MAX_COORD}.`);
  }
  return v;
}

function str(v: unknown, what: string, max: number): string {
  if (typeof v !== "string") throw new FigureError(`${what} phải là chuỗi.`);
  const s = v.trim();
  if (!s) throw new FigureError(`${what} không được rỗng.`);
  if (s.length > max) throw new FigureError(`${what} dài quá ${max} ký tự.`);
  return s;
}

function optLabel(v: unknown): string | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  return str(v, "Nhãn", MAX_LABEL);
}

/**
 * Kiểm tra và chuẩn hoá spec do model trả về.
 * Ném FigureError với thông điệp tiếng Việt nếu dữ liệu không dùng được.
 */
export function validateFigure(input: unknown): FigureSpec {
  if (typeof input !== "object" || input === null) {
    throw new FigureError("Dữ liệu hình không phải một đối tượng.");
  }
  const raw = input as Record<string, unknown>;
  const list = raw.objects;
  if (!Array.isArray(list) || list.length === 0) {
    throw new FigureError("Hình không có đối tượng nào.");
  }
  if (list.length > MAX_OBJECTS) {
    throw new FigureError(`Hình có quá ${MAX_OBJECTS} đối tượng.`);
  }

  // id → loại, dùng để kiểm tra tham chiếu. Chỉ cho phép tham chiếu tới thứ đã khai báo trước.
  const kinds = new Map<string, string>();
  const objects: FigureObject[] = [];

  const refPoint = (v: unknown, what: string): string => {
    const id = str(v, what, 40);
    const kind = kinds.get(id);
    if (!kind) throw new FigureError(`${what} "${id}" chưa được khai báo trước đó.`);
    if (!POINT_KINDS.has(kind)) throw new FigureError(`${what} "${id}" không phải điểm.`);
    return id;
  };

  const refOf = (v: unknown, what: string, allowed: Set<string>): string => {
    const id = str(v, what, 40);
    const kind = kinds.get(id);
    if (!kind) throw new FigureError(`${what} "${id}" chưa được khai báo trước đó.`);
    if (!allowed.has(kind)) throw new FigureError(`${what} "${id}" không dùng được ở đây.`);
    return id;
  };

  const declare = (id: unknown, kind: string, required: boolean): string | undefined => {
    if (id === undefined || id === null || id === "") {
      if (required) throw new FigureError(`Đối tượng ${kind} thiếu id.`);
      return undefined;
    }
    const s = str(id, "id", 40);
    if (!/^[A-Za-z][A-Za-z0-9_']{0,39}$/.test(s)) {
      throw new FigureError(`id "${s}" không hợp lệ.`);
    }
    if (kinds.has(s)) throw new FigureError(`id "${s}" bị trùng.`);
    kinds.set(s, kind);
    return s;
  };

  for (const item of list) {
    if (typeof item !== "object" || item === null) {
      throw new FigureError("Có phần tử không phải đối tượng.");
    }
    const o = item as Record<string, unknown>;
    const t = o.t;

    switch (t) {
      case "point": {
        const id = declare(o.id, "point", true)!;
        objects.push({
          t: "point",
          id,
          x: num(o.x, `Toạ độ x của ${id}`),
          y: num(o.y, `Toạ độ y của ${id}`),
          label: optLabel(o.label) ?? id,
          fixed: o.fixed === true,
        });
        break;
      }
      case "midpoint": {
        const of = o.of;
        if (!Array.isArray(of) || of.length !== 2) {
          throw new FigureError("midpoint cần đúng hai điểm trong 'of'.");
        }
        const a = refPoint(of[0], "Điểm đầu của midpoint");
        const b = refPoint(of[1], "Điểm cuối của midpoint");
        const id = declare(o.id, "midpoint", true)!;
        objects.push({ t: "midpoint", id, of: [a, b], label: optLabel(o.label) ?? id });
        break;
      }
      case "intersection": {
        const of = o.of;
        if (!Array.isArray(of) || of.length !== 2) {
          throw new FigureError("intersection cần đúng hai đối tượng trong 'of'.");
        }
        const a = refOf(of[0], "Đối tượng thứ nhất của intersection", CURVE_KINDS);
        const b = refOf(of[1], "Đối tượng thứ hai của intersection", CURVE_KINDS);
        const id = declare(o.id, "intersection", true)!;
        const which = o.which === 1 ? 1 : 0;
        objects.push({
          t: "intersection",
          id,
          of: [a, b],
          which,
          label: optLabel(o.label) ?? id,
        });
        break;
      }
      case "segment":
      case "line":
      case "ray": {
        const from = refPoint(o.from, `Điểm đầu của ${t}`);
        const to = refPoint(o.to, `Điểm cuối của ${t}`);
        if (from === to) throw new FigureError(`${t} có hai đầu trùng nhau.`);
        const id = declare(o.id, t, false);
        const base = { from, to, dash: o.dash === true } as const;
        if (t === "segment") {
          objects.push({ t, id, ...base, label: optLabel(o.label) });
        } else {
          objects.push({ t, id, ...base });
        }
        break;
      }
      case "circle": {
        const center = refPoint(o.center, "Tâm đường tròn");
        let through: string | undefined;
        let r: number | undefined;
        if (o.through !== undefined && o.through !== null && o.through !== "") {
          through = refPoint(o.through, "Điểm trên đường tròn");
        } else {
          r = num(o.r, "Bán kính");
          if (r <= 0) throw new FigureError("Bán kính phải dương.");
        }
        const id = declare(o.id, "circle", false);
        objects.push({ t: "circle", id, center, through, r, dash: o.dash === true });
        break;
      }
      case "polygon": {
        const pts = o.points;
        if (!Array.isArray(pts) || pts.length < 3) {
          throw new FigureError("Đa giác cần ít nhất ba đỉnh.");
        }
        if (pts.length > 12) throw new FigureError("Đa giác quá nhiều đỉnh.");
        const points = pts.map((p, i) => refPoint(p, `Đỉnh ${i + 1} của đa giác`));
        const id = declare(o.id, "polygon", false);
        objects.push({ t: "polygon", id, points, label: optLabel(o.label) });
        break;
      }
      case "angle": {
        const at = refPoint(o.at, "Đỉnh góc");
        const from = refPoint(o.from, "Cạnh đầu của góc");
        const to = refPoint(o.to, "Cạnh sau của góc");
        if (at === from || at === to || from === to) {
          throw new FigureError("Góc cần ba điểm khác nhau.");
        }
        objects.push({
          t: "angle",
          at,
          from,
          to,
          label: optLabel(o.label),
          right: o.right === true,
        });
        break;
      }
      case "perpendicular":
      case "parallel": {
        const line = refOf(o.line, `Đường tham chiếu của ${t}`, LINEAR_KINDS);
        const through = refPoint(o.through, `Điểm đi qua của ${t}`);
        const id = declare(o.id, t, false);
        objects.push({ t, id, line, through, dash: o.dash !== false });
        break;
      }
      case "text": {
        objects.push({
          t: "text",
          x: num(o.x, "Toạ độ x của nhãn"),
          y: num(o.y, "Toạ độ y của nhãn"),
          text: str(o.text, "Nội dung nhãn", MAX_TEXT),
        });
        break;
      }
      default:
        throw new FigureError(`Loại đối tượng "${String(t)}" không được hỗ trợ.`);
    }
  }

  const hasPoint = objects.some((o) => o.t === "point");
  if (!hasPoint) throw new FigureError("Hình phải có ít nhất một điểm tự do.");

  let bounds: FigureSpec["bounds"];
  if (Array.isArray(raw.bounds) && raw.bounds.length === 4) {
    const b = raw.bounds.map((v, i) => num(v, `bounds[${i}]`)) as [
      number,
      number,
      number,
      number,
    ];
    if (b[2] > b[0] && b[1] > b[3]) bounds = b;
  }

  return {
    title: raw.title ? str(raw.title, "Tiêu đề", 80) : undefined,
    bounds,
    objects,
  };
}

/** Khung nhìn vừa với các điểm tự do, chừa lề. */
export function autoBounds(spec: FigureSpec): [number, number, number, number] {
  if (spec.bounds) return spec.bounds;
  const pts = spec.objects.filter(
    (o): o is Extract<FigureObject, { t: "point" }> => o.t === "point"
  );
  if (pts.length === 0) return [-6, 6, 6, -6];

  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  const w = Math.max(maxX - minX, 1);
  const h = Math.max(maxY - minY, 1);
  const pad = Math.max(w, h) * 0.28 + 0.6;

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const half = Math.max(w, h) / 2 + pad;

  return [cx - half, cy + half, cx + half, cy - half];
}
