"use client";

import { useMemo, useRef } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { useFrame, useThree } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";
import type { Line2 } from "three-stdlib";
import { G, H, L, N, dirOf, floorApex, focusAngle, focusOf, logicalOf, normalOf, pageAngles, roomOpenness, smooth } from "@/lib/fold";
import { makePaperMaterial, INK } from "@/lib/paperMaterial";
import { ROOMS } from "@/lib/invite";
import { book } from "@/lib/store";
import type { BookTextures } from "@/lib/textures";

const PAGE_GAP = 0.014; // thickness between pages when the book is shut
const INK_HEX = `#${INK.getHexString()}`;

/** The page's house shape: walls of height H with a peak of height G above. */
const housePts = (inset = 0, g = G): [number, number][] => {
  const k = inset * 1.6;
  return [
    [inset, inset],
    [L - inset, inset],
    [L - inset, H - inset * 0.3],
    [L / 2, H + g - k],
    [inset, H - inset * 0.3],
    [inset, inset],
  ];
};

/** House-shaped page geometry; uv.y runs 0..1 over the walls and past 1 in the peak. */
function houseGeometry(back: boolean) {
  const shape = new THREE.Shape(housePts().slice(0, 5).map(([x, y]) => new THREE.Vector2(x, y)));
  const geo = new THREE.ShapeGeometry(shape);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / L, pos.getY(i) / H);
  if (back) geo.translate(-L / 2, 0, 0).rotateY(Math.PI).translate(L / 2, 0, 0);
  return geo;
}

/** Move the roof's apex to height H + g (pages beside the open room get a lower peak). */
function setPeak(geo: THREE.BufferGeometry, g: number) {
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++)
    if (pos.getY(i) > H + 1e-3) {
      pos.setY(i, H + g);
      uv.setY(i, (H + g) / H);
    }
  pos.needsUpdate = true;
  uv.needsUpdate = true;
  geo.computeBoundingSphere();
}

/** Hand-wobbled closed outline in a page's local XY plane. */
function wobbleRect(seed: number, inset = 0, z = 0, g = G): THREE.Vector3[] {
  const corners = housePts(inset, g);
  const out: THREE.Vector3[] = [];
  for (let s = 0; s < corners.length - 1; s++) {
    const [x1, y1] = corners[s];
    const [x2, y2] = corners[s + 1];
    const nx = -(y2 - y1);
    const ny = x2 - x1;
    for (let j = 0; j < 16; j++) {
      const t = j / 16;
      const o = 0.004 * (Math.sin(seed * 3.1 + (s * 16 + j) * 0.7) * 0.6 + Math.sin(seed * 1.7 + (s * 16 + j) * 1.9) * 0.4);
      out.push(new THREE.Vector3(x1 + (x2 - x1) * t + nx * o, y1 + (y2 - y1) * t + ny * o, z));
    }
  }
  out.push(out[0].clone());
  return out;
}

const EDGE_STEPS = 12;
/** Writes a wobbly segment a→b into arr at offset (EDGE_STEPS+1 points). */
function writeEdge(arr: Float32Array, offset: number, a: number[], b: number[], seed: number) {
  const dx = b[0] - a[0];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dz) || 1;
  const px = -dz / len;
  const pz = dx / len;
  for (let j = 0; j <= EDGE_STEPS; j++) {
    const t = j / EDGE_STEPS;
    const o = 0.005 * (Math.sin(seed + j * 0.9) * 0.6 + Math.sin(seed * 2.3 + j * 2.1) * 0.4);
    const i = (offset + j) * 3;
    arr[i] = a[0] + (b[0] - a[0]) * t + px * o;
    arr[i + 1] = a[1] + (b[1] - a[1]) * t + 0.002;
    arr[i + 2] = a[2] + (b[2] - a[2]) * t + pz * o;
  }
}

type Rect = [number, number, number, number];
type Hot = { spot: string; pos: [number, number, number]; w: number; h: number };

