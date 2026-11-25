"use client";

import { useEffect, useState } from "react";
import { WEDDING, fmtDay, getGuest } from "@/lib/wedding";

/**
 * The RSVP card. Creates a prefilled WhatsApp message for guests to send.
 */
export default function Rsvp({ onClose, preselect }: { onClose: () => void; preselect?: string }) {
  const [name, setName] = useState(getGuest());
  const [events, setEvents] = useState<string[]>(preselect ? [preselect] : []);
  const [guests, setGuests] = useState(1);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [whatsappUrl, setWhatsappUrl] = useState("");
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

  const toggle = (k: string) => setEvents((list) => (list.includes(k) ? list.filter((x) => x !== k) : [...list, k]));

  const send = () => {
    if (!name.trim()) return setError("tell us who you are");
    if (events.length === 0) return setError("tick at least one event, or say a sad no below");
    const reply = { name: name.trim(), events, guests, note: note.trim() };
    const attending = WEDDING.events
      .filter((event) => reply.events.includes(event.key))
      .map((event) => `${event.name} (${fmtDay(event.start)})`)
      .join(", ");
    const message = [
      `Wedding RSVP — ${WEDDING.couple.join(" & ")}`,
      `Name: ${reply.name}`,
      `Attending: ${attending}`,
      `Number attending: ${reply.guests}`,
      reply.note && `Note: ${reply.note}`,
    ]
      .filter(Boolean)
      .join("\n");
    const url = `https://wa.me/${WEDDING.rsvpWhatsApp}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
    setWhatsappUrl(url);
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
          {whatsappUrl ? (
            <div className="rsvp-thanks">
              <div className="rsvp-seal" aria-hidden="true">
                {WEDDING.initials}
              </div>
              <h2 className="ev-name">one last step</h2>
              <p className="ev-tagline">your RSVP is ready in WhatsApp. review it and tap send to confirm.</p>
              <a className="ev-stamp ev-rsvp" href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                open WhatsApp
              </a>
              <button className="ev-stamp" onClick={() => setWhatsappUrl("")}>
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
                <textarea rows={2} value={note} placeholder="can't wait to dance at the sangeet!" onChange={(e) => setNote(e.target.value)} />
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
