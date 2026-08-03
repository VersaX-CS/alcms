# ALCMS — Library Management System

## Project layout (seed data is now separate from the app)

```
index.html        the app itself — no book/member data baked in
js/seed-data.js    the starting catalogue/users/etc. this ships with
api/hook.js
manifest.json, icon-192.png, icon-512.png
```

`index.html` loads `js/seed-data.js` via a normal `<script src="js/seed-data.js">`
tag. **`js/seed-data.js` in this repo ships genuinely blank** (empty catalogue,
users, circulation, schedule — only the fixed enum lists the app's UI needs to
function, like book condition/status labels and the DDC main-class headings).
That's intentional: this is the public app, not your personal library.

- **Deploying to GitHub + Vercel**: push this whole folder as-is. Vercel serves
  static files, so `index.html` will load `js/seed-data.js` at runtime with no
  build step needed.
- **First load in a fresh browser**: since `js/seed-data.js` is empty, whoever
  opens the deployed app starts from a blank library. Everything they add —
  books, members, circulation, schedule — is saved into **that browser's own
  localStorage**, under keys prefixed `alcms:`. It never gets written back
  into `js/seed-data.js` or the repo. Every person who opens the same link
  builds their own independent, "indigenous" dataset, local to their browser
  only.
- **Exporting their data**: from the app's Settings/Backup area, admins can
  download:
  - a **Data backup** (catalogue, members, circulation, schedule, institution
    branding) as a `.json` file, or
  - an **Account backup** (accounts, profile pictures, theme prefs) as a
    separate `.json` file.

  Either file can be re-imported later (same screen) or handed to someone
  else to load into their own browser.
- **Updating the shipped seed data**: if you ever *want* the public repo to
  start people off with some non-empty default content (e.g. generic starter
  divisions, not your real catalogue), edit the empty arrays in
  `js/seed-data.js` directly, or use "Download updated app data" in Settings
  from a browser whose local data you're happy to make public, then swap that
  file in before deploying.

## `js/seed-data.js` vs. `alcms-data.json` — these are not the same thing

It's easy to mix these two up since they're both "a JSON-ish blob of the
library's data" — but they serve opposite purposes:

| | `js/seed-data.js` | `alcms-data.json` |
|---|---|---|
| What it is | The starting catalogue/users/circulation/schedule a **fresh browser** seeds from | A personal snapshot the optional **GitHub sync** feature pushes/pulls (Settings → GitHub sync) |
| Contains accounts/passwords? | No | **Yes** — usernames, passwords, security answers, prefs |
| Loaded automatically? | Yes, every time `index.html` opens with no local data yet | No — only if someone deliberately configures GitHub sync and clicks Save/Load |
| Safe to commit to a public repo? | Yes | **No** |
| How to update it | Admin clicks "Download updated app data" in Settings (split-mode: regenerates this file) | Whoever owns the GitHub sync connection pushes to their own private repo/path |

If you want the repo to always carry the "latest known-good library data" as
plain seed content, update `js/seed-data.js` via the "Download updated app
data" button and commit that file. Don't use `alcms-data.json` for this —
it's a credentials-bearing personal backup, not a distributable seed.

## Getting your own library data back

Your real catalogue (1,971 books) and everything that's happened since —
circulation, register log, accounts, prefs — lives only in your private
backup file, kept outside this repo. To load it into a browser for your own
use:

1. Open the deployed app in your own browser.
2. Settings → Backup & Restore → restore from your saved backup JSON, or
   configure GitHub sync (Settings → GitHub sync) pointed at your own
   **private** repo/path and load from there.

Nobody else who opens the public link can see or reach this data — it isn't
in `js/seed-data.js`, and it isn't in this repo at all.

## ⚠️ Do not commit `alcms-data.json`

The original repo had an `alcms-data.json` file sitting next to `index.html`.
That file is a **full data + account export**, including usernames,
passwords, and security answers — not seed content. It isn't loaded by the
app automatically (it only matters if you deliberately point the optional
GitHub-sync feature at it), so it has been left out of this build. Keep it
out of version control — it's listed in `.gitignore`.