/**
 * An invisible, clickable patch over something drawn in a room (the mirror, the diary...).
 * It breathes faintly while its room is in front so it can be found, and tints on hover.
 */
function Hotspot({ hot, room, onPick }: { hot: Hot; room: number; onPick: (spot: string) => void }) {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: INK,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      }),
    [],
  );
  const hover = useRef(false);
  const live = () => book.open > 0.97 && focusOf(room, book.f) > 0.97 && !book.dragging;
  useFrame(({ clock }) => {
    const on = live();
    const want = !on ? 0 : hover.current ? 0.16 : 0.035 + 0.035 * Math.sin(clock.elapsedTime * 2.2);
    mat.opacity += (want - mat.opacity) * 0.15;
  });
  const setHover = (v: boolean) => {
    hover.current = v && live();
    document.body.style.cursor = hover.current ? "pointer" : "";
  };
  return (
    <mesh
      position={hot.pos}
      material={mat}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHover(true);
      }}
      onPointerOut={() => setHover(false)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (!live() || e.delta > 6) return;
        setHover(false);
        const w = new THREE.Vector3();
        e.object.getWorldPosition(w);
        book.zoomAt = [w.x, w.y, w.z];
        onPick(hot.spot);
      }}
    >
      <planeGeometry args={[hot.w, hot.h]} />
    </mesh>
  );
}

const marksOf = (t: THREE.Texture): Record<string, Rect> => (t.userData.marks as Record<string, Rect>) ?? {};

