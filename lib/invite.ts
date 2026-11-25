// The wedding invite: one pop-up room per event, drawn with the same pen as the journal rooms.
// Each room has an invite card pinned on its right wall (clickable: it opens the details).

import type { Pt, Sketch } from "./sketch";
import { isoLayers, WHITE, type Iso } from "./iso";
import { look, tint } from "./style";
import type { Room } from "./rooms";
import { F, almondLeaf, cloud, fairyLights, flower, planks, scallopRug, soft, sparkle, tapedPhoto, tiles } from "./rooms";
import { WEDDING, fmtDay, fmtTime, getGuest, type WeddingEvent } from "./wedding";

const MARIGOLD = ["#f4a43b", "#f7c948", "#f08a3c"];
const LEAF = "#bfe0b0";
const GOLD = "#f0d48a";
const CREAM = "#fffaf0";

const ev = (key: string) => WEDDING.events.find((e) => e.key === key) as WeddingEvent;

// ---------------------------------------------------------------------------
// decorations

/** A string of marigolds sagging between two points. */
function garland(s: Sketch, x1: number, x2: number, y: number, sag = 0.05, r = 0.014) {
  const n = Math.max(6, Math.round((x2 - x1) / (r * 1.5)));
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    pts.push([x1 + (x2 - x1) * t, y + Math.sin(t * Math.PI) * sag]);
  }
  s.stroke(pts, { w: 1.4 });
  pts.forEach(([x, yy], i) => {
    const c = MARIGOLD[i % MARIGOLD.length];
    s.blob(x, yy, r, r * 0.9, tint(c), { w: 1.3 });
    s.circle(x, yy, r * 0.35, { w: 1, alpha: 0.6 });
  });
  almondLeaf(s, x1 + 0.012, y + 0.03, r * 1.6, 0.2, LEAF);
  almondLeaf(s, x2 - 0.012, y + 0.03, r * 1.6, -0.2, LEAF);
}

/** Vertical strands of marigolds (laris) hanging from y0, each ending in a little tassel. */
function laris(s: Sketch, xs: number[], y0: number, len: number, r = 0.013) {
  xs.forEach((x, k) => {
    const L = len * (0.8 + ((k * 37) % 5) * 0.06);
    s.line(x, y0, x, y0 + L, { w: 1.2 });
    for (let y = y0 + r; y < y0 + L; y += r * 1.7) s.blob(x, y, r, r * 0.85, tint(MARIGOLD[(k + Math.round(y * 97)) % 3]), { w: 1.2 });
    s.stroke(
      [
        [x - 0.008, y0 + L + 0.03],
        [x, y0 + L],
        [x + 0.008, y0 + L + 0.03],
      ],
      { w: 1.3 },
    );
  });
}

/** A row of mango leaves hanging from a cord (toran). */
function toran(s: Sketch, x1: number, x2: number, y: number) {
  s.line(x1, y, x2, y, { w: 2 });
  for (let x = x1 + 0.025; x < x2 - 0.01; x += 0.045) {
    almondLeaf(s, x, y + 0.035, 0.03, 0, LEAF);
    s.blob(x + 0.022, y + 0.01, 0.009, 0.009, tint(MARIGOLD[0]), { w: 1.1 });
  }
}

/** A small clay lamp with a flame. */
function diya(s: Sketch, x: number, y: number, w = 0.05) {
  if (look.color) s.glow(x, y - w * 0.6, w * 1.6, "#ffcf5a", 0.55);
  const bowl: Pt[] = [[x - w / 2, y - w * 0.2], ...s.ellipsePts(x, y - w * 0.2, w / 2, w * 0.35, 0, Math.PI, 12), [x + w / 2, y - w * 0.2]];
  s.sticker(bowl, 2, 0.12, tint("#e9a07c"));
  s.stroke(bowl, { closed: true, w: 1.7 });
  const flame: Pt[] = [];
  for (let i = 0; i <= 10; i++) {
    const t = (i / 10) * Math.PI * 2;
    flame.push([x + Math.sin(t) * w * 0.16, y - w * 0.55 - Math.cos(t) * w * 0.32 - (Math.cos(t) < 0 ? w * 0.18 * -Math.cos(t) : 0)]);
  }
  s.sticker(flame, 1, 0, tint("#ffd56b"));
  s.stroke(flame, { closed: true, w: 1.4 });
}

/** The invite card pinned on a wall; clicking it opens the details. */
function inviteCard(s: Sketch, e: WeddingEvent, x: number, y: number, w: number, h: number, accent: string) {
  const card = s.rectPts(x, y, w, h);
  s.sticker(card, 6, 0.24, tint(CREAM));
  s.mark("invite", card);
  s.stroke(card, { closed: true, w: 2.6 });
  s.fill(s.rectPts(x + 0.015, y + 0.015, w - 0.03, h - 0.03), tint(accent), { alpha: 0.35, jitter: 0 });
  s.rect(x + 0.015, y + 0.015, w - 0.03, h - 0.03, { w: 1.3 });
  for (const [cx, cy] of [
    [x + 0.015, y + 0.015],
    [x + w - 0.015, y + 0.015],
    [x + 0.015, y + h - 0.015],
    [x + w - 0.015, y + h - 0.015],
  ])
    flower(s, cx, cy, 0.01, accent);
  const cx = x + w / 2;
  s.text(e.name, cx, y + h * 0.18, e.name.length > 20 ? 0.039 : 0.075);
  s.text(e.tagline, cx, y + h * 0.3, 0.03, { weight: 500 });
  const ribbonY = y + h * 0.355;
  const ribbonH = h * 0.05;
  const ribbon: Pt[] = [
    [cx - w * 0.26, ribbonY],
    [cx + w * 0.26, ribbonY],
    [cx + w * 0.26, ribbonY + ribbonH * 0.22],
    [cx + w * 0.31, ribbonY + ribbonH * 0.5],
    [cx + w * 0.26, ribbonY + ribbonH * 0.78],
    [cx + w * 0.26, ribbonY + ribbonH],
    [cx - w * 0.26, ribbonY + ribbonH],
    [cx - w * 0.26, ribbonY + ribbonH * 0.78],
    [cx - w * 0.31, ribbonY + ribbonH * 0.5],
    [cx - w * 0.26, ribbonY + ribbonH * 0.22],
  ];
  s.sticker(ribbon, 0.8, 0.04, tint("#f0d48a"));
  s.stroke(ribbon, { closed: true, w: 1.1 });
  s.text("we saved you a seat!", cx, ribbonY + ribbonH * 0.53, 0.018, { weight: 500 });
  weddingCouple(s, x + w * 0.34, y + h * 0.43, w * 0.32, h * 0.2);
  s.text(fmtDay(e.start), cx, y + h * 0.73, 0.046);
  s.text(fmtTime(e.start), cx, y + h * 0.83, 0.04, { weight: 500 });
  s.text(e.venue, cx, y + h * 0.92, 0.03, { weight: 500 });
  // little pin
  s.blob(cx, y + 0.005, 0.012, 0.012, tint("#f6a99a"), { w: 1.6 });
}

