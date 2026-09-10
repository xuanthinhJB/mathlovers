/**
 * Kiểm tra hai thứ dễ sai nhất của tính năng vẽ hình:
 *  1) validateFigure có chặn được dữ liệu hỏng và chấp nhận dữ liệu tốt không
 *  2) các lệnh board.create(...) / view.create(...) có đúng API JSXGraph không
 *     (chạy thật trong Chromium, cả 2D lẫn 3D)
 *
 * Chạy: npm run check:figure
 * Đặt CHROMIUM_PATH nếu Chromium của Playwright nằm chỗ khác.
 */
import { readFileSync } from "node:fs";
import { validateFigure, autoBounds, autoBounds3 } from "../src/lib/figure.ts";

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
function done() {
  console.log(failures === 0 ? "\nTất cả kiểm tra đều đạt." : `\n${failures} kiểm tra thất bại.`);
  process.exit(failures === 0 ? 0 : 1);
}

/* ================= Dữ liệu mẫu ================= */

const flat = {
  dim: "2d",
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

// Hình chóp S.ABCD, đáy là hình vuông, SA vuông góc với đáy
const solid = {
  dim: "3d",
  title: "Hình chóp S.ABCD",
  objects: [
    { t: "point3", id: "A", x: 0, y: 0, z: 0 },
    { t: "point3", id: "B", x: 4, y: 0, z: 0 },
    { t: "point3", id: "C", x: 4, y: 4, z: 0 },
    { t: "point3", id: "D", x: 0, y: 4, z: 0 },
    { t: "point3", id: "S", x: 0, y: 0, z: 5 },
    {
      t: "solid",
      id: "chop",
      faces: [
        ["A", "B", "C", "D"],
        ["S", "A", "B"],
        ["S", "B", "C"],
        ["S", "C", "D"],
        ["S", "D", "A"],
      ],
    },
    { t: "midpoint3", id: "M", of: ["S", "C"] },
    { t: "segment3", id: "AM", from: "A", to: "M", dash: true },
    { t: "face", id: "mp", points: ["S", "B", "D"] },
    { t: "plane3", id: "P", points: ["S", "B", "C"] },
    { t: "sphere3", id: "mc", center: "A", r: 1.2 },
    { t: "line3", id: "dl", from: "A", to: "C" },
    { t: "text3", x: 2, y: 2, z: 5.5, text: "đỉnh" },
  ],
};

/* ================= 1. Validator ================= */
console.log("\nValidator 2D");

check("chấp nhận hình phẳng đầy đủ loại đối tượng", () => {
  const spec = validateFigure(flat);
  if (spec.dim !== "2d") throw new Error(`dim sai: ${spec.dim}`);
  if (spec.objects.length !== flat.objects.length) throw new Error("mất đối tượng");
});

check("autoBounds bao được mọi điểm", () => {
  const [xmin, ymax, xmax, ymin] = autoBounds(validateFigure(flat));
  if (!(xmin < 0 && xmax > 4 && ymin < 0 && ymax > 3)) {
    throw new Error(`khung nhìn không bao đủ: ${[xmin, ymax, xmax, ymin]}`);
  }
});

expectThrows("từ chối tham chiếu tới id chưa khai báo", {
  dim: "2d",
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "segment", from: "A", to: "Z" },
  ],
});
expectThrows("từ chối id trùng", {
  dim: "2d",
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point", id: "A", x: 1, y: 1 },
  ],
});
expectThrows("từ chối tham chiếu tới sau (forward reference)", {
  dim: "2d",
  objects: [
    { t: "midpoint", id: "M", of: ["A", "B"] },
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point", id: "B", x: 2, y: 0 },
  ],
});
expectThrows("từ chối loại đối tượng lạ", {
  dim: "2d",
  objects: [{ t: "point", id: "A", x: 0, y: 0 }, { t: "eval", code: "alert(1)" }],
});
expectThrows("từ chối toạ độ không hữu hạn", {
  dim: "2d",
  objects: [{ t: "point", id: "A", x: Infinity, y: 0 }],
});
expectThrows("từ chối toạ độ vượt giới hạn", {
  dim: "2d",
  objects: [{ t: "point", id: "A", x: 1e9, y: 0 }],
});
expectThrows("từ chối id không hợp lệ", {
  dim: "2d",
  objects: [{ t: "point", id: "1;drop", x: 0, y: 0 }],
});
expectThrows("từ chối hình rỗng", { dim: "2d", objects: [] });
expectThrows("từ chối dùng điểm làm đường", {
  dim: "2d",
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point", id: "B", x: 1, y: 1 },
    { t: "perpendicular", line: "A", through: "B" },
  ],
});
expectThrows("từ chối đa giác dưới ba đỉnh", {
  dim: "2d",
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point", id: "B", x: 1, y: 0 },
    { t: "polygon", points: ["A", "B"] },
  ],
});

