// processor.js
// Excel parsing, workbook state, and per-cell font metadata.
// Depends on: SheetJS (js/vendor/xlsx.full.min.js), converter.js (krutiDevToUnicode).
// Owns the workbook/sheet state that ui.js reads and renders.

// ---- Legacy font detection helpers ----
    const COMMON_LEGACY_FONTS = [
      'Kruti Dev 010', 'KrutiDev 010', 'Kruti Dev 020', 'Chanakya',
      'DevLys 010', 'DevLys 020', 'Shusha', 'Shusha 02', 'Shusha 05',
      'Walkman-Chanakya', 'Walkman Chanakya', 'Amar Ujala', 'Naaz'
    ];

    function isFontAvailable(fontName) {
      const testString = 'मि०m';
      const testSize = '72px';
      const fallbacks = ['monospace', 'sans-serif', 'serif'];
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const baseWidths = {};
      fallbacks.forEach(fb => {
        ctx.font = testSize + ' ' + fb;
        baseWidths[fb] = ctx.measureText(testString).width;
      });
      return fallbacks.some(fb => {
        ctx.font = testSize + ' "' + fontName + '", ' + fb;
        return ctx.measureText(testString).width !== baseWidths[fb];
      });
    }


    const STANDARD_DEFAULT_FONTS = new Set([
      'calibri', 'arial', 'times new roman', 'cambria', 'tahoma',
      'arial narrow', 'segoe ui', 'verdana', 'courier new',
      'mangal', 'nirmala ui', 'aparajita', 'kokila', 'utsaah',
      'sanskrit text', 'ms sans serif', 'ms serif'
    ]);

    // This reads the font name literally stored inside the file itself — it's
    // not a guess or an AI inference, it's metadata the spreadsheet already
    // contains (Excel records which font every style uses). For .xlsx this
    // comes from styles.xml; for the older binary .xls format there's no such
    // structured access, so this falls back to scanning the raw bytes for
    // known legacy font names.
    // Minimal translation helper (full English/Hindi toggle coming next) —
    // this keeps newly-added messages working without crashing in the meantime.

    function detectFontNameInFile(rawBytes, workbook, fileName, biffFontMap) {
      const resultBox = document.getElementById('fileFontHint');
      if (!resultBox) return; // element missing/renamed — don't crash the whole file-open flow over a UI hint
      let detectedNames = [];

      const stylesFile = workbook.files && workbook.files['xl/styles.xml'];
      if (stylesFile && stylesFile.content) {
        try {
          const text = new TextDecoder('utf-8').decode(stylesFile.content);
          const doc = new DOMParser().parseFromString(text, 'application/xml');

          // A font only counts if some cellXf ACTUALLY references it — a
          // font can sit unused in the font table (leftover from earlier
          // edits, e.g. someone switched a sheet from Kruti Dev to Mangal
          // without removing the old, now-orphaned font entry) without a
          // single real cell using it. Checking the raw font table alone
          // reports exactly that kind of leftover as if it were live.
          const fontNodes = doc.getElementsByTagName('font');
          const fontIdToName = {};
          for (let i = 0; i < fontNodes.length; i++) {
            const nameNode = fontNodes[i].getElementsByTagName('name')[0];
            fontIdToName[i] = nameNode ? nameNode.getAttribute('val') : null;
          }
          const cellXfsNode = doc.getElementsByTagName('cellXfs')[0];
          const xfNodes = cellXfsNode ? cellXfsNode.getElementsByTagName('xf') : [];
          const usedFontIds = new Set();
          for (let i = 0; i < xfNodes.length; i++) {
            usedFontIds.add(Number(xfNodes[i].getAttribute('fontId') || 0));
          }

          const usedNames = [...usedFontIds].map(id => fontIdToName[id]).filter(Boolean);
          detectedNames = [...new Set(usedNames)].filter(n => !STANDARD_DEFAULT_FONTS.has(n.toLowerCase()));
        } catch (err) { /* fall through below */ }
      }

      // Old binary .xls: prefer the REAL per-cell font names already read
      // by biffFontParser.js — this is the same ground-truth mechanism
      // getSheetCellFonts uses for rendering, just reused here for the
      // hint. This used to fall straight to a whole-buffer UTF-16LE text
      // scan instead, which frequently found nothing on real .xls files
      // (BIFF8 often stores font names as 1-byte compressed strings, not
      // 2-byte UTF-16LE, so the naive decode silently missed them) — that
      // was the actual cause of the hint box just staying empty/hidden.
      if (!detectedNames.length && biffFontMap) {
        const names = new Set();
        Object.keys(biffFontMap).forEach(sheetName => {
          Object.values(biffFontMap[sheetName]).forEach(name => {
            if (name && !STANDARD_DEFAULT_FONTS.has(name.toLowerCase())) names.add(name);
          });
        });
        detectedNames = [...names];
      }

      if (!detectedNames.length) {
        // Last-resort fallback if BIFF parsing itself failed (corrupt file,
        // unexpected record layout, etc.) — same crude scan as before.
        const decoder = new TextDecoder('utf-16le');
        let rawText = '';
        try { rawText = decoder.decode(rawBytes); } catch (err) { rawText = ''; }
        detectedNames = COMMON_LEGACY_FONTS.filter(name => rawText.includes(name));
        detectedNames = [...new Set(detectedNames)];
      }

      if (detectedNames.length) {
        resultBox.style.display = 'block';
        resultBox.className = 'status success';
        resultBox.textContent = t('fileUsesFont', { fonts: detectedNames.join(', ') });

        // Which of these fonts is actually missing from this device? Only
        // offer the search-assist link for those — no point suggesting a
        // download for a font that's already installed.
        // Deliberately NOT a hardcoded link to any specific font-hosting
        // site: none could be confirmed as a single authoritative/official
        // source, and several are redistributed with unclear or conflicting
        // licensing (Chanakya especially). Pointing to a neutral search
        // instead lets the user see and judge the source themselves.
        const missing = detectedNames.filter(name => typeof isFontAvailable !== 'function' || !isFontAvailable(name));
        if (missing.length) {
          const searchLinks = missing.map(name => {
            const q = encodeURIComponent(name + ' font free download');
            return '<a href="https://www.google.com/search?q=' + q + '" target="_blank" rel="noopener noreferrer">' + escapeHTML(name) + '</a>';
          }).join(', ');
          const note = document.createElement('div');
          note.style.cssText = 'margin-top:8px; font-size:.85rem;';
          note.innerHTML = t('fontMissingSearchPrefix') + ' ' + searchLinks +
            '. <span style="opacity:.75;">' + t('fontMissingSearchWarn') + '</span>';
          resultBox.appendChild(note);
        }
      } else {
        resultBox.style.display = 'none';
      }
    }


