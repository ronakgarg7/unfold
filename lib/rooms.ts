// The four rooms, drawn with the hand-drawn Sketch renderer.
//
// Canvas conventions (all coordinates are 0..1, y grows downwards):
//   left wall  – the room's corner is at x = 1, the floor at y = 1
//   right wall – the room's corner is at x = 0, the floor at y = 1
//   floor      – the corner is bottom-left (0, 1); the right wall runs along the bottom
//                edge, the left wall up the left edge; the corner nearest you is top-right
//   pop-ups    – a square card standing on its bottom edge (y = 1)
//
// Pop-up positions are [s, t]: s = distance along the right wall, t = along the left wall.

import type { Pt, Sketch } from "./sketch";
import { isoLayers, WHITE, SIDE_A, SIDE_B, type V3, type Iso } from "./iso";
import { look, tint } from "./style";

export type PopUp = { size: number; at: [number, number]; draw: (s: Sketch) => void; halo?: number };
export type Room = {
  name: string;
  mood: string;
  left: (s: Sketch) => void;
  right: (s: Sketch) => void;
  floor: (s: Sketch) => void;
  popups: PopUp[];
};

const F = (a: number, b: number): Pt => [a, 1 - b]; // floor coords → canvas

function baseboard(s: Sketch, color = "#e9dfcf") {
  s.box(-0.02, 0.93, 1.04, 0.09, color, { w: 2.2 });
}

function planks(s: Sketch, color: string, n = 7, alongRight = true) {
  s.washAll(color, 0.8);
  for (let i = 1; i < n; i++) {
    const v = i / n;
    if (alongRight) s.line(0, 1 - v, 1, 1 - v, { w: 1.8, alpha: 0.6 });
    else s.line(v, 0, v, 1, { w: 1.8, alpha: 0.6 });
    // staggered plank joints
    for (let j = 0; j < 2; j++) {
      const p = (s.r() * 0.8 + 0.1) as number;
      if (alongRight) s.line(p, 1 - v, p, 1 - v + 1 / n, { w: 1.4, alpha: 0.5 });
      else s.line(v, p, v + 1 / n, p, { w: 1.4, alpha: 0.5 });
    }
  }
}

function tiles(s: Sketch, n: number, alpha = 0.45) {
  for (let i = 1; i < n; i++) {
    s.line(i / n, 0, i / n, 1, { w: 1.3, alpha });
    s.line(0, i / n, 1, i / n, { w: 1.3, alpha });
  }
}

function frame(s: Sketch, x: number, y: number, w: number, h: number, inner: string, doodle?: (s: Sketch) => void) {
  s.box(x, y, w, h, "#fbf6ea", { w: 2.4 });
  s.box(x + w * 0.12, y + h * 0.12, w * 0.76, h * 0.76, inner, { w: 1.6 });
  doodle?.(s);
}

function plant(s: Sketch, cx: number, by: number, sc: number, pot = "#e9a07c", mask = false) {
  s.shape(
    [
      [cx - 0.09 * sc, by - 0.16 * sc],
      [cx + 0.09 * sc, by - 0.16 * sc],
      [cx + 0.065 * sc, by],
      [cx - 0.065 * sc, by],
    ],
    pot,
    { mask },
  );
  const leaves: [number, number, number][] = [
    [-0.08, -0.32, -0.6],
    [0.0, -0.4, 0],
    [0.08, -0.3, 0.6],
    [-0.12, -0.22, -1],
    [0.12, -0.22, 1],
  ];
  for (const [dx, dy, rot] of leaves) {
    const lx = cx + dx * sc;
    const ly = by + dy * sc;
    const pts = s.ellipsePts(0, 0, 0.035 * sc, 0.085 * sc).map(([x, y]) => [lx + x * Math.cos(rot) - y * Math.sin(rot), ly + x * Math.sin(rot) + y * Math.cos(rot)] as Pt);
    s.shape(pts, "#a9d39a", { mask, w: 1.8 });
    s.line(cx, by - 0.16 * sc, lx, ly, { w: 1.4, alpha: 0.8, mask });
  }
}

function fairyLights(s: Sketch, x1: number, x2: number, y: number, sag = 0.06) {
  const pts: Pt[] = [];
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    pts.push([x1 + (x2 - x1) * t, y + Math.sin(t * Math.PI * 3) ** 2 * sag]);
  }
  s.stroke(pts, { w: 1.6 });
  for (let i = 1; i < 20; i += 2) {
    const [x, yy] = pts[i];
    s.blob(x, yy + 0.022, 0.011, 0.016, "#ffe08a", { w: 1.4 });
  }
}

// ---------------------------------------------------------------------------

// Bedroom — blue ink on white paper, everything a cut-out sticker (after the reference sketch).
// In the coloured version the same pieces get soft pastel washes.

const BED = {
  wall: "#f3eef9",
  floor: "#f2dfc4",
  wood: "#ead3b2",
  curtain: "#f7d7de",
  glass: "#dcebfa",
  leaf: "#cfe8c4",
  pot: "#f3c8b0",
  cork: "#efd8b6",
  notes: ["#fff3b5", "#dbe8fb", "#fadbe2", "#dff0d4"],
  rug: "#f8d9df",
  slipper: "#dfe5f8",
  quilt: "#d9d0f3",
  quiltFold: "#ece7fb",
  shade: "#fbe6a4",
  laptop: "#e6e6ef",
  mug: "#f7ccd6",
  cup: "#cfe0f7",
  book: "#cfe8c4",
  bin: "#f3e6cf",
};

function curtain(s: Sketch, x0: number, x1: number, top: number, bottom: number) {
  const folds = 4;
  const w = x1 - x0;
  const pts: Pt[] = [[x0, top]];
  pts.push([x1, top]);
  // scalloped hem
  const hem: Pt[] = [];
  for (let i = 0; i <= folds * 2; i++) hem.push([x1 - (w * i) / (folds * 2), bottom + (i % 2 ? 0.012 : -0.004)]);
  const shape: Pt[] = [...pts, ...hem];
  s.sticker(shape, 6, 0.22, tint(BED.curtain));
  s.stroke(shape, { closed: true, w: 2.4 });
  for (let i = 1; i < folds; i++) {
    const x = x0 + (w * i) / folds;
    s.stroke(
      [
        [x, top + 0.02],
        [x + 0.006, (top + bottom) / 2],
        [x - 0.002, bottom - 0.01],
      ],
      { w: 1.5, alpha: 0.8 },
    );
  }
  s.line(x0 + 0.005, bottom - 0.02, x1 - 0.005, bottom - 0.02, { w: 1.1, alpha: 0.55 });
  // gathered rings at the top
  for (let i = 0; i < folds; i++) s.blob(x0 + (w * (i + 0.5)) / folds, top, w / folds / 2.1, 0.018, WHITE, { w: 1.8 });
}

function cloud(s: Sketch, cx: number, cy: number, r: number, hatch = false) {
  const pts: Pt[] = [];
  const bumps = [
    [-1.6, 0, 0.55],
    [-0.7, -0.45, 0.7],
    [0.4, -0.55, 0.8],
    [1.35, -0.1, 0.55],
  ];
  pts.push([cx - 2.1 * r, cy + 0.3 * r]);
  for (const [bx, by, br] of bumps) {
    const c: Pt = [cx + bx * r, cy + by * r];
    for (let i = 0; i <= 8; i++) {
      const a = Math.PI + (i / 8) * Math.PI;
      pts.push([c[0] + Math.cos(a) * br * r, c[1] + Math.sin(a) * br * r]);
    }
  }
  pts.push([cx + 2.0 * r, cy + 0.3 * r]);
  s.stroke(pts, { w: 1.8 });
  if (hatch) s.hatch([...pts, [cx + 2.0 * r, cy + 1.2 * r], [cx - 2.1 * r, cy + 1.2 * r]], 0.012, -0.9, 1.1, 0.6);
}

function tapedPhoto(s: Sketch, x: number, y: number, w: number, h: number, rot = 0, doodle: "face" | "mountain" = "face") {
  const c: Pt = [x + w / 2, y + h / 2];
  const R = (p: Pt): Pt => {
    const dx = p[0] - c[0];
    const dy = p[1] - c[1];
    return [c[0] + dx * Math.cos(rot) - dy * Math.sin(rot), c[1] + dx * Math.sin(rot) + dy * Math.cos(rot)];
  };
  const outer = s.rectPts(x, y, w, h).map(R);
  s.sticker(outer, 4);
  s.stroke(outer, { closed: true, w: 2.2 });
  const m = Math.min(w, h) * 0.12;
  const inner = s.rectPts(x + m, y + m, w - 2 * m, h - 2 * m).map(R);
  s.stroke(inner, { closed: true, w: 1.4 });
  if (doodle === "face") {
    const [hx, hy] = R([x + w / 2, y + h * 0.42]);
    s.circle(hx, hy, w * 0.13, { w: 1.6 });
    s.stroke(s.ellipsePts(x + w / 2, y + h * 0.88, w * 0.26, h * 0.24, Math.PI, Math.PI * 2, 12).map(R), { w: 1.6 });
  } else {
    s.stroke(
      [
        [x + m, y + h - m * 1.6],
        [x + w * 0.38, y + h * 0.45],
        [x + w * 0.55, y + h * 0.62],
        [x + w * 0.7, y + h * 0.5],
        [x + w - m, y + h - m * 1.6],
      ].map((p) => R(p as Pt)),
      { w: 1.6 },
    );
    const [sx, sy] = R([x + w * 0.7, y + h * 0.3]);
    s.circle(sx, sy, w * 0.07, { w: 1.4 });
    s.line(...R([x + m, y + h - m * 1.2]), ...R([x + w - m, y + h - m * 1.2]), { w: 1.2, alpha: 0.6 });
  }
  // tape strips
  for (const t of [R([x + w / 2, y - 0.004])]) {
    const tw = w * 0.35;
    const tp = s.rectPts(t[0] - tw / 2, t[1] - 0.012, tw, 0.024);
    s.fill(tp, "#e9e7f3", { alpha: 0.9, jitter: 0 });
    s.stroke(tp, { closed: true, w: 1.1, alpha: 0.7 });
  }
}


/** Curtain panel hanging on a plane just off the left wall (xa = cx), from rz down to hem. */
function isoCurtain(iso: Iso, cx: number, b0: number, b1: number, rz: number, hem: number, color: string) {
  const folds = 4;
  const pts: V3[] = [
    [cx, b0, rz - 0.01],
    [cx, b1, rz - 0.01],
  ];
  for (let i = 0; i <= folds * 2; i++) pts.push([cx, b1 - ((b1 - b0) * i) / (folds * 2), hem + (i % 2 ? 0 : 0.014)]);
  iso.face(pts, look.color ? color : WHITE, { w: 2.4 });
  for (let i = 1; i < folds; i++) {
    const b = b0 + ((b1 - b0) * i) / folds;
    iso.line([cx, b, rz - 0.03], [cx, b + 0.004, hem + 0.03], { w: 1.4 });
  }
  iso.line([cx, b0 + 0.005, hem + 0.035], [cx, b1 - 0.005, hem + 0.035], { w: 1.1, alpha: 0.55 });
  for (let i = 0; i < folds; i++) iso.at([cx, b0 + ((b1 - b0) * (i + 0.5)) / folds, rz], (s, [x, y], u) => s.circle(x, y, 0.012 * u, { w: 1.6, mask: true }));
}

