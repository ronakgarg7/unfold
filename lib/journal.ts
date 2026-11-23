// Journal entries. For now they live in this browser (localStorage); the API is async so it can
// move to a server later without touching the UI.

export type Entry = {
  id: string;
  room: string; // room name, e.g. "bathroom"
  spot: string; // where in the room, e.g. "journal"
  text: string;
  createdAt: number; // ms since epoch
};

const KEY = "unfold.entries.v1";

function readAll(): Entry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Entry[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entries: Entry[]) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

export async function listEntries(room: string, spot: string): Promise<Entry[]> {
  return readAll()
    .filter((e) => e.room === room && e.spot === spot)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function countEntries(): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const e of readAll()) out[`${e.room}/${e.spot}`] = (out[`${e.room}/${e.spot}`] ?? 0) + 1;
  return out;
}

export async function addEntry(room: string, spot: string, text: string): Promise<Entry> {
  const entry: Entry = {
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
    room,
    spot,
    text,
    createdAt: Date.now(),
  };
  writeAll([...readAll(), entry]);
  return entry;
}

export async function updateEntry(id: string, text: string): Promise<void> {
  writeAll(readAll().map((e) => (e.id === id ? { ...e, text } : e)));
}

export async function deleteEntry(id: string): Promise<void> {
  writeAll(readAll().filter((e) => e.id !== id));
}

/** Everything, for a backup download. */
export function exportAll(): string {
  return JSON.stringify(readAll(), null, 2);
}
