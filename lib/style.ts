// Global drawing style, read while the textures are being drawn.
//   pen   – "sketchy" (loose, hand-drawn) or "clean" (steady) furniture lines
//   color – false: red ink on white paper; true: soft pastel washes
// The site uses the loose pen with a little colour; the other options remain for experiments.

export type Pen = "sketchy" | "clean";
export const look: { pen: Pen; color: boolean } = { pen: "sketchy", color: true };

/** How far the pastel palette is pulled towards white, so the colour stays a hint. */
const SOFTEN = 0.25;

/** Mix a hex colour towards white. */
export function soften(hex: string, amt = SOFTEN) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v + (255 - v) * amt);
  return `#${((ch((n >> 16) & 255) << 16) | (ch((n >> 8) & 255) << 8) | ch(n & 255)).toString(16).padStart(6, "0")}`;
}

/** A colour in the coloured version, plain paper (or `mono`) in the ink-only one. */
export const tint = (c: string, mono = "#ffffff") => (look.color ? soften(c) : mono);

/** Darken a hex colour (k < 1), for the shaded sides of coloured furniture. */
export function shade(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}