/** Small, hand-drawn wedding couple in outfits sampled from the invite's palette. */
function weddingCouple(s: Sketch, x: number, y: number, w: number, h: number) {
  const choose = (colors: string[]) => colors[Math.floor(s.r() * colors.length)];
  const brideColor = choose(["#bd5141", "#a94f66", "#d18b36", "#81516f"]);
  const groomColor = choose(["#315f50", "#3e5e83", "#75506a", "#a45b3c"]);
  const skin = choose(["#d79a74", "#bd795b", "#e0ae83"]);
  const gold = "#e8b84f";
  const brideX = x + w * 0.32;
  const groomX = x + w * 0.69;
  const headY = y + h * 0.29;
  const faceR = w * 0.085;
  const shouldersY = y + h * 0.55;
  const hemY = y + h * 0.98;
  const shape = (points: Pt[], color: string) => s.shape(points, tint(color), { w: 1.2 });

  const archX = x + w * 0.5;
  const archBase = y + h * 0.94;
  const toran: Pt[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    toran.push([x + w * (0.12 + t * 0.76), y + h * 0.06 + Math.sin(t * Math.PI) * h * 0.035]);
  }
  s.stroke(toran, { w: 1.1, alpha: 0.75 });
  toran.slice(1, -1).forEach(([px, py], i) => s.blob(px, py + h * 0.035, w * 0.016, h * 0.025, tint(MARIGOLD[i % MARIGOLD.length]), { w: 1 }));
  s.stroke(s.ellipsePts(archX, archBase, w * 0.47, h * 0.86, Math.PI, Math.PI * 2, 20), { w: 1.2, alpha: 0.65 });
  s.stroke(s.ellipsePts(archX, archBase, w * 0.39, h * 0.7, Math.PI, Math.PI * 2, 18), { w: 0.9, alpha: 0.55 });
  s.line(x + w * 0.03, archBase, x + w * 0.03, y + h, { w: 1.2, alpha: 0.65 });
  s.line(x + w * 0.97, archBase, x + w * 0.97, y + h, { w: 1.2, alpha: 0.65 });
  flower(s, archX, y + h * 0.035, w * 0.035, gold);
  for (let i = 0; i < 5; i++) {
    const px = x + w * (0.18 + i * 0.16);
    s.circle(px, y + h * 0.2, w * 0.012, { w: 1, alpha: 0.75 });
  }
  sparkle(s, x + w * 0.09, y + h * 0.56, w * 0.035);
  sparkle(s, x + w * 0.91, y + h * 0.56, w * 0.035);

  shape(
    [
      [brideX - faceR * 1.6, headY - faceR * 0.6],
      [brideX + faceR * 1.6, headY - faceR * 0.6],
      [brideX + w * 0.17, hemY],
      [brideX - w * 0.17, hemY],
    ],
    "#f1d89f",
  );
  shape(
    [
      [brideX - w * 0.12, shouldersY],
      [brideX + w * 0.12, shouldersY],
      [brideX + w * 0.23, hemY],
      [brideX - w * 0.23, hemY],
    ],
    brideColor,
  );
  s.line(brideX, shouldersY + h * 0.08, brideX, hemY - h * 0.02, { w: 1, alpha: 0.75 });
  for (let row = 0; row < 4; row++)
    for (let col = -1; col <= 1; col++) {
      const offset = row % 2 ? w * 0.045 : 0;
      const px = brideX + col * w * 0.09 + offset;
      const py = shouldersY + h * (0.15 + row * 0.085);
      s.circle(px, py, w * 0.014, { w: 1, alpha: 0.85 });
      s.circle(px, py, w * 0.0045, { w: 1, alpha: 0.9 });
    }
  s.line(brideX - w * 0.18, hemY - h * 0.06, brideX + w * 0.18, hemY - h * 0.06, { w: 1.5, alpha: 0.8 });
  s.blob(brideX, headY, faceR * 1.25, faceR * 1.3, tint("#553b35"), { w: 1 });
  s.blob(brideX, headY + faceR * 0.12, faceR * 0.88, faceR, tint(skin), { w: 1.1 });
  s.blob(brideX, headY - faceR * 0.83, faceR * 1.1, faceR * 0.35, tint(gold), { w: 1 });
  s.circle(brideX - faceR * 0.3, headY + faceR * 0.04, faceR * 0.08, { w: 1 });
  s.circle(brideX + faceR * 0.3, headY + faceR * 0.04, faceR * 0.08, { w: 1 });
  s.stroke(s.ellipsePts(brideX, headY + faceR * 0.43, faceR * 0.2, faceR * 0.1, 0, Math.PI, 8), { w: 1 });
  s.circle(brideX, headY + faceR * 1.15, faceR * 0.12, { w: 1, alpha: 0.8 });
  s.stroke(s.ellipsePts(brideX, headY + faceR * 1.45, faceR * 1.1, faceR * 0.42, 0, Math.PI), { w: 1.2, alpha: 0.8 });
  for (const side of [-1, 1]) s.circle(brideX + side * faceR * 1.08, headY + faceR * 0.6, faceR * 0.12, { w: 1.2 });

  shape(
    [
      [groomX - w * 0.13, shouldersY],
      [groomX + w * 0.13, shouldersY],
      [groomX + w * 0.16, hemY],
      [groomX - w * 0.16, hemY],
    ],
    groomColor,
  );
  shape(
    [
      [groomX - w * 0.06, shouldersY],
      [groomX, shouldersY + h * 0.1],
      [groomX + w * 0.06, shouldersY],
    ],
    "#fff1d2",
  );
  s.line(groomX, shouldersY + h * 0.1, groomX, hemY - h * 0.02, { w: 1, alpha: 0.8 });
  for (let i = 0; i < 3; i++) {
    const py = shouldersY + h * (0.18 + i * 0.12);
    s.circle(groomX, py, w * 0.014, { w: 1 });
    s.circle(groomX, py, w * 0.005, { w: 1 });
  }
  s.blob(groomX, headY, faceR * 1.2, faceR * 1.25, tint("#553b35"), { w: 1 });
  s.blob(groomX, headY + faceR * 0.12, faceR * 0.88, faceR, tint(skin), { w: 1.1 });
  shape(
    [
      [groomX - faceR * 1.3, headY - faceR * 0.5],
      [groomX - faceR * 1.1, headY - faceR * 1.1],
      [groomX - faceR * 0.4, headY - faceR * 1.5],
      [groomX + faceR * 0.5, headY - faceR * 1.35],
      [groomX + faceR * 1.3, headY - faceR * 0.5],
      [groomX, headY - faceR * 0.75],
    ],
    groomColor,
  );
  s.line(groomX - faceR * 1.1, headY - faceR * 0.62, groomX + faceR * 1.1, headY - faceR * 0.62, { w: 1.2 });
  s.line(groomX - faceR * 0.8, headY - faceR * 0.95, groomX + faceR * 0.65, headY - faceR * 1.08, { w: 0.9 });
  s.circle(groomX + faceR * 0.18, headY - faceR * 1.35, faceR * 0.14, { w: 1.1 });
  almondLeaf(s, groomX + faceR * 1.2, headY - faceR * 1.55, faceR * 1.1, 0.7, LEAF, true);
  s.circle(groomX - faceR * 0.3, headY + faceR * 0.04, faceR * 0.08, { w: 1 });
  s.circle(groomX + faceR * 0.3, headY + faceR * 0.04, faceR * 0.08, { w: 1 });
  s.stroke(s.ellipsePts(groomX, headY + faceR * 0.43, faceR * 0.2, faceR * 0.1, 0, Math.PI, 8), { w: 1 });
  s.line(groomX - faceR * 0.5, headY + faceR * 0.54, groomX, headY + faceR * 0.72, { w: 1.2 });
  s.line(groomX, headY + faceR * 0.72, groomX + faceR * 0.5, headY + faceR * 0.54, { w: 1.2 });
  s.line(brideX + w * 0.1, shouldersY + h * 0.14, groomX - w * 0.1, shouldersY + h * 0.14, { w: 1.4, alpha: 0.8 });
}

/** Framed photo of the couple (two little stick portraits). */
function couplePhoto(s: Sketch, x: number, y: number, w: number, h: number, rot = 0) {
  tapedPhoto(s, x, y, w, h, rot);
  s.stroke(s.ellipsePts(x + w * 0.34, y + h * 0.88, w * 0.16, h * 0.2, Math.PI, Math.PI * 2, 10), { w: 1.4 });
  s.circle(x + w * 0.34, y + h * 0.5, w * 0.09, { w: 1.3 });
  s.circle(x + w * 0.62, y + h * 0.42, w * 0.07, { w: 1.3 });
}

function wash(s: Sketch, c: string) {
  if (look.color) s.washAll(tint(c), 1);
}

/** Petals scattered over a floor. */
function petals(s: Sketch, n: number, colors = MARIGOLD) {
  for (let i = 0; i < n; i++) {
    const x = 0.08 + s.r() * 0.84;
    const y = 0.08 + s.r() * 0.84;
    const p = s.ellipsePts(x, y, 0.008, 0.005);
    s.sticker(p, 0.5, 0, tint(colors[i % colors.length]));
    s.stroke(p, { closed: true, w: 1 });
  }
}

/** Soft cushion seen from above as an iso box with rounded look. */
function cushion(iso: Iso, x: number, y: number, size: number, color: string) {
  iso.box(x, y, 0, size, size, 0.05, WHITE, { color });
  iso.at([x + size / 2, y + size / 2, 0.05], (s, [px, py], u) => s.circle(px, py, 0.008 * u, { w: 1.4, mask: true }));
}

// ---------------------------------------------------------------------------
// the rooms

const HALDI = { wall: "#fff1c2", floor: "#f7ead2", accent: "#f7d77a", wood: "#e2c49a", brass: "#f0cf6e", paste: "#f6c445", water: "#cfe6f2", pot: "#e9a07c", cushion: "#f7a8a0" };

