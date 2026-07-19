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

