"use client";

import { useEffect, useState } from "react";
import { WEDDING, fmtDay, getGuest } from "@/lib/wedding";

const KEY = "unfold.rsvp.v1";

type Reply = { name: string; events: string[]; guests: number; note: string; sentAt: number };

/**
 * The RSVP card. For now replies are only kept in this browser (mock); a real invite would send
 * them to the couple (a small database, a form, or a prefilled WhatsApp message).
 */
export default function Rsvp({ onClose, preselect }: { onClose: () => void; preselect?: string }) {
  const [name, setName] = useState(getGuest());
  const [events, setEvents] = useState<string[]>(preselect ? [preselect] : []);
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState<Reply | null>(null);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      const prev = JSON.parse(localStorage.getItem(KEY) || "null") as Reply | null;
      if (prev) {
        setName(prev.name);
        setEvents(prev.events);
        setGuests(prev.guests);
        setNote(prev.note);
      }
    } catch {
      /* nothing saved yet */
    }
  }, []);

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

  const toggle = (k: string) => setEvents((list) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]));

  const send = () => {
    if (!name.trim()) return setError("tell us who you are");
    if (events.length === 0) return setError("tick at least one event, or say a sad no below");
    const reply: Reply = { name: name.trim(), events, guests, note: note.trim(), sentAt: Date.now() };
    try {
      localStorage.setItem(KEY, JSON.stringify(reply));
    } catch {
      /* ignore */
    }
    setSent(reply);
  };

  return (
    <div className={`cu ${leaving ? "leaving" : ""}`} onPointerDown={(e) => e.target === e.currentTarget && close()}>
      <button className="cu-x" aria-label="Close" onClick={close}>
        <svg viewBox="0 0 40 40" width="32" height="32" aria-hidden="true">
          <path d="M10 10 C 18 17, 24 24, 31 30" />
          <path d="M30 9 C 23 17, 17 23, 9 31" />
        </svg>
      </button>
      <article className="ev-card ev-rsvp-card">
        <div className="ev-inner">
          {sent ? (
            <div className="rsvp-thanks">
              <div className="rsvp-seal" aria-hidden="true">
                {WEDDING.initials}
              </div>
              <h2 className="ev-name">thank you, {sent.name}</h2>
              <p className="ev-tagline">
                we&apos;ll see you at {sent.events.length === WEDDING.events.length ? "everything" : sent.events.map((k) => WEDDING.events.find((e) => e.key === k)?.name).join(", ")}
              </p>
              <button className="ev-stamp" onClick={() => setSent(null)}>
                change my reply
              </button>
            </div>
          ) : (
            <>
              <div className="ev-hosts">kindly reply by {WEDDING.rsvpBy}</div>
              <h2 className="ev-name">rsvp</h2>
              <label className="rsvp-field">
                <span>your name</span>
                <input
                  value={name}
                  placeholder="the sharma family"
                  onChange={(e) => {
                    setName(e.target.value);
                    setError("");
                  }}
                />
              </label>
              <div className="rsvp-label">we&apos;ll be there for</div>
              <div className="rsvp-events">
                {WEDDING.events.map((e) => (
                  <button
                    key={e.key}
                    className={`rsvp-check ${events.includes(e.key) ? "on" : ""}`}
                    onClick={() => {
                      toggle(e.key);
                      setError("");
                    }}
                    aria-pressed={events.includes(e.key)}
                  >
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                      <path className="box" d="M3 4 C 9 3.5, 15 3.2, 21 4 C 20.6 10, 20.8 15, 20.5 20.5 C 14 20.8, 9 20.6, 3.5 20.2 C 3.2 14, 3.4 9, 3 4 Z" />
                      <path className="tick" d="M6 12 C 8 14, 9 16, 10 17.5 C 13 12, 16 8, 22 2" />
                    </svg>
                    <span>{e.name}</span>
                    <em>{fmtDay(e.start)}</em>
                  </button>
                ))}
              </div>
              <div className="rsvp-row">
                <span className="rsvp-label">how many of you</span>
                <button className="rsvp-step" onClick={() => setGuests((g) => Math.max(1, g - 1))} aria-label="Fewer">
                  −
                </button>
                <span className="rsvp-count">{guests}</span>
                <button className="rsvp-step" onClick={() => setGuests((g) => Math.min(12, g + 1))} aria-label="More">
                  +
                </button>
              </div>
              <label className="rsvp-field">
                <span>a note for the couple</span>
                <textarea rows={2} value={note} placeholder="can't wait to dance at the party!" onChange={(e) => setNote(e.target.value)} />
              </label>
              <div className="ev-actions">
                {error && <span className="cu-error">{error}</span>}
                <button className="ev-stamp ev-rsvp" onClick={send}>
                  send my reply
                </button>
              </div>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