/** A long banana leaf with a midrib and side veins, growing from (x, y). */
function bananaLeaf(s: Sketch, x: number, y: number, len: number, ang: number, w = 0.045, onCard = false) {
  const dx = Math.sin(ang);
  const dy = -Math.cos(ang);
  const nx = -dy;
  const ny = dx;
  const side = (sgn: number) =>
    Array.from({ length: 11 }, (_, i) => {
      const t = i / 10;
      const bulge = Math.sin(t * Math.PI) * w * (t < 0.5 ? 1 : 0.85);
      return [x + dx * len * t + nx * bulge * sgn, y + dy * len * t + ny * bulge * sgn + t * t * len * 0.12] as Pt;
    });
  const pts: Pt[] = [...side(1), ...side(-1).reverse()];
  if (onCard) s.shape(pts, tint(LEAF), { mask: true, w: 1.4 });
  else {
    s.sticker(pts, 2, 0.12, tint(LEAF));
    s.stroke(pts, { closed: true, w: 1.6 });
  }
  const rib = side(0);
  s.stroke(rib, { w: 1.2, mask: onCard });
  for (let i = 2; i < 9; i++) {
    const [px, py] = rib[i];
    for (const sgn of [1, -1]) s.line(px, py, px + (nx * sgn + dx * 0.5) * w * 0.7, py + (ny * sgn + dy * 0.5) * w * 0.7 + 0.004, { w: 0.9, alpha: 0.7, mask: onCard });
  }
}

/** A yellow haldi handprint. */
function handprint(s: Sketch, x: number, y: number, r: number, rot: number) {
  const c = Math.cos(rot);
  const sn = Math.sin(rot);
  const at = (dx: number, dy: number): Pt => [x + dx * c - dy * sn, y + dx * sn + dy * c];
  const c0 = tint(HALDI.paste);
  s.blob(...at(0, 0), r, r * 1.1, c0, { w: 1.2 });
  const fingers: [number, number, number][] = [
    [-0.75, -1.5, 0.5],
    [-0.25, -1.85, 0.55],
    [0.25, -1.8, 0.55],
    [0.7, -1.45, 0.48],
    [1.25, -0.2, 0.45],
  ];
  for (const [fx, fy, fr] of fingers) s.blob(...at(fx * r, fy * r), r * fr * 0.55, r * fr, c0, { w: 1.1 });
}

const haldi: Room = {
  name: "haldi",
  mood: ev("haldi").tagline,
  left(s) {
    wash(s, HALDI.wall);
    jaaliPanel(s, 0.035, 0.69, 0.17, 0.25, 4, 5, 0.08);
    jaaliPanel(s, 0.795, 0.69, 0.17, 0.25, 4, 5, 0.08);
    // a fringe of marigold strands along the top, over a mango-leaf toran
    laris(s, Array.from({ length: 19 }, (_, i) => 0.04 + i * 0.05), 0.05, 0.2, 0.012);
    toran(s, 0.0, 1.0, 0.04);
    // banana leaves framing an arched niche with a diya
    bananaLeaf(s, 0.22, 0.98, 0.5, -0.25, 0.05);
    bananaLeaf(s, 0.28, 0.98, 0.42, 0.15, 0.045);
    bananaLeaf(s, 0.78, 0.98, 0.5, 0.25, 0.05);
    bananaLeaf(s, 0.72, 0.98, 0.42, -0.15, 0.045);
    const niche: Pt[] = [[0.38, 0.8], [0.38, 0.6], ...s.ellipsePts(0.5, 0.6, 0.12, 0.12, Math.PI, Math.PI * 2, 14), [0.62, 0.8]];
    s.sticker(niche, 4, 0.2, tint("#f7e2b0"));
    s.stroke(niche, { closed: true, w: 2.4 });
    garland(s, 0.38, 0.62, 0.5, 0.04, 0.011);
    diya(s, 0.5, 0.78, 0.07);
    diya(s, 0.42, 0.79, 0.04);
    diya(s, 0.58, 0.79, 0.04);
    // handprints left by the guests
    for (const [x, y, r] of [
      [0.08, 0.5, 0.2],
      [0.13, 0.62, -0.3],
      [0.9, 0.46, 0.35],
      [0.86, 0.6, -0.1],
    ])
      handprint(s, x, y, 0.017, r);
  },
  right(s) {
    wash(s, HALDI.wall);
    jaaliPanel(s, 0.035, 0.66, 0.18, 0.29, 4, 5, 0.1);
    jaaliPanel(s, 0.785, 0.66, 0.18, 0.29, 4, 5, 0.1);
    toran(s, 0.0, 1.0, 0.04);
    laris(s, [0.05, 0.1, 0.15, 0.85, 0.9, 0.95], 0.05, 0.5);
    floralArch(s, 0.18, 0.82, 0.08);
    inviteCard(s, ev("haldi"), 0.28, 0.16, 0.44, 0.46, HALDI.accent);
    garland(s, 0.28, 0.72, 0.14, 0.03, 0.011);
    for (const [x, y, r] of [
      [0.32, 0.74, 0.3],
      [0.4, 0.8, -0.2],
      [0.62, 0.72, 0.1],
      [0.7, 0.8, -0.35],
    ])
      handprint(s, x, y, 0.016, r);
  },
  floor(s) {
    if (look.color) s.washAll(tint(HALDI.floor), 1);
    tiles(s, 8, 0.4);
    // a rangoli of marigold petals with a diya at its heart
    const [cx, cy] = F(0.7, 0.7);
    const ringOf = (rx: number, n: number, c: string, size: number) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const p = s.ellipsePts(cx + Math.cos(a) * rx, cy + Math.sin(a) * rx * 0.5, size, size * 0.7);
        s.sticker(p, 0.5, 0, tint(c));
        s.stroke(p, { closed: true, w: 1 });
      }
    };
    ringOf(0.13, 30, MARIGOLD[2], 0.01);
    ringOf(0.1, 24, MARIGOLD[1], 0.01);
    ringOf(0.07, 16, "#f7a8a0", 0.01);
    ringOf(0.04, 10, MARIGOLD[0], 0.009);
    s.stroke(s.ellipsePts(cx, cy, 0.155, 0.08), { closed: true, w: 1.3 });
    s.blob(cx, cy, 0.014, 0.008, tint(HALDI.pot), { w: 1.3 });
    s.shadow([F(0.28, 0.24), F(0.46, 0.24), F(0.46, 0.7), F(0.28, 0.7)], 0.2, 14);
    s.shadow(s.ellipsePts(...F(0.7, 0.14), 0.1, 0.06), 0.2, 12);
    petals(s, 50);
  },
  popups: isoLayers([
    (iso) => {
      // banana plant in a clay pot in the corner
      iso.cyl(0.09, 0.09, 0, 0.05, 0.09, WHITE, { r2: 0.06, color: HALDI.pot });
      iso.at([0.09, 0.09, 0.09], (s, [x, y], u) => {
        for (const [ang, len] of [
          [-0.7, 0.3],
          [-0.2, 0.36],
          [0.3, 0.33],
          [0.8, 0.26],
        ])
          bananaLeaf(s, x, y, len * u, ang, 0.035 * u, true);
      });
      // basket of marigolds by the left wall
      iso.cyl(0.1, 0.78, 0, 0.07, 0.07, WHITE, { r2: 0.09, color: HALDI.wood });
      iso.at([0.1, 0.78, 0.07], (s, [x, y], u) => {
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2;
          s.blob(x + Math.cos(a) * 0.05 * u, y + Math.sin(a) * 0.025 * u - 0.012 * u, 0.02 * u, 0.017 * u, tint(MARIGOLD[k % 3]), { w: 1.3, mask: true });
        }
        s.blob(x, y - 0.02 * u, 0.02 * u, 0.017 * u, tint(MARIGOLD[1]), { w: 1.3, mask: true });
      });
      // a brass urli by the right wall, with flowers floating in it
      iso.cyl(0.7, 0.14, 0, 0.06, 0.05, WHITE, { r2: 0.1, color: HALDI.brass });
      iso.disc(0.7, 0.14, 0.05, 0.085, tint(HALDI.water), { w: 1.3 });
      iso.at([0.7, 0.14, 0.05], (s, [x, y], u) => {
        for (const [dx, dy, c] of [
          [-0.04, 0, MARIGOLD[0]],
          [0.03, -0.01, "#f7a8a0"],
          [0, 0.015, MARIGOLD[1]],
          [0.05, 0.012, MARIGOLD[2]],
        ] as const)
          flower(s, x + dx * u, y + dy * u, 0.01 * u, c, true);
      });
    },
    (iso) => {
      // the haldi swing (jhoola): two posts and a beam wound with marigolds, strands hanging down
      const A = 0.36;
      const B0 = 0.28;
      const B1 = 0.68;
      const TOP = 0.66;
      const post = (b: number) => {
        iso.box(A - 0.03, b - 0.03, 0, 0.06, 0.06, 0.03, WHITE, { color: HALDI.wood });
        iso.box(A - 0.015, b - 0.015, 0.03, 0.03, 0.03, TOP - 0.03, WHITE, { color: HALDI.wood });
        iso.at([A + 0.015, b + 0.015, TOP - 0.02], (s, [x, y], u) => {
          for (let k = 0; k < 13; k++) s.blob(x + Math.sin(k * 1.3) * 0.008 * u, y + k * 0.045 * u, 0.01 * u, 0.009 * u, tint(MARIGOLD[k % 3]), { w: 1, mask: true });
        });
      };
      post(B0);
      iso.box(A - 0.022, B0 - 0.04, TOP, 0.044, B1 - B0 + 0.08, 0.035, WHITE, { color: HALDI.wood });
      for (let b = B0 + 0.04; b < B1 - 0.02; b += 0.05)
        iso.at([A + 0.02, b, TOP], (s, [x, y], u) => {
          const L = (0.08 + ((Math.round(b * 100) * 7) % 4) * 0.015) * u;
          s.line(x, y, x, y + L, { w: 1, mask: true });
          for (let yy = 0.012 * u; yy < L; yy += 0.02 * u) s.blob(x, y + yy, 0.009 * u, 0.008 * u, tint(MARIGOLD[Math.round(yy * 300) % 3]), { w: 1, mask: true });
        });
      // ropes and a seat with a backrest and cushions
      const SZ = 0.17;
      const S0 = B0 + 0.07;
      const S1 = B1 - 0.07;
      for (const b of [S0, S1]) {
        iso.line([A - 0.04, b, TOP], [A - 0.04, b, SZ + 0.03], { w: 1.4 });
        iso.line([A + 0.04, b, TOP], [A + 0.04, b, SZ + 0.03], { w: 1.4 });
      }
      iso.box(A - 0.06, S0 - 0.01, SZ, 0.12, S1 - S0 + 0.02, 0.03, WHITE, { color: HALDI.wood });
      iso.box(A - 0.06, S0 - 0.01, SZ + 0.03, 0.02, S1 - S0 + 0.02, 0.1, WHITE, { color: HALDI.wood });
      iso.box(A - 0.04, S0 + 0.01, SZ + 0.03, 0.09, S1 - S0 - 0.02, 0.03, WHITE, { color: HALDI.accent });
      iso.box(A - 0.04, S0 + 0.03, SZ + 0.06, 0.03, 0.08, 0.07, WHITE, { color: HALDI.cushion });
      iso.box(A - 0.04, S1 - 0.11, SZ + 0.06, 0.03, 0.08, 0.07, WHITE, { color: MARIGOLD[1] });
      post(B1);
    },
    (iso) => {
      // a brass thali with bowls of haldi paste, rose water and petals
      iso.cyl(0.66, 0.4, 0, 0.11, 0.015, WHITE, { color: HALDI.brass });
      for (const [a, b, r, c] of [
        [0.63, 0.36, 0.035, HALDI.paste],
        [0.7, 0.38, 0.03, "#f7a8a0"],
        [0.66, 0.45, 0.03, HALDI.paste],
      ] as const) {
        iso.cyl(a, b, 0.015, r * 0.65, 0.03, WHITE, { r2: r, color: HALDI.brass });
        iso.disc(a, b, 0.045, r * 0.8, tint(c), { w: 1.2 });
      }
      // a kalash beside it
      iso.cyl(0.8, 0.5, 0, 0.035, 0.08, WHITE, { r2: 0.025, color: HALDI.brass });
      iso.at([0.8, 0.5, 0.08], (s, [x, y], u) => {
        for (const r of [-0.9, 0, 0.9]) almondLeaf(s, x + r * 0.014 * u, y - 0.014 * u, 0.016 * u, r, LEAF, true);
        s.blob(x, y - 0.024 * u, 0.015 * u, 0.015 * u, tint("#c9a27a"), { w: 1.3, mask: true });
      });
    },
  ]),
};

