# unfold

> **Branch `wedding-invite`:** the book as a wedding invitation. Each page is one event (haldi,
> the party, the wedding, reception) with an invite card pinned in the scene; tap it
> for the date, venue, dress code, a map link and an add-to-calendar file, and RSVP from the top
> right. Names, dates and places live in `lib/wedding.ts` (mock data for now), the rooms in
> `lib/invite.ts`. Personal links: `?to=the%20sharma%20family` writes the guest's name on the cover.
> RSVPs are only kept in the browser for now.

A journal house: a hand-drawn pop-up book whose rooms fold open one at a time.

- **Full-circle book** — pages radiate from the spine all the way round, like a carousel pop-up
  book. The room in front opens to a right angle with its creased floor flat and its pop-up
  furniture standing; turning keeps going round, from the last room back to the first.
- **Hybrid style** — everything is blue-ink line art on paper; the room in front washes with colour.
- **Four rooms** — bedroom, bathroom, kitchen, balcony. See [ROOMS.md](./ROOMS.md).

## Journal

Each room has one place you write: the cork board (bedroom), the mirror (bathroom), the fridge
door (kitchen) and the diary on the bean bag (balcony). Click it when the room is in front and the
camera moves in on it, then opens a close-up (`components/Closeup.tsx`):

- the cork board, mirror and fridge show your notes stuck on them (pins, tape, magnets); click +
  or a note to lift it off and write; Cmd/Ctrl+Enter or "pin it" sticks it back on
- the diary opens as a two-page spread: past pages listed on the left, today's page on the right
- "tear out" crumples a note away; Esc puts a note back, then closes the close-up

Entries are saved in this browser only (localStorage, `unfold.entries.v1`), through the async
functions in `lib/journal.ts`, so moving them to a server later only means changing that file.
Spots are marked inside the drawings with `s.mark("journal", ...)` / `iso.mark(...)`; their
names and prompts live in `lib/spots.ts`.

## Run

```bash
npm install
npm run dev
```

Open http://localhost:3000. Arrow keys or the side arrows page through rooms, drag sideways to
flip, Enter / double-click opens and closes the book.

## How it's built

| File | What it does |
|------|--------------|
| `lib/fold.ts` | Fold geometry: page angles for a focus position, the floor's crease apex, camera focus. |
| `lib/sketch.ts` | Tiny hand-drawn 2D renderer (wobbly ink lines, watercolour fills, hatching) and `bake()`, which packs ink + wash + cut-out mask into one texture. |
| `lib/rooms.ts` | The drawings for every wall, floor and pop-up, plus the covers. |
| `lib/paperMaterial.ts` | Shader: paper grain, watercolour reveal, soft light, pen hatching on shadowed faces. |
| `components/Book.tsx` | The R3F scene: pages, folding floors, pop-ups, camera. |
| `components/Experience.tsx` | Canvas, controls, drag + keyboard input, captions. |

Stack: Next.js (App Router), React Three Fiber, drei, three.js. Handwriting is Caveat via `@fontsource/caveat`.

### The floor fold

Each floor is a square creased on its diagonal. With walls at angle θ apart, the crease apex sits at
distance `L / cos(θ/2)` along the bisector and height `sqrt(2L² − (L / cos(θ/2))²)`: flat at 90°,
standing straight up when the book is shut.

## License

[MIT](LICENSE)
