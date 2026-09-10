/**
 * Kiểm tra hai thứ dễ sai nhất của tính năng vẽ hình:
 *  1) validateFigure có chặn được dữ liệu hỏng và chấp nhận dữ liệu tốt không
 *  2) các lệnh board.create(...) có đúng API JSXGraph không (chạy thật trong Chromium)
 *
 * Chạy: node --experimental-strip-types scripts/check-figure.mjs
 */
import { readFileSync } from "node:fs";
import { validateFigure, autoBounds } from "../src/lib/figure.ts";

let failures = 0;
function check(name, fn) {
  try {
    fn();
    console.log(`  ok   ${name}`);
  } catch (e) {
    failures++;
    console.log(`  FAIL ${name}: ${e.message}`);
  }
}
function expectThrows(name, input) {
  check(name, () => {
    let threw = false;
    try {
      validateFigure(input);
    } catch {
      threw = true;
    }
    if (!threw) throw new Error("lẽ ra phải bị từ chối");
  });
}

// ---------- 1. Validator ----------
console.log("\nValidator");

const good = {
  title: "Tam giác vuông tại A",
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point", id: "B", x: 4, y: 0 },
    { t: "point", id: "C", x: 0, y: 3 },
    { t: "polygon", id: "p", points: ["A", "B", "C"] },
    { t: "segment", id: "BC", from: "B", to: "C" },
    { t: "midpoint", id: "M", of: ["B", "C"] },
    { t: "perpendicular", id: "h", line: "BC", through: "A" },
    { t: "intersection", id: "H", of: ["h", "BC"] },
    { t: "circle", id: "c1", center: "M", through: "B" },
    { t: "angle", at: "A", from: "B", to: "C", right: true },
    { t: "parallel", id: "k", line: "BC", through: "A" },
    { t: "ray", id: "r", from: "A", to: "B" },
    { t: "line", id: "d", from: "A", to: "C" },
    { t: "text", x: 1, y: 2, text: "ghi chú" },
  ],
};

check("chấp nhận hình hợp lệ đầy đủ loại đối tượng", () => {
  const spec = validateFigure(good);
  if (spec.objects.length !== good.objects.length) throw new Error("mất đối tượng");
});

check("autoBounds bao được mọi điểm", () => {
  const [xmin, ymax, xmax, ymin] = autoBounds(validateFigure(good));
  if (!(xmin < 0 && xmax > 4 && ymin < 0 && ymax > 3)) {
    throw new Error(`khung nhìn không bao đủ: ${[xmin, ymax, xmax, ymin]}`);
  }
});

expectThrows("từ chối tham chiếu tới id chưa khai báo", {
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "segment", from: "A", to: "Z" },
  ],
});
expectThrows("từ chối id trùng", {
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point", id: "A", x: 1, y: 1 },
  ],
});
expectThrows("từ chối tham chiếu tới sau (forward reference)", {
  objects: [
    { t: "midpoint", id: "M", of: ["A", "B"] },
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point", id: "B", x: 2, y: 0 },
  ],
});
expectThrows("từ chối loại đối tượng lạ", {
  objects: [{ t: "point", id: "A", x: 0, y: 0 }, { t: "eval", code: "alert(1)" }],
});
expectThrows("từ chối toạ độ không hữu hạn", {
  objects: [{ t: "point", id: "A", x: Infinity, y: 0 }],
});
expectThrows("từ chối toạ độ vượt giới hạn", {
  objects: [{ t: "point", id: "A", x: 1e9, y: 0 }],
});
expectThrows("từ chối id không hợp lệ", {
  objects: [{ t: "point", id: "1;drop", x: 0, y: 0 }],
});
expectThrows("từ chối hình rỗng", { objects: [] });
expectThrows("từ chối dùng điểm làm đường", {
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point", id: "B", x: 1, y: 1 },
    { t: "perpendicular", line: "A", through: "B" },
  ],
});
expectThrows("từ chối đa giác dưới ba đỉnh", {
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point", id: "B", x: 1, y: 0 },
    { t: "polygon", points: ["A", "B"] },
  ],
});

// ---------- 2. JSXGraph thật trong trình duyệt ----------
// Phần này cần Playwright. Không có thì bỏ qua, phần validator vẫn chạy được.
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("\nJSXGraph (Chromium): bỏ qua — chưa cài playwright (npm i -D playwright).");
  console.log(failures === 0 ? "\nTất cả kiểm tra đều đạt." : `\n${failures} kiểm tra thất bại.`);
  process.exit(failures === 0 ? 0 : 1);
}