const WED = { wall: "#f6ead8", drape: "#f08bb6", drape2: "#f7d98a", floor: "#faf1e6", accent: "#f9c6da", drapeLit: "#f7b3cf", pillar: GOLD, seat: "#f5b942" };

/** Draped fabric hanging in swags across the top of a wall. */
function swags(s: Sketch, x1: number, x2: number, y: number, n: number, c: string) {
  const w = (x2 - x1) / n;
  for (let i = 0; i < n; i++) {
    const a = x1 + i * w;
    const swag: Pt[] = [[a, y], [a + w, y], ...s.ellipsePts(a + w / 2, y, w / 2, w * 0.35, 0, Math.PI, 12)];
    s.sticker(swag, 3, 0.16, tint(c));
    s.stroke(swag, { closed: true, w: 1.8 });
    s.stroke(s.ellipsePts(a + w / 2, y, w * 0.35, w * 0.2, 0.2, Math.PI - 0.2, 10), { w: 1, alpha: 0.6 });
  }
  for (let i = 0; i <= n; i++) s.blob(x1 + i * w, y, 0.014, 0.014, tint(MARIGOLD[0]), { w: 1.4 });
}

function drapePanel(s: Sketch, x: number, top: number, w: number, c: string) {
  const pts: Pt[] = [
    [x, top],
    [x + w, top],
    [x + w * 0.8, 0.5],
    [x + w * 1.05, 0.98],
    [x - w * 0.05, 0.98],
    [x + w * 0.2, 0.5],
  ];
  s.sticker(soft(pts, 2), 3, 0.18, tint(c));
  s.stroke(soft(pts, 2), { closed: true, w: 2 });
  s.line(x + w * 0.5, top + 0.02, x + w * 0.5, 0.95, { w: 1, alpha: 0.6 });
}

/** A faint diamond jaali, like carved stone latticework in a haveli window. */
function jaaliPanel(s: Sketch, x: number, y: number, w: number, h: number, cols: number, rows: number, alpha = 0.12) {
  const cw = w / cols;
  const ch = h / rows;
  for (let row = 0; row < rows; row++)
    for (let col = 0; col < cols; col++) {
      const left = x + col * cw;
      const top = y + row * ch;
      const mx = left + cw / 2;
      const my = top + ch / 2;
      s.stroke(
        [
          [mx, top],
          [left + cw, my],
          [mx, top + ch],
          [left, my],
        ],
        { closed: true, w: 0.9, alpha },
      );
      if ((row + col) % 2 === 0) s.circle(mx, my, Math.min(cw, ch) * 0.055, { w: 0.8, alpha: alpha * 1.6 });
    }
}

const MANDAP_H = 0.7;

/** A mandap pillar: stepped base, slim gold shaft, a capital, and a kalash pot at its foot. */
function mandapPillar(iso: Iso, a: number, b: number) {
  iso.box(a - 0.035, b - 0.035, 0, 0.07, 0.07, 0.03, WHITE, { color: "#efd6ae" });
  iso.box(a - 0.025, b - 0.025, 0.03, 0.05, 0.05, 0.03, WHITE, { color: WED.pillar });
  iso.box(a - 0.014, b - 0.014, 0.06, 0.028, 0.028, MANDAP_H - 0.1, WHITE, { color: WED.pillar });
  iso.box(a - 0.026, b - 0.026, MANDAP_H - 0.04, 0.052, 0.052, 0.04, WHITE, { color: "#efd6ae" });
  // marigold strand wound down the pillar
  iso.at([a + 0.014, b + 0.014, MANDAP_H - 0.06], (s, [x, y], u) => {
    for (let k = 0; k < 10; k++) s.blob(x + Math.sin(k * 1.3) * 0.008 * u, y + k * 0.05 * u, 0.009 * u, 0.008 * u, tint(MARIGOLD[k % 3]), { w: 1, mask: true });
  });
  // kalash: a round pot with mango leaves and a coconut
  const ka = a + 0.06;
  const kb = b + 0.06;
  iso.cyl(ka, kb, 0, 0.022, 0.05, WHITE, { r2: 0.016, color: GOLD });
  iso.at([ka, kb, 0.05], (s, [x, y], u) => {
    for (const r of [-0.9, 0, 0.9]) almondLeaf(s, x + r * 0.012 * u, y - 0.012 * u, 0.013 * u, r, LEAF, true);
    s.blob(x, y - 0.02 * u, 0.012 * u, 0.012 * u, tint("#c9a27a"), { w: 1.3, mask: true });
  });
}

