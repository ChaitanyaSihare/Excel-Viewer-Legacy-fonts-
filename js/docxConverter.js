// docxConverter.js
// Converts a legacy-font (Kruti Dev etc.) .docx file to real Unicode text,
// reusing the exact same converter registry already built for Excel files
// (js/converter.js, js/converters/krutidev.js) — one conversion engine,
// two file formats.
//
// .docx is a zip of XML files (same container family as .xlsx), but isn't
// something SheetJS's zip access can read (that's scoped to spreadsheet
// structure) — needs its own zip reader, hence js/vendor/jszip.min.js
// (MIT licensed, mature, the same reason the other .xlsx-reading code in
// this app avoided writing a zip reader from scratch).
//
// Deliberately uses DOMParser/XMLSerializer throughout instead of raw
// string/regex manipulation of the XML. This isn't just cleaner — it
// structurally avoids a real bug found during development of a similar
// standalone script: feeding raw (still-escaped) XML text straight into
// the converter treats literal "&amp;" as five separate Kruti Dev
// keystrokes instead of one "&" character, producing confident-looking
// garbage. DOM APIs decode entities automatically on read (.textContent)
// and re-encode them automatically on write (XMLSerializer) — there is no
// raw escaped text for the converter to ever see.

const DOCX_W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';

// The font NAME to reference for converted text — NOT embedded/bundled,
// just referenced by name in the document XML, same as any font choice
// made in Word itself. Mangal ships with Windows by default (unlike Kruti
// Dev/DevLys/Chanakya, whose licensing is unclear — see project notes),
// so most people opening this on a Windows PC already have it without us
// distributing anything.
const DOCX_TARGET_FONT = 'Mangal';

// Read-only extraction for VIEWING (separate from convertDocxToUnicode,
// which mutates and re-saves). Mirrors the cell-level {text, isLegacy}
// shape the Excel viewer already uses.
async function extractDocxParagraphs(fileBytes) {
  const zip = await JSZip.loadAsync(fileBytes);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) throw new Error('word/document.xml not found — not a valid .docx');
  const docXmlText = await docXmlFile.async('string');
  const doc = new DOMParser().parseFromString(docXmlText, 'application/xml');
  const paragraphNodes = doc.getElementsByTagNameNS(DOCX_W_NS, 'p');
  const paragraphs = [];
  for (let p = 0; p < paragraphNodes.length; p++) {
    const runs = paragraphNodes[p].getElementsByTagNameNS(DOCX_W_NS, 'r');
    const runList = [];
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i];
      const rPr = run.getElementsByTagNameNS(DOCX_W_NS, 'rPr')[0];
      const rFonts = rPr ? rPr.getElementsByTagNameNS(DOCX_W_NS, 'rFonts')[0] : null;
      const fontName = rFonts ? (rFonts.getAttributeNS(DOCX_W_NS, 'ascii') || rFonts.getAttributeNS(DOCX_W_NS, 'hAnsi')) : null;
      const tNodes = run.getElementsByTagNameNS(DOCX_W_NS, 't');
      let text = '';
      for (let j = 0; j < tNodes.length; j++) text += tNodes[j].textContent || '';
      if (text) runList.push({ text, fontName, isLegacy: isLegacyFontName(fontName) });
    }
    paragraphs.push(runList);
  }
  return paragraphs;
}