const bedroom: Room = {
  name: "bedroom",
  mood: "slow mornings, late-night thinking",
  left(s) {
    if (look.color) s.washAll(tint(BED.wall), 1);
    // window
    const win = s.rectPts(0.22, 0.2, 0.46, 0.42);
    s.sticker(win, 8);
    s.fill(s.rectPts(0.245, 0.225, 0.41, 0.37), tint(BED.glass), { alpha: 1, jitter: 0.4 });
    s.box(0.22, 0.2, 0.46, 0.42, null, { w: 3 });
    s.rect(0.245, 0.225, 0.41, 0.37, { w: 1.8 });
    s.line(0.45, 0.225, 0.45, 0.595, { w: 2.6 });
    s.line(0.245, 0.41, 0.655, 0.41, { w: 2.6 });
    s.box(0.2, 0.615, 0.5, 0.022, null, { w: 2.2 });
    cloud(s, 0.31, 0.31, 0.025);
    cloud(s, 0.56, 0.29, 0.03);
    cloud(s, 0.33, 0.54, 0.035, true);
    cloud(s, 0.57, 0.5, 0.032, true);
    for (const [x, y] of [
      [0.27, 0.25],
      [0.48, 0.44],
    ]) {
      s.line(x, y + 0.04, x + 0.03, y, { w: 1.2, alpha: 0.6 });
      s.line(x + 0.015, y + 0.06, x + 0.05, y + 0.015, { w: 1.2, alpha: 0.6 });
    }
    // (the curtains and their rod are pop-ups that hang just in front of this wall)
    // stars near the corner
    s.star(0.88, 0.22, 0.026, { w: 2 });
    s.star(0.92, 0.33, 0.016, { w: 1.8 });
    s.star(0.84, 0.4, 0.012, { w: 1.6 });
    // taped photos near the front edge
    tapedPhoto(s, 0.03, 0.4, 0.08, 0.1, -0.05);
    tapedPhoto(s, 0.035, 0.55, 0.085, 0.1, 0.04);
  },
  right(s) {
    if (look.color) s.washAll(tint(BED.wall), 1);
    // stars
    s.star(0.33, 0.1, 0.016);
    s.star(0.38, 0.16, 0.022);
    // hanging plant (replaces the poster): three cords from the ceiling, a bowl pot, trailing vines
    const leaf = (x: number, y: number, r: number, rot: number) => {
      const almond: Pt[] = [];
      for (let i = 0; i <= 8; i++) almond.push([Math.sin((i / 8) * Math.PI) * r * 0.55, -r + (2 * r * i) / 8]);
      for (let i = 8; i >= 0; i--) almond.push([-Math.sin((i / 8) * Math.PI) * r * 0.55, -r + (2 * r * i) / 8]);
      const pts = almond.map(([a, b]) => [x + a * Math.cos(rot) - b * Math.sin(rot), y + a * Math.sin(rot) + b * Math.cos(rot)] as Pt);
      s.sticker(pts, 2, 0.12, tint(BED.leaf));
      s.stroke(pts, { closed: true, w: 1.6 });
      s.line(x + Math.sin(rot) * r * 0.8, y - Math.cos(rot) * r * 0.8, x - Math.sin(rot) * r * 0.8, y + Math.cos(rot) * r * 0.8, { w: 1, alpha: 0.7 });
    };
    const px = 0.18;
    const potTop = 0.27;
    s.line(px, 0, px, 0.04, { w: 1.6 });
    s.circle(px, 0.05, 0.01, { w: 1.6 });
    for (const dx of [-0.065, 0, 0.065]) s.line(px, 0.058, px + dx, potTop, { w: 1.3 });
    // leaves poking out of the top of the pot
    for (const [dx, dy, rot] of [
      [-0.05, -0.03, -0.7],
      [0.0, -0.045, 0.1],
      [0.05, -0.03, 0.8],
    ] as const)
      leaf(px + dx, potTop + dy, 0.028, rot);
    const pot = s.ellipsePts(px, potTop, 0.075, 0.07, 0, Math.PI, 16);
    s.sticker(pot, 4, 0.18, tint(BED.pot));
    s.stroke(pot, { closed: true, w: 2.2 });
    s.line(px - 0.075, potTop + 0.012, px + 0.075, potTop + 0.012, { w: 1.2, alpha: 0.6 });
    const vines: Pt[][] = [
      [
        [px - 0.06, potTop + 0.02],
        [px - 0.09, potTop + 0.12],
        [px - 0.08, potTop + 0.22],
        [px - 0.1, potTop + 0.3],
      ],
      [
        [px - 0.01, potTop + 0.06],
        [px - 0.02, potTop + 0.16],
        [px + 0.0, potTop + 0.26],
      ],
      [
        [px + 0.05, potTop + 0.03],
        [px + 0.08, potTop + 0.12],
        [px + 0.07, potTop + 0.19],
      ],
    ];
    vines.forEach((v, i) => {
      s.stroke(v, { w: 1.4 });
      for (let j = 0; j < v.length - 1; j++)
        for (const tt of [0.4, 0.9]) {
          const x = v[j][0] + (v[j + 1][0] - v[j][0]) * tt;
          const y = v[j][1] + (v[j + 1][1] - v[j][1]) * tt;
          const side = (j + (tt > 0.5 ? 1 : 0) + i) % 2 ? 1 : -1;
          leaf(x + side * 0.018, y, 0.026, side * 0.9);
        }
    });
    // big cork board above the desk with pinned notes
    const bx = 0.44;
    const by = 0.22;
    const bw = 0.5;
    const bh = 0.37;
    s.sticker(s.rectPts(bx, by, bw, bh), 6, 0.22, tint(BED.cork));
    s.mark("journal", s.rectPts(bx, by, bw, bh));
    s.box(bx, by, bw, bh, null, { w: 2.8 });
    s.rect(bx + 0.018, by + 0.018, bw - 0.036, bh - 0.036, { w: 1.2, alpha: 0.6 });
    for (let i = 0; i < 70; i++) s.circle(bx + 0.03 + s.r() * (bw - 0.06), by + 0.03 + s.r() * (bh - 0.06), 0.0022, { w: 1, alpha: 0.45 });
    let noteN = 0;
    const note = (x: number, y: number, w: number, h: number, lines: number, rot = 0) => {
      const c: Pt = [x + w / 2, y + h / 2];
      const pts = s.rectPts(x, y, w, h).map(([qx, qy]) => [c[0] + (qx - c[0]) * Math.cos(rot) - (qy - c[1]) * Math.sin(rot), c[1] + (qx - c[0]) * Math.sin(rot) + (qy - c[1]) * Math.cos(rot)] as Pt);
      s.sticker(pts, 2, 0.15, tint(BED.notes[noteN++ % BED.notes.length]));
      s.stroke(pts, { closed: true, w: 1.6 });
      for (let i = 0; i < lines; i++) s.line(x + w * 0.18, y + h * (0.32 + i * 0.16), x + w * 0.82, y + h * (0.32 + i * 0.16), { w: 1, alpha: 0.6 });
      s.blob(x + w / 2, y + 0.008, 0.007, 0.007, "#d9d6ec", { w: 1.3 });
    };
    note(0.48, 0.26, 0.1, 0.12, 4, -0.05);
    note(0.61, 0.27, 0.14, 0.1, 0, 0.02);
    s.stroke(
      [
        [0.625, 0.355],
        [0.655, 0.3],
        [0.68, 0.335],
        [0.7, 0.315],
        [0.735, 0.355],
      ],
      { w: 1.4 },
    );
    s.circle(0.71, 0.295, 0.009, { w: 1.2 });
    note(0.79, 0.26, 0.11, 0.12, 4, 0.05);
    note(0.49, 0.43, 0.09, 0.09, 3, 0.07);
    note(0.62, 0.42, 0.09, 0.1, 0, -0.04);
    s.circle(0.665, 0.47, 0.018, { w: 1.3 });
    note(0.75, 0.43, 0.08, 0.08, 2, 0.03);
    note(0.85, 0.44, 0.07, 0.1, 3, -0.06);
  },
  floor(s) {
    if (look.color) s.washAll(tint(BED.floor), 1);
    // floor boards running away from the left wall
    for (let i = 1; i < 9; i++) {
      const v = i / 9;
      s.line(0, 1 - v, 1, 1 - v, { w: 1.5, alpha: 0.55 });
      for (let j = 0; j < 2; j++) {
        const p = s.r() * 0.8 + 0.1;
        s.line(p, 1 - v, p, 1 - v + 1 / 9, { w: 1.2, alpha: 0.45 });
      }
    }
    // contact shadows under the furniture (coords: F(xa, xb))
    const quad = (x: number, y: number, dx: number, dy: number) => [F(x, y), F(x + dx, y), F(x + dx, y + dy), F(x, y + dy)];
    s.shadow(quad(0.03, 0.27, 0.36, 0.62), 0.28, 16);
    s.shadow(quad(0.42, 0.02, 0.56, 0.27), 0.22, 16);
    s.shadow(quad(0.52, 0.3, 0.18, 0.16), 0.2, 12);
    s.shadow(s.ellipsePts(0.9, 1 - 0.36, 0.05, 0.05), 0.2, 8);
    // rug with a scalloped edge
    const rx0 = 0.46;
    const rx1 = 0.88;
    const ry0 = 0.46;
    const ry1 = 0.88;
    const rug = [F(rx0, ry0), F(rx1, ry0), F(rx1, ry1), F(rx0, ry1)];
    s.sticker(rug, 4, 0.16, tint(BED.rug));
    const edge: Pt[] = [];
    const side = (a: Pt, b: Pt) => {
      const n = 14;
      for (let i = 0; i < n; i++) {
        const t0 = i / n;
        const tm = (i + 0.5) / n;
        const x = a[0] + (b[0] - a[0]) * t0;
        const y = a[1] + (b[1] - a[1]) * t0;
        const dx = b[0] - a[0];
        const dy = b[1] - a[1];
        const len = Math.hypot(dx, dy);
        edge.push([x, y]);
        edge.push([a[0] + dx * tm + (dy / len) * 0.012, a[1] + dy * tm - (dx / len) * 0.012]);
      }
    };
    for (let i = 0; i < 4; i++) side(rug[i], rug[(i + 1) % 4]);
    s.stroke(edge, { closed: true, w: 2 });
    for (let i = 0; i < 26; i++) {
      const x = rx0 + 0.04 + s.r() * (rx1 - rx0 - 0.08);
      const y = ry0 + 0.04 + s.r() * (ry1 - ry0 - 0.08);
      const [px, py] = F(x, y);
      s.line(px, py, px + 0.008, py - 0.008, { w: 1.1, alpha: 0.5 });
    }
    // slippers
    for (const dx of [0, 0.075]) {
      const cx = 0.6 + dx;
      const cy = 1 - 0.7;
      const sl = s.ellipsePts(cx, cy, 0.03, 0.06);
      s.sticker(sl, 3, 0.2, tint(BED.slipper));
      s.stroke(sl, { closed: true, w: 2 });
      s.stroke(s.ellipsePts(cx, cy + 0.015, 0.022, 0.035, Math.PI * 1.05, Math.PI * 1.95, 10), { w: 1.6 });
    }
  },
  popups: isoLayers([
    // against the walls: curtains, desk, bed
    (iso) => {
      // --- curtains on a rod, hanging just off the left wall over the bed ---
      const CX = 0.05;
      const RZ = 0.835;
      iso.line([0, 0.22, RZ], [CX, 0.22, RZ], { w: 2 });
      iso.line([0, 0.87, RZ], [CX, 0.87, RZ], { w: 2 });
      iso.line([CX, 0.22, RZ], [CX, 0.87, RZ], { w: 2.8 });
      isoCurtain(iso, CX, 0.24, 0.37, RZ, 0.34, BED.curtain);
      isoCurtain(iso, CX, 0.73, 0.86, RZ, 0.34, BED.curtain);

      // --- desk (against the right wall) ---
      const DZ = 0.36;
      // far leg pair at the left end
      iso.box(0.43, 0.03, 0, 0.025, 0.025, DZ - 0.02, WHITE, { color: BED.wood });
      // drawer unit at the right end
      iso.box(0.76, 0.03, 0, 0.19, 0.22, DZ - 0.02, WHITE, { color: BED.wood });
      for (let i = 0; i < 3; i++) {
        const z0 = 0.03 + i * 0.105;
        iso.face(
          [
            [0.775, 0.25, z0],
            [0.935, 0.25, z0],
            [0.935, 0.25, z0 + 0.085],
            [0.775, 0.25, z0 + 0.085],
          ],
          null,
          { w: 1.6 },
        );
        iso.line([0.835, 0.25, z0 + 0.045], [0.875, 0.25, z0 + 0.045], { w: 2.2 });
      }
      iso.box(0.43, 0.22, 0, 0.025, 0.025, DZ - 0.02, WHITE, { color: BED.wood });
      // desk top
      iso.box(0.41, 0.02, DZ - 0.025, 0.56, 0.27, 0.025, WHITE, { color: BED.wood });
      const T = DZ;
      // lamp: weighted base, straight stem, shade centred above it
      const LX = 0.49;
      const LY = 0.08;
      iso.cyl(LX, LY, T, 0.035, 0.018, WHITE, { color: BED.wood });
      iso.line([LX, LY, T + 0.018], [LX, LY, T + 0.13], { w: 2.4 });
      iso.cyl(LX, LY, T + 0.11, 0.06, 0.08, WHITE, { r2: 0.028, color: BED.shade });
      iso.at([LX, LY, T + 0.11], (s, [x, y], u) => {
        for (let i = 0; i < 4; i++) {
          const a = 0.35 + i * 0.6;
          s.line(x + Math.cos(a) * 0.09 * u, y + Math.sin(a) * 0.07 * u, x + Math.cos(a) * 0.13 * u, y + Math.sin(a) * 0.1 * u, { w: 1.4, mask: true });
        }
      });
      // laptop
      iso.box(0.6, 0.06, T, 0.16, 0.12, 0.01, WHITE, { color: BED.laptop });
      iso.face(
        [
          [0.6, 0.06, T + 0.01],
          [0.76, 0.06, T + 0.01],
          [0.76, 0.035, T + 0.13],
          [0.6, 0.035, T + 0.13],
        ],
        tint(BED.laptop),
        { w: 2.2 },
      );
      iso.face(
        [
          [0.615, 0.057, T + 0.025],
          [0.745, 0.057, T + 0.025],
          [0.745, 0.039, T + 0.115],
          [0.615, 0.039, T + 0.115],
        ],
        null,
        { w: 1.3 },
      );
      // mug, pencil cup, books
      iso.cyl(0.8, 0.2, T, 0.028, 0.05, WHITE, { color: BED.mug });
      iso.at([0.83, 0.2, T + 0.03], (s, [x, y], u) => s.stroke(s.ellipsePts(x, y, 0.018 * u, 0.022 * u, -1.3, 1.3, 8), { w: 2, mask: true }));
      iso.cyl(0.87, 0.1, T, 0.03, 0.07, WHITE, { color: BED.cup });
      for (const [dx, dy] of [
        [-0.01, 0],
        [0.008, -0.01],
        [0.004, 0.012],
      ])
        iso.line([0.87 + dx, 0.1 + dy, T + 0.07], [0.87 + dx * 2.5, 0.1 + dy * 2.5, T + 0.13], { w: 2 });
      iso.box(0.9, 0.18, T, 0.035, 0.08, 0.1, WHITE, { color: BED.book });

      // --- bed (against the left wall), kept simple ---
      const B0 = 0.28;
      const B1 = 0.87;
      iso.box(0.03, B0, 0, 0.34, B1 - B0, 0.08, WHITE, { color: BED.wood });
      iso.box(0.03, B0, 0.08, 0.34, B1 - B0, 0.09);
      // pillow
      iso.box(0.08, 0.31, 0.17, 0.24, 0.1, 0.04);
      // quilt over the front part with a folded-back edge
      const Q0 = 0.46;
      iso.box(0.025, Q0, 0.06, 0.35, B1 + 0.01 - Q0, 0.115, WHITE, { color: BED.quilt });
      iso.box(0.025, Q0, 0.175, 0.35, 0.06, 0.008, WHITE, { color: BED.quiltFold });
    },
    // loose pieces: chair, bin
    (iso) => {
      // chair, back to us, tucked at the desk
      const cx = 0.53;
      const cy = 0.3;
      for (const [lx, ly] of [
        [cx + 0.01, cy + 0.01],
        [cx + 0.125, cy + 0.01],
        [cx + 0.01, cy + 0.125],
        [cx + 0.125, cy + 0.125],
      ])
        iso.line([lx, ly, 0], [lx, ly, 0.19], { w: 2.4 });
      iso.box(cx, cy, 0.19, 0.15, 0.15, 0.02, WHITE, { color: BED.wood });
      iso.line([cx + 0.01, cy + 0.14, 0.21], [cx + 0.01, cy + 0.14, 0.33], { w: 2.4 });
      iso.line([cx + 0.14, cy + 0.14, 0.21], [cx + 0.14, cy + 0.14, 0.33], { w: 2.4 });
      iso.box(cx, cy + 0.13, 0.33, 0.15, 0.02, 0.08, WHITE, { color: BED.wood });
      // waste bin with a woven pattern
      iso.cyl(0.9, 0.36, 0, 0.045, 0.1, WHITE, { r2: 0.052, color: BED.bin });
      iso.at([0.9, 0.36, 0.05], (s, [x, y], u) => {
        for (let i = -2; i <= 2; i++) {
          s.line(x + (i * 0.018 - 0.02) * u, y - 0.045 * u, x + (i * 0.018 + 0.02) * u, y + 0.045 * u, { w: 1, alpha: 0.7, mask: true });
          s.line(x + (i * 0.018 + 0.02) * u, y - 0.045 * u, x + (i * 0.018 - 0.02) * u, y + 0.045 * u, { w: 1, alpha: 0.7, mask: true });
        }
      });
    },
  ]),
};