/** One side of the mandap: a beam with a scalloped fabric swag and hanging marigold strands. */
function mandapSide(iso: Iso, p: [number, number], q: [number, number]) {
  const H = MANDAP_H;
  const n = 16;
  const edge: [number, number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const sag = Math.abs(Math.sin(t * Math.PI * 2)) * 0.07 + 0.015;
    edge.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, H - sag]);
  }
  iso.face([[p[0], p[1], H], ...edge, [q[0], q[1], H]], tint(WED.drape), { w: 1.8 });
  iso.line([p[0], p[1], H + 0.012], [q[0], q[1], H + 0.012], { w: 3.2 });
  for (const t of [0.25, 0.5, 0.75]) {
    const a = p[0] + (q[0] - p[0]) * t;
    const b = p[1] + (q[1] - p[1]) * t;
    iso.at([a, b, H - 0.02], (s, [x, y], u) => {
      s.line(x, y, x, y + 0.13 * u, { w: 1, mask: true });
      for (let k = 0; k < 5; k++) s.blob(x, y + (0.025 + k * 0.022) * u, 0.01 * u, 0.009 * u, tint(MARIGOLD[k % 3]), { w: 1, mask: true });
    });
  }
}

const wedding: Room = {
  name: "wedding",
  mood: ev("wedding").tagline,
  left(s) {
    wash(s, WED.wall);
    jaaliPanel(s, 0.08, 0.72, 0.84, 0.2, 12, 3, 0.1);
    swags(s, 0.0, 1.0, 0.04, 5, WED.drape);
    drapePanel(s, 0.08, 0.06, 0.1, WED.drape2);
    drapePanel(s, 0.82, 0.06, 0.1, WED.drape2);
    laris(s, [0.3, 0.38, 0.46, 0.54, 0.62, 0.7], 0.12, 0.3);
    // a shelf of diyas
    s.sticker(s.rectPts(0.28, 0.66, 0.46, 0.025), 3, 0.18, tint("#e2c49a"));
    s.box(0.28, 0.66, 0.46, 0.025, null, { w: 2 });
    for (const x of [0.33, 0.43, 0.53, 0.63]) diya(s, x, 0.66, 0.045);
  },
  right(s) {
    wash(s, WED.wall);
    jaaliPanel(s, 0.08, 0.72, 0.84, 0.2, 12, 3, 0.1);
    swags(s, 0.0, 1.0, 0.04, 5, WED.drape);
    floralArch(s, 0.16, 0.84, 0.08);
    inviteCard(s, ev("wedding"), 0.28, 0.16, 0.44, 0.46, WED.accent);
    drapePanel(s, 0.08, 0.06, 0.1, WED.drape2);
    drapePanel(s, 0.82, 0.06, 0.1, WED.drape2);
  },
  floor(s) {
    if (look.color) s.washAll(tint(WED.floor), 1);
    tiles(s, 6, 0.35);
    // rangoli under the mandap
    const [cx, cy] = F(0.47, 0.47);
    for (const [r, n, c] of [
      [0.2, 16, MARIGOLD[0]],
      [0.15, 12, "#f6b7aa"],
      [0.1, 10, "#f7d77a"],
    ] as const) {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const pts = s.ellipsePts(0, 0, r * 0.18, r * 0.42).map(([px, py]) => [cx + Math.cos(a) * r * 0.62 + px * Math.cos(a) - py * Math.sin(a), cy + Math.sin(a) * r * 0.62 + px * Math.sin(a) + py * Math.cos(a)] as Pt);
        s.sticker(pts, 1, 0.05, tint(c));
        s.stroke(pts, { closed: true, w: 1.2 });
      }
    }
    s.circle(cx, cy, 0.035, { w: 1.6 });
  },
  popups: isoLayers([
    (iso) => {
      // mandap, back half: three pillars on stepped bases with kalash pots, and the two back
      // sides hung with scalloped fabric and marigolds
      for (const [a, b] of [
        [0.22, 0.22],
        [0.74, 0.22],
        [0.22, 0.74],
      ])
        mandapPillar(iso, a, b);
      mandapSide(iso, [0.22, 0.22], [0.74, 0.22]);
      mandapSide(iso, [0.22, 0.22], [0.22, 0.74]);
    },
    (iso) => {
      // the sacred fire on its stepped kund, two seats, a brass plate of offerings
      iso.box(0.38, 0.38, 0, 0.18, 0.18, 0.035, WHITE, { color: "#e2c49a" });
      iso.box(0.405, 0.405, 0.035, 0.13, 0.13, 0.035, WHITE, { color: "#efd6ae" });
      iso.box(0.43, 0.43, 0.07, 0.08, 0.08, 0.03, WHITE, { color: "#e2c49a" });
      iso.at([0.47, 0.47, 0.1], (s, [x, y], u) => {
        if (look.color) s.glow(x, y - 0.1 * u, 0.24 * u, "#ffb347", 0.65);
        const outer = soft(
          [
            [x - 0.07 * u, y],
            [x - 0.055 * u, y - 0.1 * u],
            [x - 0.02 * u, y - 0.15 * u],
            [x - 0.005 * u, y - 0.23 * u],
            [x + 0.03 * u, y - 0.13 * u],
            [x + 0.05 * u, y - 0.17 * u],
            [x + 0.07 * u, y],
          ],
          2,
        );
        s.shape(outer, tint("#ffcf5a"), { mask: true, w: 1.6 });
        s.shape(
          soft(
            [
              [x - 0.035 * u, y],
              [x - 0.01 * u, y - 0.12 * u],
              [x + 0.035 * u, y],
            ],
            2,
          ),
          tint("#f6a99a"),
          { mask: true, w: 1.2 },
        );
      });
      cushion(iso, 0.6, 0.34, 0.12, WED.seat);
      cushion(iso, 0.34, 0.6, 0.12, WED.seat);
      iso.cyl(0.6, 0.6, 0, 0.05, 0.015, WHITE, { r2: 0.06, color: GOLD });
      iso.at([0.6, 0.6, 0.015], (s, [x, y], u) => {
        for (const [dx, dy, c] of [
          [-0.02, -0.005, MARIGOLD[0]],
          [0.018, -0.008, "#f6b7aa"],
          [0, -0.02, MARIGOLD[1]],
        ] as const)
          s.blob(x + dx * u, y + dy * u, 0.012 * u, 0.01 * u, tint(c), { w: 1.2, mask: true });
      });
    },
    (iso) => {
      // front half: the fourth pillar, the two front sides and a peaked canopy on top
      mandapPillar(iso, 0.74, 0.74);
      mandapSide(iso, [0.74, 0.22], [0.74, 0.74]);
      mandapSide(iso, [0.22, 0.74], [0.74, 0.74]);
      const H = MANDAP_H;
      const apex: [number, number, number] = [0.48, 0.48, H + 0.2];
      iso.face([[0.74, 0.22, H], [0.74, 0.74, H], apex], tint(WED.drapeLit), { w: 2.2 });
      iso.face([[0.22, 0.74, H], [0.74, 0.74, H], apex], tint(WED.drape), { w: 2.2 });
      for (const t of [0.33, 0.66]) {
        iso.line([0.74, 0.22 + 0.52 * t, H], apex, { w: 1, alpha: 0.55 });
        iso.line([0.22 + 0.52 * t, 0.74, H], apex, { w: 1, alpha: 0.55 });
      }
      iso.at(apex, (s, [x, y], u) => {
        s.blob(x, y - 0.02 * u, 0.02 * u, 0.025 * u, tint(GOLD), { w: 1.6, mask: true });
        s.line(x, y - 0.045 * u, x, y - 0.07 * u, { w: 1.6, mask: true });
      });
    },
  ]),
};

const REC = {
  wall: "#f5e7d2",
  floor: "#edddc5",
  accent: "#e9b64d",
  cloth: "#fff7e8",
  glass: "#dcebfa",
  blush: "#f3a185",
  runner: "#bd5141",
};

function chandelier(s: Sketch, x: number, y: number, w: number) {
  s.line(x, 0, x, y, { w: 1.6 });
  if (look.color) s.glow(x, y + w * 0.3, w * 1.4, "#ffe39a", 0.5);
  const arms: Pt[] = [...s.ellipsePts(x, y + w * 0.2, w, w * 0.28, 0, Math.PI, 14)];
  s.stroke(arms, { w: 2 });
  s.stroke(s.ellipsePts(x, y + w * 0.05, w * 0.6, w * 0.18, 0, Math.PI, 12), { w: 1.6 });
  for (const t of [-1, -0.5, 0, 0.5, 1]) {
    const cx = x + t * w;
    const cy = y + w * 0.2 + Math.sqrt(Math.max(0, 1 - t * t)) * w * 0.28;
    s.rect(cx - 0.006, cy - 0.04, 0.012, 0.04, { w: 1.2 });
    s.blob(cx, cy - 0.052, 0.006, 0.01, tint("#ffd56b"), { w: 1 });
    for (let k = 0; k < 2; k++) s.blob(cx, cy + 0.015 + k * 0.018, 0.005, 0.008, tint(REC.glass), { w: 1 });
  }
}