async function convertDocxToUnicode(fileBytes, isProtectedWord) {
  const zip = await JSZip.loadAsync(fileBytes);
  const docXmlFile = zip.file('word/document.xml');
  if (!docXmlFile) throw new Error('word/document.xml not found — not a valid .docx');
  const docXmlText = await docXmlFile.async('string');

  const doc = new DOMParser().parseFromString(docXmlText, 'application/xml');
  const runs = doc.getElementsByTagNameNS(DOCX_W_NS, 'r');

  let convertedCount = 0;
  const skippedByFont = {};

  for (let i = 0; i < runs.length; i++) {
    const run = runs[i];
    const rPr = run.getElementsByTagNameNS(DOCX_W_NS, 'rPr')[0];
    const rFonts = rPr ? rPr.getElementsByTagNameNS(DOCX_W_NS, 'rFonts')[0] : null;
    if (!rFonts) continue;
    const fontName = rFonts.getAttributeNS(DOCX_W_NS, 'ascii') || rFonts.getAttributeNS(DOCX_W_NS, 'hAnsi');
    if (!fontName || !isLegacyFontName(fontName)) continue;

    const converter = (typeof getConverterForFont === 'function' && getConverterForFont(fontName)) ||
      (typeof krutiDevToUnicode === 'function' ? krutiDevToUnicode : null);
    if (!converter) {
      skippedByFont[fontName] = (skippedByFont[fontName] || 0) + 1;
      continue;
    }

    const tNodes = run.getElementsByTagNameNS(DOCX_W_NS, 't');
    for (let j = 0; j < tNodes.length; j++) {
      const tNode = tNodes[j];
      if (!tNode.textContent) continue;
      tNode.textContent = converter(tNode.textContent, isProtectedWord);
    }
    if (tNodes.length) convertedCount++;

    // Re-font this run to a real Unicode-safe font, matching how the
    // Excel viewer's "trusted legacy" cells get re-tagged on export —
    // never leave a converted run still pointing at the legacy font name.
    rFonts.setAttributeNS(DOCX_W_NS, 'w:ascii', DOCX_TARGET_FONT);
    rFonts.setAttributeNS(DOCX_W_NS, 'w:hAnsi', DOCX_TARGET_FONT);
    rFonts.setAttributeNS(DOCX_W_NS, 'w:cs', DOCX_TARGET_FONT);
  }

  // Catch every remaining rFonts reference in the document body — mainly
  // paragraph-mark run properties (w:pPr/w:rPr/w:rFonts, the invisible
  // end-of-paragraph marker's font), which have no text of their own so
  // the loop above never touches them. Not a text-correctness fix, just
  // making sure nothing still points at the legacy font name anywhere.
  const allBodyRFonts = doc.getElementsByTagNameNS(DOCX_W_NS, 'rFonts');
  for (let i = 0; i < allBodyRFonts.length; i++) {
    const el = allBodyRFonts[i];
    const ascii = el.getAttributeNS(DOCX_W_NS, 'ascii');
    if (isLegacyFontName(ascii)) {
      el.setAttributeNS(DOCX_W_NS, 'w:ascii', DOCX_TARGET_FONT);
      el.setAttributeNS(DOCX_W_NS, 'w:hAnsi', DOCX_TARGET_FONT);
      el.setAttributeNS(DOCX_W_NS, 'w:cs', DOCX_TARGET_FONT);
    }
  }

  const newDocXml = new XMLSerializer().serializeToString(doc);
  zip.file('word/document.xml', newDocXml);

  // Also re-font paragraph/style-level Kruti Dev references still sitting
  // in styles.xml, if present — a run's own rFonts (handled above) always
  // wins when present, but a paragraph without an explicit run-level
  // override falls back to whatever the paragraph/doc-default style says,
  // and leaving that pointed at the legacy font would still look wrong
  // for any text that relies on the style default instead of a direct tag.
  const stylesFile = zip.file('word/styles.xml');
  if (stylesFile) {
    const stylesText = await stylesFile.async('string');
    if (stylesText.includes('Kruti Dev') || /DevLys|Chanakya|Shusha/.test(stylesText)) {
      const stylesDoc = new DOMParser().parseFromString(stylesText, 'application/xml');
      const allRFonts = stylesDoc.getElementsByTagNameNS(DOCX_W_NS, 'rFonts');
      for (let i = 0; i < allRFonts.length; i++) {
        const el = allRFonts[i];
        const ascii = el.getAttributeNS(DOCX_W_NS, 'ascii');
        if (isLegacyFontName(ascii)) {
          el.setAttributeNS(DOCX_W_NS, 'w:ascii', DOCX_TARGET_FONT);
          el.setAttributeNS(DOCX_W_NS, 'w:hAnsi', DOCX_TARGET_FONT);
          el.setAttributeNS(DOCX_W_NS, 'w:cs', DOCX_TARGET_FONT);
        }
      }
      zip.file('word/styles.xml', new XMLSerializer().serializeToString(stylesDoc));
    }
  }

  const outputBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });

  return { blob: outputBlob, convertedCount, skippedByFont };
}