console.log("\nValidator 3D");

check("chấp nhận hình không gian đầy đủ loại đối tượng", () => {
  const spec = validateFigure(solid);
  if (spec.dim !== "3d") throw new Error(`dim sai: ${spec.dim}`);
  if (spec.objects.length !== solid.objects.length) throw new Error("mất đối tượng");
});

check("suy ra dim = 3d khi không khai báo", () => {
  const { ...noDim } = solid;
  delete noDim.dim;
  if (validateFigure(noDim).dim !== "3d") throw new Error("không suy ra được 3d");
});

check("autoBounds3 bao hết các điểm và là hộp cân", () => {
  const [xr, yr, zr] = autoBounds3(validateFigure(solid));
  if (!(xr[0] < 0 && xr[1] > 4)) throw new Error(`trục x không bao đủ: ${xr}`);
  if (!(zr[0] < 0 && zr[1] > 5)) throw new Error(`trục z không bao đủ: ${zr}`);
  const spans = [xr, yr, zr].map(([lo, hi]) => hi - lo);
  if (Math.max(...spans) - Math.min(...spans) > 1e-9) {
    throw new Error(`ba trục không cùng độ dài: ${spans}`);
  }
});

expectThrows("từ chối trộn đối tượng 2D vào hình 3D", {
  dim: "3d",
  objects: [
    { t: "point3", id: "A", x: 0, y: 0, z: 0 },
    { t: "point", id: "B", x: 1, y: 1 },
  ],
});
expectThrows("từ chối trộn đối tượng 3D vào hình 2D", {
  dim: "2d",
  objects: [
    { t: "point", id: "A", x: 0, y: 0 },
    { t: "point3", id: "B", x: 1, y: 1, z: 1 },
  ],
});
expectThrows("từ chối point3 thiếu z", {
  dim: "3d",
  objects: [{ t: "point3", id: "A", x: 0, y: 0 }],
});
expectThrows("từ chối khối dưới ba mặt", {
  dim: "3d",
  objects: [
    { t: "point3", id: "A", x: 0, y: 0, z: 0 },
    { t: "point3", id: "B", x: 1, y: 0, z: 0 },
    { t: "point3", id: "C", x: 0, y: 1, z: 0 },
    { t: "solid", faces: [["A", "B", "C"]] },
  ],
});
expectThrows("từ chối plane3 không đủ ba điểm", {
  dim: "3d",
  objects: [
    { t: "point3", id: "A", x: 0, y: 0, z: 0 },
    { t: "point3", id: "B", x: 1, y: 0, z: 0 },
    { t: "plane3", points: ["A", "B"] },
  ],
});
expectThrows("từ chối mặt tham chiếu điểm chưa khai báo", {
  dim: "3d",
  objects: [
    { t: "point3", id: "A", x: 0, y: 0, z: 0 },
    { t: "face", points: ["A", "B", "C"] },
  ],
});

/* ================= 2. JSXGraph thật trong trình duyệt ================= */
let chromium;
try {
  ({ chromium } = await import("playwright"));
} catch {
  console.log("\nJSXGraph (Chromium): bỏ qua — chưa cài playwright (npm i -D playwright).");
  done();
}

console.log("\nJSXGraph (Chromium)");

const core = readFileSync("node_modules/jsxgraph/distrib/jsxgraphcore.js", "utf8");
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
  `<!doctype html><html><body>
     <div id="box2d" style="width:600px;height:400px"></div>
     <div id="box3d" style="width:600px;height:400px"></div>
   </body></html>`
);
await page.addScriptTag({ content: core });