// Bathroom — same paper cut-out style as the bedroom (after Dakshi's reference sketch).

const BATH = {
  wall: "#eef7f4",
  tile: "#d6eee6",
  floor: "#e6f0f3",
  curtain: "#d3e8f6",
  rug: "#f8d2c6",
  mat: "#cfe0f8",
  towel: "#f8d2c6",
  towel2: "#dbe8fb",
  vanity: "#d6e8ef",
  wood: "#ead3b2",
  glass: "#dcebfa",
  leaf: "#cfe8c4",
  pot: "#f3c8b0",
  diffuser: "#f3e1c4",
  jar: "#f7ccd6",
  soap: "#cfe8c4",
  cup: "#cfe0f7",
  bin: "#f3e6cf",
  lamp: "#fbe6a4",
};

/** Four-point sparkle. */
function sparkle(s: Sketch, x: number, y: number, r: number) {
  const k = r * 0.28;
  s.stroke(
    [
      [x, y - r],
      [x + k, y - k],
      [x + r * 0.75, y],
      [x + k, y + k],
      [x, y + r],
      [x - k, y + k],
      [x - r * 0.75, y],
      [x - k, y - k],
    ],
    { closed: true, w: 1.8 },
  );
}

function almondLeaf(s: Sketch, x: number, y: number, r: number, rot: number, color: string, mask = false) {
  const almond: Pt[] = [];
  for (let i = 0; i <= 8; i++) almond.push([Math.sin((i / 8) * Math.PI) * r * 0.62, -r + (2 * r * i) / 8]);
  for (let i = 8; i >= 0; i--) almond.push([-Math.sin((i / 8) * Math.PI) * r * 0.62, -r + (2 * r * i) / 8]);
  const pts = almond.map(([a, b]) => [x + a * Math.cos(rot) - b * Math.sin(rot), y + a * Math.sin(rot) + b * Math.cos(rot)] as Pt);
  s.sticker(pts, 2, 0.12, tint(color));
  if (mask) s.maskFill(pts);
  s.stroke(pts, { closed: true, w: 1.6, mask });
  s.line(x + Math.sin(rot) * r * 0.8, y - Math.cos(rot) * r * 0.8, x - Math.sin(rot) * r * 0.8, y + Math.cos(rot) * r * 0.8, { w: 1, alpha: 0.7 });
}

/** Trailing leaves along a few vines. */
function vines(s: Sketch, lines: Pt[][], r: number, color: string) {
  lines.forEach((v, i) => {
    s.stroke(v, { w: 1.4 });
    for (let j = 0; j < v.length - 1; j++)
      for (const tt of [0.4, 0.9]) {
        const x = v[j][0] + (v[j + 1][0] - v[j][0]) * tt;
        const y = v[j][1] + (v[j + 1][1] - v[j][1]) * tt;
        const side = (j + (tt > 0.5 ? 1 : 0) + i) % 2 ? 1 : -1;
        almondLeaf(s, x + side * r * 0.7, y, r, side * 0.9, color);
      }
  });
}

/** Rug with a scalloped edge and a few stitch marks; corners given in canvas coords. */
function scallopRug(s: Sketch, corners: Pt[], color: string, n = 10) {
  s.sticker(corners, 4, 0.16, tint(color));
  const edge: Pt[] = [];
  for (let k = 0; k < 4; k++) {
    const a = corners[k];
    const b = corners[(k + 1) % 4];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const m = Math.max(4, Math.round((n * len) / 0.3));
    for (let i = 0; i < m; i++) {
      const t0 = i / m;
      const tm = (i + 0.5) / m;
      edge.push([a[0] + dx * t0, a[1] + dy * t0]);
      edge.push([a[0] + dx * tm + (dy / len) * 0.01, a[1] + dy * tm - (dx / len) * 0.01]);
    }
  }
  s.stroke(edge, { closed: true, w: 1.9 });
  const cx = corners.reduce((q, p) => q + p[0], 0) / 4;
  const cy = corners.reduce((q, p) => q + p[1], 0) / 4;
  const inner = corners.map(([x, y]) => [cx + (x - cx) * 0.78, cy + (y - cy) * 0.78] as Pt);
  for (let k = 0; k < 4; k++) {
    const a = inner[k];
    const b = inner[(k + 1) % 4];
    for (let i = 0; i < 8; i++) {
      const t = (i + 0.5) / 8;
      s.circle(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, 0.0025, { w: 1.2, alpha: 0.6 });
    }
  }
}