/** A floral arch with the couple's initials on a small sign. */
function floralArch(s: Sketch, x0: number, x1: number, top: number) {
  const cx = (x0 + x1) / 2;
  const rx = (x1 - x0) / 2;
  const arch: Pt[] = [[x0, 0.98], ...s.ellipsePts(cx, top + rx * 0.9, rx, rx * 0.9, Math.PI, Math.PI * 2, 24), [x1, 0.98]];
  s.stroke(arch, { w: 2.4 });
  const ring = s.ellipsePts(cx, top + rx * 0.9, rx, rx * 0.9, Math.PI, Math.PI * 2, 22);
  const path: Pt[] = [
    ...Array.from({ length: 8 }, (_, i) => [x0, 0.98 - i * ((0.98 - top - rx * 0.9) / 8)] as Pt),
    ...ring,
    ...Array.from({ length: 8 }, (_, i) => [x1, top + rx * 0.9 + i * ((0.98 - top - rx * 0.9) / 8)] as Pt),
  ];
  path.forEach(([x, y], i) => {
    if (i % 3 === 1) almondLeaf(s, x + (i % 2 ? 0.015 : -0.015), y, 0.016, i % 2 ? 0.9 : -0.9, LEAF);
  });
  path.forEach(([x, y], i) => {
    if (i % 2 === 0) flower(s, x, y, 0.011, i % 4 === 0 ? REC.blush : "#fffaf0");
  });
  // the sign
  const sign = s.rectPts(cx - 0.08, top + rx * 0.55, 0.16, 0.08);
  s.sticker(sign, 3, 0.18, tint("#fffaf0"));
  s.stroke(sign, { closed: true, w: 1.8 });
  s.text(WEDDING.initials, cx, top + rx * 0.55 + 0.04, 0.05);
  s.line(cx - 0.05, top + rx * 0.55, cx - 0.03, top + rx * 0.4, { w: 1 });
  s.line(cx + 0.05, top + rx * 0.55, cx + 0.03, top + rx * 0.4, { w: 1 });
}

/** A bunch of balloons on strings. */
function balloons(s: Sketch, x: number, y: number) {
  const list: [number, number, string][] = [
    [-0.03, -0.05, REC.blush],
    [0.03, -0.07, "#fffaf0"],
    [0.0, -0.11, GOLD],
    [0.05, -0.02, REC.blush],
  ];
  for (const [dx, dy] of list) s.stroke([[x, y + 0.12], [x + dx * 0.6, y + 0.05], [x + dx, y + dy + 0.03]], { w: 1 });
  for (const [dx, dy, c] of list) {
    const b = s.ellipsePts(x + dx, y + dy, 0.026, 0.032);
    s.sticker(b, 2, 0.14, tint(c));
    s.stroke(b, { closed: true, w: 1.6 });
    s.line(x + dx - 0.01, y + dy - 0.015, x + dx - 0.005, y + dy - 0.022, { w: 1.4, alpha: 0.7 });
  }
}

const lagan: Room = {
  name: "lagan",
  mood: ev("lagan").tagline,
  left(s) {
    wash(s, REC.wall);
    toran(s, 0.0, 1.0, 0.04);
    laris(s, [0.12, 0.2, 0.8, 0.88], 0.06, 0.24);
    for (const x of [0.06, 0.78]) {
      const win: Pt[] = [[x, 0.86], [x, 0.44], ...s.ellipsePts(x + 0.08, 0.44, 0.08, 0.1, Math.PI, Math.PI * 2, 10), [x + 0.16, 0.86]];
      s.sticker(win, 5, 0.18, tint(REC.glass));
      s.stroke(win, { closed: true, w: 2.4 });
      jaaliPanel(s, x + 0.02, 0.53, 0.12, 0.29, 3, 5, 0.16);
      s.line(x + 0.08, 0.36, x + 0.08, 0.86, { w: 1.6 });
      s.line(x, 0.62, x + 0.16, 0.62, { w: 1.6 });
    }
    floralArch(s, 0.33, 0.67, 0.34);
    chandelier(s, 0.5, 0.12, 0.12);
    diya(s, 0.43, 0.81, 0.045);
    diya(s, 0.57, 0.81, 0.045);
  },
  right(s) {
    wash(s, REC.wall);
    jaaliPanel(s, 0.1, 0.73, 0.8, 0.19, 11, 3, 0.1);
    toran(s, 0.0, 1.0, 0.04);
    laris(s, [0.08, 0.16, 0.84, 0.92], 0.06, 0.25);
    floralArch(s, 0.2, 0.8, 0.08);
    inviteCard(s, ev("lagan"), 0.28, 0.14, 0.44, 0.42, REC.accent);
    couplePhoto(s, 0.06, 0.26, 0.13, 0.16, -0.03);
    couplePhoto(s, 0.8, 0.2, 0.12, 0.14, 0.05);
    garland(s, 0.27, 0.73, 0.66, 0.025, 0.01);
  },
  floor(s) {
    if (look.color) s.washAll(tint(REC.floor), 1);
    tiles(s, 5, 0.4);
    for (let i = 0; i < 20; i++) {
      const x = s.r();
      const y = s.r();
      s.line(x, y, x + 0.05, y + 0.02, { w: 1, alpha: 0.25 });
    }
    // an aisle runner up to the couple's seat, edged with petals
    const run = [F(0.26, 0.42), F(1.0, 0.42), F(1.0, 0.58), F(0.26, 0.58)];
    s.sticker(run, 2, 0.1, tint(REC.runner));
    s.stroke(run, { closed: true, w: 1.6 });
    for (let a = 0.3; a < 1; a += 0.06)
      for (const b of [0.4, 0.6]) {
        const [px, py] = F(a, b);
        s.blob(px, py, 0.008, 0.006, tint(REC.blush), { w: 1 });
      }
    const [cx, cy] = F(0.72, 0.72);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const petal = s.ellipsePts(cx + Math.cos(a) * 0.075, cy + Math.sin(a) * 0.04, 0.012, 0.022);
      s.sticker(petal, 0.5, 0, tint(MARIGOLD[i % MARIGOLD.length]));
      s.stroke(petal, { closed: true, w: 1 });
    }
    s.circle(cx, cy, 0.025, { w: 1.5 });
    s.shadow(s.ellipsePts(...F(0.14, 0.14), 0.1, 0.1), 0.22, 14);
    s.shadow([F(0.04, 0.34), F(0.2, 0.34), F(0.2, 0.66), F(0.04, 0.66)], 0.22, 14);
    s.shadow(s.ellipsePts(...F(0.62, 0.74), 0.17, 0.14), 0.22, 16);
  },
  popups: isoLayers([
    (iso) => {
      // a ceremonial bajot with a brass thali and offerings
      iso.box(0.12, 0.2, 0, 0.25, 0.23, 0.08, WHITE, { color: REC.runner });
      iso.box(0.135, 0.215, 0.08, 0.22, 0.2, 0.025, WHITE, { color: REC.cloth });
      iso.cyl(0.23, 0.31, 0.105, 0.075, 0.012, WHITE, { color: GOLD });
      iso.disc(0.23, 0.31, 0.117, 0.06, tint("#f7d77a"), { w: 1.3 });
      iso.at([0.23, 0.31, 0.117], (s, [x, y], u) => {
        flower(s, x - 0.025 * u, y, 0.012 * u, MARIGOLD[0], true);
        flower(s, x + 0.025 * u, y, 0.012 * u, "#f7a8a0", true);
        s.circle(x, y, 0.008 * u, { w: 1.2, mask: true });
      });
      // a kalash with mango leaves and a coconut
      iso.cyl(0.5, 0.3, 0, 0.035, 0.075, WHITE, { r2: 0.045, color: GOLD });
      iso.at([0.5, 0.3, 0.075], (s, [x, y], u) => {
        almondLeaf(s, x - 0.018 * u, y - 0.01 * u, 0.022 * u, -0.8, LEAF, true);
        almondLeaf(s, x, y - 0.015 * u, 0.024 * u, 0, LEAF, true);
        almondLeaf(s, x + 0.018 * u, y - 0.01 * u, 0.022 * u, 0.8, LEAF, true);
        s.blob(x, y - 0.035 * u, 0.018 * u, 0.02 * u, tint("#c9a27a"), { w: 1.3, mask: true });
      });
    },
    (iso) => {
      // floor cushions and a tray of marigolds
      cushion(iso, 0.23, 0.58, 0.14, REC.accent);
      cushion(iso, 0.43, 0.58, 0.14, REC.blush);
      iso.cyl(0.72, 0.43, 0, 0.085, 0.05, WHITE, { r2: 0.1, color: REC.cloth });
      iso.disc(0.72, 0.43, 0.05, 0.08, tint("#f7d77a"), { w: 1.3 });
      iso.at([0.72, 0.43, 0.05], (s, [x, y], u) => {
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          flower(s, x + Math.cos(a) * 0.045 * u, y + Math.sin(a) * 0.025 * u, 0.012 * u, MARIGOLD[i % MARIGOLD.length], true);
        }
        flower(s, x, y, 0.014 * u, REC.blush, true);
      });
    },
  ]),
};