/* ---- 2D ---- */
const spec2d = validateFigure(flat);
const res2d = await page.evaluate(
  ({ spec, bounds }) => {
    const board = JXG.JSXGraph.initBoard("box2d", {
      boundingbox: bounds,
      keepaspectratio: true,
      axis: false,
      grid: false,
      showCopyright: false,
      showNavigation: false,
    });
    const refs = new Map();
    const get = (id) => refs.get(id);
    const la = (d) => ({ strokeColor: "#333", strokeWidth: 1.6, dash: d ? 2 : 0, fixed: true });

    for (const o of spec.objects) {
      switch (o.t) {
        case "point":
          refs.set(o.id, board.create("point", [o.x, o.y], { name: o.label ?? o.id }));
          break;
        case "midpoint":
          refs.set(o.id, board.create("midpoint", [get(o.of[0]), get(o.of[1])], { name: o.id }));
          break;
        case "intersection":
          refs.set(
            o.id,
            board.create("intersection", [get(o.of[0]), get(o.of[1]), o.which ?? 0], { name: o.id })
          );
          break;
        case "segment":
        case "line": {
          const e = board.create(o.t, [get(o.from), get(o.to)], la(o.dash));
          if (o.id) refs.set(o.id, e);
          break;
        }
        case "ray": {
          const e = board.create("line", [get(o.from), get(o.to)], {
            ...la(),
            straightFirst: false,
          });
          if (o.id) refs.set(o.id, e);
          break;
        }
        case "circle": {
          const e = board.create(
            "circle",
            o.through ? [get(o.center), get(o.through)] : [get(o.center), o.r],
            la()
          );
          if (o.id) refs.set(o.id, e);
          break;
        }
        case "polygon": {
          const e = board.create("polygon", o.points.map(get), { fillOpacity: 0.1 });
          if (o.id) refs.set(o.id, e);
          break;
        }
        case "angle":
          board.create("angle", [get(o.from), get(o.at), get(o.to)], {
            radius: o.right ? 0.45 : 0.7,
            type: o.right ? "square" : "sector",
          });
          break;
        case "perpendicular":
        case "parallel": {
          const e = board.create(o.t, [get(o.line), get(o.through)], la(true));
          if (o.id) refs.set(o.id, e);
          break;
        }
        case "text":
          board.create("text", [o.x, o.y, o.text], { fixed: true });
          break;
      }
    }
    board.update();

    const A = refs.get("A");
    const H = refs.get("H");
    const B = refs.get("B");
    const C = refs.get("C");
    const dot = (H.X() - A.X()) * (C.X() - B.X()) + (H.Y() - A.Y()) * (C.Y() - B.Y());
    return { perpDot: dot, svg: document.querySelectorAll("#box2d svg *").length };
  },
  { spec: spec2d, bounds: autoBounds(spec2d) }
);

check("2D: SVG có nội dung", () => {
  if (res2d.svg < 10) throw new Error(`chỉ có ${res2d.svg} phần tử`);
});
check("2D: ràng buộc hình học đúng (AH ⟂ BC)", () => {
  if (Math.abs(res2d.perpDot) > 1e-6) {
    throw new Error(`tích vô hướng AH·BC = ${res2d.perpDot}, lẽ ra ≈ 0`);
  }
});

