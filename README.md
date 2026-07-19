# यथारूप (Yatharoop)

**पुराना फॉन्ट, वही सही रूप** — View old Excel files (KrutiDev, DevLys, Chanakya-era)
in their correct form, entirely in your browser. No file is ever uploaded to a server.

## What this is

Government offices, schools, and old records across India are full of `.xls`/`.xlsx`
files typed in legacy "trick" fonts — KrutiDev, DevLys, Chanakya — where plain ASCII
bytes were remapped to *look* like Devanagari glyphs when displayed in that specific
font. Open one of these files without the right font installed, and it's unreadable
garbage. Yatharoop reads the file's own font metadata (from `xl/styles.xml` for
`.xlsx`, or directly from the BIFF8 binary records for old `.xls`), figures out which
cells actually need the legacy font, and renders everything correctly — either by
loading your real font file, or by converting to proper Unicode as a best-effort guess.

## Quick start

Just open `index.html` in a browser. That's it — no build step, no server, no install.

- **On a phone / for distribution**: use the bundled single-file build if one exists,
  or open `index.html` directly from the folder (all `js/` files are relative).
- **As a PWA**: `manifest.webmanifest` + `sw.js` are already wired up — "Add to Home
  Screen" from a mobile browser installs it like a native app, works offline after
  first load.

## Features

- Opens `.xlsx` and legacy binary `.xls` files
- Multi-sheet support, with a workbook summary screen before diving into the table
- Reads REAL per-cell font metadata (not guessing) wherever the file provides it —
  see `js/processor.js` (`.xlsx`) and `js/biffFontParser.js` (`.xls`)
- Falls back to a dictionary + statistical (bigram) model only when no font metadata
  exists at all, and only when explicitly opted into (off by default)
- Two view modes: **मूल फॉन्ट** (original font, exact appearance) and **यूनिकोड अनुमान**
  (best-effort Unicode conversion, no font upload needed — clearly marked as a guess)
- Tap any word to correct a misclassification; the app remembers your correction and
  also feeds it back into the statistical model so it generalizes a little to similar
  words next time (`js/data/bigrams.js`)
- Export to a clean Unicode `.xlsx`, export to PDF, or save the page as a
  self-contained HTML file
- Search across the whole sheet
- Bilingual UI (हिंदी / English), toggle in the header
- Remembers your uploaded font and last-opened file across sessions (IndexedDB via
  `js/persistence.js`) — nothing is ever sent anywhere, this is purely local caching
  of files you already have
- Where the browser supports it (Chromium-based: desktop Chrome/Edge, Chrome on
  Android — not Firefox, not any iOS browser), can remember a live link to the file
  on disk via the File System Access API (`js/fileSystemAccess.js`), so "resume" reads
  the file's current content instead of a frozen snapshot. Falls back to the
  IndexedDB snapshot everywhere else automatically.
- Recent files list (up to 5), separate from the single-slot "resume last file" —
  jump back to something from earlier in the week, not just the very last file
  opened. Same on-device-only storage, nothing new to trust.

## Architecture

```
index.html              Layout, styles, script loading order
js/
  converter.js           Shared conversion utilities + converter registry
                          (registerLegacyConverter / getConverterForFont)
  converters/
    krutidev.js           Kruti Dev -> Unicode character-mapping table,
                           self-registers with the registry above. Adding
                           DevLys/Chanakya/etc. later = one new file here.
  processor.js            Excel parsing, .xlsx font metadata (styles.xml), workbook state
  biffFontParser.js       .xls (legacy binary) font metadata — reads FONT/XF records directly
  persistence.js          IndexedDB: last file, last font, session resume
  fileSystemAccess.js     Compiled from ts/fileSystemAccess.ts — see below
  ui.js                   DOM rendering, event wiring, search, view modes, i18n
  data/
    dictionary.js          ~274k English words, used only as an opt-in fallback signal
    bigrams.js              Offline statistical English-vs-KrutiDev-fragment classifier
  vendor/                 Third-party libraries (SheetJS, jsPDF, html2canvas, cfb.js)
ts/
  fileSystemAccess.ts     Source for js/fileSystemAccess.js — see ts/README.md
tests/
  run.js                  Headless regression harness — runs the real engine against
                           real sample files + synthetic edge cases
  *.xlsx / *.xls          Test fixtures (see tests/README.md)
```

