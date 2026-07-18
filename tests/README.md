# yatharoop test harness

Runs the real engine (`converter.js`, `biffFontParser.js`, `processor.js` —
the same code that ships in `index.html`) headlessly against every
`.xlsx`/`.xls` file in this folder, plus a few synthetic edge cases.

## Run it

```
npm install xlsx cfb @xmldom/xmldom
node run.js
```

## Add a new regression file

Just drop a `.xlsx` or `.xls` file in this folder — it's picked up
automatically (sheet count, font-metadata reading, and the
conversion-pipeline-never-crashes checks run on every file with zero
extra code).

To pin down a *specific* known-good cell result (so a future change can't
silently regress it), add an entry to `EXPECTATIONS` in `run.js`:

```js
'your_file.xlsx': {
  sheetCount: 3,
  cells: {
    'Sheet1': {
      'B2': { needsConversion: true, containsAfterConvert: 'अपेक्षित शब्द' },
      'D5': { needsConversion: false, unchanged: 'already correct text' },
    },
  },
},
```

## What's covered right now

- 5 real government files (Beat reports, staff report, wildlife case
  file, student enrollment) — sheet counts, font-metadata reading,
  conversion pipeline never throwing.
- `Vanyaprani_Shikar-_Hamle_for_SP-1.xls` has pinned per-cell
  expectations (the D.R.I./बरघाट row, the RF-08 case, digit-anchored
  case numbers) — these are the exact real bugs found and fixed during
  development, now locked in as regressions.
- Synthetic edge cases: `empty.xlsx`, `one_cell.xlsx`, `merged.xlsx`,
  `dates.xlsx`, `hidden_sheet.xlsx`.
- Failure handling: `corrupted.xlsx` (random bytes) and `truncated.xlsx`
  (a real file cut off mid-stream) — both must be REJECTED, not silently
  parsed into garbage. (This is how `isValidExcelSignature` in
  `processor.js` got built — SheetJS itself doesn't reliably throw for
  garbage input, it was silently succeeding until this test caught it.)

## Known gap

No `password.xlsx` yet — need an actual password-protected file to test
against; synthesizing a realistic one isn't straightforward from here.
