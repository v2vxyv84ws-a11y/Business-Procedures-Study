---
name: business-procedures-study-lab
description: >
  Maintain and extend the FBLA "Introduction to Business Procedures" Study Lab — a
  self-contained flashcard + scored-test web app deployed on Cloudflare Pages at
  fbla.donle21.workers.dev (repo: Business-Procedures-Study). Use this skill whenever the
  user wants to add/edit flashcards or test questions, pull the latest from their Google Doc
  and sync the site, regenerate the printable study sheet (HTML/PDF), fix a bug in the
  flashcard/test/history engine, or deploy and verify changes. Also trigger on mentions of
  the "Study Lab", "Additional Learning" page, the FBLA business procedures study site,
  data-notes.js / data-extra.js / app.js in that project, or the live fbla.donle21.workers.dev URL.
  It encodes the project's architecture, data formats, version/deploy conventions, and the
  macOS-sandbox preview workaround so you don't rediscover them each session.
---

# Business Procedures Study Lab — maintenance & extension

A single-page-per-view, dependency-free study web app for the FBLA *Introduction to
Business Procedures* event. It has **flashcards**, a **scored test** (with topic filter,
timer, and "retake missed"), and **test history** (last 3 results, saved in the browser).
Everything is plain HTML/CSS/vanilla JS — no build step, no frameworks — so it runs offline
by double-clicking a file and deploys as static assets.

## Where things live

- **Project root:** `/Users/donle/Desktop/My stuffs/Business-Procedures-Study/`
- **Live site:** https://fbla.donle21.workers.dev/ (Cloudflare Pages, auto-deploys from `main`)
- **GitHub repo:** https://github.com/v2vxyv84ws-a11y/Business-Procedures-Study
- **Source of truth for content:** the user's Google Doc (they share a link when it changes)

## File map

