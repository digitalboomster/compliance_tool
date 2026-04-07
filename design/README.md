# Design handoff (Stitch → Cursor)

Put everything Stitch gives you here so Cursor can see it in context.

## What to add after Stitch

1. **Screenshots or exports** — PNG/WebP of each screen (mobile + desktop if both matter).
2. **DESIGN.md** — If Stitch exports a design spec or tokens, save it as `DESIGN.md` in this folder.
3. **Optional starter HTML/CSS** — If Stitch exports code, drop it in `exports/` (create that folder) as reference; Cursor can translate into your real stack.

## Suggested first mockups (MVP story)

Pick **one** flow to design end-to-end:

- **Compliance queue** — List of cases (pending review), open one case, approve/reject, notes.
- **Or: KYC status** — User-facing “verification in progress / needs document / approved.”

## Using this in Cursor

- `@design/` — Attach the whole folder when asking to build a screen.
- Paste **exact copy** from Stitch (headings, button labels, error messages) so the app matches the mockup.

## Order of work

1. Stitch → lock **layout + copy + states** (empty list, error, loading).
2. This repo → scaffold app (e.g. React + Vite) when you’re ready to implement.
3. Cursor → “Implement the screen to match `@design/SCREEN_NAME.png` and `DESIGN.md`.”
