"use client";

import { useEffect, useState } from "react";
import { WEDDING, fmtDate, fmtTime, icsFor, type WeddingEvent } from "@/lib/wedding";

function downloadIcs(ev: WeddingEvent) {
  const blob = new Blob([icsFor(ev)], { type: "text/calendar" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${WEDDING.couple.join("-")}-${ev.key}.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

/** The invite card for one event, held up close: date, time, place, what to wear. */
export default function EventCard({ ev, onClose, onRsvp }: { ev: WeddingEvent; onClose: () => void; onRsvp: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const close = () => {
    setLeaving(true);
    setTimeout(onClose, 240);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const map = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${ev.venue}, ${ev.address}`)}`;

  return (
    <div className={`cu ${leaving ? "leaving" : ""}`} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <button className="cu-x" aria-label="Close" onClick={close}>
        <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">
          <path d="M10 10 C 18 17, 24 24, 31 30" />
          <path d="M30 9 C 23 17, 17 23, 9 31" />
        </svg>
      </button>
      <article className={`ev-card ev-${ev.key}`}>
        <div className="ev-inner">
          <div className="ev-hosts">{WEDDING.couple.join(" & ")} invite you to</div>
          <h2 className="ev-name">{ev.name}</h2>
          <div className="ev-tagline">{ev.tagline}</div>
          <div className="ev-rule" aria-hidden="true" />
          <dl className="ev-facts">
            <dt>when</dt>
            <dd>
              {fmtDate(ev.start)}
              <br />
              {fmtTime(ev.start)} onwards
            </dd>
            <dt>where</dt>
            <dd>
              {ev.venue}
              <br />
              <span className="ev-small">{ev.address}</span>
            </dd>
            <dt>wear</dt>
            <dd>{ev.dress}</dd>
          </dl>
          <div className="ev-actions">
            <a className="ev-stamp" href={map} target="_blank" rel="noreferrer">
              open the map
            </a>
            <button className="ev-stamp" onClick={() => downloadIcs(ev)}>
              add to calendar
            </button>
            <button className="ev-stamp ev-rsvp" onClick={onRsvp}>
              rsvp
            </button>
          </div>
        </div>
      </article>
    </div>
  );
}