const SAN = {
  wall: "#a3a7e0",
  floor: "#9296d2",
  tile: "#b3b6e8",
  accent: "#c8c4f3",
  speaker: "#3b3b52",
  drum: "#f3c5cf",
  pink: "#ff9ccc",
  cyan: "#9fe6ff",
  lime: "#dcf59a",
  sun: "#ffe08a",
  booth: "#5a5f9e",
};
const CONFETTI = [SAN.pink, SAN.cyan, SAN.lime, SAN.sun, "#ffffff"];

/** Paper confetti: little rectangles and dots at random angles. */
function confetti(s: Sketch, n: number, x0 = 0.04, x1 = 0.96, y0 = 0.04, y1 = 0.96, floor = false) {
  for (let i = 0; i < n; i++) {
    let x = x0 + s.r() * (x1 - x0);
    let y = y0 + s.r() * (y1 - y0);
    if (floor) [x, y] = F(x, y);
    const c = tint(CONFETTI[i % CONFETTI.length]);
    if (i % 3 === 0) s.blob(x, y, 0.006, 0.006, c, { w: 1 });
    else {
      const a = s.r() * Math.PI;
      const dx = Math.cos(a) * 0.009;
      const dy = Math.sin(a) * 0.009;
      const p: Pt[] = [
        [x - dx, y - dy],
        [x + dx, y + dy],
        [x + dx + dy * 0.5, y + dy - dx * 0.5],
        [x - dx + dy * 0.5, y - dy - dx * 0.5],
      ];
      s.sticker(p, 0.5, 0, c);
      s.stroke(p, { closed: true, w: 1 });
    }
  }
}

/** Triangle pennant bunting sagging between two points. */
function bunting(s: Sketch, x1: number, x2: number, y: number, sag: number, n: number) {
  const at = (t: number): Pt => [x1 + (x2 - x1) * t, y + Math.sin(t * Math.PI) * sag];
  s.stroke(Array.from({ length: 21 }, (_, i) => at(i / 20)), { w: 1.6 });
  for (let i = 0; i < n; i++) {
    const a = at((i + 0.15) / n);
    const b = at((i + 0.85) / n);
    const tip: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.07];
    const p: Pt[] = [a, b, tip];
    s.sticker(p, 2, 0.12, tint(CONFETTI[i % 4]));
    s.stroke(p, { closed: true, w: 1.5 });
  }
}

/** A mirrored disco ball on a string, throwing little light flecks. */
function discoBall(s: Sketch, x: number, y: number, r: number) {
  s.line(x, 0, x, y - r, { w: 1.4 });
  if (look.color) {
    s.glow(x, y, r * 3.2, "#ffffff", 0.35);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + 0.3;
      const d = r * (2.2 + (i % 3) * 0.9);
      s.glow(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.8, 0.018, CONFETTI[i % 4], 0.7);
    }
  }
  const ball = s.ellipsePts(x, y, r, r);
  s.sticker(ball, 3, 0.2, tint("#e6e8f5"));
  s.stroke(ball, { closed: true, w: 2 });
  for (const k of [-0.6, -0.2, 0.2, 0.6]) {
    s.stroke(s.ellipsePts(x, y + k * r, r * Math.sqrt(1 - k * k), r * 0.12, 0, Math.PI, 10), { w: 0.9, alpha: 0.7 });
    s.stroke(s.ellipsePts(x + k * r, y, r * 0.14, r * Math.sqrt(1 - k * k), -Math.PI / 2, Math.PI / 2, 10), { w: 0.9, alpha: 0.7 });
  }
  s.line(x - r * 0.45, y - r * 0.5, x - r * 0.25, y - r * 0.6, { w: 1.6, alpha: 0.8 });
  for (const [dx, dy, rr] of [
    [-1.9, -0.6, 0.02],
    [1.8, 0.4, 0.024],
    [1.3, -1.4, 0.016],
  ])
    sparkle(s, x + dx * r, y + dy * r, rr);
}

/** Hand-lettered neon sign: a soft coloured glow behind doubled lettering. */
function neon(s: Sketch, str: string, x: number, y: number, size: number, c: string, rot = 0) {
  if (look.color) {
    s.glow(x, y, size * 2.6, c, 0.55);
    s.glow(x, y, size * 1.4, c, 0.5);
  }
  s.text(str, x, y, size, { rotate: rot });
}