const bathroom: Room = {
  name: "bathroom",
  mood: "resets, mirror talks",
  left(s) {
    if (look.color) s.washAll(tint(BATH.wall), 1);
    // shower recess: tiled panel from the floor up
    const sx0 = 0.12;
    const sx1 = 0.6;
    const sy0 = 0.24;
    s.sticker(s.rectPts(sx0, sy0, sx1 - sx0, 1.02 - sy0), 5, 0.18, tint(BATH.tile));
    s.stroke(
      [
        [sx0, 1.01],
        [sx0, sy0],
        [sx1, sy0],
        [sx1, 1.01],
      ],
      { w: 2.4 },
    );
    for (let x = sx0 + 0.06; x < sx1 - 0.01; x += 0.06) s.line(x, sy0, x, 1, { w: 1.1, alpha: 0.5 });
    for (let y = sy0 + 0.06; y < 1; y += 0.06) s.line(sx0, y, sx1, y, { w: 1.1, alpha: 0.5 });
    // shower arm + head + water
    s.stroke(
      [
        [sx0, 0.32],
        [0.21, 0.31],
        [0.25, 0.34],
      ],
      { w: 3 },
    );
    const head = s.ellipsePts(0.27, 0.375, 0.055, 0.03, Math.PI, Math.PI * 2, 14);
    const headShape: Pt[] = [[0.235, 0.345], ...head.reverse(), [0.305, 0.345]];
    s.sticker(headShape, 3, 0.15);
    s.stroke(headShape, { closed: true, w: 2.4 });
    for (let i = 0; i < 7; i++) {
      const x = 0.225 + i * 0.015;
      s.line(x, 0.395, x + (i - 3) * 0.012, 0.5 + (i % 2) * 0.03, { w: 1, alpha: 0.55 });
      if (i % 2 === 0) s.circle(x + (i - 3) * 0.014, 0.53 + (i % 3) * 0.02, 0.003, { w: 1, alpha: 0.5 });
    }
    // shower shelf with bottles
    s.sticker(s.rectPts(sx0 + 0.01, 0.6, 0.2, 0.025), 3, 0.15, tint(BATH.wood));
    s.box(sx0 + 0.01, 0.6, 0.2, 0.025, null, { w: 2 });
    for (const [x, h, c] of [
      [0.16, 0.08, BATH.towel2],
      [0.21, 0.1, BATH.soap],
    ] as const) {
      const b = s.rectPts(x, 0.6 - h, 0.04, h);
      s.sticker(b, 2, 0.12, tint(c));
      s.stroke(b, { closed: true, w: 1.8 });
      s.box(x + 0.012, 0.6 - h - 0.02, 0.016, 0.02, null, { w: 1.6 });
    }
    // towel on a hook near the front edge
    s.circle(0.075, 0.44, 0.012, { w: 2 });
    const towel: Pt[] = [
      [0.035, 0.46],
      [0.115, 0.46],
      [0.125, 0.75],
      [0.03, 0.75],
    ];
    s.sticker(towel, 4, 0.18, tint(BATH.towel));
    s.stroke(towel, { closed: true, w: 2.2 });
    s.line(0.04, 0.7, 0.12, 0.7, { w: 1.3, alpha: 0.7 });
    s.line(0.06, 0.48, 0.065, 0.66, { w: 1.1, alpha: 0.6 });
    sparkle(s, 0.07, 0.3, 0.025);
    sparkle(s, 0.05, 0.37, 0.014);
    // hanging plant near the corner
    const px = 0.81;
    const potTop = 0.24;
    s.line(px, 0, px, 0.03, { w: 1.6 });
    s.circle(px, 0.04, 0.01, { w: 1.6 });
    for (const dx of [-0.06, 0.06]) s.line(px, 0.05, px + dx, potTop, { w: 1.3 });
    for (const [dx, dy, rot] of [
      [-0.06, -0.04, -0.8],
      [-0.02, -0.06, -0.2],
      [0.03, -0.06, 0.3],
      [0.07, -0.035, 0.9],
    ] as const)
      almondLeaf(s, px + dx, potTop + dy, 0.032, rot, BATH.leaf);
    const pot = s.ellipsePts(px, potTop, 0.065, 0.06, 0, Math.PI, 16);
    s.sticker(pot, 4, 0.18, tint(BATH.pot));
    s.stroke(pot, { closed: true, w: 2.2 });
    vines(
      s,
      [
        [
          [px - 0.04, potTop + 0.04],
          [px - 0.06, potTop + 0.14],
          [px - 0.05, potTop + 0.24],
        ],
        [
          [px + 0.03, potTop + 0.05],
          [px + 0.05, potTop + 0.13],
        ],
      ],
      0.026,
      BATH.leaf,
    );
  },
  right(s) {
    if (look.color) s.washAll(tint(BATH.wall), 1);
    // framed picture
    tapedPhoto(s, 0.14, 0.12, 0.12, 0.13, 0.02, "mountain");
    // floating shelves
    const shelf = (y: number) => {
      s.sticker(s.rectPts(0.13, y, 0.3, 0.028), 3, 0.18, tint(BATH.wood));
      s.box(0.13, y, 0.3, 0.028, null, { w: 2.2 });
    };
    shelf(0.37);
    shelf(0.51);
    // folded towels + reed diffuser on the top shelf
    for (const [y, c] of [
      [0.33, BATH.towel],
      [0.29, BATH.towel2],
    ] as const) {
      const t = s.rectPts(0.15, y, 0.13, 0.04);
      s.sticker(t, 2, 0.12, tint(c));
      s.stroke(t, { closed: true, w: 1.8 });
      s.line(0.16, y + 0.02, 0.27, y + 0.02, { w: 1, alpha: 0.6 });
    }
    const dif = s.rectPts(0.33, 0.31, 0.05, 0.06);
    s.sticker(dif, 2, 0.12, tint(BATH.diffuser));
    s.stroke(dif, { closed: true, w: 1.8 });
    for (const dx of [-0.012, 0, 0.012]) s.line(0.355, 0.31, 0.355 + dx * 2.2, 0.23, { w: 1.3 });
    // jar + little trailing plant on the lower shelf
    const jar = s.rectPts(0.16, 0.475, 0.055, 0.035);
    s.sticker(jar, 2, 0.12, tint(BATH.jar));
    s.stroke(jar, { closed: true, w: 1.8 });
    s.line(0.16, 0.485, 0.215, 0.485, { w: 1.2 });
    const pot2 = s.rectPts(0.3, 0.47, 0.06, 0.04);
    s.sticker(pot2, 2, 0.12, tint(BATH.pot));
    s.stroke(pot2, { closed: true, w: 1.8 });
    for (const [dx, rot] of [
      [-0.02, -0.7],
      [0.015, 0.1],
      [0.045, 0.8],
    ] as const)
      almondLeaf(s, 0.32 + dx, 0.45, 0.024, rot, BATH.leaf);
    vines(
      s,
      [
        [
          [0.36, 0.5],
          [0.38, 0.57],
          [0.37, 0.64],
        ],
      ],
      0.022,
      BATH.leaf,
    );
    // toilet, drawn flat against the wall
    const loo = (pts: Pt[]) => {
      s.sticker(pts, 4, 0.2);
      s.stroke(pts, { closed: true, w: 2.4 });
    };
    loo(s.rectPts(0.175, 0.6, 0.15, 0.17));
    loo(s.rectPts(0.165, 0.58, 0.17, 0.025));
    s.box(0.235, 0.565, 0.03, 0.015, null, { w: 1.8 });
    loo([
      [0.21, 0.82],
      [0.29, 0.82],
      [0.28, 0.9],
      [0.27, 1.0],
      [0.23, 1.0],
      [0.22, 0.9],
    ]);
    loo([[0.15, 0.79], ...s.ellipsePts(0.25, 0.79, 0.1, 0.05, 0, Math.PI, 16)]);
    loo(s.rectPts(0.145, 0.77, 0.21, 0.025));
    s.line(0.2, 0.69, 0.3, 0.69, { w: 1, alpha: 0.5 });
    // toilet-paper holder
    s.line(0.38, 0.64, 0.41, 0.64, { w: 2.2 });
    const roll = s.rectPts(0.395, 0.62, 0.05, 0.05);
    s.sticker(roll, 2, 0.12);
    s.stroke(roll, { closed: true, w: 1.8 });
    s.circle(0.42, 0.645, 0.008, { w: 1.4 });
    // arched mirror over the vanity
    const mx = 0.74;
    const mirror: Pt[] = [[0.63, 0.58], ...s.ellipsePts(mx, 0.32, 0.11, 0.1, Math.PI, Math.PI * 2, 18), [0.85, 0.58]];
    s.sticker(mirror, 6, 0.2, tint(BATH.vanity));
    s.stroke(mirror, { closed: true, w: 2.6 });
    const glass: Pt[] = [[0.65, 0.565], ...s.ellipsePts(mx, 0.325, 0.09, 0.082, Math.PI, Math.PI * 2, 18), [0.83, 0.565]];
    s.mark("journal", mirror);
    s.fill(glass, tint(BATH.glass), { alpha: 1, jitter: 0.3 });
    s.stroke(glass, { closed: true, w: 1.5 });
    s.line(0.68, 0.36, 0.72, 0.3, { w: 1.2, alpha: 0.6 });
    s.line(0.69, 0.42, 0.76, 0.32, { w: 1.2, alpha: 0.6 });
    // little sticky notes on the mirror
    const postit = (x: number, y: number, w: number, rot: number, c: string, lines: number) => {
      const cx = x + w / 2;
      const cy = y + w / 2;
      const pts = s.rectPts(x, y, w, w).map(([qx, qy]) => [cx + (qx - cx) * Math.cos(rot) - (qy - cy) * Math.sin(rot), cy + (qx - cx) * Math.sin(rot) + (qy - cy) * Math.cos(rot)] as Pt);
      s.sticker(pts, 2, 0.14, tint(c));
      s.stroke(pts, { closed: true, w: 1.5 });
      for (let i = 0; i < lines; i++) s.line(x + w * 0.2, y + w * (0.38 + i * 0.2), x + w * 0.8, y + w * (0.38 + i * 0.2), { w: 1, alpha: 0.6 });
    };
    postit(0.66, 0.44, 0.05, -0.12, "#fff3b5", 2);
    postit(0.77, 0.47, 0.045, 0.1, "#fadbe2", 0);
    s.stroke(
      [
        [0.783, 0.495],
        [0.792, 0.488],
        [0.8, 0.497],
        [0.792, 0.506],
        [0.783, 0.495],
      ],
      { w: 1.2 },
    );
    postit(0.72, 0.5, 0.046, 0.05, "#dbe8fb", 2);
    // wall lamp above the mirror
    s.line(0.74, 0.11, 0.74, 0.15, { w: 2.2 });
    const lamp: Pt[] = [
      [0.71, 0.2],
      [0.725, 0.15],
      [0.755, 0.15],
      [0.77, 0.2],
    ];
    s.sticker(lamp, 3, 0.18, tint(BATH.lamp));
    s.stroke(lamp, { closed: true, w: 2 });
    for (const [a, b] of [
      [0.69, 0.13],
      [0.79, 0.13],
      [0.74, 0.06],
    ])
      s.line(a, b, a + (a - 0.74) * 0.4, b - 0.02, { w: 1.4 });
    sparkle(s, 0.56, 0.3, 0.022);
  },
  floor(s) {
    if (look.color) s.washAll(tint(BATH.floor), 1);
    // tiles
    for (let i = 1; i < 9; i++) {
      s.line(i / 9, 0, i / 9, 1, { w: 1.4, alpha: 0.5 });
      s.line(0, i / 9, 1, i / 9, { w: 1.4, alpha: 0.5 });
    }
    // contact shadows
    const quad = (x: number, y: number, ax: number, ay: number) => [F(x, y), F(x + ax, y), F(x + ax, y + ay), F(x, y + ay)];
    s.shadow(quad(0.54, 0.0, 0.42, 0.32), 0.24, 16);
    s.shadow(s.ellipsePts(...F(0.93, 0.44), 0.06, 0.06), 0.2, 10);
    // rugs
    scallopRug(s, [F(0.17, 0.54), F(0.35, 0.54), F(0.35, 0.8), F(0.17, 0.8)], BATH.mat, 9);
    scallopRug(s, [F(0.52, 0.42), F(0.86, 0.42), F(0.86, 0.86), F(0.52, 0.86)], BATH.rug, 11);
  },
  popups: isoLayers([
    // against the walls: shower curtain, vanity
    (iso) => {
      // --- shower curtain: rod across the front of the recess, curtain pulled to the inner end ---
      const CX = 0.07; // distance out from the left wall (hangs close to it)
      const RZ = 0.78;
      iso.line([0, 0.41, RZ], [CX, 0.41, RZ], { w: 2.2 });
      iso.line([0, 0.89, RZ], [CX, 0.89, RZ], { w: 2.2 });
      iso.line([CX, 0.41, RZ], [CX, 0.89, RZ], { w: 3 });
      const c0 = 0.42;
      const c1 = 0.65;
      const HEM = 0.04;
      const folds = 6;
      const curtain: V3[] = [
        [CX, c0, RZ - 0.01],
        [CX, c1, RZ - 0.01],
      ];
      for (let i = 0; i <= folds * 2; i++) curtain.push([CX, c1 - ((c1 - c0) * i) / (folds * 2), HEM + (i % 2 ? 0 : 0.015)]);
      iso.face(curtain, look.color ? BATH.curtain : WHITE, { w: 2.4 });
      for (let i = 1; i < folds; i++) {
        const y = c0 + ((c1 - c0) * i) / folds;
        iso.line([CX, y, RZ - 0.03], [CX, y + 0.004, HEM + 0.03], { w: 1.4 });
      }
      for (let i = 0; i < 5; i++) iso.at([CX, c0 + 0.02 + i * 0.04, RZ], (s, [x, y], u) => s.circle(x, y, 0.012 * u, { w: 1.6, mask: true }));

      // --- vanity (against the right wall) ---
      for (const [lx, ly] of [
        [0.56, 0.03],
        [0.89, 0.03],
        [0.56, 0.255],
        [0.89, 0.255],
      ])
        iso.box(lx, ly, 0, 0.022, 0.022, 0.06, WHITE, { color: BATH.vanity });
      iso.box(0.555, 0.02, 0.05, 0.36, 0.26, 0.25, WHITE, { color: BATH.vanity });
      for (const [a0, a1] of [
        [0.57, 0.725],
        [0.745, 0.9],
      ]) {
        iso.face(
          [
            [a0, 0.28, 0.07],
            [a1, 0.28, 0.07],
            [a1, 0.28, 0.28],
            [a0, 0.28, 0.28],
          ],
          null,
          { w: 1.6 },
        );
      }
      iso.line([0.71, 0.28, 0.16], [0.71, 0.28, 0.21], { w: 2.4 });
      iso.line([0.76, 0.28, 0.16], [0.76, 0.28, 0.21], { w: 2.4 });
      iso.box(0.54, 0.005, 0.3, 0.39, 0.295, 0.035);
      // basin
      iso.face(
        [
          [0.63, 0.07, 0.336],
          [0.84, 0.07, 0.336],
          [0.84, 0.22, 0.336],
          [0.63, 0.22, 0.336],
        ],
        WHITE,
        { w: 2 },
      );
      iso.face(
        [
          [0.65, 0.085, 0.336],
          [0.82, 0.085, 0.336],
          [0.82, 0.205, 0.336],
          [0.65, 0.205, 0.336],
        ],
        null,
        { w: 1.3 },
      );
      iso.at([0.74, 0.15, 0.336], (s, [x, y], u) => s.circle(x, y, 0.008 * u, { w: 1.4, mask: true }));
      // faucet
      iso.path(
        [
          [0.735, 0.03, 0.336],
          [0.735, 0.03, 0.43],
          [0.735, 0.08, 0.43],
          [0.735, 0.085, 0.4],
        ],
        { w: 3 },
      );
      // soap pump + toothbrush cup
      iso.cyl(0.585, 0.06, 0.336, 0.02, 0.06, WHITE, { color: BATH.soap });
      iso.line([0.585, 0.06, 0.396], [0.585, 0.06, 0.42], { w: 2 });
      iso.line([0.585, 0.06, 0.42], [0.6, 0.06, 0.42], { w: 2 });
      iso.cyl(0.88, 0.23, 0.336, 0.024, 0.05, WHITE, { color: BATH.cup });
      for (const [dx, dy] of [
        [-0.008, 0],
        [0.008, -0.006],
        [0.002, 0.01],
      ])
        iso.line([0.88 + dx, 0.23 + dy, 0.386], [0.88 + dx * 2.2, 0.23 + dy * 2.2, 0.44], { w: 2 });
    },
    // in front: waste bin with a towel over the edge
    (iso) => {
      iso.cyl(0.93, 0.44, 0, 0.045, 0.1, WHITE, { r2: 0.052, color: BATH.bin });
      iso.at([0.93, 0.44, 0.05], (s, [x, y], u) => {
        for (let i = -2; i <= 2; i++) {
          s.line(x + (i * 0.018 - 0.02) * u, y - 0.045 * u, x + (i * 0.018 + 0.02) * u, y + 0.045 * u, { w: 1, alpha: 0.7, mask: true });
          s.line(x + (i * 0.018 + 0.02) * u, y - 0.045 * u, x + (i * 0.018 - 0.02) * u, y + 0.045 * u, { w: 1, alpha: 0.7, mask: true });
        }
      });
      iso.face(
        [
          [0.915, 0.47, 0.105],
          [0.955, 0.47, 0.105],
          [0.958, 0.49, 0.03],
          [0.912, 0.49, 0.035],
        ],
        look.color ? BATH.towel : WHITE,
        { w: 1.8 },
      );
    },
  ]),
};

// Kitchen — after Dakshi's reference sketch: L-shaped counter, oven and hood, a tall fridge,
// window with curtains, plants everywhere, a little table by the window. Ink-only or soft colour.

const KIT = {
  wall: "#fbf3da",
  tile: "#f4efe6",
  cabinet: "#d3e6c8",
  counter: "#f6f2ea",
  wood: "#ead3b2",
  floor: "#f0dcc0",
  fridge: "#d8ecf6",
  glass: "#dcebfa",
  curtain: "#f8d2c6",
  leaf: "#cfe8c4",
  pot: "#f3c8b0",
  jar: "#fff3cf",
  lid: "#f3c8b0",
  kettle: "#f8d2c6",
  pan: "#e2e2ea",
  rug: "#f8d2c6",
  mug: "#f7ccd6",
  bowl: "#dbe8fb",
  apple: "#f6b7aa",
  note: "#fff3b5",
  note2: "#fadbe2",
  flower: "#f7ccd6",
  towel: "#dbe8fb",
};

/** Pot with a fan of big leaves and a couple of trailing vines (canvas coords, base at by). */
function leafyPlant(s: Sketch, cx: number, by: number, sc: number, trail = 2) {
  const fan: [number, number, number][] = [
    [-1.1, -0.9, -1.1],
    [-0.6, -1.5, -0.5],
    [0.05, -1.75, 0.05],
    [0.65, -1.5, 0.55],
    [1.1, -0.9, 1.1],
  ];
  for (const [dx, dy, rot] of fan) almondLeaf(s, cx + dx * sc * 0.05, by + dy * sc * 0.05, sc * 0.045, rot, KIT.leaf);
  const lines: Pt[][] = [];
  if (trail > 0)
    lines.push([
      [cx - sc * 0.045, by - sc * 0.02],
      [cx - sc * 0.075, by + sc * 0.08],
      [cx - sc * 0.065, by + sc * 0.18],
    ]);
  if (trail > 1)
    lines.push([
      [cx + sc * 0.045, by - sc * 0.02],
      [cx + sc * 0.07, by + sc * 0.07],
    ]);
  if (lines.length) vines(s, lines, sc * 0.028, KIT.leaf);
  const pot: Pt[] = [...s.ellipsePts(cx, by - sc * 0.045, sc * 0.05, sc * 0.045, 0, Math.PI, 14)];
  pot.unshift([cx + sc * 0.05, by - sc * 0.045]);
  s.sticker(pot, 3, 0.16, tint(KIT.pot));
  s.stroke(pot, { closed: true, w: 2 });
}