All `js/` files are loaded as plain `<script>` tags in a specific order (not ES
modules) — top-level `const`/`let`/`function` in one file are visible to files loaded
after it, since classic scripts on one page share a global scope. No bundler, no
build step for the app itself, by design — this needs to keep working by just
opening a file on a government office computer with no internet access.

The one opt-in exception is `ts/` — new modules going forward may be written in
TypeScript and compiled to plain `js/*.js` output ahead of time (`npm run build`).
The compiled output is committed and loaded exactly like every other script; nobody
running the site needs Node or TypeScript installed. See `ts/README.md` for the
full rationale and rules. Existing hand-written files are not being converted.


## Testing

```
cd tests
node run.js
```

Runs the actual engine code (not a mock) against every file in `tests/`. Drop a new
`.xlsx`/`.xls` in that folder and it's picked up automatically. See `tests/README.md`
for how to pin down expected results for a specific file/cell.

## Known limitations

- **No password-protected file support** (by design — shows a clear error rather than
  attempting to bypass).
- **Statistical/dictionary-based conversion is a best-effort guess**, not ground
  truth, for cells with no font metadata at all. Always available: tap-to-correct,
  and the "मूल फॉन्ट" view mode to see the unmodified original.
- **Font licensing researched — no single authoritative source exists for any of
  these fonts**, so this app deliberately never hosts or redistributes any of them.
  What was actually found, per font:
  - **Kruti Dev, DevLys**: widely redistributed as "free for personal use" by dozens
    of third-party sites, but original authorship isn't consistently documented
    anywhere, and no official government or foundry source was found to point to
    with confidence. Even the redistributor sites themselves are often explicit that
    the license label they show is just a guess, not a verified fact, and that an
    unlabeled font shouldn't be assumed free.
  - **Shusha**: multiple sources attribute this one to the Indian Type Foundry
    (1997) and explicitly say commercial use requires contacting the author — more
    likely to have a real rights holder than Kruti Dev/DevLys. Treat with more
    caution, not less.
  - **Chanakya**: conflicting claims — some sources call it ITF-owned/commercial,
    others call it freely redistributable. Genuinely unresolved.
  - **Naaz**: could not find licensing information for the actual Hindi legacy
    typing font of this name at all — searches mostly surface an unrelated
    decorative Latin/Persian display font that happens to share the name. Unresolved.
  - Given all of the above, the in-app "font not found" hint (see `processor.js`,
    `detectFontNameInFile`) deliberately does NOT hardcode a download link to any
    specific site for any of these fonts — it opens a neutral web search instead,
    so the user sees and judges the source themselves. This was a decision made
    once, with reasoning, not something to "fix" by adding a direct link later
    without redoing this research.
- **No true virtual scrolling** — large sheets load in chunks (1500 rows) via a "load
  more" button rather than fully virtualizing the DOM.
- **Formula cells**: displays the cached calculated value (correct default — a
  report reader wants the number, not `=SUM(B2:B9)`), marks formula cells with a
  small corner indicator + tooltip showing the formula, and preserves the formula
  on Unicode export so the exported file keeps recalculating in Excel rather than
  freezing to a static snapshot.
- Single-font-per-cell assumption: real-world files checked so far never mix two
  fonts inside one cell (verified against several government sample files), so this
  hasn't been a practical problem, but isn't structurally guaranteed.
- **File System Access "live resume" only works in Chromium browsers** (desktop
  Chrome/Edge, Chrome on Android). Firefox and every iOS browser (Safari's engine is
  forced on all of them, including "Chrome" for iOS) don't support it at all, and
  never silently break — they just always use the IndexedDB snapshot fallback
  instead. No feature-detection bug here, just a real platform gap.

## License

No license file yet — add one before treating this as open source in the formal
sense.

## Credits

Built by Chaitanya, with help from Claude (Anthropic).