const ringSangeet: Room = {
  name: "ring-sangeet",
  mood: ev("ring-sangeet").tagline,
  left(s) {
    if (look.color) s.washAll(tint(SAN.wall, "#ffffff"), 1);
    jaaliPanel(s, 0.08, 0.78, 0.84, 0.16, 12, 2, 0.07);
    toran(s, 0.0, 1.0, 0.04);
    garland(s, 0.08, 0.92, 0.14, 0.035, 0.01);
    // spotlight beams from the top corners
    if (look.color)
      for (const [x0, x1, c] of [
        [0.98, 0.62, SAN.pink],
        [0.02, 0.4, SAN.cyan],
      ] as const)
        for (let k = 0; k < 6; k++) s.glow(x0 + (x1 - x0) * (k / 5), 0.12 + k * 0.15, 0.05 + k * 0.02, c, 0.22);
    bunting(s, 0.0, 0.52, 0.04, 0.07, 6);
    bunting(s, 0.48, 1.0, 0.04, 0.06, 6);
    discoBall(s, 0.64, 0.26, 0.07);
    neon(s, "let's dance!", 0.66, 0.54, 0.075, SAN.pink, -0.06);
    neon(s, "sangeet!", 0.25, 0.44, 0.06, SAN.cyan, 0.04);
    s.stroke(s.ellipsePts(0.25, 0.34, 0.028, 0.028), { w: 2.4 });
    s.stroke(s.ellipsePts(0.29, 0.34, 0.028, 0.028), { w: 2.4 });
    // music notes floating up
    for (const [x, y] of [
      [0.9, 0.74],
      [0.47, 0.64],
      [0.86, 0.4],
    ]) {
      s.blob(x, y, 0.015, 0.012, tint(SAN.sun), { w: 1.5 });
      s.line(x + 0.014, y, x + 0.014, y - 0.07, { w: 1.6 });
      s.line(x + 0.014, y - 0.07, x + 0.04, y - 0.055, { w: 1.6 });
    }
    confetti(s, 40, 0.03, 0.97, 0.12, 0.95);
  },
  right(s) {
    if (look.color) s.washAll(tint(SAN.wall, "#ffffff"), 1);
    jaaliPanel(s, 0.08, 0.72, 0.84, 0.2, 12, 3, 0.09);
    toran(s, 0.0, 1.0, 0.04);
    fairyLights(s, 0.02, 0.98, 0.06, 0.06);
    floralArch(s, 0.2, 0.8, 0.08);
    inviteCard(s, ev("ring-sangeet"), 0.3, 0.16, 0.4, 0.44, SAN.accent);
    // a photo-booth strip taped up next to the card
    const strip = s.rectPts(0.08, 0.2, 0.11, 0.42);
    s.sticker(strip, 3, 0.2, tint("#fffaf0"));
    s.stroke(strip, { closed: true, w: 1.8 });
    for (let k = 0; k < 3; k++) {
      const y = 0.23 + k * 0.13;
      s.fill(s.rectPts(0.095, y, 0.08, 0.1), tint(CONFETTI[k]), { alpha: 0.6, jitter: 0 });
      s.rect(0.095, y, 0.08, 0.1, { w: 1.2 });
      s.circle(0.12, y + 0.05, 0.013, { w: 1.1 });
      s.circle(0.15, y + 0.045, 0.011, { w: 1.1 });
      s.stroke(s.ellipsePts(0.135, y + 0.068, 0.01, 0.006, 0, Math.PI, 6), { w: 1 });
    }
    s.line(0.11, 0.19, 0.16, 0.21, { w: 4, alpha: 0.3 });
    balloons(s, 0.86, 0.3);
    for (const [x, y] of [
      [0.78, 0.6],
      [0.24, 0.72],
      [0.92, 0.72],
    ])
      sparkle(s, x, y, 0.025);
    confetti(s, 30, 0.03, 0.97, 0.62, 0.96);
  },
  floor(s) {
    if (look.color) s.washAll(tint(SAN.floor, "#ffffff"), 1);
    const n = 6;
    const lit = [SAN.pink, SAN.cyan, SAN.lime, SAN.sun];
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const sq = [F(i / n, j / n), F((i + 1) / n, j / n), F((i + 1) / n, (j + 1) / n), F(i / n, (j + 1) / n)];
        if ((i * 7 + j * 3) % 5 === 0 && i > 1 && j > 1) {
          if (look.color) s.fill(sq, tint(lit[(i + j) % 4], "#ffffff"), { alpha: 0.9, jitter: 0.2 });
        } else if ((i + j) % 2) {
          if (look.color) s.fill(sq, tint(SAN.tile, "#ffffff"), { alpha: 1, jitter: 0.2 });
          else s.hatch(sq, 0.02, -0.8, 1, 0.22);
        }
      }
    tiles(s, n, 0.5);
    petals(s, 28, [SAN.pink, SAN.sun, MARIGOLD[0]]);
    if (look.color) {
      s.glow(...F(0.6, 0.6), 0.35, "#ffd56b", 0.25);
      s.glow(...F(0.45, 0.75), 0.2, SAN.pink, 0.35);
      s.glow(...F(0.75, 0.45), 0.2, SAN.cyan, 0.35);
    }
    s.shadow([F(0.2, 0.04), F(0.58, 0.04), F(0.58, 0.2), F(0.2, 0.2)], 0.22, 14);
    s.shadow([F(0.04, 0.6), F(0.2, 0.6), F(0.2, 0.92), F(0.04, 0.92)], 0.22, 14);
    confetti(s, 60, 0.25, 0.97, 0.25, 0.97, true);
  },
  popups: isoLayers([
    (iso) => {
      // speakers either side of the dj booth
      for (const [a, h] of [
        [0.05, 0.4],
        [0.62, 0.34],
      ]) {
        iso.box(a, 0.04, 0, 0.12, 0.12, h, WHITE, { color: SAN.speaker });
        iso.at([a + 0.06, 0.16, h * 0.68], (s, [x, y], u) => {
          s.circle(x, y, 0.035 * u, { w: 1.8, mask: true });
          s.circle(x, y, 0.012 * u, { w: 1.4, mask: true });
        });
        iso.at([a + 0.06, 0.16, h * 0.28], (s, [x, y], u) => s.circle(x, y, 0.025 * u, { w: 1.6, mask: true }));
      }
      // dj booth with two decks, a laptop and headphones
      iso.box(0.2, 0.05, 0, 0.38, 0.13, 0.26, WHITE, { color: SAN.booth });
      iso.at([0.39, 0.18, 0.13], (s, [x, y], u) => {
        if (look.color) s.glow(x, y, 0.07 * u, SAN.pink, 0.6);
        s.text(WEDDING.initials, x, y, 0.045 * u, { rotate: -0.45 });
      });
      for (const a of [0.27, 0.5]) {
        iso.disc(a, 0.115, 0.26, 0.045, tint("#2f3146"), { w: 1.4 });
        iso.disc(a, 0.115, 0.262, 0.012, tint(SAN.pink), { w: 1.1 });
      }
      iso.face(
        [
          [0.36, 0.08, 0.26],
          [0.43, 0.08, 0.26],
          [0.43, 0.08, 0.33],
          [0.36, 0.08, 0.33],
        ],
        tint("#dfe3f7"),
        { w: 1.6 },
      );
      iso.at([0.44, 0.15, 0.27], (s, [x, y], u) => {
        s.stroke(s.ellipsePts(x, y, 0.02 * u, 0.018 * u, Math.PI, Math.PI * 2, 10), { w: 1.6, mask: true });
        s.blob(x - 0.02 * u, y, 0.007 * u, 0.01 * u, tint(SAN.cyan), { w: 1.2, mask: true });
        s.blob(x + 0.02 * u, y, 0.007 * u, 0.01 * u, tint(SAN.cyan), { w: 1.2, mask: true });
      });
      // tabla pair on a low marigold-draped stand
      iso.box(0.04, 0.6, 0, 0.22, 0.24, 0.08, WHITE, { color: SAN.booth });
      iso.box(0.055, 0.615, 0.08, 0.19, 0.21, 0.018, WHITE, { color: SAN.sun });
      const tabla = (a: number, b: number, r: number, h: number) => {
        iso.cyl(a, b, 0.098, r, h, WHITE, { r2: r * 0.8, color: SAN.drum });
        iso.disc(a, b, 0.098 + h, r * 0.82, tint("#f5e3b0"), { w: 1.2 });
        iso.at([a, b, 0.098 + h], (s, [x, y], u) => {
          s.circle(x, y, r * 0.4 * u, { w: 1.2, mask: true });
          s.blob(x, y, r * 0.15 * u, r * 0.15 * u, tint(SAN.speaker), { w: 1, mask: true });
        });
      };
      tabla(0.11, 0.7, 0.045, 0.12);
      tabla(0.2, 0.72, 0.035, 0.1);
    },
    (iso) => {
      // a bunch of balloons tied to a weight, and a mic stand on the floor
      iso.cyl(0.86, 0.3, 0, 0.025, 0.03, WHITE, { color: SAN.sun });
      iso.at([0.86, 0.3, 0.03], (s, [x, y], u) => {
        const list: [number, number, string][] = [
          [-0.05, -0.42, SAN.pink],
          [0.04, -0.46, SAN.cyan],
          [0.0, -0.52, SAN.sun],
          [0.06, -0.38, SAN.lime],
          [-0.03, -0.35, "#ffffff"],
        ];
        for (const [dx, dy] of list) s.stroke([[x, y], [x + dx * 0.4 * u, y + dy * 0.5 * u], [x + dx * u, y + (dy + 0.03) * u]], { w: 1, mask: true });
        for (const [dx, dy, c] of list) {
          s.shape(s.ellipsePts(x + dx * u, y + dy * u, 0.03 * u, 0.037 * u), tint(c), { mask: true, w: 1.6 });
          s.line(x + (dx - 0.012) * u, y + (dy - 0.016) * u, x + (dx - 0.006) * u, y + (dy - 0.024) * u, { w: 1.4, alpha: 0.7, mask: true });
        }
      });
      iso.disc(0.5, 0.36, 0, 0.04, tint("#cfcfd8"), { w: 1.6 });
      iso.line([0.5, 0.36, 0], [0.5, 0.36, 0.42], { w: 2.4 });
      iso.line([0.5, 0.36, 0.42], [0.54, 0.4, 0.46], { w: 2.4 });
      iso.at([0.55, 0.41, 0.47], (s, [x, y], u) => s.blob(x, y, 0.016 * u, 0.02 * u, tint("#cfcfd8"), { w: 1.6, mask: true }));
      // a dholak left on the dance floor
      iso.cyl(0.3, 0.5, 0, 0.06, 0.14, WHITE, { color: SAN.drum });
      iso.at([0.3, 0.5, 0.07], (s, [x, y], u) => {
        for (let k = -2; k <= 2; k++) s.line(x + k * 0.02 * u, y - 0.06 * u, x + k * 0.025 * u, y + 0.06 * u, { w: 1, mask: true });
      });
    },
  ]),
};

export const ROOMS: Room[] = [haldi, ringSangeet, lagan, wedding];

// ---------------------------------------------------------------------------
// covers

export function drawFrontCover(s: Sketch) {
  if (look.color) s.washAll(tint("#fbe9e1"), 1);
  // the page outline is the border now (house-shaped); flowers sit in its lower corners
  for (const [x, y] of [
    [0.09, 0.91],
    [0.91, 0.91],
  ])
    flower(s, x, y, 0.018, MARIGOLD[0]);
  garland(s, 0.1, 0.9, 0.06, 0.08, 0.013);
  s.text(WEDDING.hosts, 0.5, 0.3, 0.035, { weight: 500 });
  s.text(WEDDING.couple[0], 0.5, 0.42, 0.11);
  s.text("&", 0.5, 0.52, 0.06, { weight: 500 });
  s.text(WEDDING.couple[1], 0.5, 0.62, 0.11);
  const first = WEDDING.events[0].start;
  const last = WEDDING.events[WEDDING.events.length - 1].start;
  s.text(`${fmtDay(first).split(" ").slice(1).join(" ")} – ${fmtDay(last).split(" ").slice(1).join(" ")} · ${WEDDING.city}`, 0.5, 0.72, 0.035, { weight: 500 });
  const g = getGuest();
  if (g) {
    s.line(0.3, 0.8, 0.7, 0.795, { w: 1.2 });
    s.text(`for ${g}`, 0.5, 0.84, 0.042);
  }
}

export function drawBackCover(s: Sketch) {
  if (look.color) s.washAll(tint("#fbe9e1"), 1);
  s.text("with love", 0.5, 0.5, 0.06, { weight: 500 });
}