function note(s: Sketch, x: number, y: number, w: number, h: number, rot: number, kind: "heart" | "list" | "leaf", c: string) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const R = ([qx, qy]: Pt): Pt => [cx + (qx - cx) * Math.cos(rot) - (qy - cy) * Math.sin(rot), cy + (qx - cx) * Math.sin(rot) + (qy - cy) * Math.cos(rot)];
  const pts = s.rectPts(x, y, w, h).map(R);
  s.sticker(pts, 2, 0.14, tint(c));
  s.stroke(pts, { closed: true, w: 1.6 });
  s.box(cx - w * 0.15, y - 0.008, w * 0.3, 0.016, null, { w: 1.1, alpha: 0.7 });
  if (kind === "heart") {
    const hp: Pt[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = (i / 24) * Math.PI * 2;
      hp.push(R([cx + 16 * Math.sin(t) ** 3 * w * 0.012, cy + h * 0.06 - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t)) * w * 0.012]));
    }
    s.stroke(hp, { w: 1.4 });
  } else if (kind === "list") {
    for (let i = 0; i < 3; i++) {
      const yy = y + h * (0.3 + i * 0.22);
      s.box(x + w * 0.15, yy - 0.006, 0.012, 0.012, null, { w: 1 });
      s.line(x + w * 0.4, yy, x + w * 0.85, yy, { w: 1, alpha: 0.7 });
    }
  } else {
    s.line(cx, y + h * 0.85, cx, y + h * 0.3, { w: 1.2 });
    almondLeaf(s, cx - w * 0.15, y + h * 0.5, w * 0.16, -0.7, KIT.leaf);
    almondLeaf(s, cx + w * 0.15, y + h * 0.4, w * 0.16, 0.7, KIT.leaf);
  }
}


/** A flat, front-on kitchen counter drawn on a wall: base cabinets + worktop. */
function counterFront(s: Sketch, x0: number, x1: number, top = 0.62) {
  const base = s.rectPts(x0, top + 0.035, x1 - x0, 1.02 - top - 0.035);
  s.sticker(base, 4, 0.2, tint(KIT.cabinet));
  s.stroke(
    [
      [x0, 1.01],
      [x0, top + 0.035],
      [x1, top + 0.035],
      [x1, 1.01],
    ],
    { w: 2.4 },
  );
  const wt = s.rectPts(x0 - 0.01, top, x1 - x0 + 0.02, 0.035);
  s.sticker(wt, 3, 0.18, tint(KIT.counter));
  s.stroke(wt, { closed: true, w: 2.4 });
  s.line(x0, 0.965, x1, 0.965, { w: 1.4, alpha: 0.8 });
}

/** Cabinet door with a bar handle. */
function cabDoor(s: Sketch, x0: number, x1: number, top: number, bottom: number, handleLeft: boolean) {
  s.rect(x0, top, x1 - x0, bottom - top, { w: 1.6 });
  const hx = handleLeft ? x0 + 0.02 : x1 - 0.02;
  s.line(hx, top + 0.03, hx, top + 0.08, { w: 2.6 });
}

function frontKettle(s: Sketch, cx: number, base: number) {
  const body: Pt[] = [
    [cx - 0.04, base],
    [cx + 0.04, base],
    [cx + 0.03, base - 0.07],
    [cx - 0.03, base - 0.07],
  ];
  s.stroke(s.ellipsePts(cx, base - 0.07, 0.03, 0.04, Math.PI, Math.PI * 2, 10), { w: 2 });
  s.sticker(body, 3, 0.16, tint(KIT.kettle));
  s.stroke(body, { closed: true, w: 2 });
  s.line(cx + 0.035, base - 0.03, cx + 0.065, base - 0.06, { w: 2.4 });
  s.circle(cx, base - 0.08, 0.008, { w: 1.6 });
}

const kitchen: Room = {
  name: "kitchen",
  mood: "nourishment, home, people over",
  left(s) {
    if (look.color) s.washAll(tint(KIT.wall), 1);
    // tiled backsplash above the counter (counter runs from the corner to x≈0.45)
    s.sticker(s.rectPts(0.44, 0.42, 0.58, 0.24), 2, 0.1, tint(KIT.tile));
    for (let x = 0.44; x < 1; x += 0.045) s.line(x, 0.42, x, 0.66, { w: 1, alpha: 0.45 });
    for (let y = 0.465; y < 0.66; y += 0.045) s.line(0.44, y, 1, y, { w: 1, alpha: 0.45 });
    s.line(0.44, 0.42, 1, 0.42, { w: 1.6 });
    s.line(0.44, 0.42, 0.44, 0.66, { w: 1.6 });
    // counter run along this wall: sink, soap, a tea towel on the door
    counterFront(s, 0.45, 1.02);
    cabDoor(s, 0.48, 0.62, 0.68, 0.94, true);
    cabDoor(s, 0.63, 0.77, 0.68, 0.94, false);
    cabDoor(s, 0.8, 0.98, 0.68, 0.94, true);
    const towel: Pt[] = [
      [0.735, 0.7],
      [0.785, 0.7],
      [0.79, 0.84],
      [0.73, 0.84],
    ];
    s.sticker(towel, 3, 0.16, tint(KIT.towel));
    s.stroke(towel, { closed: true, w: 1.8 });
    for (const x of [0.75, 0.77]) s.line(x, 0.71, x, 0.83, { w: 1, alpha: 0.6 });
    // sink rim + gooseneck tap
    s.line(0.58, 0.62, 0.74, 0.62, { w: 3 });
    s.stroke(
      [
        [0.66, 0.62],
        [0.66, 0.53],
        [0.69, 0.51],
        [0.72, 0.53],
        [0.72, 0.56],
      ],
      { w: 3 },
    );
    const soap = s.rectPts(0.52, 0.565, 0.035, 0.055);
    s.sticker(soap, 2, 0.12, tint(KIT.towel));
    s.stroke(soap, { closed: true, w: 1.8 });
    s.stroke(
      [
        [0.5375, 0.565],
        [0.5375, 0.545],
        [0.555, 0.545],
      ],
      { w: 1.8 },
    );
    frontKettle(s, 0.88, 0.62);
    // window with clouds
    const win = s.rectPts(0.2, 0.2, 0.32, 0.38);
    s.sticker(win, 7);
    s.fill(s.rectPts(0.22, 0.22, 0.28, 0.34), tint(KIT.glass), { alpha: 1, jitter: 0.3 });
    s.box(0.2, 0.2, 0.32, 0.38, null, { w: 2.8 });
    s.rect(0.22, 0.22, 0.28, 0.34, { w: 1.6 });
    s.line(0.36, 0.22, 0.36, 0.56, { w: 2.4 });
    s.line(0.22, 0.39, 0.5, 0.39, { w: 2.4 });
    cloud(s, 0.28, 0.3, 0.022);
    cloud(s, 0.44, 0.27, 0.025);
    cloud(s, 0.3, 0.5, 0.026, true);
    cloud(s, 0.45, 0.48, 0.024, true);
    s.box(0.18, 0.58, 0.36, 0.02, null, { w: 2 });
    // rod + curtains
    s.line(0.13, 0.17, 0.59, 0.17, { w: 2.6 });
    curtain(s, 0.13, 0.25, 0.17, 0.68);
    curtain(s, 0.47, 0.59, 0.17, 0.48);
    // floating shelves near the corner: books, jars
    const shelf = (y: number) => {
      s.sticker(s.rectPts(0.64, y, 0.3, 0.026), 3, 0.18, tint(KIT.wood));
      s.box(0.64, y, 0.3, 0.026, null, { w: 2 });
    };
    shelf(0.22);
    shelf(0.36);
    for (const [x, w, h] of [
      [0.82, 0.03, 0.1],
      [0.853, 0.035, 0.09],
    ] as const) {
      const b = s.rectPts(x, 0.22 - h, w, h);
      s.sticker(b, 2, 0.12, tint(KIT.note2));
      s.stroke(b, { closed: true, w: 1.6 });
      s.line(x + w * 0.2, 0.22 - h + 0.02, x + w * 0.8, 0.22 - h + 0.02, { w: 1, alpha: 0.6 });
    }
    for (const [x, w, h] of [
      [0.7, 0.06, 0.08],
      [0.8, 0.065, 0.07],
    ] as const) {
      const j = s.rectPts(x, 0.36 - h, w, h);
      s.sticker(j, 2, 0.12, tint(KIT.jar));
      s.stroke(j, { closed: true, w: 1.8 });
      const l = s.rectPts(x - 0.004, 0.36 - h - 0.016, w + 0.008, 0.016);
      s.sticker(l, 1, 0.1, tint(KIT.lid));
      s.stroke(l, { closed: true, w: 1.5 });
      for (let i = 0; i < 6; i++) s.circle(x + 0.012 + s.r() * (w - 0.024), 0.36 - h * 0.15 - s.r() * h * 0.45, 0.003, { w: 1, alpha: 0.7 });
    }
    // taped notes near the front edge
    note(s, 0.03, 0.55, 0.07, 0.08, -0.04, "heart", KIT.note2);
    note(s, 0.035, 0.67, 0.075, 0.09, 0.03, "list", KIT.note);
  },
  right(s) {
    if (look.color) s.washAll(tint(KIT.wall), 1);
    // backsplash behind the counter
    s.sticker(s.rectPts(-0.02, 0.42, 0.76, 0.24), 2, 0.1, tint(KIT.tile));
    for (let x = 0.025; x < 0.74; x += 0.045) s.line(x, 0.42, x, 0.66, { w: 1, alpha: 0.45 });
    for (let y = 0.465; y < 0.66; y += 0.045) s.line(0, y, 0.74, y, { w: 1, alpha: 0.45 });
    s.line(0, 0.42, 0.74, 0.42, { w: 1.6 });
    // counter run along this wall: door, oven, drawers, door (the fridge hides the far end)
    counterFront(s, -0.02, 0.735);
    cabDoor(s, 0.02, 0.22, 0.68, 0.94, false);
    const oven = s.rectPts(0.24, 0.655, 0.18, 0.31);
    s.sticker(oven, 2, 0.1);
    s.stroke(oven, { closed: true, w: 2 });
    for (const x of [0.275, 0.33, 0.385]) s.circle(x, 0.69, 0.012, { w: 1.6 });
    s.line(0.26, 0.725, 0.4, 0.725, { w: 2.4 });
    s.fill(s.rectPts(0.265, 0.75, 0.13, 0.17), tint(KIT.glass), { alpha: 1, jitter: 0.2 });
    s.rect(0.265, 0.75, 0.13, 0.17, { w: 1.6 });
    s.line(0.28, 0.8, 0.31, 0.77, { w: 1, alpha: 0.6 });
    for (let i = 0; i < 3; i++) {
      const y = 0.67 + i * 0.095;
      s.rect(0.44, y, 0.1, 0.08, { w: 1.5 });
      s.line(0.47, y + 0.04, 0.51, y + 0.04, { w: 2.2 });
    }
    cabDoor(s, 0.56, 0.72, 0.68, 0.94, true);
    // on the worktop: kettle, pot on the hob, cutting board, fruit bowl, utensils, toaster
    frontKettle(s, 0.1, 0.62);
    const pot = s.rectPts(0.29, 0.56, 0.08, 0.06);
    s.sticker(pot, 3, 0.15, tint(KIT.pan));
    s.stroke(pot, { closed: true, w: 2 });
    s.line(0.285, 0.555, 0.375, 0.555, { w: 2.2 });
    s.circle(0.33, 0.545, 0.008, { w: 1.6 });
    s.line(0.37, 0.575, 0.4, 0.57, { w: 2.4 });
    const board: Pt[] = [
      [0.44, 0.62],
      [0.5, 0.62],
      [0.5, 0.5],
      [0.44, 0.5],
    ];
    s.sticker(board, 3, 0.15, tint(KIT.wood));
    s.stroke(board, { closed: true, w: 2 });
    s.circle(0.47, 0.485, 0.012, { w: 1.6 });
    for (const [dx, dy] of [
      [-0.025, 0.585],
      [0.02, 0.585],
      [0, 0.565],
    ]) {
      const ap = s.ellipsePts(0.56 + dx, dy, 0.018, 0.017);
      s.sticker(ap, 2, 0.12, tint(KIT.apple));
      s.stroke(ap, { closed: true, w: 1.6 });
    }
    const bowlShape: Pt[] = [[0.61, 0.6], ...s.ellipsePts(0.56, 0.6, 0.05, 0.03, 0, Math.PI, 12)];
    s.sticker(bowlShape, 3, 0.15, tint(KIT.bowl));
    s.stroke(bowlShape, { closed: true, w: 2 });
    const crock = s.rectPts(0.18, 0.57, 0.045, 0.05);
    s.sticker(crock, 2, 0.12);
    s.stroke(crock, { closed: true, w: 1.8 });
    s.line(0.192, 0.57, 0.185, 0.5, { w: 2 });
    s.stroke(s.ellipsePts(0.185, 0.49, 0.012, 0.018), { closed: true, w: 1.6 });
    s.line(0.21, 0.57, 0.22, 0.51, { w: 2 });
    // framed picture near the corner
    tapedPhoto(s, 0.06, 0.1, 0.11, 0.13, 0.02, "mountain");
    // range hood over the oven
    const chim = s.rectPts(0.29, 0.06, 0.08, 0.24);
    s.sticker(chim, 3, 0.18);
    s.stroke(chim, { closed: true, w: 2.2 });
    const hood: Pt[] = [
      [0.29, 0.3],
      [0.37, 0.3],
      [0.43, 0.4],
      [0.23, 0.4],
    ];
    s.sticker(hood, 4, 0.2);
    s.stroke(hood, { closed: true, w: 2.4 });
    s.box(0.23, 0.4, 0.2, 0.022, null, { w: 2 });
    for (const x of [0.37, 0.39, 0.41]) s.circle(x, 0.411, 0.004, { w: 1 });
    s.line(0.26, 0.37, 0.31, 0.33, { w: 1.1, alpha: 0.6 });
    // upper cabinet
    const cab = s.rectPts(0.47, 0.2, 0.22, 0.2);
    s.sticker(cab, 5, 0.2, tint(KIT.cabinet));
    s.stroke(cab, { closed: true, w: 2.6 });
    s.line(0.58, 0.2, 0.58, 0.4, { w: 1.8 });
    s.line(0.56, 0.31, 0.56, 0.36, { w: 2.4 });
    s.line(0.6, 0.31, 0.6, 0.36, { w: 2.4 });
  },
  floor(s) {
    if (look.color) s.washAll(tint(KIT.floor), 1);
    for (let i = 1; i < 9; i++) {
      const v = i / 9;
      s.line(v, 0, v, 1, { w: 1.5, alpha: 0.55 });
      for (let j = 0; j < 2; j++) {
        const p = s.r() * 0.8 + 0.1;
        s.line(v, p, v + 1 / 9, p, { w: 1.2, alpha: 0.45 });
      }
    }
    const quad = (x: number, y: number, ax: number, ay: number) => [F(x, y), F(x + ax, y), F(x + ax, y + ay), F(x, y + ay)];
    s.shadow(quad(0.74, 0.0, 0.26, 0.31), 0.26, 16);
    s.shadow(s.ellipsePts(...F(0.36, 0.78), 0.09, 0.09), 0.2, 12);
    scallopRug(s, [F(0.44, 0.4), F(0.84, 0.4), F(0.84, 0.82), F(0.44, 0.82)], KIT.rug, 11);
  },
  popups: isoLayers([
    // tall fridge with a plant on top
    (iso) => {
      // --- fridge with a plant on top ---
      iso.box(0.745, 0.025, 0, 0.23, 0.25, 0.8, WHITE, { color: KIT.fridge });
      iso.mark("journal", [
        [0.745, 0.275, 0],
        [0.975, 0.275, 0],
        [0.975, 0.275, 0.8],
        [0.745, 0.275, 0.8],
        [0.975, 0.025, 0.8],
      ]);
      const FF = 0.275;
      iso.line([0.745, FF, 0.5], [0.975, FF, 0.5], { w: 1.8 });
      iso.line([0.77, FF, 0.55], [0.77, FF, 0.68], { w: 3 });
      iso.line([0.77, FF, 0.3], [0.77, FF, 0.44], { w: 3 });
      iso.face(
        [
          [0.84, FF, 0.58],
          [0.89, FF, 0.58],
          [0.89, FF, 0.66],
          [0.84, FF, 0.66],
        ],
        look.color ? KIT.note : WHITE,
        { w: 1.4 },
      );
      for (const z of [0.6, 0.62, 0.64]) iso.line([0.85, FF, z], [0.88, FF, z], { w: 1, alpha: 0.7 });
      iso.face(
        [
          [0.84, FF, 0.32],
          [0.9, FF, 0.32],
          [0.9, FF, 0.4],
          [0.84, FF, 0.4],
        ],
        look.color ? KIT.note2 : WHITE,
        { w: 1.4 },
      );
      iso.at([0.87, FF, 0.36], (s, [x, y], u) => s.blob(x, y, 0.01 * u, 0.009 * u, null, { w: 1.3, mask: true }));
      iso.cyl(0.85, 0.12, 0.8, 0.045, 0.05, WHITE, { color: KIT.pot });
      iso.at([0.85, 0.12, 0.85], (s, [x, y], u) => {
        for (const [dx, dy, rot] of [
          [-0.05, -0.03, -1.0],
          [-0.02, -0.06, -0.3],
          [0.025, -0.065, 0.3],
          [0.055, -0.03, 1.0],
        ] as const) {
          const r = 0.03 * u;
          const pts: Pt[] = [];
          for (let i = 0; i <= 8; i++) pts.push([Math.sin((i / 8) * Math.PI) * r * 0.62, -r + (2 * r * i) / 8]);
          for (let i = 8; i >= 0; i--) pts.push([-Math.sin((i / 8) * Math.PI) * r * 0.62, -r + (2 * r * i) / 8]);
          const q = pts.map(([a, b]) => [x + dx * u + a * Math.cos(rot) - b * Math.sin(rot), y + dy * u + a * Math.sin(rot) + b * Math.cos(rot)] as Pt);
          s.shape(q, tint(KIT.leaf), { mask: true, w: 1.5 });
        }
      });
    },
    // table by the window, spindle-back chair and a stool
    (iso) => {
      // chair (behind the table, facing it)
      const cx0 = 0.06;
      const cb0 = 0.72;
      for (const [a, b] of [
        [cx0, cb0],
        [cx0 + 0.13, cb0],
        [cx0, cb0 + 0.13],
        [cx0 + 0.13, cb0 + 0.13],
      ])
        iso.line([a + 0.01, b + 0.01, 0], [a + 0.01, b + 0.01, 0.2], { w: 2.6 });
      iso.box(cx0, cb0, 0.2, 0.15, 0.15, 0.025, WHITE, { color: KIT.wood });
      iso.line([cx0 + 0.008, cb0 + 0.01, 0.225], [cx0 + 0.008, cb0 + 0.01, 0.46], { w: 2.6 });
      iso.line([cx0 + 0.008, cb0 + 0.14, 0.225], [cx0 + 0.008, cb0 + 0.14, 0.46], { w: 2.6 });
      for (const b of [0.045, 0.075, 0.105]) iso.line([cx0 + 0.008, cb0 + b, 0.225], [cx0 + 0.008, cb0 + b, 0.43], { w: 1.8 });
      iso.box(cx0 - 0.005, cb0, 0.43, 0.02, 0.15, 0.04, WHITE, { color: KIT.wood });
      // round table
      iso.cyl(0.36, 0.78, 0, 0.065, 0.015, WHITE, { color: KIT.wood });
      iso.line([0.36, 0.78, 0.015], [0.36, 0.78, 0.29], { w: 3.4 });
      iso.cyl(0.36, 0.78, 0.29, 0.13, 0.025, WHITE, { color: KIT.wood });
      const TT = 0.315;
      // vase with flowers, fruit bowl, mug
      iso.cyl(0.32, 0.72, TT, 0.022, 0.06, WHITE, { r2: 0.016, color: KIT.bowl });
      iso.at([0.32, 0.72, TT + 0.06], (s, [x, y], u) => {
        for (const [dx, dy] of [
          [-0.03, -0.07],
          [0.0, -0.09],
          [0.03, -0.065],
        ]) {
          s.line(x, y, x + dx * u, y + dy * u, { w: 1.4, mask: true });
          for (let k = 0; k < 5; k++) {
            const a = (k / 5) * Math.PI * 2;
            s.blob(x + dx * u + Math.cos(a) * 0.01 * u, y + dy * u + Math.sin(a) * 0.01 * u, 0.008 * u, 0.008 * u, tint(KIT.flower), { w: 1.2, mask: true });
          }
          s.circle(x + dx * u, y + dy * u, 0.004 * u, { w: 1.2 });
        }
      });
      iso.cyl(0.4, 0.8, TT, 0.04, 0.025, WHITE, { r2: 0.055, color: KIT.bowl });
      iso.at([0.4, 0.8, TT + 0.025], (s, [x, y], u) => {
        for (const [dx, dy] of [
          [-0.025, -0.01],
          [0.02, -0.012],
          [0, -0.03],
        ])
          s.blob(x + dx * u, y + dy * u, 0.017 * u, 0.016 * u, tint(KIT.apple), { w: 1.5, mask: true });
      });
      iso.cyl(0.29, 0.83, TT, 0.02, 0.035, WHITE, { color: KIT.mug });
      // stool in front
      const sx = 0.58;
      const sy = 0.86;
      for (const a of [0.4, 2.0, 3.6, 5.2]) iso.line([sx + Math.cos(a) * 0.04, sy + Math.sin(a) * 0.04, 0], [sx + Math.cos(a) * 0.035, sy + Math.sin(a) * 0.035, 0.21], { w: 2.4 });
      iso.cyl(sx, sy, 0.21, 0.06, 0.03, WHITE, { color: KIT.wood });
    },
  ]),
};

