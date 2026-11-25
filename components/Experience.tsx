"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows } from "@react-three/drei";
import Book from "./Book";
import EventCard from "./EventCard";
import Rsvp from "./Rsvp";
import { WEDDING, eventByKey, fmtDay, setGuest } from "@/lib/wedding";
import { HandArrow, HandUnderline } from "./Hand";
import { logicalOf } from "@/lib/fold";
import { ROOMS } from "@/lib/invite";
import { book } from "@/lib/store";
import { buildTextures, type BookTextures } from "@/lib/textures";
import { look } from "@/lib/style";

const FONT = "Caveat";
const PAGE_THEMES: Record<string, { paper: string; glow: string; edge: string; accent: string; ornamentFilter: string }> = {
  haldi: {
    paper: "#f6edda",
    glow: "rgba(238, 193, 80, 0.15)",
    edge: "rgba(122, 83, 42, 0.11)",
    accent: "#bd801e",
    ornamentFilter: "sepia(0.55) saturate(1.5) hue-rotate(-8deg)",
  },
  "ring-sangeet": {
    paper: "#eeedf5",
    glow: "rgba(161, 151, 216, 0.15)",
    edge: "rgba(69, 64, 109, 0.11)",
    accent: "#7770ae",
    ornamentFilter: "sepia(0.15) saturate(1.15) hue-rotate(210deg)",
  },
  lagan: {
    paper: "#f3e5ce",
    glow: "rgba(222, 174, 98, 0.13)",
    edge: "rgba(112, 70, 43, 0.12)",
    accent: "#a85b3c",
    ornamentFilter: "sepia(0.25) saturate(1.3) hue-rotate(5deg)",
  },
  wedding: {
    paper: "#f6e8df",
    glow: "rgba(218, 139, 145, 0.13)",
    edge: "rgba(112, 70, 43, 0.11)",
    accent: "#b04b58",
    ornamentFilter: "sepia(0.25) saturate(1.4) hue-rotate(-8deg)",
  },
};