export default function Book({ tex, onSpot }: { tex: BookTextures; onSpot: (room: number, spot: string) => void }) {
  const { camera, size } = useThree();

  // ---- static pieces ------------------------------------------------------
  // one geometry per page, so each page's peak can be raised or lowered on its own
  const pageGeo = useMemo(
    () => Array.from({ length: N + 1 }, () => ({ front: houseGeometry(false), back: houseGeometry(true), g: G })),
    [],
  );

  // Page k front = right wall of physical room k (or the front cover for k = N).
  // Page k back  = left wall of physical room k-1 (or the back cover for k = 0).
  const pageMats = useMemo(
    () =>
      Array.from({ length: N + 1 }, (_, k) => ({
        front: makePaperMaterial(k === N ? tex.front : tex.rooms[logicalOf(k)].right, { seed: k * 2, flat: k === N }),
        back: makePaperMaterial(k === 0 ? tex.back : tex.rooms[logicalOf(k - 1)].left, { seed: k * 2 + 1, flat: k === 0 }),
      })),
    [tex],
  );

  const floors = useMemo(
    () =>
      Array.from({ length: N }, (_, p) => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(18), 3));
        geo.setAttribute("uv", new THREE.BufferAttribute(new Float32Array([0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1]), 2));
        const mat = makePaperMaterial(tex.rooms[logicalOf(p)].floor, { side: THREE.DoubleSide, seed: 40 + p });
        return { geo, mat };
      }),
    [tex],
  );

  const popups = useMemo(
    () =>
      Array.from({ length: N }, (_, p) => {
        const li = logicalOf(p);
        return ROOMS[li].popups.map((spec, j) => ({
          spec,
          geo: new THREE.PlaneGeometry(spec.size, spec.size).translate(0, spec.size / 2, 0),
          mat: makePaperMaterial(tex.rooms[li].popups[j], { side: THREE.DoubleSide, blankBack: true, seed: 60 + p * 4 + j, flat: 0.85, transparent: true }),
        }));
      }),
    [tex],
  );

  // Clickable spots: on the right wall (page p front), the left wall (page p+1 back) and pop-up cards.
  const hots = useMemo(() => {
    const front: { room: number; hot: Hot }[][] = Array.from({ length: N + 1 }, () => []);
    const back: { room: number; hot: Hot }[][] = Array.from({ length: N + 1 }, () => []);
    const cards: Hot[][][] = Array.from({ length: N }, () => []);
    for (let p = 0; p < N; p++) {
      const r = tex.rooms[logicalOf(p)];
      for (const [spot, [x0, y0, x1, y1]] of Object.entries(marksOf(r.right)))
        front[p].push({ room: p, hot: { spot, pos: [((x0 + x1) / 2) * L, H * (1 - (y0 + y1) / 2), 0.004], w: (x1 - x0) * L, h: (y1 - y0) * H } });
      for (const [spot, [x0, y0, x1, y1]] of Object.entries(marksOf(r.left)))
        back[p + 1].push({ room: p, hot: { spot, pos: [L * (1 - (x0 + x1) / 2), H * (1 - (y0 + y1) / 2), -0.004], w: (x1 - x0) * L, h: (y1 - y0) * H } });
      cards[p] = r.popups.map((pt, j) => {
        const size = ROOMS[logicalOf(p)].popups[j].size;
        return Object.entries(marksOf(pt)).map(([spot, [x0, y0, x1, y1]]) => ({
          spot,
          pos: [((x0 + x1) / 2 - 0.5) * size, (1 - (y0 + y1) / 2) * size, 0.006] as [number, number, number],
          w: (x1 - x0) * size,
          h: (y1 - y0) * size,
        }));
      });
    }
    return { front, back, cards };
  }, [tex]);
  const pick = (p: number) => (spot: string) => onSpot(logicalOf(p), spot);

  const outlines = useMemo(() => Array.from({ length: N + 1 }, (_, k) => wobbleRect(k + 1)), []);
  // an inner border on the two covers, following the house shape
  const coverBorders = useMemo(() => ({ front: wobbleRect(31, 0.05, 0.002), back: wobbleRect(37, 0.05, -0.002) }), []);
  const floorLinePts = useMemo(() => Array.from({ length: N }, () => Array.from({ length: (EDGE_STEPS + 1) * 3 }, () => new THREE.Vector3())), []);
  const edgeBuf = useMemo(() => new Float32Array((EDGE_STEPS + 1) * 3 * 3), []);

  // ---- refs ---------------------------------------------------------------
  const pageRefs = useRef<(THREE.Group | null)[]>([]);
  const floorLineRefs = useRef<(Line2 | null)[]>([]);
  const outlineRefs = useRef<(Line2 | null)[]>([]);
  const borderRefs = useRef<(Line2 | null)[]>([]);
  const coverRefs = useRef<{ front: THREE.Mesh | null; back: THREE.Mesh | null }>({ front: null, back: null });
  const popRefs = useRef<{ outer: THREE.Group | null; hinge: THREE.Group | null }[][]>(Array.from({ length: N }, () => []));
  const target = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dtRaw) => {
    const dt = Math.min(dtRaw, 1 / 20);
    if (!book.dragging) book.f += (book.target - book.f) * (1 - Math.exp(-dt * 7));
    book.open += (book.openTarget - book.open) * (1 - Math.exp(-dt * 7));
    if (Math.abs(book.openTarget - book.open) < 1e-4) book.open = book.openTarget;

    const f = book.f;
    const e = smooth(book.open);
    const phi = pageAngles(f, book.open);

    // pages
    for (let k = 0; k <= N; k++) {
      const g = pageRefs.current[k];
      if (!g) continue;
      const n = normalOf(phi[k]);
      const off = (k - N / 2) * PAGE_GAP * (1 - e);
      g.rotation.y = -phi[k];
      g.position.set(n[0] * off, 0, n[2] * off);
      const m = pageMats[k];
      const rf = k === N ? 1 : focusOf(k, f) * e;
      const rb = k === 0 ? 1 : focusOf(k - 1, f) * e;
      m.front.uniforms.uReveal.value = rf;
      m.back.uniforms.uReveal.value = rb;
      m.front.uniforms.uInkAmt.value = k === N ? 1 : 0.55 + 0.45 * rf;
      m.back.uniforms.uInkAmt.value = k === 0 ? 1 : 0.55 + 0.45 * rb;
      // the open room's two walls keep their full peak; the others drop to a small one so the
      // pages fanned round the sides don't read as tall slanted spikes
      const near = Math.max(focusOf(k, f), focusOf(k - 1, f));
      const peak = G * (1 + (0.25 + 0.75 * near - 1) * e);
      const pg = pageGeo[k];
      if (Math.abs(pg.g - peak) > 1e-3) {
        pg.g = peak;
        setPeak(pg.front, peak);
        setPeak(pg.back, peak);
        const line = outlineRefs.current[k];
        if (line) line.geometry.setPositions(wobbleRect(k + 1, 0, 0, peak).flatMap((v) => [v.x, v.y, v.z]));
      }
      // once the book has opened all the way round, the two covers meet back to back: hide them
      // ...along with their inner borders, and the last page's outline, which would sit
      // right on top of the first page's and draw every edge twice
      if (k === N) {
        const shut = book.open < 0.97;
        for (const b of borderRefs.current) if (b) b.visible = shut;
        const ol = outlineRefs.current[N];
        if (ol) ol.visible = shut;
      }
      if (k === N) coverRefs.current.front && (coverRefs.current.front.visible = book.open < 0.97);
      if (k === 0) coverRefs.current.back && (coverRefs.current.back.visible = book.open < 0.97);
    }

    // floors + pop-ups
    for (let p = 0; p < N; p++) {
      const a = phi[p];
      const b = phi[p + 1];
      const A = dirOf(a).map((v) => v * L);
      const B = dirOf(b).map((v) => v * L);
      const P = floorApex(a, b);
      const O = [0, 0, 0];
      const pos = floors[p].geo.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      [O, A, P, O, P, B].forEach((v, i) => {
        arr[i * 3] = v[0];
        arr[i * 3 + 1] = v[1] + 0.0005;
        arr[i * 3 + 2] = v[2];
      });
      pos.needsUpdate = true;
      floors[p].geo.computeVertexNormals();
      floors[p].geo.computeBoundingSphere();
      const fr = focusOf(p, f) * e;
      floors[p].mat.uniforms.uReveal.value = fr;
      floors[p].mat.uniforms.uInkAmt.value = 0.5 + 0.5 * fr;

      const line = floorLineRefs.current[p];
      if (line) {
        writeEdge(edgeBuf, 0, A, P, p * 3 + 1);
        writeEdge(edgeBuf, EDGE_STEPS + 1, P, B, p * 3 + 2);
        writeEdge(edgeBuf, (EDGE_STEPS + 1) * 2, O, P, p * 3 + 3);
        line.geometry.setPositions(edgeBuf);
        line.material.opacity = smooth((book.open - 0.05) / 0.25);
        line.visible = line.material.opacity > 0.01;
      }

      const open = roomOpenness(phi, p);
      // Pop-ups are drawn for the fully open room seen head-on, so they only appear once the
      // room has settled at a right angle and fade out as soon as it starts to fold.
      const rise = smooth((open - 0.965) / 0.035) * smooth((book.open - 0.96) / 0.04) * smooth((focusOf(p, f) - 0.9) / 0.1);
      const mid = (a + b) / 2;
      const dA = dirOf(a);
      const dB = dirOf(b);
      popups[p].forEach((pu, j) => {
        const r = popRefs.current[p][j];
        if (!r?.outer || !r.hinge) return;
        const vis = smooth((rise - j * 0.3) / (1 - j * 0.3 + 1e-3));
        r.outer.visible = vis > 0.01;
        const [s, t] = pu.spec.at;
        r.outer.position.set((dA[0] * s + dB[0] * t) * L, 0.001, (dA[2] * s + dB[2] * t) * L);
        r.outer.rotation.y = Math.PI / 2 - mid;
        // fade in one layer after another with a small lift
        r.hinge.scale.y = 0.9 + 0.1 * vis;
        pu.mat.uniforms.uOpacity.value = vis;
        pu.mat.uniforms.uReveal.value = fr;
      });
    }

    // camera: front view of the cover when shut, looking into the focused room when open
    const gF = focusAngle(phi, f);
    const yaw = Math.PI / 2 + (gF - Math.PI / 2) * e;
    const pitch = THREE.MathUtils.degToRad(8 + 24 * e);
    const dF = dirOf(gF);
    target.set(L / 2 + (dF[0] * 0.45 - L / 2) * e, (H + G) / 2 + (0.58 - (H + G) / 2) * e, dF[2] * 0.45 * e);
    // moving in on a journal spot
    book.zoom += (book.zoomTarget - book.zoom) * (1 - Math.exp(-dt * 6));
    const zm = smooth(book.zoom);
    target.x += (book.zoomAt[0] - target.x) * zm;
    target.y += (book.zoomAt[1] - target.y) * zm;
    target.z += (book.zoomAt[2] - target.z) * zm;
    camera.position.set(target.x + Math.cos(yaw) * Math.cos(pitch) * 10, target.y + Math.sin(pitch) * 10, target.z + Math.sin(yaw) * Math.cos(pitch) * 10);
    camera.lookAt(target);
    // tall enough for the folded page stacks, which rise well above the open room
    const viewH = 1.95 + 1.05 * e;
    const narrow = size.width < 640;
    const viewW = (narrow ? 1.35 : 1.9) + (narrow ? 1.0 : 1.2) * e;
    const ortho = camera as THREE.OrthographicCamera;
    ortho.zoom = Math.min(size.height / viewH, size.width / viewW) * (1 + 2.6 * zm);
    ortho.updateProjectionMatrix();
  });

  return (
    <group>
      {pageMats.map((m, k) => (
        <group key={k} ref={(el) => void (pageRefs.current[k] = el)}>
          <mesh geometry={pageGeo[k].front} material={m.front} ref={k === N ? (el) => void (coverRefs.current.front = el) : undefined} />
          <mesh geometry={pageGeo[k].back} material={m.back} ref={k === 0 ? (el) => void (coverRefs.current.back = el) : undefined} />
          {hots.front[k].map(({ room, hot }) => (
            <Hotspot key={`f${hot.spot}`} hot={hot} room={room} onPick={pick(room)} />
          ))}
          {hots.back[k].map(({ room, hot }) => (
            <Hotspot key={`b${hot.spot}`} hot={hot} room={room} onPick={pick(room)} />
          ))}
          <Line
            ref={(el) => void (outlineRefs.current[k] = el as unknown as Line2 | null)}
            points={outlines[k]}
            color={INK_HEX}
            lineWidth={1.7}
            transparent
          />
          {k === N && <Line ref={(el) => void (borderRefs.current[0] = el as unknown as Line2 | null)} points={coverBorders.front} color={INK_HEX} lineWidth={2.2} />}
          {k === 0 && <Line ref={(el) => void (borderRefs.current[1] = el as unknown as Line2 | null)} points={coverBorders.back} color={INK_HEX} lineWidth={2.2} />}
        </group>
      ))}
      {floors.map((fl, p) => (
        <group key={p}>
          <mesh geometry={fl.geo} material={fl.mat} />
          <Line
            ref={(el) => void (floorLineRefs.current[p] = el as unknown as Line2 | null)}
            points={floorLinePts[p]}
            transparent
            color={INK_HEX}
            lineWidth={1.5}
          />
        </group>
      ))}
      {popups.map((list, p) =>
        list.map((pu, j) => (
          <group
            key={`${p}-${j}`}
            ref={(el) => {
              popRefs.current[p][j] = { ...(popRefs.current[p][j] ?? { hinge: null }), outer: el };
            }}
          >
            <group
              ref={(el) => {
                popRefs.current[p][j] = { ...(popRefs.current[p][j] ?? { outer: null }), hinge: el };
              }}
            >
              <mesh geometry={pu.geo} material={pu.mat} />
              {hots.cards[p][j]?.map((hot) => <Hotspot key={hot.spot} hot={hot} room={p} onPick={pick(p)} />)}
            </group>
          </group>
        )),
      )}
    </group>
  );
}
