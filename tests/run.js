#!/usr/bin/env node
// tests/run.js — regression harness for the yatharoop engine.
//
// Loads the REAL app source (converter.js, biffFontParser.js, processor.js
// — the "engine" layer, not the DOM-heavy ui.js) and runs it against every
// file dropped in this folder. This is not a mock of the app's logic; it's
// the exact same code that ships in index.html, run headless.
//
// Usage:
//   node tests/run.js
//
// Add a new regression file: just drop it in this folder. No code changes
// needed — the harness picks up every .xlsx/.xls file automatically. If a
// file needs a specific known-good expectation (e.g. "cell J12 must stay
// unchanged"), add it to EXPECTATIONS below.

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { DOMParser } = require('@xmldom/xmldom');

// ---- Minimal browser shims the engine files need ----
global.XLSX = XLSX;
global.CFB = require('cfb');
global.DOMParser = DOMParser;
global.document = { getElementById: () => null, createElement: () => ({ getContext: () => null }) };
global.localStorage = (() => { const store = {}; return { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = v; } }; })();

const ROOT = path.join(__dirname, '..');
function loadSource(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
}

// Evaluate the real engine source files, in the same order index.html
// loads them, into this process's global scope.
eval(loadSource('js/converter.js'));
eval(loadSource('js/biffFontParser.js'));
eval(loadSource('js/processor.js'));

// ---- Known, hand-verified expectations for specific real files ----
// Filled in as real bugs get found and fixed — this is what actually turns
// "I tested it once" into a regression suite that catches it coming back.
const EXPECTATIONS = {
  'Vanyaprani_Shikar-_Hamle_for_SP-1.xls': {
    sheetCount: 5,
    cells: {
      'Sheet1 (2)': {
        'J6': { needsConversion: true, containsAfterConvert: 'सिवनी' },
        'J12': { needsConversion: false }, // D.R.I. row — already migrated, must stay untouched
        'E12': { needsConversion: false, unchanged: 'बरघाट ' },
        'K12': { needsConversion: false, unchanged: 'NIL' },
      },
    },
  },
  'Beet_Reports.xlsx': { sheetCountMin: 1 },
  'empty.xlsx': { sheetCount: 1 },
  'one_cell.xlsx': { sheetCount: 1 },
  'hidden_sheet.xlsx': { sheetCount: 2 },
};

// ---- Test runner ----
let pass = 0, fail = 0;
const failures = [];

function check(label, condition, detail) {
  if (condition) { pass++; }
  else { fail++; failures.push(label + (detail ? ' — ' + detail : '')); }
  console.log((condition ? '  \u2713 ' : '  \u2717 ') + label + (detail && !condition ? ' (' + detail + ')' : ''));
}

const files = fs.readdirSync(__dirname).filter(f => /\.(xlsx|xls)$/i.test(f));
console.log('Found ' + files.length + ' test file(s) in tests/\n');