export default function Experience() {
  const [tex, setTex] = useState<BookTextures | null>(null);
  const [room, setRoom] = useState(0); // logical index
  const [open, setOpen] = useState(false);
  const [card, setCard] = useState<string | null>(null); // event key whose invite card is open
  const [rsvp, setRsvp] = useState<string | null>(null); // "" = open, or an event key to pre-tick
  const writing = card !== null || rsvp !== null;
  const drag = useRef({ x: 0, startX: 0, active: false });

  // Draw every surface once the handwriting font is ready (loose pen, a little colour).
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await Promise.all([document.fonts.load(`700 64px ${FONT}`), document.fonts.load(`500 64px ${FONT}`)]);
      } catch {
        /* fall back to whatever cursive font is around */
      }
      look.pen = "sketchy";
      look.color = true;
      // a personal link: ?to=the%20sharma%20family puts their name on the cover
      setGuest(new URLSearchParams(window.location.search).get("to") ?? "");
      if (alive) setTex(buildTextures(`${FONT}, cursive`));
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Step round the circle: +1 = next room. The target keeps counting so the carousel always
  // turns the short way, and wraps from the last room back to the first.
  const step = useCallback((dir: number) => {
    book.target = Math.round(book.target) - dir;
    setRoom(logicalOf(book.target));
  }, []);

  const setBookOpen = useCallback((v: boolean) => {
    book.openTarget = v ? 1 : 0;
    setOpen(v);
  }, []);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (writing) return; // the journal sheet handles its own keys
      if (ev.key === "ArrowRight") {
        if (!open) setBookOpen(true);
        else step(1);
      } else if (ev.key === "ArrowLeft") {
        if (open) step(-1);
      } else if (ev.key === "Enter" || ev.key === " ") {
        setBookOpen(!open);
      } else if (ev.key === "Escape") setBookOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, step, setBookOpen, writing]);

  // Drag sideways to page through: content follows your finger.
  const onDown = (ev: React.PointerEvent) => {
    drag.current = { x: ev.clientX, startX: ev.clientX, active: true };
    (ev.target as HTMLElement).setPointerCapture?.(ev.pointerId);
    if (open) book.dragging = true;
  };
  const onMove = (ev: React.PointerEvent) => {
    if (!drag.current.active || !open) return;
    const dx = ev.clientX - drag.current.x;
    drag.current.x = ev.clientX;
    book.f += dx / 170;
  };
  const onUp = (ev: React.PointerEvent) => {
    if (!drag.current.active) return;
    drag.current.active = false;
    const moved = Math.abs(ev.clientX - drag.current.startX);
    if (!open) {
      if (moved < 6) setBookOpen(true);
      return;
    }
    book.dragging = false;
    book.target = Math.round(book.f);
    setRoom(logicalOf(book.target));
  };

  const current = ROOMS[room];
  const pageTheme = PAGE_THEMES[open ? current.name : "wedding"] ?? PAGE_THEMES.wedding;

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--paper", pageTheme.paper);
    root.setProperty("--paper-glow", pageTheme.glow);
    root.setProperty("--paper-edge", pageTheme.edge);
    root.setProperty("--event-accent", pageTheme.accent);
    root.setProperty("--ornament-filter", pageTheme.ornamentFilter);
    return () => {
      root.removeProperty("--paper");
      root.removeProperty("--paper-glow");
      root.removeProperty("--paper-edge");
      root.removeProperty("--event-accent");
      root.removeProperty("--ornament-filter");
    };
  }, [pageTheme]);

  return (
    <main className="stage">
      <header className="topbar">
        <div className="wordmark">
          {WEDDING.initials}
          <HandUnderline />
        </div>
        <button className={`hand-btn rsvp-btn ${writing ? "is-hidden" : ""}`} onClick={() => setRsvp("")}>
          rsvp
        </button>
      </header>

      <div className="canvas-wrap" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={() => setBookOpen(!open)}>
        {tex && (
          <Canvas orthographic flat linear dpr={[1, 2]} camera={{ position: [0, 2, 10], zoom: 200, near: 0.1, far: 100 }} gl={{ alpha: true, antialias: true }}>
            <Book
              tex={tex}
              onSpot={(li) => {
                // move in on the invite card, then hold it up close
                book.zoomTarget = 1;
                setTimeout(() => setCard(ROOMS[li].name), 380);
              }}
            />
            <ContactShadows position={[0, -0.04, 0]} scale={5} resolution={512} far={1.4} blur={2.4} opacity={0.32} color="#2a2350" frames={Infinity} />
          </Canvas>
        )}
        {!tex && <div className="loading">sharpening pencils…</div>}
      </div>

      <button
        className={`arrow arrow-left ${open ? "" : "is-off"} ${writing ? "is-hidden" : ""}`}
        aria-label="Previous room"
        onClick={() => step(-1)}
        disabled={!open}
      >
        <HandArrow flip />
      </button>
      <button
        className={`arrow arrow-right ${writing ? "is-hidden" : ""}`}
        aria-label={open ? "Next room" : "Open the book"}
        onClick={() => (open ? step(1) : setBookOpen(true))}
      >
        <HandArrow />
      </button>

      <footer className="caption">
        {open ? (
          <>
            <div className="room-name">{eventByKey(current.name)?.name ?? current.name}</div>
            <div className="room-mood">{eventByKey(current.name) ? `${fmtDay(eventByKey(current.name)!.start)} · tap the card` : ""}</div>
          </>
        ) : (
          <div className="room-mood">you&apos;re invited · tap the cover to open</div>
        )}
      </footer>
      {card && eventByKey(card) && (
        <EventCard
          ev={eventByKey(card)!}
          onClose={() => {
            setCard(null);
            book.zoomTarget = 0;
          }}
          onRsvp={() => {
            setRsvp(card);
            setCard(null);
            book.zoomTarget = 0;
          }}
        />
      )}
      {rsvp !== null && <Rsvp preselect={rsvp || undefined} onClose={() => setRsvp(null)} />}
    </main>
  );
}