// Balcony — after Dakshi's reference: sliding door, plants everywhere, a bean bag with a throw,
// railings open to the sky. Ink-only or soft colour.

const BAL = {
  wall: "#e9e3f1",
  sky: "#8f98d2",
  skyLow: "#a9a6d8",
  hills: "#a9aad3",
  city: "#9b9dcc",
  window: "#ffe39a",
  moon: "#fff3bf",
  deck: "#dcc3a0",
  wood: "#e2c9a6",
  glass: "#fbe6b0",
  curtain: "#f3e7d6",
  bag: "#f1dccb",
  pillow: "#ddd3f2",
  throw: "#f4c9cf",
  diary: "#c9d8f3",
  leaf: "#c6e0bd",
  pot: "#efc2aa",
  flower: "#f7ccd6",
  hydrangea: "#d9d0f3",
  can: "#cfe0f7",
  mug: "#f7ccd6",
  book: "#dbe8fb",
  lantern: "#ffe39a",
  bulb: "#fff1b0",
  light: "#ffd56b",
  rug: "#ece4f6",
};

/** Corner-cutting (Chaikin) smoothing for soft, puffy outlines. */
function soft(points: Pt[], iterations = 3): Pt[] {
  let p = points;
  for (let k = 0; k < iterations; k++) {
    const out: Pt[] = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i];
      const b = p[(i + 1) % p.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = out;
  }
  return p;
}

/** Five-petal flower. */
function flower(s: Sketch, x: number, y: number, r: number, color: string, mask = false) {
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * Math.PI * 2 - Math.PI / 2;
    s.blob(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75, r * 0.75, tint(color), { w: 1.3, mask });
  }
  s.circle(x, y, r * 0.35, { w: 1.2, mask });
}

/** Round, slightly notched monstera-ish leaf. */
function bigLeaf(s: Sketch, x: number, y: number, r: number, rot: number, mask: boolean) {
  const pts: Pt[] = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    const notch = i % 4 === 2 ? 0.7 : 1;
    pts.push([x + Math.cos(a + rot) * r * notch, y + Math.sin(a + rot) * r * 0.85 * notch]);
  }
  s.shape(pts, tint(BAL.leaf), { mask, w: 1.6 });
  s.line(x - Math.cos(rot) * r * 0.9, y - Math.sin(rot) * r * 0.8, x + Math.cos(rot) * r * 0.9, y + Math.sin(rot) * r * 0.8, { w: 1.1 });
}

/** Railing seen from the front on a wall: top rail + balusters down to the floor. */
function wallRailing(s: Sketch, x0: number, x1: number, top: number) {
  const rail = s.rectPts(x0, top, x1 - x0, 0.03);
  s.sticker(rail, 3, 0.18, tint(BAL.wood));
  s.stroke(rail, { closed: true, w: 2.2 });
  for (let x = x0 + 0.02; x < x1 - 0.01; x += 0.045) {
    const b = s.rectPts(x, top + 0.03, 0.022, 1.0 - top - 0.03);
    s.sticker(b, 1, 0.1, tint(BAL.wood));
    s.stroke(b, { closed: true, w: 1.6 });
  }
  s.line(x0, 0.96, x1, 0.96, { w: 2 });
}


/** Leaves and flower heads on stems growing out of a pot (card coords; x, y = top of the pot). */
function potPlant(
  s: Sketch,
  x: number,
  y: number,
  u: number,
  leaves: [number, number, number][],
  heads: [number, number][],
  head: (hx: number, hy: number) => void,
) {
  // stems first, from the soil to every leaf and flower
  for (const [dx, dy] of [...leaves.map(([a, b]) => [a * 0.6, b * 0.7] as [number, number]), ...heads]) {
    const ex = x + dx * u;
    const ey = y + dy * u;
    s.stroke(
      [
        [x + dx * 0.15 * u, y - 0.005 * u],
        [x + dx * 0.55 * u, y + dy * 0.5 * u],
        [ex, ey],
      ],
      { w: 1.7, mask: true },
    );
  }
  for (const [dx, dy, rot] of leaves) almondLeaf(s, x + dx * u, y + dy * u, 0.032 * u, rot, BAL.leaf, true);
  for (const [dx, dy] of heads) head(x + dx * u, y + dy * u);
}

