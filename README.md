# Writing Studio

A self-hosted desk for writing a book: plan it, write it, keep it consistent, read it back, and export it. Single user, runs on a Raspberry Pi, used from a phone or a computer. No dependencies beyond Node.

## What is in it

- **Desk**: the open book's cover, progress, today's words against a daily target, a writing-days calendar and your shelf of books.
- **Storyboard**: scene cards by act. Drag a card by its handle to reorder or move it. Each card holds point of view, setting, goal, conflict, outcome, tension, status and threads.
- **Write**: a quiet editor. A side panel (a bottom sheet on the phone) shows the scene plan, the story bible, craft and author guides, saved versions, a prose check and feedback from Claude. Focus mode hides everything and keeps the line you are typing mid-screen. Timed sprints log how much you wrote.
- **Manuscript**: every written scene in reading order as one book, with names linked to the story bible. Export to Word (standard manuscript format), EPUB, Markdown or plain text.
- **Story bible**: character sheets, places, objects, groups and rules, a relationship map, and a list of the scenes each one appears in.
- **Tracker**: tension curve, viewpoint strip, who-is-on-stage grid, plot threads by scene, setups and payoffs, and word-count progress.
- **Plot library, craft toolkit, non-fiction track**: reference material with fill-in templates.
- **Author styles**: 197 writers from the Complete Works shelf. Each has a written guide (voice, how the plots are built, how the themes are worked in, techniques to borrow, an exercise) plus numbers measured from the EPUBs (sentence length, dialogue share, adverbs and so on), a sortable comparison table, and a note of which writers the open draft is closest to.

## Run it

```
npm start          # http://localhost:3080
npm test           # API smoke test
```

Needs Node 22.13 or newer (it uses the built-in `node:sqlite`).

## Deploy to the Pi

From the Mac, in this folder:

```
git pull
./scripts/deploy.sh
```

Defaults are `anujjha1989@anujrpi.local`, port 3080. Override with `PI_HOST`, `PI_USER`, `PI_PORT`, `APP_DIR` or `NODE_BIN`. The script tests, packages, copies over SSH (one password prompt), installs a systemd service and checks it came up. Data lives in `~/writing-studio/data` on the Pi and deploys never touch it.

## Addresses

- Home network: `http://anujrpi.local:3080`
- Any device signed in to Tailscale: `https://anujrpi.tail549492.ts.net/writing/` (through Caddy on the Pi, the same way as the other apps; the route is in `/etc/caddy/Caddyfile`)

The app uses relative paths, so it works at the root or under a sub-path.

## iPhone and iPad app

A native shell lives in `ios/`. See `ios/README.md`; `./ios/scripts/install.sh` builds and installs it on a connected device.

## Settings worth knowing

- **Feedback from Claude**: paste your own Anthropic API key in Settings. It is stored in `data/secrets.json` on the Pi (mode 600) and is never sent back to the browser. Nothing is sent to Anthropic unless you press "Get notes" on a scene.
- **Passphrase**: optional. Set one in Settings before exposing the app beyond the home network (for example through Tailscale Funnel). Each device unlocks once for 90 days.
- **Backups**: the server writes a compressed copy every night after 3 am and keeps the last 30. They go to `/mnt/seagate/WritingStudio/backups` when that drive is mounted, otherwise `data/backups`. Set `WS_BACKUP_DIR` to change it.
- **Two devices**: each save carries the version it was based on. If a scene's text changed elsewhere in the meantime, the app asks which to keep and stores the other under Versions. Open tabs pick up changes from other devices within a minute.
- **Offline**: if the Pi is unreachable while you write, edits are kept on the device and sent when it returns. Opening the app with no connection at all needs a secure (https) address, because browsers only allow service workers there.

## Choices made

- Zero npm dependencies. DOCX and EPUB are written with a small built-in zip writer.
- Typefaces (Literata, Instrument Sans) are shipped in `public/fonts`, so the app does not need the internet.
- Italics in drafts are written `*like this*` and become real italics in the manuscript and exports.
- Chapters in the manuscript follow the Chapter field on scene cards. With no chapter numbers set, each scene is its own chapter.
- Author guides are original descriptions of technique. No text from any book is stored; the measurements are numbers only. Emily Dickinson and Thomas Hardy could not be measured from the library copies. Translated writers' numbers reflect their translators.
- The prose check runs in the browser. It uses simple rules, so treat its marks as prompts to look, not as errors.

## Not tested

- Real iOS Safari. Everything was tested in Chromium at phone and desktop sizes, including drag and drop with pointer events.
- Feedback from Claude with a real key. The request path is tested up to the point of calling Anthropic.

## Recovery and book setup

Book creation starts with kind, working title and an optional premise, followed by optional targets and a plot structure. The premise remains editable in Book settings. Author guides can be marked as favourites and filtered; these choices are stored on the Pi with your author notes.

Each edit immediately updates the device's recovery outbox before the network save. The status distinguishes local recovery from “Saved on Pi”; a storage failure warns you to keep the tab open. Local browser storage still has capacity limits and is not a substitute for server backups.

When a saved scene's text changes, the server keeps its previous non-empty draft on the first change and then no more than once every five minutes. It retains the latest 30 automatic versions per scene, alongside manual versions. Open the editor's Versions panel to compare or restore them.

Deleting a scene moves its draft and versions to Settings → Deleted scenes for the open book. Restore brings them back together. Deleting the entire book also deletes its recovery items. Backups use unique filenames even on the same day, and a replace import stops if its prerequisite backup fails. Backup retention remains the configured number of files (30 by default), not a guaranteed number of days.