| File | Role |
|------|------|
| `index.html` | **Main page** — "Your Notes" set (content derived from the user's doc). Thin: loads `styles.css`, `data-notes.js`, then `app.js`. |
| `additional.html` | **Additional Learning page** — supplementary, researched content (NOT from the doc). Loads `data-extra.js` + `app.js`. Banner-flagged as supplementary; cross-links to/from the main page. |
| `app.js` | **Shared engine** — flashcards, test, history. Used by BOTH pages. A fix here hits both pages. |
| `styles.css` | **Shared styles** — used by both pages. |
| `data-notes.js` | Notes content → defines `STUDY_CARDS` + `STUDY_QUESTIONS`. |
| `data-extra.js` | Additional Learning content → defines `STUDY_CARDS` + `STUDY_QUESTIONS`. |
| `build-study-sheet.js` | Node script: regenerates the printable study sheet from `data-extra.js`. |
| `Additional-Learning-Study-Sheet.html` / `.pdf` | Generated printable doc of the Additional Learning content. |

Each page sets `STUDY_HISTORY_KEY` inline before loading `app.js` so the two pages keep
**separate** test histories (`fbla_hist_notes_v1` vs `fbla_hist_extra_v1`).

## Data formats (the only thing you usually edit)

`app.js` reads two globals per page; the data files define them.

```js
// Flashcards: [category, term, definition]
var STUDY_CARDS = [
  ["Finance","Net Income","Revenue minus ALL expenses — the 'bottom line.'"],
  // ...
];

// Test questions: a = index of the correct option in opts
var STUDY_QUESTIONS = [
  {cat:"Finance", q:"Net Income is calculated as:",
   opts:["Revenue − COGS","Revenue − All Expenses","Assets − Liabilities","CA − CL"],
   a:1, why:"Net Income = Revenue − ALL Expenses. Revenue − COGS is Gross Profit."},
  // ...
];
```

Rules that keep the app working:
- **Category drives the filters.** A new `cat` string automatically appears in the flashcard
  category dropdown and the test topic dropdown — no other wiring needed.
- **`why` is shown in results** for missed (and correct) questions, so write it as a real
  explanation, not just a restatement.
- **Edit the right file:** doc-derived content → `data-notes.js`; supplementary content →
  `data-extra.js`. Don't mix them.
- After editing, sanity-check with `node --check data-notes.js` (or `data-extra.js`).

## Common tasks

### Add or edit flashcards / questions
1. Decide the page: notes (`data-notes.js`) vs additional (`data-extra.js`).
2. Append entries in the formats above, inside the relevant array's closing `];`.
3. `node --check <file>` to catch syntax errors.
4. Bump the version stamp (below), verify locally, deploy.

### Pull the latest from the user's Google Doc and sync
The doc is the source of truth for the **notes** set. When the user shares a link:
1. Get the doc ID from the URL (`/document/d/<ID>/`).
2. Export the text (works when "anyone with the link can view"):
   `curl -sL "https://docs.google.com/document/d/<ID>/export?format=txt" -o gdoc.txt`
3. **Diff against what's already captured** to find only the new material — don't re-read
   2000 lines. Normalize (strip leading bullets/numbers/whitespace) and list lines present
   in the new export but not the old one. Look for the user's "Newly learned" section.
4. Turn genuinely new, testable concepts into `STUDY_CARDS` (and a few `STUDY_QUESTIONS`)
   in `data-notes.js`. Skip near-duplicates of cards that already exist (grep first).
5. The user may transcribe things from the Additional Learning set into their doc — that's
   fine; it just means a concept now legitimately belongs to the notes set too.

### Regenerate the printable study sheet (Additional Learning)
It's generated from `data-extra.js`, so it always matches that page. After editing
`data-extra.js`:
```bash
cd "/Users/donle/Desktop/My stuffs/Business-Procedures-Study"
node build-study-sheet.js "Month DD, YYYY"
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu \
  --no-pdf-header-footer \
  --print-to-pdf="Additional-Learning-Study-Sheet.pdf" \
  "file://$PWD/Additional-Learning-Study-Sheet.html"
```
(The study sheet only covers the Additional Learning set; the notes set has no printable doc.)

### Version stamp convention
Every page's footer carries a build stamp:
```html
<div class="version">v1.8 · build 2026-06-26 15:49 PDT</div>
```
- Bump the minor version and update the timestamp on every shipped change. Get the time with
  `date "+%Y-%m-%d %H:%M %Z"`.
- **If you changed the shared engine (`app.js`) or `styles.css`, bump BOTH pages** — the
  change affects both. If you only changed one page's data, bump just that page.
- The stamp is how you confirm a deploy went live (you grep the live HTML for it).

## Local verification (important macOS gotcha)

The project lives under `~/Desktop`, and **macOS sandboxes Desktop/Downloads from the
preview/dev-server process** (you'll get 404s or `PermissionError: Operation not permitted`
if you serve straight from the project folder). Workaround that works every time:

1. Copy the files you changed into the **session scratchpad** dir (the one named in your
   system prompt — it's sandbox-readable).
2. Point a static server there via `preview_start` with a `.claude/launch.json` like:
   ```json
   { "version":"0.0.1","configurations":[{
     "name":"study-site","runtimeExecutable":"python3",
     "runtimeArgs":["-m","http.server","8773","--directory","<ABSOLUTE_SCRATCHPAD_PATH>"],
     "port":8773 }]}
   ```
3. Drive it with the `preview_*` tools (snapshot/eval/screenshot). Check
   `preview_console_logs` (level: error) — the engine should log nothing.
4. **Browsers cache `app.js` hard.** When you reload after editing JS, the page often keeps
   the OLD `app.js`. To force a fresh copy during verification, append a query string to the
   script URL in the *served* copy (`src="app.js?v=fix"`) and reload, or verify the new code
   is live with `typeof <newFunction>==='function'` before trusting results.

A good smoke test after any change: load the page, confirm `STUDY_CARDS.length` /
`STUDY_QUESTIONS.length`, run a quick test in one topic, finish it, confirm it scores and
saves to History — all with zero console errors.

## Deploy & confirm live

Cloudflare Pages is connected to the GitHub repo and **auto-deploys on push to `main`**
(~30–90s). There is no manual deploy step.

```bash
cd "/Users/donle/Desktop/My stuffs/Business-Procedures-Study"
git add -A
git commit -m "vX.Y: <what changed>

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push origin main
```
Then poll the live site until the new version stamp appears:
```bash
for i in $(seq 1 14); do
  curl -s "https://fbla.donle21.workers.dev/" | grep -q "vX.Y · build" && { echo "live"; break; }
  sleep 15
done
```
Notes on the host (Cloudflare Pages static hosting):
- It serves real files at their paths and **404s missing ones** (no SPA fallback), so new
  files like `additional.html` and `data-*.js` deploy and serve fine.
- `*.html` paths **307-redirect to the pretty URL** (`/additional.html` → `/additional`).
  This is normal; links with the `.html` extension still work (and keep offline file:// use
  working), so prefer keeping `.html` in hrefs.

## Conventions & guardrails

- **Keep it dependency-free and offline-capable.** No frameworks, no CDNs, no build step.
  Relative paths only, so double-clicking `index.html` works without internet.
- **noindex stays.** Both pages carry `<meta name="robots" content="noindex,...">` — the
  user wants this kept out of search results. Don't remove it.
- **The shared engine is shared.** When fixing a bug, fix it in `app.js` once; both pages
  benefit. Don't fork logic into a page.
- **History is per-page and per-device** (localStorage). Don't expect it to sync across
  devices or pages.
- **Additional Learning ≠ the doc.** Keep it clearly labeled as supplementary. If you add to
  it, it's your researched material, not the user's notes — verify facts against real sources
  (the user has noted some study sites get things wrong).
- **Always verify in the browser and confirm the live version stamp** before telling the user
  it's done — they rely on that stamp to know the latest is deployed.