/* ---- 3D ---- */
const spec3d = validateFigure(solid);
const res3d = await page.evaluate(
  ({ spec, ranges }) => {
    const board = JXG.JSXGraph.initBoard("box3d", {
      boundingbox: [-8, 8, 8, -8],
      keepaspectratio: true,
      axis: false,
      grid: false,
      showCopyright: false,
      showNavigation: false,
    });
    const view = board.create(
      "view3d",
      [
        [-7.2, -7.2],
        [14.4, 14.4],
        ranges,
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
    );

    const refs = new Map();
    const get = (id) => {
      const e = refs.get(id);
      if (!e) throw new Error(`thiếu ${id}`);
      return e;
    };
    const la = (d) => ({ strokeColor: "#333", strokeWidth: 1.6, dash: d ? 2 : 0 });
    const edge = (a, b, d) =>
      view.create("line3d", [get(a), get(b)], { ...la(d), straightFirst: false, straightLast: false });

    const uniqueEdges = (faces) => {
      const seen = new Set();
      const out = [];
      for (const f of faces) {
        for (let i = 0; i < f.length; i++) {
          const a = f[i];
          const b = f[(i + 1) % f.length];
          const k = a < b ? `${a}|${b}` : `${b}|${a}`;
          if (seen.has(k)) continue;
          seen.add(k);
          out.push([a, b]);
        }
      }
      return out;
    };

    let created = 0;
    for (const o of spec.objects) {
      switch (o.t) {
        case "point3":
          refs.set(o.id, view.create("point3d", [o.x, o.y, o.z], { name: o.label ?? o.id }));
          created++;
          break;
        case "midpoint3": {
          const pa = get(o.of[0]);
          const pb = get(o.of[1]);
          refs.set(
            o.id,
            view.create(
              "point3d",
              [
                () => (pa.X() + pb.X()) / 2,
                () => (pa.Y() + pb.Y()) / 2,
                () => (pa.Z() + pb.Z()) / 2,
              ],
              { name: o.id }
            )
          );
          created++;
          break;
        }
        case "segment3":
          refs.set(o.id ?? `s${created++}`, edge(o.from, o.to, o.dash));
          break;
        case "line3":
          refs.set(
            o.id ?? `l${created++}`,
            view.create("line3d", [get(o.from), get(o.to)], {
              ...la(o.dash),
              straightFirst: true,
              straightLast: true,
            })
          );
          break;
        case "face":
          view.create("polygon3d", [o.points.map(get)], { fillOpacity: 0.2 });
          for (const [a, b] of uniqueEdges([o.points])) edge(a, b);
          created++;
          break;
        case "solid":
          for (const f of o.faces) view.create("polygon3d", [f.map(get)], { fillOpacity: 0.16 });
          for (const [a, b] of uniqueEdges(o.faces)) edge(a, b);
          created++;
          break;
        case "sphere3":
          view.create("sphere3d", o.through ? [get(o.center), get(o.through)] : [get(o.center), o.r], {
            fillOpacity: 0.12,
          });
          created++;
          break;
        case "plane3":
          view.create("plane3d", [get(o.points[0]), get(o.points[1]), get(o.points[2])], {
            fillOpacity: 0.12,
            threepoints: true,
          });
          created++;
          break;
        case "text3":
          view.create("text3d", [[o.x, o.y, o.z], o.text], { fixed: true });
          created++;
          break;
      }
    }
    board.update();

    // M phải là trung điểm SC trong không gian
    const M = refs.get("M");
    const S = refs.get("S");
    const C = refs.get("C");
    const err = Math.max(
      Math.abs(M.X() - (S.X() + C.X()) / 2),
      Math.abs(M.Y() - (S.Y() + C.Y()) / 2),
      Math.abs(M.Z() - (S.Z() + C.Z()) / 2)
    );

    // Đổi góc nhìn phải chạy được và làm hình vẽ lại
    view.setView((-40 * Math.PI) / 180, (25 * Math.PI) / 180);
    board.update();

    return {
      created,
      svg: document.querySelectorAll("#box3d svg *").length,
      midpointErr: err,
      hasSetView: typeof view.setView === "function",
    };
  },
  { spec: spec3d, ranges: autoBounds3(spec3d) }
);

check("3D: dựng được mọi loại đối tượng", () => {
  if (res3d.created < 10) throw new Error(`chỉ dựng được ${res3d.created}`);
});
check("3D: SVG có nội dung", () => {
  if (res3d.svg < 30) throw new Error(`chỉ có ${res3d.svg} phần tử`);
});
check("3D: trung điểm đúng trong không gian", () => {
  if (res3d.midpointErr > 1e-9) throw new Error(`lệch ${res3d.midpointErr}`);
});
check("3D: đổi được góc nhìn", () => {
  if (!res3d.hasSetView) throw new Error("view.setView không tồn tại");
});
check("không có lỗi JS trên trang", () => {
  if (consoleErrors.length) throw new Error(consoleErrors.slice(0, 2).join(" | "));
});

await browser.close();
done();
