// converter.js
// Shared engine layer: text-transform utilities used by every legacy-font
// converter, plus a small registry so a new legacy font (DevLys, Chanakya,
// ...) can be added as its own file under js/converters/ without touching
// this file, processor.js, or ui.js. Only Kruti Dev has an actual mapping
// today (js/converters/krutidev.js) — this is the plumbing for adding more,
// not a claim that more already exist.
// Pure text transform: no DOM, no XLSX, no globals besides what it defines.

const DEVANAGARI_RANGE = /[\u0900-\u097F]/;

function replaceAllLiteral(text, find, replace) {
  if (find === '') return text;
  return text.split(find).join(replace);
}

// fontNamePattern -> converter function, e.g. { 'kruti': krutiDevToUnicode }.
// A converter file registers itself by calling registerLegacyConverter()
// below — converter.js itself never needs to know what converters exist.
const LEGACY_CONVERTERS = {};

function registerLegacyConverter(fontNamePattern, converterFn) {
  LEGACY_CONVERTERS[fontNamePattern.toLowerCase()] = converterFn;
}

// Looks up the right converter for a given font name (e.g. "Kruti Dev 010")
// by substring match against registered patterns. Returns null if no
// converter is registered for that font.
function getConverterForFont(fontName) {
  if (!fontName) return null;
  const lower = fontName.toLowerCase();
  for (const pattern in LEGACY_CONVERTERS) {
    if (lower.includes(pattern)) return LEGACY_CONVERTERS[pattern];
  }
  return null;
}

// Neither the .xlsx style-index reader nor the .xls (BIFF8) font parser
// looks at per-CHARACTER rich-text runs within a cell — both only read
// the cell's single default font. A cell that mixes runs (e.g. a clause
// actually typed in Kruti Dev alongside a date typed in Arial) reports
// only ONE font for the whole cell, and it's sometimes the wrong one for
// the legacy text actually sitting inside it — the font tag says "Arial
// Narrow" and the cell gets silently left unconverted.
//
// This flags that situation for a WARNING only — it deliberately does
// NOT trigger conversion. Kruti Dev's mapping remaps ordinary ASCII too
// (plain letters, commas, digits-adjacent punctuation all have their own
// glyph slots in that font), so running the converter over a mixed cell
// corrupts the parts that were genuinely fine ("Dt" → "क्ज", "," → "ए" —
// seen happen on a real file before this was pulled back to detect-only).
// Converting only the actually-legacy substring would need real per-run
// font parsing, which neither format-reading path here does; until that
// exists, surfacing "this looks wrong, check it by hand" is honest,
// auto-"fixing" it with a guess is not.
//
// The fingerprint itself: a semicolon directly GLUED between two letters,
// no surrounding whitespace (e.g. "vf/kfu;e"). Kruti Dev's mapping
// produces this constantly for real conjuncts; verified against every
// real sample file available for this project (every match across all of
// them was inside a genuinely un-converted legacy cell, zero false
// positives) — including checking it doesn't fire on cells that already
// contain real Devanagari. Deliberately does NOT include '/' — "s/o",
// "w/o", "Board/Uni", "RollNo/EnrollmentNo" are all real, common content
// in exactly these government forms, and a slash-based version fired on
// several of them.
function looksLikeUnconvertedLegacyGlyphs(text) {
  return typeof text === 'string' && /[A-Za-z];[A-Za-z]/.test(text);
}

// Picks the right converter for a cell: uses the font-specific one if we
// have metadata AND a matching converter registered; otherwise falls back
// to Kruti Dev specifically for the no-metadata heuristic case, since
// that's the only mapping this app's dictionary/bigram fallback models
// were ever built against. If metadata names a legacy font we recognize
// but have no converter for (DevLys, Chanakya, Shusha — not yet built),
// returns null rather than guessing wrong: applying Kruti Dev's mapping to
// DevLys-encoded bytes would produce confidently WRONG text, which is
// worse than leaving it unconverted.
function pickConverterForCell(knownFontName) {
  if (knownFontName) return getConverterForFont(knownFontName) || null;
  return typeof krutiDevToUnicode === 'function' ? krutiDevToUnicode : null;
}

