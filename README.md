# Writing Studio

A self-hosted, single-user writing workbench for fiction and non-fiction. Runs on a Raspberry Pi on your local network and is designed for iOS Safari (add it to the Home Screen for a full-screen app). No accounts, no cloud: your work is stored in one SQLite file, with JSON export/import.

## What's inside

| Section | What you get |
|---|---|
| **Plot library** | 11 structures (Three-Act, Hero's Journey, Save the Cat, Seven-Point, Kishotenketsu, Booker's Seven Basic Plots, Mystery, Romance, Thriller, Fichtean Curve, Freytag) with beat-by-beat guidance, pitfalls, and a fill-in template saved per project. One tap turns a template into storyboard scene cards. Export a filled template as Markdown. |
| **Characters** | 12 archetypes, 6 arc types (positive, flat, 3 negative, redemption) with step lists, a character sheet builder, interview prompts, and an auto-laid-out SVG relationship map. |
| **Storyboard** | Scene cards in act/part columns. Drag the ⠿ handle (touch and mouse) to reorder or move across acts. Each card: title, chapter, POV, setting, goal/conflict/outcome, status, target words, threads, notes. |
| **Plot tracker** | Subplot threads, a thread × scene timeline grid, setups/payoffs checklist, word goal + deadline + words/day needed, per-act progress, 14-day words-per-day chart. |
| **Author styles** | 22 original style guides (voice, sentence rhythm, structure, POV, pacing, worldbuilding, dialogue, themes, techniques to borrow, imitation pitfalls) plus 3 practice exercises each, with a place to write and tick off your attempts and keep your own notes. |
| **Non-fiction** | Book proposal outline, argument map (claim, reasons, evidence, objections, rebuttals), chapter templates, source tracker, narrative non-fiction techniques, research habits. |
| **Craft toolkit** | Guides (show vs tell, dialogue, scene vs summary, POV, pacing, openings/endings, description, revision), interactive revision checklists, prompt generator and prompt list. |
| **Write** | Distraction-free editor with focus mode, autosave, live word counts. Every draft belongs to a storyboard scene, so word counts feed the tracker. |
| **Backup** | Export/import everything as JSON (merge or replace). |

## Run locally

Requires **Node 22.13+** (uses the built-in `node:sqlite`; there are no npm dependencies and nothing to compile, so it works unchanged on a Pi).

```sh
npm start            # http://localhost:3080
npm test             # API smoke test (CRUD, export/import round-trip)
```

Environment: `PORT` (default 3080), `HOST` (default 0.0.0.0), `NS_DATA_DIR` (default `./data`).

## Deploy to the Pi (build on the Mac, install on the Pi)

```sh
PI_HOST=raspberrypi.local PI_USER=pi ./scripts/deploy.sh
```

It runs the smoke test, packages `server/`, `public/` and `package.json` into a tarball, copies it over SSH, unpacks it as a timestamped release, flips a `current` symlink, installs and restarts a `writing-studio` systemd service, health-checks it, and prunes old releases (keeps 5). Your data lives in `~/writing-studio/data` and is never touched by deploys. Optional vars: `PI_PORT` (3080), `APP_DIR`, `KEEP_RELEASES`. The Pi needs Node 22.13+ (the script checks and prints install instructions) and passwordless `sudo` for the service install.

Then open `http://raspberrypi.local:3080` in iOS Safari and use **Share → Add to Home Screen**.

Back up with `scp pi@raspberrypi.local:writing-studio/data/writing-studio.db .` or the in-app JSON export.

## Choices I made (you asked me not to ask)

- **Stack:** zero-dependency Node server + vanilla ES-module front end. No build tooling or native modules, so "build on the Mac" is just test + package, and there is no ARM cross-compile risk. SQLite via Node's built-in driver (needs Node ≥ 22.13; it prints no warnings because the service silences the experimental notice).
- **Storage:** one `records` table (`id, type, project, data JSON, updated_at`) so export/import is trivial and the schema never needs migrations. Projects are scoped records; author practice work and notes are global (not tied to a project).
- **Multiple projects:** supported (a novel and a non-fiction book can coexist), although you asked for single-user, with no accounts.
- **No HTTPS / auth:** it's LAN-only by design. Don't expose the port to the internet. Because iOS treats HTTP as an insecure context, I avoid APIs like `crypto.randomUUID`.
- **Drag and drop:** custom pointer-event dragging on a handle, because the HTML5 drag API doesn't work on iOS touch. The handle uses `touch-action: none`, so the rest of the card scrolls normally.
- **Author guides:** all analysis is original prose about technique. No passages from any book are reproduced. I have **no access to your Home Books app or its Complete Works section**, so the guides are my own characterisation from general knowledge, not drawn from your library. Each author page has a Notes box so you can add your own observations. Will Durant is treated as a narrative-history/non-fiction stylist. Check any factual claim against the books before relying on it.
- **Plot "act" placement:** beats are assigned to acts by their approximate percentage through the story, so you can edit them freely afterwards. Acts/parts are renamable per project (Settings on Home).
- **Home-screen icon:** a generated PNG and SVG; replace `public/icon-180.png` if you want something nicer.
- **Offline:** no service worker (the Pi is on your LAN); saving shows "Saving…/Saved" in the header and flushes on page hide.

## Data model

`GET /api/records?type=&project=` · `PUT /api/records/:id` · `DELETE /api/records/:id` · `GET /api/export` · `POST /api/import?mode=merge|replace`.
Record types: `project, scene, thread, setup, char, rel, plotnote, proposal, arg, source, check, wordlog, practice, authnote`.