// ---- Workbook / sheet state ----
    let currentWorkbook = null;
    let currentSheetName = null;

    // ============================================================
    // Per-cell font metadata (the ground-truth approach): Excel doesn't
    // store "this cell looks like Hindi" — it stores plain bytes PLUS a
    // font name in styles.xml, and the font itself does all the glyph
    // substitution. If we read that same metadata, we know exactly which
    // font Excel intended for every single cell, with no guessing at all.
    // This only works for .xlsx (a ZIP of XML we can already read via
    // SheetJS's bookFiles option) — the older binary .xls format doesn't
    // expose this the same way, so those files still use the heuristic
    // fallback below.
    // ============================================================
    // XLSX.read() does NOT reliably throw for garbage input — SheetJS
    // falls back to a permissive "maybe this is CSV" parser for anything
    // that isn't a recognized binary signature, which almost never fails.
    // Check the real magic bytes ourselves first: a genuine .xlsx is a zip
    // (starts with PK\x03\x04), a genuine legacy .xls is an OLE compound
    // file (starts with D0 CF 11 E0). Anything else gets rejected here.
    function isValidExcelSignature(bytes) {
      if (!bytes || bytes.length < 4) return false;
      const isZip = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
      const isOle = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
      return isZip || isOle;
    }

    let workbookFontCache = null; // { fontIdToName, cellXfFontIds } — parsed once per file
    let sheetCellFontCache = {};  // sheetName -> { "A1": "Kruti Dev 010", ... }
    let biffFontCache = null;     // sheetName -> { "A1": "Kruti Dev 010", ... } — .xls (BIFF8) path, see biffFontParser.js

