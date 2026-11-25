// Everything the invite says. Change names, dates and places here; the drawings read from it.

export type WeddingEvent = {
  key: string; // also the room's name in the book
  name: string; // shown on the invite card
  tagline: string;
  start: string; // local date-time, ISO without zone
  end: string;
  venue: string;
  address: string;
  dress: string;
};

export const WEDDING = {
  couple: ["Ronak", "Muskan"] as const,
  initials: "r & m",
  city: "Karauli",
  hosts: "together with their families",
  rsvpBy: "15 jan 2027",
  rsvpWhatsApp: "919636526200",
  events: [
    {
      key: "haldi",
      name: "haldi",
      tagline: "come get a little yellow",
      start: "2027-02-26T11:00",
      end: "2027-02-26T13:00",
      venue: "Ashirwad Farmhouse",
      address: "Karauli",
      dress: "yellow, and clothes you don't mind ruining",
    },
    {
      key: "ring-sangeet",
      name: "ring ceremony, then sangeet",
      tagline: "an evening of promises and dancing",
      start: "2027-02-26T19:00",
      end: "2027-02-26T23:00",
      venue: "Ashirwad Farmhouse",
      address: "Karauli",
      dress: "festive, sparkle encouraged",
    },
    {
      key: "lagan",
      name: "lagan",
      tagline: "a morning of blessings",
      start: "2027-02-27T11:00",
      end: "2027-02-27T13:00",
      venue: "Ashirwad Farmhouse",
      address: "Karauli",
      dress: "traditional",
    },
    {
      key: "wedding",
      name: "the wedding",
      tagline: "seven steps, one forever",
      start: "2027-02-27T19:00",
      end: "2027-02-27T23:00",
      venue: "Ashirwad Farmhouse",
      address: "Karauli",
      dress: "traditional, reds and golds welcome",
    },
  ] satisfies WeddingEvent[],
};

export const eventByKey = (key: string) => WEDDING.events.find((e) => e.key === key);

const d = (iso: string) => new Date(iso);
export const fmtDay = (iso: string) => d(iso).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }).toLowerCase().replace(",", "");
export const fmtDate = (iso: string) => d(iso).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).toLowerCase().replace(",", "");
export const fmtTime = (iso: string) => d(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();

/** A guest's name from the link (?to=the%20sharma%20family), shown on the cover. */
let guest = "";
export const setGuest = (g: string) => {
  guest = g.trim().toLowerCase().slice(0, 40);
};
export const getGuest = () => guest;

/** An .ics calendar file for one event. */
export function icsFor(ev: WeddingEvent) {
  const stamp = (iso: string) => iso.replace(/[-:]/g, "") + "00";
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//unfold//wedding invite//EN",
    "BEGIN:VEVENT",
    `UID:${ev.key}-${WEDDING.couple.join("-")}@unfold`,
    `DTSTART:${stamp(ev.start)}`,
    `DTEND:${stamp(ev.end)}`,
    `SUMMARY:${ev.name} · ${WEDDING.couple.join(" & ")}`,
    `LOCATION:${ev.venue}, ${ev.address}`,
    `DESCRIPTION:dress code: ${ev.dress}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