const balcony: Room = {
  name: "balcony",
  mood: "late nights, the big picture, gratitude",
  left(s) {
    if (look.color) s.washAll(tint(BAL.wall), 1);
    // sliding glass door with a peek of the room inside
    const door = s.rectPts(0.14, 0.2, 0.46, 0.8);
    s.sticker(door, 6, 0.2);
    s.fill(s.rectPts(0.165, 0.23, 0.2, 0.74), tint(BAL.glass), { alpha: 1, jitter: 0.2 });
    s.fill(s.rectPts(0.385, 0.23, 0.19, 0.74), tint(BAL.glass), { alpha: 1, jitter: 0.2 });
    s.stroke(
      [
        [0.14, 1.0],
        [0.14, 0.2],
        [0.6, 0.2],
        [0.6, 1.0],
      ],
      { w: 3 },
    );
    s.rect(0.165, 0.23, 0.2, 0.74, { w: 1.8 });
    s.rect(0.385, 0.23, 0.19, 0.74, { w: 1.8 });
    s.line(0.39, 0.6, 0.39, 0.67, { w: 2.6 });
    for (const [x, y] of [
      [0.2, 0.3],
      [0.42, 0.28],
    ]) {
      s.line(x, y + 0.08, x + 0.05, y, { w: 1.1, alpha: 0.6 });
      s.line(x + 0.02, y + 0.12, x + 0.08, y + 0.03, { w: 1.1, alpha: 0.6 });
    }
    // inside: the room is lit — floor lamp glowing, armchair, picture (faint)
    if (look.color) s.glow(0.22, 0.47, 0.16, BAL.light, 0.55);
    s.line(0.22, 0.88, 0.22, 0.5, { w: 1.4, alpha: 0.55 });
    s.stroke(
      [
        [0.19, 0.5],
        [0.25, 0.5],
        [0.24, 0.44],
        [0.2, 0.44],
      ],
      { w: 1.4, alpha: 0.55, closed: true },
    );
    s.stroke(
      [
        [0.18, 0.9],
        [0.18, 0.72],
        [0.24, 0.7],
        [0.32, 0.72],
        [0.33, 0.8],
        [0.33, 0.9],
      ],
      { w: 1.4, alpha: 0.55 },
    );
    s.line(0.18, 0.8, 0.33, 0.8, { w: 1.4, alpha: 0.55 });
    s.rect(0.44, 0.4, 0.07, 0.08, { w: 1.3, alpha: 0.55 });
    // curtain tied to the right of the door
    const cur: Pt[] = [
      [0.55, 0.2],
      [0.64, 0.2],
      [0.63, 0.95],
      [0.6, 0.97],
      [0.57, 0.95],
      [0.54, 0.97],
    ];
    s.sticker(cur, 4, 0.18, tint(BAL.curtain));
    s.stroke(cur, { closed: true, w: 2.2 });
    for (const x of [0.575, 0.6, 0.62]) s.line(x, 0.22, x - 0.004, 0.94, { w: 1.2, alpha: 0.7 });
    s.line(0.13, 0.19, 0.66, 0.19, { w: 2.6 });
    // wall lantern with a glow
    s.stroke(
      [
        [0.03, 0.3],
        [0.06, 0.28],
        [0.08, 0.31],
      ],
      { w: 2 },
    );
    const lan: Pt[] = [
      [0.055, 0.33],
      [0.105, 0.33],
      [0.1, 0.42],
      [0.06, 0.42],
    ];
    if (look.color) s.glow(0.08, 0.38, 0.14, BAL.light, 0.6);
    s.sticker(lan, 3, 0.18, tint(BAL.lantern));
    s.stroke(lan, { closed: true, w: 2 });
    s.stroke(
      [
        [0.05, 0.33],
        [0.08, 0.305],
        [0.11, 0.33],
      ],
      { w: 2 },
    );
    s.line(0.08, 0.34, 0.08, 0.41, { w: 1.2 });
    for (const [a, b, c, d] of [
      [0.04, 0.44, 0.025, 0.46],
      [0.12, 0.44, 0.135, 0.46],
      [0.08, 0.45, 0.08, 0.48],
    ])
      s.line(a, b, c, d, { w: 1.4 });
    // two little plant prints
    note(s, 0.03, 0.52, 0.07, 0.08, -0.03, "leaf", BAL.flower);
    note(s, 0.05, 0.64, 0.07, 0.08, 0.04, "leaf", BAL.bulb);
    // floating shelves near the corner with books and a trailing pothos
    const shelf = (y: number) => {
      s.sticker(s.rectPts(0.68, y, 0.25, 0.025), 3, 0.18, tint(BAL.wood));
      s.box(0.68, y, 0.25, 0.025, null, { w: 2 });
    };
    shelf(0.22);
    shelf(0.38);
    for (const [x, w, h, y] of [
      [0.83, 0.03, 0.09, 0.22],
      [0.862, 0.035, 0.08, 0.22],
      [0.75, 0.035, 0.1, 0.38],
      [0.787, 0.03, 0.09, 0.38],
      [0.82, 0.04, 0.085, 0.38],
    ] as const) {
      const b = s.rectPts(x, y - h, w, h);
      s.sticker(b, 2, 0.12, tint(BAL.book));
      s.stroke(b, { closed: true, w: 1.6 });
      s.line(x + w * 0.2, y - h + 0.02, x + w * 0.8, y - h + 0.02, { w: 1, alpha: 0.6 });
    }
    const pot: Pt[] = [[0.765, 0.17], ...s.ellipsePts(0.72, 0.17, 0.045, 0.05, 0, Math.PI, 12)];
    vines(
      s,
      [
        [
          [0.69, 0.18],
          [0.66, 0.28],
          [0.67, 0.4],
          [0.65, 0.5],
        ],
        [
          [0.73, 0.2],
          [0.72, 0.3],
        ],
      ],
      0.026,
      BAL.leaf,
    );
    for (const [dx, dy, rot] of [
      [-0.04, -0.03, -0.9],
      [0, -0.05, 0],
      [0.04, -0.03, 0.9],
    ] as const)
      almondLeaf(s, 0.72 + dx, 0.17 + dy, 0.028, rot, BAL.leaf);
    s.sticker(pot, 3, 0.16, tint(BAL.pot));
    s.stroke(pot, { closed: true, w: 2 });
  },
  right(s) {
    if (look.color) s.washAll(tint(BAL.wall), 1);
    // open to the night: moon, stars, dark hills and a little town with lit windows
    const sky = s.rectPts(-0.02, -0.02, 1.04, 0.64);
    s.sticker(sky, 0, 0, tint(BAL.sky));
    if (look.color) s.fill(s.rectPts(-0.02, 0.4, 1.04, 0.22), BAL.skyLow, { alpha: 0.6, jitter: 0 });
    else s.hatch(sky, 0.011, -1.0, 1.1, 0.42);
    // moon
    if (look.color) s.glow(0.83, 0.25, 0.12, BAL.moon, 0.7);
    const moon: Pt[] = [...s.ellipsePts(0.83, 0.25, 0.045, 0.045, 0.6, 5.7, 20), ...s.ellipsePts(0.855, 0.235, 0.035, 0.035, 5.2, 1.1, 14)];
    s.sticker(moon, 3, 0, tint(BAL.moon));
    s.stroke(moon, { closed: true, w: 2 });
    // stars
    for (const [x, y, r] of [
      [0.42, 0.18, 0.016],
      [0.55, 0.27, 0.011],
      [0.66, 0.16, 0.013],
      [0.95, 0.38, 0.012],
      [0.5, 0.36, 0.009],
      [0.72, 0.33, 0.01],
      [0.36, 0.3, 0.01],
    ] as const) {
      s.sticker(s.ellipsePts(x, y, r * 0.7, r * 0.7), 3, 0, tint(BAL.moon));
      s.star(x, y, r, { w: 1.5 });
    }
    // hills + town silhouettes
    const hills: Pt[] = [[-0.02, 0.6]];
    for (let i = 0; i <= 20; i++) {
      const x = -0.02 + (1.04 * i) / 20;
      hills.push([x, 0.52 - Math.sin(i * 0.9) * 0.02 - Math.sin(i * 0.37) * 0.025]);
    }
    hills.push([1.02, 0.6]);
    s.sticker(hills, 1, 0.05, tint(BAL.hills));
    s.stroke(hills.slice(1, -1), { w: 1.6 });
    const town: [number, number, number][] = [
      [0.58, 0.44, 0.05],
      [0.635, 0.4, 0.04],
      [0.68, 0.46, 0.06],
      [0.75, 0.42, 0.045],
      [0.8, 0.47, 0.05],
    ];
    for (const [x, top, w] of town) {
      const bld = s.rectPts(x, top, w, 0.6 - top);
      s.sticker(bld, 1, 0.05, tint(BAL.city));
      s.stroke(bld, { closed: true, w: 1.5 });
      for (let wy = top + 0.02; wy < 0.53; wy += 0.03)
        for (let wx = x + 0.01; wx < x + w - 0.015; wx += 0.017)
          if (s.r() > 0.45) {
            const win = s.rectPts(wx, wy, 0.009, 0.013);
            s.sticker(win, 0.5, 0, tint(BAL.window));
            s.stroke(win, { closed: true, w: 0.9 });
          }
    }
    // railing along the open side
    wallRailing(s, -0.02, 1.02, 0.6);
    // flower box hanging on the railing
    const box = s.rectPts(0.6, 0.63, 0.18, 0.07);
    for (const [x, c] of [
      [0.63, BAL.flower],
      [0.68, BAL.hydrangea],
      [0.73, BAL.flower],
    ] as const)
      flower(s, x, 0.6, 0.012, c);
    s.sticker(box, 3, 0.18, tint(BAL.pot));
    s.stroke(box, { closed: true, w: 2 });
    // macrame hanging planter near the corner
    const mx = 0.2;
    s.line(mx, 0, mx, 0.04, { w: 1.6 });
    s.circle(mx, 0.05, 0.01, { w: 1.6 });
    for (const dx of [-0.05, -0.02, 0.02, 0.05]) s.stroke([[mx, 0.06], [mx + dx, 0.2], [mx + dx * 0.6, 0.3]], { w: 1.2 });
    for (const y of [0.15, 0.22]) s.stroke([[mx - 0.04, y], [mx, y + 0.02], [mx + 0.04, y]], { w: 1.1 });
    for (const [dx, dy, rot] of [
      [-0.05, -0.03, -1],
      [-0.02, -0.06, -0.3],
      [0.02, -0.06, 0.3],
      [0.05, -0.03, 1],
    ] as const)
      almondLeaf(s, mx + dx, 0.28 + dy, 0.03, rot, BAL.leaf);
    const mpot: Pt[] = [[mx + 0.05, 0.28], ...s.ellipsePts(mx, 0.28, 0.05, 0.05, 0, Math.PI, 12)];
    s.sticker(mpot, 3, 0.16, tint(BAL.pot));
    s.stroke(mpot, { closed: true, w: 2 });
    for (const dx of [-0.01, 0, 0.01]) s.line(mx + dx, 0.33, mx + dx * 2, 0.4, { w: 1.1 });
    vines(
      s,
      [
        [
          [mx - 0.04, 0.3],
          [mx - 0.07, 0.4],
          [mx - 0.06, 0.48],
        ],
        [
          [mx + 0.04, 0.3],
          [mx + 0.06, 0.38],
        ],
      ],
      0.024,
      BAL.leaf,
    );
    // fairy lights draped along the railing
    const wire: Pt[] = [];
    for (let i = 0; i <= 40; i++) {
      const tt = i / 40;
      wire.push([0.0 + tt * 1.0, 0.615 + Math.sin(tt * Math.PI * 6) ** 2 * 0.035]);
    }
    s.stroke(wire, { w: 1.4 });
    for (let i = 2; i < 40; i += 3) {
      const [x, y] = wire[i];
      const b = s.ellipsePts(x, y + 0.016, 0.009, 0.012);
      if (look.color) s.glow(x, y + 0.016, 0.045, BAL.light, 0.55);
      s.sticker(b, 2, 0.08, tint(BAL.bulb));
      s.stroke(b, { closed: true, w: 1.3 });
    }
  },
  floor(s) {
    if (look.color) s.washAll(tint(BAL.deck), 1);
    for (let i = 1; i < 12; i++) {
      const v = i / 12;
      s.line(0, v, 1, v, { w: 1.5, alpha: 0.55 });
      for (let j = 0; j < 2; j++) {
        const p = s.r() * 0.8 + 0.1;
        s.line(p, v, p, v + 1 / 12, { w: 1.2, alpha: 0.45 });
      }
    }
    s.shadow(s.ellipsePts(...F(0.27, 0.29), 0.24, 0.22), 0.28, 20);
    s.shadow(s.ellipsePts(...F(0.12, 0.1), 0.07, 0.07), 0.2, 10);
    s.shadow(s.ellipsePts(...F(0.32, 0.84), 0.05, 0.05), 0.2, 10);
    s.shadow(s.ellipsePts(...F(0.56, 0.3), 0.06, 0.05), 0.16, 8);
    scallopRug(s, [F(0.1, 0.14), F(0.56, 0.14), F(0.56, 0.68), F(0.1, 0.68)], BAL.rug, 12);
  },
  popups: isoLayers([
    // against the walls: monstera in the corner
    (iso) => {
      iso.p([0.02, 0.0, 0.6]);
      iso.p([0.22, 0.2, 0.6]);
      iso.cyl(0.12, 0.1, 0, 0.075, 0.13, WHITE, { r2: 0.085, color: BAL.pot });
      iso.at([0.12, 0.1, 0.13], (s, [x, y], u) => {
        s.line(x, y, x - 0.05 * u, y - 0.2 * u, { w: 1.6, mask: true });
        s.line(x, y, x + 0.06 * u, y - 0.25 * u, { w: 1.6, mask: true });
        s.line(x, y, x + 0.01 * u, y - 0.3 * u, { w: 1.6, mask: true });
        bigLeaf(s, x - 0.08 * u, y - 0.2 * u, 0.07 * u, -0.4, true);
        bigLeaf(s, x + 0.09 * u, y - 0.24 * u, 0.075 * u, 0.4, true);
        bigLeaf(s, x + 0.0 * u, y - 0.33 * u, 0.065 * u, 0, true);
      });
    },
    // a big, squishy bean bag with a tufted pillow and a knitted throw; a mug of tea on a book
    (iso) => {
      const BX = 0.26;
      const BY = 0.28;
      iso.p([BX + 0.2, BY - 0.2, 0]);
      iso.p([BX - 0.2, BY + 0.2, 0]);
      iso.p([BX, BY, 0.48]);
      iso.p([BX + 0.07, BY + 0.07, 0]);
      iso.at([BX, BY, 0], (s, [x, y], u) => {
        const P = (pts: [number, number][]) => pts.map(([dx, dy]) => [x + dx * u, y + dy * u] as Pt);
        const solid = (pts: Pt[], c: string, w = 2.4) => {
          s.solid(pts, tint(c));
          s.stroke(pts, { closed: true, w, mask: true, rough: 0.8 });
        };
        // the bag: a slumped, puffy teardrop
        const bag = soft(
          P([
            [-0.24, 0.02],
            [-0.27, -0.1],
            [-0.23, -0.24],
            [-0.12, -0.33],
            [0.02, -0.36],
            [0.15, -0.32],
            [0.24, -0.2],
            [0.27, -0.07],
            [0.22, 0.03],
            [0.06, 0.065],
            [-0.12, 0.055],
          ]),
        );
        solid(bag, BAL.bag, 2.8);
        // soft seams and squish lines
        for (const [x0, y0, x1, y1, bend] of [
          [-0.05, -0.35, -0.17, 0.04, -0.08],
          [0.1, -0.34, 0.14, 0.05, 0.04],
          [-0.2, -0.27, -0.25, -0.04, -0.04],
          [0.22, -0.24, 0.24, -0.02, 0.03],
        ] as const)
          s.stroke(
            P([
              [x0, y0],
              [(x0 + x1) / 2 + bend, (y0 + y1) / 2],
              [x1, y1],
            ]),
            { w: 1.2, alpha: 0.55 },
          );
        // the seat dent where you sink in
        s.stroke(s.ellipsePts(x, y - 0.14 * u, 0.16 * u, 0.06 * u, Math.PI * 1.05, Math.PI * 1.95, 14), { w: 1.6, alpha: 0.8 });
        s.stroke(s.ellipsePts(x, y - 0.13 * u, 0.13 * u, 0.045 * u, Math.PI * 0.1, Math.PI * 0.9, 12), { w: 1.1, alpha: 0.5 });
        // a few dotted stitches along the bottom
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * (0.12 + 0.08 * i);
          s.circle(x + Math.cos(a) * 0.22 * u, y - 0.02 * u + Math.sin(a) * 0.05 * u, 0.0025 * u, { w: 1, alpha: 0.6 });
        }
        // tufted pillow leaning back into it
        const pillow = soft(
          P([
            [-0.08, -0.4],
            [0.0, -0.385],
            [0.085, -0.43],
            [0.075, -0.33],
            [0.1, -0.235],
            [0.01, -0.25],
            [-0.075, -0.21],
            [-0.06, -0.31],
          ]),
          2,
        );
        solid(pillow, BAL.pillow, 2.2);
        const [px, py] = [x + 0.008 * u, y - 0.315 * u];
        s.circle(px, py, 0.007 * u, { w: 1.4 });
        for (const [dx, dy] of [
          [-0.05, -0.05],
          [0.05, -0.06],
          [0.06, 0.05],
          [-0.05, 0.06],
        ])
          s.line(px + dx * 0.25 * u, py + dy * 0.25 * u, px + dx * u, py + dy * u, { w: 1, alpha: 0.6 });
        // knitted throw slung over the left arm, spilling down the front, with tassels
        const throwPts = soft(
          P([
            [-0.255, -0.17],
            [-0.17, -0.25],
            [-0.06, -0.235],
            [-0.03, -0.15],
            [-0.02, -0.03],
            [-0.03, 0.075],
            [-0.12, 0.085],
            [-0.2, 0.06],
            [-0.235, -0.03],
          ]),
          2,
        );
        solid(throwPts, BAL.throw, 2.2);
        // knit: little V stitches in columns
        for (let c = 0; c < 4; c++)
          for (let r = 0; r < 7; r++) {
            const cx = x + (-0.2 + c * 0.045 + r * 0.003) * u;
            const cy = y + (-0.17 + r * 0.035) * u;
            s.stroke(
              [
                [cx - 0.009 * u, cy - 0.008 * u],
                [cx, cy + 0.006 * u],
                [cx + 0.009 * u, cy - 0.008 * u],
              ],
              { w: 1, alpha: 0.6 },
            );
          }
        // the fold where it goes over the arm
        s.stroke(
          P([
            [-0.245, -0.12],
            [-0.15, -0.165],
            [-0.04, -0.13],
          ]),
          { w: 1.3, alpha: 0.65 },
        );
        // tassels along the hem
        for (let i = 0; i <= 6; i++) {
          const t = i / 6;
          const hx = x + (-0.19 + 0.15 * t) * u;
          const hy = y + (0.07 + Math.sin(t * Math.PI) * 0.012) * u;
          s.line(hx, hy, hx + 0.003 * u, hy + 0.035 * u, { w: 1.7, mask: true });
        }
        // a small diary left lying on the seat: cover, page edges, elastic band, ribbon, a heart
        const D = (dx: number, dy: number): Pt => [x + dx * u, y + dy * u];
        const pagesEdge: Pt[] = [D(0.035, -0.135), D(0.135, -0.18), D(0.185, -0.15), D(0.185, -0.137), D(0.085, -0.092), D(0.035, -0.122)];
        solid(pagesEdge, "#ffffff", 1.8);
        for (const k of [0.4, 0.7]) s.line(...D(0.085, -0.105 + k * 0.012), ...D(0.185, -0.15 + k * 0.012), { w: 0.9, alpha: 0.6 });
        const cover: Pt[] = [D(0.03, -0.138), D(0.13, -0.183), D(0.188, -0.153), D(0.088, -0.108)];
        s.mark("journal", cover, 0.02);
        solid(cover, BAL.diary, 2);
        s.line(...D(0.145, -0.176), ...D(0.103, -0.115), { w: 1.6 });
        s.stroke([D(0.06, -0.125), D(0.055, -0.098), D(0.07, -0.088)], { w: 1.4, mask: true });
        const hp: Pt[] = [];
        for (let i = 0; i <= 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          hp.push(D(0.085 + 16 * Math.sin(a) ** 3 * 0.0009, -0.147 - (13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a)) * 0.0006));
        }
        s.stroke(hp, { w: 1.2 });
      });
      // a little stack: book + mug of tea with steam
      iso.box(0.51, 0.26, 0, 0.11, 0.08, 0.022, WHITE, { color: BAL.book });
      iso.box(0.52, 0.265, 0.022, 0.09, 0.07, 0.018, WHITE, { color: BAL.pillow });
      iso.cyl(0.565, 0.3, 0.04, 0.022, 0.042, WHITE, { color: BAL.mug });
      iso.at([0.59, 0.3, 0.065], (s, [x, y], u) => s.stroke(s.ellipsePts(x, y, 0.012 * u, 0.015 * u, -1.4, 1.4, 8), { w: 1.6, mask: true }));
      iso.at([0.565, 0.3, 0.09], (s, [x, y], u) => {
        for (const dx of [-0.008, 0.006]) s.stroke([[x + dx * u, y], [x + (dx - 0.006) * u, y - 0.025 * u], [x + dx * u, y - 0.05 * u]], { w: 1.1, mask: true });
      });
    },
    // front: hydrangea, a small flower pot, and the front railing with a flower box and fairy lights
    (iso) => {
      // hydrangea in a pot near the door
      iso.p([0.07, 0.86, 0.42]);
      iso.p([0.24, 0.97, 0.42]);
      iso.cyl(0.15, 0.9, 0, 0.06, 0.11, WHITE, { r2: 0.07, color: BAL.pot });
      iso.at([0.15, 0.9, 0.11], (s, [x, y], u) =>
        potPlant(
          s,
          x,
          y,
          u,
          [
            [-0.07, -0.05, -1.2],
            [0.07, -0.05, 1.2],
            [-0.045, -0.1, -0.6],
            [0.05, -0.11, 0.6],
          ],
          [
            [-0.04, -0.15],
            [0.035, -0.165],
            [0.0, -0.215],
            [-0.065, -0.2],
            [0.065, -0.215],
          ],
          (hx, hy) => {
            for (let k = 0; k < 4; k++) flower(s, hx + Math.cos(k * 1.6) * 0.018 * u, hy + Math.sin(k * 1.6) * 0.014 * u, 0.008 * u, BAL.hydrangea, true);
          },
        ),
      );
      // small pink flower pot next to the hydrangea
      iso.p([0.24, 0.82, 0.22]);
      iso.cyl(0.32, 0.84, 0, 0.04, 0.075, WHITE, { r2: 0.048, color: BAL.pot });
      iso.at([0.32, 0.84, 0.075], (s, [x, y], u) => {
        const v = u * 0.72;
        potPlant(
          s,
          x,
          y,
          v,
          [
            [-0.06, -0.035, -1.2],
            [0.06, -0.035, 1.2],
          ],
          [
            [-0.03, -0.1],
            [0.03, -0.11],
            [0, -0.15],
          ],
          (hx, hy) => flower(s, hx, hy, 0.014 * v, BAL.flower, true),
        );
      });
      // front railing along the open edge (the far end of the right-wall railing), with a flower box
      const RA = 0.965;
      const R0 = 0.66;
      const R1 = 0.995;
      const RZ = 0.32;
      iso.box(RA - 0.012, R0, 0, 0.025, 0.025, RZ, WHITE, { color: BAL.wood });
      for (let b = R0 + 0.05; b < R1 - 0.02; b += 0.045) iso.line([RA, b, 0], [RA, b, RZ], { w: 2.4 });
      iso.box(RA - 0.012, R1 - 0.025, 0, 0.025, 0.025, RZ, WHITE, { color: BAL.wood });
      iso.box(RA - 0.015, R0 - 0.01, RZ, 0.03, R1 - R0 + 0.02, 0.025, WHITE, { color: BAL.wood });
      iso.line([RA, R0, 0.03], [RA, R1, 0.03], { w: 2 });
      // fairy lights looped along the top rail
      const loop: V3[] = [];
      for (let i = 0; i <= 24; i++) {
        const tt = i / 24;
        loop.push([RA - 0.018, R0 + (R1 - R0) * tt, RZ + 0.005 - Math.sin(tt * Math.PI * 4) ** 2 * 0.035]);
      }
      iso.path(loop, { w: 1.4 });
      for (let i = 2; i < 24; i += 3)
        iso.at(loop[i], (s, [x, y], u) => {
          if (look.color) s.glow(x, y + 0.012 * u, 0.05 * u, BAL.light, 0.55);
          s.blob(x, y + 0.012 * u, 0.008 * u, 0.011 * u, tint(BAL.bulb), { w: 1.3, mask: true });
        });
      // flower box hooked on the inside of the rail, flowers growing out of it
      const FA = RA - 0.06;
      for (let i = 0; i < 4; i++) {
        const fb = 0.765 + i * 0.045;
        iso.line([FA + 0.02, fb, 0.27], [FA + 0.02, fb + (i % 2 ? 0.006 : -0.006), 0.33], { w: 1.7 });
        iso.at([FA + 0.02, fb, 0.3], (s, [x, y], u) => almondLeaf(s, x + (i % 2 ? 0.014 : -0.014) * u, y, 0.016 * u, i % 2 ? 1.1 : -1.1, BAL.leaf, true));
      }
      iso.box(FA, 0.74, 0.2, 0.04, 0.2, 0.07, WHITE, { color: BAL.pot });
      for (let i = 0; i < 4; i++) {
        const fb = 0.765 + i * 0.045;
        iso.at([FA + 0.02, fb + (i % 2 ? 0.006 : -0.006), 0.335], (s, [x, y], u) => flower(s, x, y, 0.011 * u, i % 2 ? BAL.hydrangea : BAL.flower, true));
      }
      iso.line([FA + 0.04, 0.745, RZ + 0.01], [FA + 0.04, 0.745, 0.27], { w: 1.6 });
      iso.line([FA + 0.04, 0.935, RZ + 0.01], [FA + 0.04, 0.935, 0.27], { w: 1.6 });
    },
  ]),
};

export const ROOMS: Room[] = [bedroom, bathroom, kitchen, balcony];

// ---------------------------------------------------------------------------

export function drawFrontCover(s: Sketch) {
  s.rect(0.07, 0.07, 0.86, 0.86, { w: 3 });
  s.text("dakshie's", 0.5, 0.42, 0.14);
  // a small heart, drawn in one go with the pen overlapping at the bottom
  const heart: Pt[] = [];
  for (let i = 0; i <= 40; i++) {
    const t = (i / 40) * Math.PI * 2.06;
    const x = 16 * Math.sin(t) ** 3;
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    heart.push([0.5 + x * 0.0019, 0.545 - y * 0.0019]);
  }
  s.stroke(heart, { w: 2.4, overshoot: 0 });
}

export function drawBackCover(s: Sketch) {
  s.rect(0.07, 0.07, 0.86, 0.86, { w: 3 });
}

// shared drawing helpers, reused by the wedding invite rooms (lib/invite.ts)
export { F, baseboard, planks, tiles, fairyLights, tapedPhoto, sparkle, almondLeaf, vines, scallopRug, soft, flower, cloud };