console.log("\nJSXGraph (Chromium)");

const core = readFileSync("node_modules/jsxgraph/distrib/jsxgraphcore.js", "utf8");
const spec = validateFigure(good);
const bounds = autoBounds(spec);

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}
);
const page = await browser.newPage();
const consoleErrors = [];
page.on("pageerror", (e) => consoleErrors.push(String(e)));
page.on("console", (m) => {
  if (m.type() === "error") consoleErrors.push(m.text());
});

await page.setContent(
  `<!doctype html><html><body><div id="box" style="width:600px;height:400px"></div></body></html>`
);
await page.addScriptTag({ content: core });

const result = await page.evaluate(
  ({ spec, bounds }) => {
    const board = JXG.JSXGraph.initBoard("box", {
      boundingbox: bounds,
      keepaspectratio: true,
      axis: false,
      grid: false,
      showCopyright: false,
      showNavigation: false,
    });
    const refs = new Map();
    const get = (id) => {
      const e = refs.get(id);
      if (!e) throw new Error(`thiếu ${id}`);
      return e;
    };
    const lineAttrs = (dash) => ({
      strokeColor: "#333",
      strokeWidth: 1.6,
      dash: dash ? 2 : 0,
      highlight: false,
      fixed: true,
    });

    for (const o of spec.objects) {
      switch (o.t) {
        case "point":
          refs.set(o.id, board.create("point", [o.x, o.y], { name: o.label ?? o.id, size: 3 }));
          break;
        case "midpoint":
          refs.set(o.id, board.create("midpoint", [get(o.of[0]), get(o.of[1])], { name: o.id }));
          break;
        case "intersection":
          refs.set(
            o.id,
            board.create("intersection", [get(o.of[0]), get(o.of[1]), o.which ?? 0], {
              name: o.id,
            })
          );
          break;
        case "segment": {
          const e = board.create("segment", [get(o.from), get(o.to)], lineAttrs(o.dash));
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
            borders: { strokeColor: "#333", strokeWidth: 1.6, highlight: false },
            fillColor: "#1a6b58",
            fillOpacity: 0.09,
            highlight: false,
            vertices: { visible: false },
          });
          if (o.id) refs.set(o.id, e);
          break;
        }
        case "angle":
          board.create("angle", [get(o.from), get(o.at), get(o.to)], {
            radius: o.right ? 0.45 : 0.7,
            type: o.right ? "square" : "sector",
            highlight: false,
            withLabel: Boolean(o.label),
          });
          break;
        case "perpendicular": {
          const e = board.create("perpendicular", [get(o.line), get(o.through)], lineAttrs(true));
          if (o.id) refs.set(o.id, e);
          break;
        }
        case "parallel": {
          const e = board.create("parallel", [get(o.line), get(o.through)], lineAttrs(true));
          if (o.id) refs.set(o.id, e);
          break;
        }
        case "text":
          board.create("text", [o.x, o.y, o.text], { fixed: true });
          break;
      }
    }
    board.update();

    // Chân đường cao H phải nằm trên BC và AH vuông góc BC
    const A = refs.get("A");
    const H = refs.get("H");
    const B = refs.get("B");
    const C = refs.get("C");
    const dot =
      (H.X() - A.X()) * (C.X() - B.X()) + (H.Y() - A.Y()) * (C.Y() - B.Y());

    const svg = document.querySelector("#box svg");
    return {
      created: refs.size,
      svgChildren: svg ? svg.querySelectorAll("*").length : 0,
      H: [H.X(), H.Y()],
      perpDot: dot,
    };
  },
  { spec, bounds }
);

check("board dựng được mọi loại đối tượng", () => {
  if (result.created < 10) throw new Error(`chỉ tạo được ${result.created} đối tượng có id`);
});
check("SVG có nội dung", () => {
  if (result.svgChildren < 10) throw new Error(`SVG chỉ có ${result.svgChildren} phần tử`);
});
check("ràng buộc hình học đúng (AH ⟂ BC)", () => {
  if (Math.abs(result.perpDot) > 1e-6) {
    throw new Error(`tích vô hướng AH·BC = ${result.perpDot}, lẽ ra ≈ 0`);
  }
});
check("không có lỗi JS trên trang", () => {
  if (consoleErrors.length) throw new Error(consoleErrors.slice(0, 2).join(" | "));
});

await browser.close();

console.log(failures === 0 ? "\nTất cả kiểm tra đều đạt." : `\n${failures} kiểm tra thất bại.`);
process.exit(failures === 0 ? 0 : 1);