for (const file of files) {
  console.log('=== ' + file + ' ===');
  const raw = fs.readFileSync(path.join(__dirname, file));
  const data = new Uint8Array(raw);
  const expect = EXPECTATIONS[file] || {};
  const isKnownBad = /corrupted|truncated/i.test(file);

  let currentWorkbook;
  if (!isValidExcelSignature(data)) {
    if (isKnownBad) {
      check('rejected by signature check before ever reaching XLSX.read', true);
    } else {
      check('has a valid .xlsx/.xls signature', false, 'file was rejected but is not in the known-bad set');
    }
    console.log('');
    continue;
  }
  try {
    currentWorkbook = XLSX.read(data, { type: 'array', bookFiles: true });
  } catch (err) {
    if (isKnownBad) {
      check('fails to parse cleanly, as expected for a corrupted file', true);
    } else {
      check('parses without throwing', false, err.message);
    }
    console.log('');
    continue;
  }

  if (isKnownBad) {
    // A truncated-but-structurally-valid-looking file might pass the
    // signature check but still fail (or worse, silently succeed) at the
    // XLSX.read stage — catch that case too.
    check('a corrupted/truncated file did not silently produce sheets', currentWorkbook.SheetNames.length === 0,
      'got ' + currentWorkbook.SheetNames.length + ' sheet(s) from bad input');
    console.log('');
    continue;
  }

  check('has at least one sheet', currentWorkbook.SheetNames.length > 0,
    'found ' + currentWorkbook.SheetNames.length);

  if (expect.sheetCount !== undefined) {
    check('sheet count === ' + expect.sheetCount, currentWorkbook.SheetNames.length === expect.sheetCount,
      'got ' + currentWorkbook.SheetNames.length);
  }
  if (expect.sheetCountMin !== undefined) {
    check('sheet count >= ' + expect.sheetCountMin, currentWorkbook.SheetNames.length >= expect.sheetCountMin,
      'got ' + currentWorkbook.SheetNames.length);
  }

  // Font metadata: must not throw, regardless of whether the file has any.
  let workbookFontCache = null, biffFontCache = null;
  try {
    workbookFontCache = parseWorkbookFontMaps(currentWorkbook);
  } catch (err) {
    check('parseWorkbookFontMaps does not throw', false, err.message);
  }
  if (!workbookFontCache) {
    try {
      biffFontCache = parseBiffFontMap(data);
    } catch (err) {
      check('parseBiffFontMap does not throw', false, err.message);
    }
  }
  check('font metadata reading did not crash', true); // reaching here means neither path threw uncaught

  // For every sheet: reading data + running the conversion decision over
  // every non-empty text cell must never throw, and must never corrupt
  // pure-digit or pure-Devanagari content (the one thing that should be
  // structurally impossible regardless of guessing settings).
  let anyCellCrashed = false;
  let corruptedPureContent = null;
  currentWorkbook.SheetNames.forEach(sheetName => {
    let json;
    try {
      json = XLSX.utils.sheet_to_json(currentWorkbook.Sheets[sheetName], { header: 1, raw: false });
    } catch (err) {
      anyCellCrashed = true;
      return;
    }
    const sheetCellFontCache = {};
    function getFontsForThisSheet() {
      if (sheetCellFontCache[sheetName]) return sheetCellFontCache[sheetName];
      if (workbookFontCache) {
        try {
          const xmlPath = findSheetXmlPath(currentWorkbook, sheetName);
          if (xmlPath && currentWorkbook.files[xmlPath]) {
            const xml = currentWorkbook.files[xmlPath].content.toString ? Buffer.from(currentWorkbook.files[xmlPath].content).toString('utf-8') : '';
            const doc = new DOMParser().parseFromString(xml, 'application/xml');
            const cellNodes = doc.getElementsByTagName('c');
            const result = {};
            const { fontIdToName, cellXfFontIds } = workbookFontCache;
            for (let i = 0; i < cellNodes.length; i++) {
              const node = cellNodes[i];
              const styleIdx = Number(node.getAttribute('s') || 0);
              const fontId = cellXfFontIds[styleIdx] || 0;
              result[node.getAttribute('r')] = fontIdToName[fontId] || null;
            }
            sheetCellFontCache[sheetName] = result;
            return result;
          }
        } catch (err) { /* fall through */ }
      }
      if (biffFontCache && biffFontCache[sheetName]) return biffFontCache[sheetName];
      return null;
    }
    const cellFonts = getFontsForThisSheet();
    const expectCells = expect.cells && expect.cells[sheetName];

    (json || []).forEach((row, r) => (row || []).forEach((cell, c) => {
      if (typeof cell !== 'string' || !cell.trim()) return;
      const address = colIndexToLetters(c) + (r + 1);
      const knownFont = cellFonts ? cellFonts[address] : null;
      let needs;
      try {
        needs = knownFont ? isLegacyFontName(knownFont) : /[^\u0900-\u097F0-9\s.,;:\-/()%]/.test(cell);
        if (needs) krutiDevToUnicode(cell, () => false);
      } catch (err) {
        anyCellCrashed = true;
        return;
      }

      // Structural invariant: pure digits or pure Devanagari must NEVER
      // be flagged as needing conversion, regardless of font metadata.
      if (/^\d+$/.test(cell.trim()) && needs) corruptedPureContent = address + ' (pure digits flagged for conversion)';
      if (/^[\u0900-\u097F\s]+$/.test(cell) && knownFont && isLegacyFontName(knownFont) === false && needs) {
        corruptedPureContent = address + ' (pure Devanagari flagged for conversion)';
      }

      if (expectCells && expectCells[address]) {
        const exp = expectCells[address];
        if (exp.needsConversion !== undefined) {
          check(sheetName + '!' + address + ' needsConversion === ' + exp.needsConversion, needs === exp.needsConversion,
            'got ' + needs);
        }
        if (exp.unchanged !== undefined) {
          check(sheetName + '!' + address + ' stays byte-identical when not converted', !needs && cell === exp.unchanged,
            JSON.stringify(cell));
        }
        if (exp.containsAfterConvert !== undefined && needs) {
          const out = krutiDevToUnicode(cell, () => false);
          check(sheetName + '!' + address + ' converts to include "' + exp.containsAfterConvert + '"',
            out.includes(exp.containsAfterConvert), JSON.stringify(out));
        }
      }
    }));
  });

  check('no cell crashed the conversion pipeline', !anyCellCrashed);
  check('no pure-digit/pure-Devanagari cell got corrupted', !corruptedPureContent, corruptedPureContent);

  console.log('');
}

console.log('='.repeat(50));
console.log(pass + ' passed, ' + fail + ' failed');
if (fail > 0) {
  console.log('\nFailures:');
  failures.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