// ---- Address & per-cell font metadata (the ground-truth approach) ----
    function colIndexToLetters(c) {
      let s = '';
      c += 1;
      while (c > 0) {
        const rem = (c - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        c = Math.floor((c - 1) / 26);
      }
      return s;
    }

    function parseWorkbookFontMaps(workbook) {
      if (!workbook.files || !workbook.files['xl/styles.xml']) return null;
      try {
        const xml = new TextDecoder('utf-8').decode(workbook.files['xl/styles.xml'].content);
        const doc = new DOMParser().parseFromString(xml, 'application/xml');
        const fontNodes = doc.getElementsByTagName('font');
        const fontIdToName = {};
        for (let i = 0; i < fontNodes.length; i++) {
          const nameNode = fontNodes[i].getElementsByTagName('name')[0];
          fontIdToName[i] = nameNode ? nameNode.getAttribute('val') : 'Unknown';
        }
        const cellXfsNode = doc.getElementsByTagName('cellXfs')[0];
        const xfNodes = cellXfsNode ? cellXfsNode.getElementsByTagName('xf') : [];
        const cellXfFontIds = [];
        for (let i = 0; i < xfNodes.length; i++) {
          cellXfFontIds.push(Number(xfNodes[i].getAttribute('fontId') || 0));
        }
        return { fontIdToName, cellXfFontIds };
      } catch (err) {
        console.error('Could not parse styles.xml', err);
        return null;
      }
    }

    function findSheetXmlPath(workbook, sheetName) {
      try {
        const wbXml = new TextDecoder('utf-8').decode(workbook.files['xl/workbook.xml'].content);
        const wbDoc = new DOMParser().parseFromString(wbXml, 'application/xml');
        const sheetNodes = wbDoc.getElementsByTagName('sheet');
        let relId = null;
        for (let i = 0; i < sheetNodes.length; i++) {
          if (sheetNodes[i].getAttribute('name') === sheetName) {
            relId = sheetNodes[i].getAttribute('r:id') || sheetNodes[i].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
            break;
          }
        }
        if (!relId) return null;
        if (!workbook.files['xl/_rels/workbook.xml.rels']) return null; // some LibreOffice/older exporters lay this out differently
        const relsXml = new TextDecoder('utf-8').decode(workbook.files['xl/_rels/workbook.xml.rels'].content);
        const relsDoc = new DOMParser().parseFromString(relsXml, 'application/xml');
        const relNodes = relsDoc.getElementsByTagName('Relationship');
        for (let i = 0; i < relNodes.length; i++) {
          if (relNodes[i].getAttribute('Id') === relId) {
            return 'xl/' + relNodes[i].getAttribute('Target').replace(/^\/?xl\//, '');
          }
        }
        return null;
      } catch (err) {
        console.error('Could not resolve sheet XML path', err);
        return null;
      }
    }

    function getSheetCellFonts(workbook, sheetName) {
      if (sheetCellFontCache[sheetName]) return sheetCellFontCache[sheetName];
      // .xlsx path: read the real per-cell font straight out of xl/styles.xml + the sheet XML.
      if (workbookFontCache) {
        const xmlPath = findSheetXmlPath(workbook, sheetName);
        if (xmlPath && workbook.files[xmlPath]) {
          try {
            const xml = new TextDecoder('utf-8').decode(workbook.files[xmlPath].content);
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
          } catch (err) {
            console.error('Could not parse sheet XML for fonts', err);
          }
        }
      }
      // .xls path: no styles.xml exists at all (it's not a zip/XML file —
      // see biffFontParser.js for why), but the SAME kind of font metadata
      // is still physically present in the file, just in the old binary
      // BIFF8 container. biffFontCache is populated once per file in
      // ui.js's file-open handler, from the raw bytes.
      if (typeof biffFontCache !== 'undefined' && biffFontCache && biffFontCache[sheetName]) {
        sheetCellFontCache[sheetName] = biffFontCache[sheetName];
        return biffFontCache[sheetName];
      }
      return null;
    }

    const STANDARD_UNICODE_FONTS = new Set([
      'calibri', 'arial', 'times new roman', 'cambria', 'tahoma',
      'arial narrow', 'segoe ui', 'verdana', 'courier new',
      'mangal', 'nirmala ui', 'aparajita'
    ]);

    function isLegacyFontName(name) {
      if (!name) return false;
      const lower = name.toLowerCase();
      return lower.includes('kruti') || lower.includes('devlys') ||
        lower.includes('chanakya') || lower.includes('shusha') ||
        lower.includes('walkman') || lower.includes('agra') || lower.includes('naaz');
    }


// ---- Legacy-vs-Unicode decision for export ----
    function cellNeedsConversion(address, cellText) {
      if (!cellText) return false;
      // Genuine Devanagari already present is strong evidence a human has
      // already retyped/migrated this cell — a cell's font TAG can be
      // stale (e.g. inherited column formatting) even after its actual
      // content has been fixed by hand. Never re-run conversion on a cell
      // that already contains real Hindi, regardless of what its style
      // metadata claims. (Note: checked every real sample file available
      // for this exact scenario — real Devanagari mixed with unconverted
      // Kruti Dev in the same cell — and it doesn't occur in any of them
      // yet. This is a safety net for when it does, not a fix for an
      // observed corruption.)
      if (/[\u0900-\u097F]/.test(cellText)) return false;
      // Kruti Dev uses basic ASCII letters AND several extended Latin-1
      // characters (Ø, Œ, etc.) as glyph keys — checking only [A-Za-z]
      // missed those. This checks for anything outside genuine Devanagari,
      // digits, and common punctuation/whitespace instead.
      const hasSuspectChar = /[^\u0900-\u097F0-9\s.,;:\-/()%]/.test(cellText);
      if (!hasSuspectChar) return false;
      const cellFonts = currentWorkbook ? getSheetCellFonts(currentWorkbook, currentSheetName) : null;
      const knownFont = cellFonts ? cellFonts[address] : null;
      if (knownFont) return isLegacyFontName(knownFont);
      // No metadata available (old .xls, or unknown font) — use the same
      // safe heuristic as viewing: if it's not pure Devanagari/digits and
      // isn't a taught exception, assume it may be legacy text worth
      // attempting to convert.
      return true;
    }

// ---- Unicode Excel export ----
    async function exportToUnicodeExcel() {
      if (!currentWorkbook || !currentSheetName) {
        setStatus('पहले कोई फाइल खोलें।', 'error');
        return;
      }
      exportUnicodeBtn.disabled = true;
      const originalLabel = exportUnicodeBtn.textContent;
      exportUnicodeBtn.textContent = 'बदला जा रहा है...';
      try {
        const worksheet = currentWorkbook.Sheets[currentSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });
        const isProtectedWord = (word) => {
          const lower = word.toLowerCase();
          if (typeof userExceptions !== 'undefined' && userExceptions.has(lower)) return true;
          if (typeof KNOWN_ENGLISH_TERMS !== 'undefined' && KNOWN_ENGLISH_TERMS.has(lower)) return true;
          if (typeof useDictionaryGuess !== 'undefined' && useDictionaryGuess &&
              typeof ENGLISH_DICTIONARY !== 'undefined' && ENGLISH_DICTIONARY.has(lower) && lower.length >= 3) return true;
          if (typeof useDictionaryGuess !== 'undefined' && useDictionaryGuess &&
              typeof looksStatisticallyEnglish === 'function' && looksStatisticallyEnglish(lower)) return true;
          return false;
        };
        const converted = jsonData.map((row, r) => row.map((cell, c) => {
          const text = cell != null ? String(cell) : '';
          if (!text) return text;
          const address = colIndexToLetters(c) + (r + 1);
          if (cellNeedsConversion(address, text)) {
            const cellFonts = currentWorkbook ? getSheetCellFonts(currentWorkbook, currentSheetName) : null;
            const knownFont = cellFonts ? cellFonts[address] : null;
            const converter = pickConverterForCell(knownFont);
            if (!converter) return text; // recognized as legacy but no converter built for this font yet — leave as-is rather than mis-convert
            try { return converter(text, isProtectedWord); } catch (err) { return text; }
          }
          return text;
        }));
        const newWs = XLSX.utils.aoa_to_sheet(converted);
        const newWb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(newWb, newWs, (currentSheetName || 'Sheet1').slice(0, 31));
        XLSX.writeFile(newWb, 'yatharoop-unicode.xlsx');
      } catch (err) {
        console.error(err);
        setStatus('यूनिकोड फाइल नहीं बन पाई।', 'error');
      } finally {
        exportUnicodeBtn.disabled = false;
        exportUnicodeBtn.textContent = originalLabel;
      }
    }

