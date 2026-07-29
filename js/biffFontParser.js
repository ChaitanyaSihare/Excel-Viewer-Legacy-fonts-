// biffFontParser.js
// Reads REAL per-cell font metadata directly out of legacy .xls (BIFF8)
// files — the exact same kind of ground truth getSheetCellFonts already
// reads from xl/styles.xml for .xlsx files, just for the old binary
// container format instead of zip+XML.
//
// Why this exists: .xls is not a zip file — it's an OLE/Compound File
// Binary structure (signature D0 CF 11 E0), a completely different
// container from .xlsx. SheetJS's friendly cell.s API doesn't expose
// per-cell font info for this format, which made it LOOK like these files
// carry no font metadata at all. They do — it just needs reading directly,
// the same way we already bypass SheetJS's high-level API and read
// xl/styles.xml raw for .xlsx. This is that, for .xls.
//
// Record layouts below are taken directly from Microsoft's own published
// [MS-XLS] specification (docs at learn.microsoft.com/openspecs/office_file_formats/ms-xls),
// cross-checked against the xlrd project's documented behavior for the
// "font index 4 is never used" quirk.
//
// Depends on: js/vendor/cfb.min.js (SheetJS's own OLE container reader —
// same family as xlsx.full.min.js, used here only to pull out the raw
// "Workbook" stream bytes; everything after that is parsed by hand below).

function parseBiffFontMap(rawFileBytes) {
  let container;
  try {
    container = CFB.read(rawFileBytes, { type: 'array' });
  } catch (err) {
    return null; // not a valid OLE container at all — not a legacy .xls we can read this way
  }
  const wbEntry = CFB.find(container, 'Workbook') || CFB.find(container, 'Book');
  if (!wbEntry || !wbEntry.content) return null;

  // wbEntry.content may be a plain array of byte values (from CFB) rather
  // than a typed array — normalize using Uint8Array, which works in both
  // the browser (where Buffer doesn't exist) and Node (for our own tests).
  const buf = wbEntry.content instanceof Uint8Array ? wbEntry.content : new Uint8Array(wbEntry.content);

  // Minimal readUInt16LE/readUInt32LE that work on both a real Buffer
  // (Node, for our own testing) and a plain Uint8Array (browser runtime).
  function u16(b, p) { return b[p] | (b[p + 1] << 8); }
  function u32(b, p) { return (b[p] | (b[p + 1] << 8) | (b[p + 2] << 16) | (b[p + 3] << 24)) >>> 0; }

  // ---- Pass 1: split the stream into records ----
  // Each record: 2-byte type, 2-byte length, then that many bytes of data.
  // CONTINUE (0x003C) records are Microsoft's way of splitting a record
  // that would otherwise exceed the ~8KB single-record limit — none of the
  // record types we care about (FONT/XF/cell records/BoundSheet8) get
  // anywhere near that size in practice, so we intentionally do NOT merge
  // CONTINUE payloads here; treating each raw record independently is
  // sufficient and keeps this parser small and easy to verify by hand.
  const records = [];
  let pos = 0;
  while (pos + 4 <= buf.length) {
    const type = u16(buf, pos);
    const len = u16(buf, pos + 2);
    const dataStart = pos + 4;
    if (dataStart + len > buf.length) break; // truncated/corrupt tail guard
    records.push({ type, offset: pos, data: buf.slice(dataStart, dataStart + len) });
    pos = dataStart + len;
  }

  // ---- Read a ShortXLUnicodeString (used for font names & sheet names) ----
  // Layout: 1 byte char count (cch), 1 byte flag byte (bit 0 = wide/UTF-16
  // vs compressed 1-byte-per-char), then cch characters.
  function readShortXLUnicodeString(data, offset) {
    const cch = data[offset];
    const flags = data[offset + 1];
    const isWide = (flags & 0x01) !== 0;
    if (isWide) {
      let s = '';
      for (let i = 0; i < cch; i++) {
        const code = u16(data, offset + 2 + i * 2);
        s += String.fromCharCode(code);
      }
      return s;
    }
    let s = '';
    for (let i = 0; i < cch; i++) s += String.fromCharCode(data[offset + 2 + i]);
    return s;
  }

  // ---- FONT records (0x0031) — the font name table ----
  // Fixed 14-byte header (height, attribute flags, color, weight,
  // script, underline, family, charset, reserved), then the name string.
  // KNOWN QUIRK (confirmed via xlrd's own documented behavior): index 4 in
  // this table is never actually used by any XF record — a placeholder
  // keeps array index === the ifnt values used elsewhere, so nothing else
  // in this file needs an off-by-one adjustment.
  const fonts = [];
  records.filter(r => r.type === 0x0031).forEach(r => {
    fonts.push(readShortXLUnicodeString(r.data, 14));
    if (fonts.length === 4) fonts.push(null); // the skipped index
  });

  // ---- XF records (0x00E0) — cell format -> font index ----
  // We only need the very first field (ifnt, 2 bytes) — everything else
  // in this record (borders, fill, alignment...) is irrelevant here.
  const xfToFontIndex = [];
  records.filter(r => r.type === 0x00E0).forEach(r => {
    xfToFontIndex.push(u16(r.data, 0));
  });

  // ---- BoundSheet8 records (0x0085) — sheet name + substream offset ----
  const boundSheets = [];
  records.filter(r => r.type === 0x0085).forEach(r => {
    boundSheets.push({ streamPos: u32(r.data, 0), name: readShortXLUnicodeString(r.data, 6) });
  });

  // ---- Walk each sheet's substream, collect (row,col) -> font name ----
  // Every real cell-data record (BLANK, NUMBER, RK, LABELSST, LABEL,
  // FORMULA, BOOLERR, MULBLANK's first cell) starts with the same 6-byte
  // header: row (2), col (2), ixfe (2) — the cell format index, which is
  // exactly what we look up in xfToFontIndex -> fonts.
  const CELL_RECORD_TYPES = { 0x0201: 1, 0x0203: 1, 0x027E: 1, 0x00FD: 1, 0x0204: 1, 0x0006: 1, 0x0205: 1, 0x00BE: 1 };
  function colToLetters(c) {
    let s = '';
    c += 1;
    while (c > 0) { const m = (c - 1) % 26; s = String.fromCharCode(65 + m) + s; c = Math.floor((c - 1) / 26); }
    return s;
  }

  const result = {};
  boundSheets.forEach(sheet => {
    const startIdx = records.findIndex(r => r.offset === sheet.streamPos);
    if (startIdx === -1) return;
    const cellFonts = {};
    for (let i = startIdx + 1; i < records.length; i++) {
      const r = records[i];
      if (r.type === 0x000A) break; // EOF ends this sheet's substream
      if (!CELL_RECORD_TYPES[r.type] || r.data.length < 6) continue;
      const row = u16(r.data, 0);
      const col = u16(r.data, 2);
      const ixfe = u16(r.data, 4);
      const fontName = fonts[xfToFontIndex[ixfe]];
      if (fontName) cellFonts[colToLetters(col) + (row + 1)] = fontName;
    }
    result[sheet.name] = cellFonts;
  });

  return result; // { sheetName: { 'A1': 'Kruti Dev 010', ... } }
}
