// Geometry of the pop-up book: a full-circle carousel (the covers meet when it's open).
//
// Pages radiate from a vertical spine at the origin. Page k sits at angle phi[k]
// (measured from +x towards +z). Physical room p lives between page p and page p+1.
// Its floor is a square creased along the diagonal: when the walls are 90° apart the
// floor lies flat, and as they close the crease rises like a tent.

export const N = 4; // rooms (must match ROOMS in invite.ts: one per wedding event)
export const L = 1; // page width (spine to outer edge)
export const H = 1; // page height (the walls)
export const G = 0.4; // height of the peaked top above the walls (pages are house-shaped)
export const RIGHT_ANGLE = Math.PI / 2;

export const smooth = (x: number) => {
  const t = Math.min(1, Math.max(0, x));
  return t * t * (3 - 2 * t);
};

export const dirOf = (a: number): [number, number, number] => [Math.cos(a), 0, Math.sin(a)];
/** Unit vector pointing from page at angle a into the room on its +angle side. */
export const normalOf = (a: number): [number, number, number] => [-Math.sin(a), 0, Math.cos(a)];

/** Wrap a slot index into 0..N-1 (f keeps counting up/down as you spin round). */
export const wrap = (x: number) => ((x % N) + N) % N;

/** Distance between slot i and focus f, going the short way round the circle. */
export const circDist = (i: number, f: number) => {
  const d = Math.abs(i - wrap(f));
  return Math.min(d, N - d);
};

/** How much physical room i is "the focused room" (1 = fully in front). */
export const focusOf = (i: number, f: number) => smooth(1 - circDist(i, f));

/**
 * Page angles for focus position f (physical slot, continuous, wraps) and book openness (0..1).
 * The focused room always gets a right angle; the rest of the full circle is shared evenly
 * between the other rooms. The last page stops a hair short of 360° so the covers just meet.
 */
export const SPAN = Math.PI * 2 * 0.996;

export function pageAngles(f: number, open: number): number[] {
  const b: number[] = [];
  let sb = 0;
  for (let i = 0; i < N; i++) {
    const bb = focusOf(i, f);
    b.push(bb);
    sb += bb;
  }
  const rest = SPAN - RIGHT_ANGLE * sb;
  const others = N - sb;
  const phi = [0];
  for (let i = 0; i < N; i++) phi.push(phi[i] + (RIGHT_ANGLE * b[i] + (rest * (1 - b[i])) / Math.max(others, 1e-4)) * open);
  return phi;
}

/** Angle the camera should look along for focus f (centre of the focused room). */
export function focusAngle(phi: number[], f: number): number {
  const fm = wrap(f);
  const i0 = Math.floor(fm) % N;
  const i1 = (i0 + 1) % N;
  const fr = fm - Math.floor(fm);
  const ca = (phi[i0] + phi[i0 + 1]) / 2;
  let cb = (phi[i1] + phi[i1 + 1]) / 2;
  if (i1 === 0) cb += phi[N];
  return ca + (cb - ca) * fr;
}

/**
 * Apex of the creased floor between walls at angles a and b.
 * Solves |P| = L√2 and |P − L·dirA| = |P − L·dirB| = L, with P in the bisector plane.
 */
export function floorApex(a: number, b: number): [number, number, number] {
  const th = Math.min(b - a, RIGHT_ANGLE);
  const u = dirOf((a + b) / 2);
  const x = L / Math.cos(th / 2);
  const y = Math.sqrt(Math.max(0, 2 * L * L - x * x));
  return [u[0] * x, y, u[2] * x];
}

/** 0 when the room's walls are shut, 1 when they're at a right angle. */
export function roomOpenness(phi: number[], p: number) {
  return Math.min(1, (phi[p + 1] - phi[p]) / RIGHT_ANGLE);
}

/** Logical room index (0 = first room after the cover) ↔ physical slot. */
export const physicalOf = (logical: number) => N - 1 - wrap(logical);
export const logicalOf = (physical: number) => N - 1 - wrap(Math.round(physical));
