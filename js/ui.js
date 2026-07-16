// ui.js
// DOM wiring, rendering, search/filter, drag & drop, and PDF export.
// Depends on: converter.js, processor.js (workbook state + font metadata),
// and the vendor libs (SheetJS, html2canvas, jsPDF).

// ---- Element references ----
    const fileInput = document.getElementById('excelFile');
    const fontFileInput = document.getElementById('fontFile');
    const readBtn = document.getElementById('readBtn');
    const statusBox = document.getElementById('statusBox');
    const fontStatusBox = document.getElementById('fontStatusBox');
    const tableWrapper = document.getElementById('tableWrapper');
    const outputTable = document.getElementById('outputTable');
    const emptyState = document.getElementById('emptyState');
    const tableInfo = document.getElementById('tableInfo');
    const sheetMeta = document.getElementById('sheetMeta');
    const fileNameBox = document.getElementById('fileNameBox');
    const fontNameBox = document.getElementById('fontNameBox');
    const dropzone = document.getElementById('dropzone');
    const scrollTopBtn = document.getElementById('scrollTopBtn');
    const newFileBtn = document.getElementById('newFileBtn');
    const sheetEnglishToggle = document.getElementById('sheetEnglishToggle');
    const aiAssistBtn = document.getElementById('aiAssistBtn');
    const aiAssistStatus = document.getElementById('aiAssistStatus');
    const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportUnicodeBtn = document.getElementById('exportUnicodeBtn');
    const searchInput = document.getElementById('searchInput');
    const dictionaryToggle = document.getElementById('dictionaryToggle');
    const loadMoreRow = document.getElementById('loadMoreRow');
    const loadMoreBtn = document.getElementById('loadMoreBtn');

    let customFontLoaded = false;
    let activeFontFamily = null; // name to use in CSS, once a font is ready

// ---- Bilingual UI (Hindi / English) ----
    const TRANSLATIONS = {
      hi: {
        brandTagline: 'पुराना फॉन्ट, वही सही रूप',
        topbarNote: 'फाइल और फॉन्ट चुनें — तुरंत सही रूप में देखें',
        eyebrow: 'बिना अनुवाद, बिना अटकल',
        heroTitle: 'फाइल को उसके असली फॉन्ट में देखें',
        heroText: 'यह टूल टेक्स्ट को बदलने या अनुवाद करने की कोशिश नहीं करता। यह वही करता है जो कंप्यूटर करता है — सही फॉन्ट (जैसे <strong>कृति देव</strong>) मिलते ही फाइल अपने आप सही दिख जाती है। फॉन्ट फाइल एक बार अपलोड करें, बाकी काम ब्राउज़र खुद कर लेता है — हर बार, बिना किसी गड़बड़ी के।',
        openFileLink: 'फाइल खोलें',
        meta01: 'एक्सेल फाइल चुनें (.xlsx या .xls)',
        meta02: 'फॉन्ट चुनें — अपने आप पहचाना भी जा सकता है',
        meta03: 'टेबल उसी फॉन्ट में, सही रूप में दिखेगी',
        meta04: 'फाइल आपके फोन में ही रहती है, कहीं नहीं जाती',
        panel1Title: '1. एक्सेल फाइल चुनें',
        panel1Subtitle: '.xlsx या .xls फॉर्मेट, कोई भी आकार।',
        dropzoneMain: 'फाइल यहाँ खींचें या टैप करके चुनें',
        dropzoneSub: 'समर्थित फॉर्मेट: .xlsx, .xls',
        panel2Title: '2. फॉन्ट तय करें',
        fontDetectChecking: 'फोन में मौजूद फॉन्ट जांचे जा रहे हैं...',
        detectedFontsIntro: 'ये फॉन्ट आपके फोन में पहले से मौजूद हैं — टैप करके चुनें:',
        uploadFontIntro: 'कोई फॉन्ट न मिले तो फाइल खुद अपलोड करें — कृति देव, चाणक्य, DevLys, शुषा, जो भी आपका दफ़्तर उपयोग करता हो:',
        fontDropzoneMain: 'फॉन्ट फाइल टैप करें',
        fontDropzoneSub: 'यह फाइल भी कहीं अपलोड नहीं होती',
        readBtnLabel: 'फाइल खोलकर देखें',
        tipsTitle: 'जानने योग्य बातें',
        tip1: 'यह टूल टेक्स्ट को ठीक या अनुवादित नहीं करता — सिर्फ सही फॉन्ट में दिखाता है।',
        tip2: 'इसलिए टेबल से टेक्स्ट कॉपी करके WhatsApp या कहीं और भेजने पर वह वैसा नहीं दिखेगा — वहाँ यह फॉन्ट नहीं होगा।',
        tip3: 'पढ़ने और देखने के लिए यह पूरी तरह सही रहेगा, कंप्यूटर जैसा ही।',
        resultsTitle: 'तालिका',
        tableInfoInitial: 'अभी कोई फाइल नहीं खोली गई है।',
        exportPdfLabel: 'PDF डाउनलोड करें',
        exportUnicodeLabel: 'यूनिकोड Excel डाउनलोड करें',
        downloadHtmlLabel: 'HTML फाइल के रूप में सहेजें',
        emptyStateTitle: 'कुछ भी दिखाने के लिए तैयार नहीं है',
        emptyStateText: 'एक्सेल फाइल और फॉन्ट चुनें, फिर "फाइल खोलकर देखें" दबाएँ।',
        sheetMetaInitial: 'शीट की जानकारी यहाँ दिखेगी।',
        scrollTopLabel: 'ऊपर जाएं',
        editHint: 'किसी भी सेल पर टैप करके उसे सीधे ठीक किया जा सकता है। अगर कोई शब्द गलती से अंग्रेज़ी मानकर छोड़ दिया गया हो, उस पर टैप करें — अगली बार से यह ऐसी गलती नहीं दोहराएगा।',
        footerText: 'यथारूप पूरी तरह ब्राउज़र में चलता है — कोई फाइल कभी किसी सर्वर पर नहीं जाती। इस पेज को अपने पास सहेजने के लिए ऊपर "HTML फाइल के रूप में सहेजें" दबाएँ। ध्यान रहे, दोबारा खोलने पर फॉन्ट फिर से चुनना होगा।',
        footerCredit: 'बनाया: चैतन्य द्वारा, Claude (Anthropic) की सहायता से।',

        fileUsesFont: 'इस फाइल में यह फॉन्ट दर्ज है: {fonts} — यही फॉन्ट चुनें तो रूप सही आएगा।',
        fontsFoundOnDevice: 'आपके फोन में ये फॉन्ट पहले से मौजूद हैं:',
        noFontsFound: 'कोई जाना-पहचाना फॉन्ट नहीं मिला — नीचे से फॉन्ट फाइल चुनें।',
        fontSelected: '"{name}" चुना गया।',
        selectedFileLabel: 'चयनित फाइल:',
        selectedFontLabel: 'चयनित फॉन्ट:',
        fontLoading: 'फॉन्ट लोड हो रहा है...',
        fontReady: 'फॉन्ट तैयार है।',
        fontLoadFailed: 'यह फॉन्ट फाइल नहीं खुली। .ttf या .otf फाइल चुनें।',
        noDataInSheet: 'इस शीट में कोई डेटा नहीं मिला।',
        noDataAvailable: 'कोई डेटा उपलब्ध नहीं।',
        sheetLabelShort: 'शीट: {name}',
        fileOpenedOk: 'फाइल खुल गई।',
        fileOpenedNoFont: 'फाइल खुल गई, पर फॉन्ट के बिना — रूप सही नहीं होगा।',
        pleaseChooseFile: 'पहले कोई एक्सेल फाइल चुनें।',
        libraryNotLoaded: 'ज़रूरी लाइब्रेरी लोड नहीं हुई — पेज को दोबारा खोलकर देखें।',
        noFontSelectedWarning: 'फॉन्ट चुना नहीं गया — फिर भी दिखाया जा रहा है, पर रूप सही नहीं होगा...',
        openingFile: 'फाइल खोली जा रही है...',
        processingFile: 'फाइल प्रोसेस हो रही है...',
        preparingData: 'डेटा तैयार किया जा रहा है...',
        fileReadSuccess: 'फाइल सफलतापूर्वक पढ़ी गई। नीचे तालिका देखें।',
        sheetMetaFull: 'शीट: {name} • पंक्तियाँ: {rows} • कॉलम: {cols}',
        fileOpenError: 'यह फाइल नहीं खुल पाई। सही एक्सेल फाइल चुनकर देखें।',
        fileOpenErrorDetail: 'फाइल खोलने में गड़बड़ी हुई।',
        tryAnotherFile: 'कोई दूसरी फाइल आज़माकर देखें।',
        fileLoadFailed: 'फाइल लोड नहीं हुई। दोबारा कोशिश करें।',
        pleaseOpenFileFirst: 'पहले कोई फाइल खोलें।',
        converting: 'बदला जा रहा है...',
        unicodeExportFailed: 'यूनिकोड फाइल नहीं बन पाई।',
        pdfGenerating: 'PDF बन रहा है...',
        pdfFailed: 'PDF नहीं बन पाया।',
        taggableMarkTitle: 'असली अंग्रेज़ी नहीं है? टैप करें',
        taggableUnmarkTitle: 'यह असली अंग्रेज़ी शब्द है? दबाकर रखें',
        sheetEnglishLabel: 'यह शीट पूरी तरह अंग्रेज़ी/यूनिकोड में है',
        newFileLabel: 'नई फाइल खोलें',
        searchPlaceholder: 'डेटा खोजें...',
        dictionaryToggleLabel: 'बिना फॉन्ट-जानकारी वाले सेल में शब्दकोश और सांख्यिकीय अनुमान से पता लगाएं (जोखिम भरा — बंद रहना बेहतर)',
        aiAssistLabel: 'अस्पष्ट शब्दों की जांच इस डिवाइस के AI से करें',
        aiAssistUnavailable: 'इस ब्राउज़र/डिवाइस पर कोई ऑन-डिवाइस AI उपलब्ध नहीं मिला। कुछ भी कहीं नहीं भेजा गया।',
        aiAssistChecking: 'AI से जांच हो रही है... ({done}/{total})',
        aiAssistDone: 'पूरा हुआ — {count} शब्द ठीक किए गए।',
        aiAssistNoneFound: 'जांचने के लिए कोई अस्पष्ट शब्द नहीं मिला।',
        loadMoreLabel: 'और {count} पंक्तियाँ लोड करें',
      },
      en: {
        brandTagline: 'Old font, exact same look',
        topbarNote: 'Pick a file and font — see it correctly right away',
        eyebrow: 'No translation, no guessing',
        heroTitle: 'View the file in its actual font',
        heroText: 'This tool doesn\'t try to fix or translate text. It does exactly what a computer does — the moment the right font (like <strong>Kruti Dev</strong>) is available, the file just looks correct on its own. Upload the font once; the browser handles the rest, every time, with no mix-ups.',
        openFileLink: 'Open a file',
        meta01: 'Choose an Excel file (.xlsx or .xls)',
        meta02: 'Pick a font — can be auto-detected too',
        meta03: 'Table shows in that exact font, correctly',
        meta04: 'File stays on your phone, never leaves',
        panel1Title: '1. Choose your Excel file',
        panel1Subtitle: '.xlsx or .xls format, any size.',
        dropzoneMain: 'Drag a file here or tap to choose',
        dropzoneSub: 'Supported formats: .xlsx, .xls',
        panel2Title: '2. Choose a font',
        fontDetectChecking: 'Checking for fonts already on your phone...',
        detectedFontsIntro: 'These fonts are already on your phone — tap to select:',
        uploadFontIntro: 'None found? Upload the font file yourself — Kruti Dev, Chanakya, DevLys, Shusha, whichever your office uses:',
        fontDropzoneMain: 'Tap to choose a font file',
        fontDropzoneSub: 'This file isn\'t uploaded anywhere either',
        readBtnLabel: 'Open and view file',
        tipsTitle: 'Good to know',
        tip1: 'This tool doesn\'t fix or translate text — it only displays it in the correct font.',
        tip2: 'So copying text from the table into WhatsApp or elsewhere won\'t look the same — that font won\'t exist there.',
        tip3: 'For reading and viewing, this will be fully accurate, exactly like a computer.',
        resultsTitle: 'Table',
        tableInfoInitial: 'No file opened yet.',
        exportPdfLabel: 'Download PDF',
        exportUnicodeLabel: 'Download Unicode Excel',
        downloadHtmlLabel: 'Save as HTML file',
        emptyStateTitle: 'Nothing to show yet',
        emptyStateText: 'Choose an Excel file and font, then press "Open and view file".',
        sheetMetaInitial: 'Sheet info will appear here.',
        scrollTopLabel: 'Scroll to top',
        editHint: 'Tap any cell to fix it directly. If a word got wrongly left as English, tap it — it won\'t make that mistake again next time.',
        footerText: 'Yatharoop runs entirely in the browser — no file is ever sent to a server. To save this page, press "Save as HTML file" above. Note: you\'ll need to choose the font again when reopening it.',
        footerCredit: 'Made by Chaitanya, with help from Claude (Anthropic).',

        fileUsesFont: 'This file uses the font: {fonts} — choose this font for the correct look.',
        fontsFoundOnDevice: 'These fonts are already on your phone:',
        noFontsFound: 'No known font found — choose a font file below.',
        fontSelected: '"{name}" selected.',
        selectedFileLabel: 'Selected file:',
        selectedFontLabel: 'Selected font:',
        fontLoading: 'Loading font...',
        fontReady: 'Font ready.',
        fontLoadFailed: 'Could not open that font file. Choose a .ttf or .otf file.',
        noDataInSheet: 'No data found in this sheet.',
        noDataAvailable: 'No data available.',
        sheetLabelShort: 'Sheet: {name}',
        fileOpenedOk: 'File opened.',
        fileOpenedNoFont: 'File opened, but without a font — it won\'t display correctly.',
        pleaseChooseFile: 'Choose an Excel file first.',
        libraryNotLoaded: 'A required library failed to load — try reopening the page.',
        noFontSelectedWarning: 'No font selected — showing anyway, but it won\'t display correctly...',
        openingFile: 'Opening file...',
        processingFile: 'Processing file...',
        preparingData: 'Preparing data...',
        fileReadSuccess: 'File read successfully. See the table below.',
        sheetMetaFull: 'Sheet: {name} • Rows: {rows} • Columns: {cols}',
        fileOpenError: 'This file could not be opened. Choose a valid Excel file.',
        fileOpenErrorDetail: 'Something went wrong opening the file.',
        tryAnotherFile: 'Try a different file.',
        fileLoadFailed: 'File failed to load. Try again.',
        pleaseOpenFileFirst: 'Open a file first.',
        converting: 'Converting...',
        unicodeExportFailed: 'Could not create the Unicode file.',
        pdfGenerating: 'Generating PDF...',
        pdfFailed: 'Could not create the PDF.',
        taggableMarkTitle: 'Not really English? Tap here',
        taggableUnmarkTitle: 'Is this genuine English? Press and hold',
        sheetEnglishLabel: 'This sheet is entirely English/Unicode',
        newFileLabel: 'Open new file',
        searchPlaceholder: 'Search data...',
        dictionaryToggleLabel: 'Use dictionary + statistical guessing for cells with no font info (risky — best left off)',
        aiAssistLabel: 'Check ambiguous words using this device\'s AI',
        aiAssistUnavailable: 'No on-device AI was found on this browser/device. Nothing was sent anywhere.',
        aiAssistChecking: 'Checking with AI... ({done}/{total})',
        aiAssistDone: 'Done — {count} words corrected.',
        aiAssistNoneFound: 'No ambiguous words found to check.',
        loadMoreLabel: 'Load {count} more rows',
      }
    };

    let currentLang = 'hi';
    try {
      const savedLang = localStorage.getItem('yatharoopLang');
      if (savedLang === 'en' || savedLang === 'hi') currentLang = savedLang;
    } catch (err) { /* localStorage unavailable — default to Hindi */ }

    function t(key, vars) {
      const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.hi;
      let str = dict[key] || TRANSLATIONS.hi[key] || key;
      if (vars) Object.keys(vars).forEach(k => { str = str.split('{' + k + '}').join(vars[k]); });
      return str;
    }

    // Tracks which translation key (and variables) currently populate these
    // two dynamic status elements, so a language switch mid-session can
    // properly RE-TRANSLATE the current real status — not just avoid
    // reverting to a stale placeholder, but show "40 rows" style status in
    // whichever language is now selected.
    let tableInfoState = { key: 'tableInfoInitial', vars: null };
    let sheetMetaState = { key: 'sheetMetaInitial', vars: null };

    function setTableInfo(key, vars) {
      tableInfoState = { key, vars };
      tableInfo.textContent = t(key, vars);
    }

    function setSheetMeta(key, vars) {
      sheetMetaState = { key, vars };
      sheetMeta.textContent = t(key, vars);
    }

    function applyTranslations() {
      document.documentElement.lang = currentLang === 'en' ? 'en' : 'hi';
      document.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = t(el.getAttribute('data-i18n'));
      });
      document.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = t(el.getAttribute('data-i18n-html'));
      });
      document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
      });

      // Re-derive these from their tracked state (key + variables), so a
      // language switch mid-session shows the CURRENT real status (e.g.
      // actual row/column counts) in the newly selected language — not a
      // frozen leftover from whichever language was active when it was set.
      const fontDetectEl = document.getElementById('fontDetectStatus');
      if (fontDetectEl) {
        const current = fontDetectEl.textContent;
        const isUntouched = current === TRANSLATIONS.hi.fontDetectChecking || current === TRANSLATIONS.en.fontDetectChecking;
        if (isUntouched) fontDetectEl.textContent = t('fontDetectChecking');
      }
      tableInfo.textContent = t(tableInfoState.key, tableInfoState.vars);
      sheetMeta.textContent = t(sheetMetaState.key, sheetMetaState.vars);

      const hiBtn = document.getElementById('langBtnHi');
      const enBtn = document.getElementById('langBtnEn');
      if (hiBtn && enBtn) {
        hiBtn.style.background = currentLang === 'hi' ? 'var(--accent)' : 'transparent';
        hiBtn.style.color = currentLang === 'hi' ? '#fff' : 'var(--ink)';
        enBtn.style.background = currentLang === 'en' ? 'var(--accent)' : 'transparent';
        enBtn.style.color = currentLang === 'en' ? '#fff' : 'var(--ink)';
      }
    }

    function setLanguage(lang) {
      currentLang = lang;
      try { localStorage.setItem('yatharoopLang', lang); } catch (err) { /* ignore */ }
      applyTranslations();
    }


// ---- Installed / uploaded legacy font detection UI ----
    function detectInstalledFonts() {
      const found = COMMON_LEGACY_FONTS.filter(isFontAvailable);
      const statusEl = document.getElementById('fontDetectStatus');
      const boxEl = document.getElementById('detectedFontsBox');
      const listEl = document.getElementById('detectedFontsList');

      if (found.length) {
        statusEl.textContent = 'आपके फोन में ये फॉन्ट पहले से मौजूद हैं:';
        boxEl.style.display = 'block';
        listEl.innerHTML = '';
        found.forEach(name => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'btn btn-secondary';
          btn.style.cssText = 'font-size:.85rem; padding: 0 14px; min-height: 40px;';
          btn.textContent = name;
          btn.addEventListener('click', () => selectDetectedFont(name, btn));
          listEl.appendChild(btn);
        });
      } else {
        statusEl.textContent = 'कोई जाना-पहचाना फॉन्ट नहीं मिला — नीचे से फॉन्ट फाइल चुनें।';
      }
    }

    function selectDetectedFont(name, btnEl) {
      activeFontFamily = name;
      customFontLoaded = true;
      document.documentElement.style.setProperty('--legacy-font', "'" + name + "'");
      document.querySelectorAll('#detectedFontsList .btn').forEach(b => b.classList.remove('btn-primary'));
      btnEl.classList.add('btn-primary');
      const activeBox = document.getElementById('fontActiveBox');
      activeBox.style.display = 'block';
      activeBox.textContent = '"' + name + '" चुना गया।';
      fontNameBox.style.display = 'none';
    }

    function setStatus(message, type) {
      statusBox.className = 'status';
      if (!message) { statusBox.style.display = 'none'; return; }
      statusBox.textContent = message;
      statusBox.classList.add(type);
      statusBox.style.display = 'block';
    }


    function escapeHTML(value) {
      return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    // Real government files often mix THREE kinds of content in one cell:
    // genuine Unicode Hindi (already correct), raw Kruti-Dev-encoded ASCII
    // (needs the legacy font to read correctly), and plain English words or
    // acronyms (D.R.I., NIL, RCT...). Applying the legacy font uniformly
    // corrupts the genuine Hindi/English portions, since a legacy font like
    // Kruti Dev redraws ANY plain Latin letter as a Devanagari-shaped glyph,
    // with no way to tell "this Latin text is really English" from "this
    // Latin text is Kruti Dev-encoded Hindi" — that ambiguity is inherent to
    // the format itself. What IS unambiguous: a genuine Unicode Devanagari
    // character (U+0900–097F) can only ever be real Hindi, never raw Kruti
    // Dev bytes — so those runs are always protected from the legacy font.

// ---- Manual English-word exceptions (allow-list, tap-to-correct) ----
    const KNOWN_ENGLISH_TERMS = new Set([
      'nil', 'rct', 'fir', 'ipc', 'crpc', 'sho', 'sp', 'dfo', 'ccf', 'pccf',
      'gpf', 'cpf', 'nps', 'pf', 'esi', 'gis', 'lic', 'pan', 'tds', 'ifsc', 'rf',
      'hra', 'da', 'ta', 'gst', 'nagpur', 'dt',
      'agar', 'malwa', 'alirajpur', 'anuppur', 'ashoknagar', 'balaghat',
      'barwani', 'betul', 'bhind', 'bhopal', 'burhanpur', 'chhatarpur',
      'chhindwara', 'damoh', 'datia', 'dewas', 'dhar', 'dindori', 'guna',
      'gwalior', 'harda', 'indore', 'jabalpur', 'jhabua', 'katni', 'khandwa',
      'khargone', 'mandla', 'mandsaur', 'morena', 'narsinghpur', 'neemuch',
      'niwari', 'panna', 'raisen', 'rajgarh', 'ratlam', 'rewa', 'sagar',
      'satna', 'sehore', 'seoni', 'shahdol', 'shajapur', 'sheopur',
      'shivpuri', 'sidhi', 'singrauli', 'tikamgarh', 'ujjain', 'umaria',
      'vidisha', 'chachaura', 'nagda', 'mauganj', 'pandhurna', 'maihar'
    ]);

    // The single source of truth for "treat this word as real English" —
    // starts pre-loaded with the curated set above, and grows every time you
    // tap-correct a word. This is now an ALLOW-list, not a block-list: by
    // default, a plain PC-style viewer assumes EVERY letter is Kruti Dev and
    // draws it with the chosen font, no guessing involved at all. A giant
    // dictionary trying to guess "is this real English" was the actual
    // source of most bugs (uke/flag/eh/das/sen/shah/modi/rana all being
    // real English words that were ALSO genuine Kruti Dev fragments) — so
    // guessing is gone. Only two things are ever protected automatically:
    // genuine Unicode Devanagari (unambiguous), and a digit flanked by
    // digits on both sides across "/", ".", "-", ":" (also unambiguous,
    // since Kruti Dev words never contain embedded digits).
    let userExceptions = new Set(KNOWN_ENGLISH_TERMS);
    try {
      const saved = localStorage.getItem('krutiViewerExceptions');
      if (saved) JSON.parse(saved).forEach(w => userExceptions.add(w));
    } catch (err) { /* localStorage unavailable — feature degrades gracefully */ }

    function saveUserExceptions() {
      try {
        localStorage.setItem('krutiViewerExceptions', JSON.stringify([...userExceptions]));
      } catch (err) { /* ignore — nothing to persist to */ }
    }

    function addUserException(word) {
      userExceptions.add(word.toLowerCase());
      saveUserExceptions();
    }

    // ---- English-dictionary fallback guess (opt-in, off by default) ----
    // See js/data/dictionary.js for why this is gated behind a toggle rather
    // than always-on: a flat word-list lookup mis-fires on short Kruti Dev
    // fragments that are coincidentally also real English words. It only
    // ever applies to cells with no font metadata at all (trustedLegacy is
    // falsy) — a cell the workbook itself already tagged as a legacy font
    // is never second-guessed by the dictionary.
    let useDictionaryGuess = localStorage.getItem('krutiUseDictionary') === 'true';
    if (dictionaryToggle) {
      dictionaryToggle.checked = useDictionaryGuess;
      dictionaryToggle.addEventListener('change', () => {
        useDictionaryGuess = dictionaryToggle.checked;
        try { localStorage.setItem('krutiUseDictionary', String(useDictionaryGuess)); } catch (err) { /* ignore */ }
        if (currentWorkbook && currentSheetName) renderSheet(currentSheetName);
      });
    }


// ---- Cell rendering ----
// trustedLegacy=true means per-cell font metadata already confirmed this
// text uses a legacy font (Kruti Dev / DevLys / etc.) — we skip the
// ambiguous 'is this really Kruti Dev or real English' tap-to-correct UI
// for that certainty, but we STILL run the same digit/word protection so
// real English words or numbers mixed into a legacy cell don't render
// as garbled glyphs. Previously the metadata-confirmed path skipped this
// protection entirely, which was the source of the bad-looking output.
    function renderCellHTML(cellText, trustedLegacy) {
      if (!cellText) return '';
      const runs = [];
      let current = '';
      let currentIsDeva = null;
      for (const ch of cellText) {
        const isDeva = DEVANAGARI_RANGE.test(ch);
        if (currentIsDeva === null || isDeva === currentIsDeva) {
          current += ch;
          currentIsDeva = isDeva;
        } else {
          runs.push({ text: current, isDeva: currentIsDeva });
          current = ch;
          currentIsDeva = isDeva;
        }
      }
      if (current) runs.push({ text: current, isDeva: currentIsDeva });

      return runs.map(run => {
        if (run.isDeva) {
          return '<span class="run-normal-font">' + escapeHTML(run.text) + '</span>';
        }
        // Tokenize into: digit groups, single punctuation marks, letter
        // words, and everything else — checked CHARACTER BY CHARACTER so a
        // date/case-number mixed into the same run as real Kruti Dev letters
        // (e.g. "47118/22 कज़ए" all as one continuous byte sequence) is still
        // handled correctly, instead of requiring the whole run to be clean.
        const pieces = run.text.match(/\d+|[A-Za-z]+|[^\dA-Za-z]/g) || [];
        return pieces.map((piece, i) => {
          if (/^\d+$/.test(piece)) {
            return escapeHTML(piece); // digits are never remapped by any legacy font
          }
          if (/^[A-Za-z]+$/.test(piece)) {
            const lower = piece.toLowerCase();
            // Both of these are STATISTICAL GUESSES, not ground truth — and
            // unlike font metadata, a wrong guess here does something Excel
            // itself structurally cannot do: paint part of one cell in a
            // different font than the rest of it. Excel always uses exactly
            // one font per cell, so it can never be "half right, half
            // wrong" the way a mis-firing guess here can. That's why BOTH
            // guessing signals are opt-in, off by default — the viewer's
            // default behavior should never be riskier than plain Excel.
            const guessingEnabled = !trustedLegacy && useDictionaryGuess;
            const dictionaryHit = guessingEnabled && ENGLISH_DICTIONARY.has(lower) && lower.length >= 3;
            const bigramHit = guessingEnabled && looksStatisticallyEnglish(lower);
            if (userExceptions.has(lower) || dictionaryHit || bigramHit) {
              return '<span class="run-normal-font" data-taggable="true" title="असली अंग्रेज़ी नहीं है? टैप करें">' + escapeHTML(piece) + '</span>';
            }
            const hint = trustedLegacy
              ? 'फाइल के अनुसार यह पुराने फॉन्ट में है — फिर भी असली अंग्रेज़ी शब्द है? दबाकर रखें'
              : 'यह असली अंग्रेज़ी शब्द है? दबाकर रखें';
            return '<span data-taggable="unmark" title="' + hint + '">' + escapeHTML(piece) + '</span>';
          }
          // A lone punctuation mark: protect it ONLY when digits sit on
          // both sides (a real date/case-number separator) — Kruti Dev
          // words never contain embedded digits, so this is unambiguous.
          const prevIsDigit = i > 0 && /^\d+$/.test(pieces[i - 1]);
          const nextIsDigit = i < pieces.length - 1 && /^\d+$/.test(pieces[i + 1]);
          if (prevIsDigit && nextIsDigit && /^[.\-/:,%]$/.test(piece)) {
            return '<span class="run-normal-font">' + escapeHTML(piece) + '</span>';
          }
          return escapeHTML(piece);
        }).join('');
      }).join('');
    }

    // Tapping a word tells the tool which way it should go:
    // - a legacy-font word tapped once means "this is real English" (added
    //   to the exceptions list, shown normally from then on)
    // - an already-exempted word tapped again means "no, treat this as
    //   Kruti Dev" (removed from the list, shown with the legacy font)
    // Either way it's remembered on this device for every future file.
    outputTable.addEventListener('click', (e) => {
      const span = e.target.closest('[data-taggable]');
      if (!span) return;
      e.preventDefault();
      const word = span.textContent;
      const mode = span.getAttribute('data-taggable');
      if (mode === 'unmark') {
        addUserException(word);
        if (typeof learnWord === 'function') learnWord(word, true); // confirmed: real English
      } else {
        userExceptions.delete(word.toLowerCase());
        saveUserExceptions();
        if (typeof learnWord === 'function') learnWord(word, false); // confirmed: actually Kruti Dev
      }
      const cell = span.closest('td, th');
      if (cell) {
        const rawText = cell.textContent;
        cell.innerHTML = renderCellHTML(rawText);
      }
    });


    function updateFileName() {
      const file = fileInput.files[0];
      fileNameBox.style.display = file ? 'block' : 'none';
      fileNameBox.innerHTML = file ? '<strong>चयनित फाइल:</strong> ' + escapeHTML(file.name) : '';
    }

// ---- Legacy font file upload (user-supplied .ttf/.otf) ----
    async function handleFontUpload() {
      const file = fontFileInput.files[0];
      if (!file) return;
      fontNameBox.style.display = 'block';
      fontNameBox.innerHTML = '<strong>चयनित फॉन्ट:</strong> ' + escapeHTML(file.name);
      document.querySelectorAll('#detectedFontsList .btn').forEach(b => b.classList.remove('btn-primary'));
      document.getElementById('fontActiveBox').style.display = 'none';

      fontStatusBox.className = 'status loading';
      fontStatusBox.style.display = 'block';
      fontStatusBox.textContent = 'फॉन्ट लोड हो रहा है...';
      try {
        const buffer = await file.arrayBuffer();
        const fontFace = new FontFace('LegacyOfficeFont', buffer);
        await fontFace.load();
        document.fonts.add(fontFace);
        customFontLoaded = true;
        activeFontFamily = 'LegacyOfficeFont';
        document.documentElement.style.setProperty('--legacy-font', "'LegacyOfficeFont'");
        fontStatusBox.className = 'status success';
        fontStatusBox.textContent = 'फॉन्ट तैयार है।';
      } catch (err) {
        console.error(err);
        customFontLoaded = false;
        activeFontFamily = null;
        fontStatusBox.className = 'status error';
        fontStatusBox.textContent = 'यह फॉन्ट फाइल नहीं खुली। .ttf या .otf फाइल चुनें।';
      }
    }

// ---- Sheet rendering ----
    // Building one giant HTML string (or one giant DOM tree) for every row
    // of a huge sheet in one go is the #1 documented weakness of this kind
    // of viewer — the tab freezes or the browser flags the page as
    // unresponsive well before 100,000 cells. Rather than a full virtual
    // scroller (a much bigger change), this renders in fixed-size chunks:
    // the first chunk appears immediately, and a "load more" button pulls
    // in the rest on demand. Search still works across the WHOLE sheet —
    // typing a query auto-loads any remaining rows first (see filterTable).
    const ROWS_PER_CHUNK = 1500;
    let renderState = null; // { jsonData, spanInfo, cellFonts, maxCols, numRows, nextRow, forceEnglish }

    // Real .xlsx files exported by report-generator tools (not saved by
    // Excel itself) sometimes have NO styles.xml at all — plain English
    // data with zero legacy-font metadata to go on. Without any signal,
    // the default assumption ("every letter might be Kruti Dev") makes
    // every name/place in a pure-English sheet look like it needs
    // conversion. Rather than guess, this is a one-click manual override:
    // mark the WHOLE sheet as English/Unicode and skip the guessing
    // entirely for it. Remembered per sheet name, reset when a new file
    // is opened (a sheet name from a different workbook isn't the same
    // sheet, even if it happens to share the name).
    let englishSheets = new Set();
    if (sheetEnglishToggle) {
      sheetEnglishToggle.addEventListener('change', () => {
        if (!currentSheetName) return;
        if (sheetEnglishToggle.checked) englishSheets.add(currentSheetName);
        else englishSheets.delete(currentSheetName);
        renderSheet(currentSheetName);
      });
    }

    // ---- On-device AI assist (opt-in, explicit action only) ----
    // This is deliberately NOT automatic and NOT a background process. It
    // only runs when someone taps the button, and it only ever uses AI
    // that's already built into THIS device's browser (Chrome's on-device
    // Prompt API / Gemini Nano, where available) — never a server we run,
    // never an API key, never a network request. If the device has no such
    // AI, we say so plainly and do nothing else. This keeps the "yatharoop
    // never sends your file anywhere" promise intact even when using AI:
    // the file still never leaves the browser, because the AI itself is
    // already sitting inside the browser.
    async function getOnDeviceAISession() {
      try {
        if (typeof LanguageModel !== 'undefined') {
          const avail = await LanguageModel.availability();
          if (avail === 'unavailable') return null;
          return await LanguageModel.create();
        }
        if (typeof window.ai !== 'undefined' && window.ai.languageModel) {
          const caps = await window.ai.languageModel.capabilities();
          if (caps.available === 'no') return null;
          return await window.ai.languageModel.create();
        }
      } catch (err) {
        console.error('on-device AI unavailable:', err);
      }
      return null;
    }

    async function askDeviceAIIsEnglish(session, word) {
      const prompt = 'Answer with exactly one word, YES or NO. Is "' + word +
        '" a real, standalone English word or abbreviation (not a fragment produced by ' +
        'typing Hindi in the Kruti Dev keyboard layout, which reuses ASCII letters as ' +
        'Devanagari glyph codes)? Word: ' + word;
      try {
        const response = await session.prompt(prompt);
        return /^\s*yes/i.test(response);
      } catch (err) {
        return null; // treat a failed single query as "couldn't determine", not as a NO
      }
    }

    if (aiAssistBtn) {
      aiAssistBtn.addEventListener('click', async () => {
        aiAssistBtn.disabled = true;
        aiAssistStatus.textContent = '';
        const session = await getOnDeviceAISession();
        if (!session) {
          aiAssistStatus.textContent = t('aiAssistUnavailable');
          aiAssistBtn.disabled = false;
          return;
        }
        const spans = Array.from(outputTable.querySelectorAll('[data-taggable="unmark"], [data-taggable="true"]'));
        const uniqueWords = [...new Set(spans.map(s => s.textContent.trim()).filter(w => w.length >= 3))];
        if (!uniqueWords.length) {
          aiAssistStatus.textContent = t('aiAssistNoneFound');
          aiAssistBtn.disabled = false;
          if (session.destroy) session.destroy();
          return;
        }
        let corrected = 0;
        for (let i = 0; i < uniqueWords.length; i++) {
          const word = uniqueWords[i];
          aiAssistStatus.textContent = t('aiAssistChecking', { done: i + 1, total: uniqueWords.length });
          const isEnglish = await askDeviceAIIsEnglish(session, word);
          if (isEnglish === null) continue;
          if (isEnglish) addUserException(word); else userExceptions.delete(word.toLowerCase());
          saveUserExceptions();
          if (typeof learnWord === 'function') learnWord(word, isEnglish);
          corrected++;
        }
        if (session.destroy) session.destroy();
        if (currentSheetName) renderSheet(currentSheetName);
        aiAssistStatus.textContent = t('aiAssistDone', { count: corrected });
        aiAssistBtn.disabled = false;
      });
    }

    function buildRowHTML(r, spanInfo, jsonData, maxCols, cellFonts, forceEnglish) {
      let rowHTML = '<tr>';
      for (let c = 0; c < maxCols; c++) {
        const info = spanInfo[r][c];
        if (info === 'skip') continue;
        const cell = jsonData[r] ? jsonData[r][c] : undefined;
        const cellText = cell != null ? String(cell) : '';
        const hasText = cellText.trim() !== '';
        const span = info || { rowspan: 1, colspan: 1 };
        const isTitleBar = span.colspan >= maxCols && hasText;
        const isHeaderLike = !isTitleBar && hasText && (span.rowspan > 1 || span.colspan > 1);
        let cls = '';
        if (isTitleBar) cls = ' class="row-title-cell"';
        else if (isHeaderLike) cls = ' class="row-header-cell"';
        const attrs = 'contenteditable="true" spellcheck="false"' +
          (span.rowspan > 1 ? ' rowspan="' + span.rowspan + '"' : '') +
          (span.colspan > 1 ? ' colspan="' + span.colspan + '"' : '') +
          cls;

        let cellHTML;
        if (forceEnglish) {
          cellHTML = '<span class="run-normal-font">' + escapeHTML(cellText) + '</span>';
        } else {
          const address = colIndexToLetters(c) + (r + 1);
          const knownFont = cellFonts ? cellFonts[address] : null;
          if (knownFont && isLegacyFontName(knownFont)) {
            cellHTML = renderCellHTML(cellText, true);
          } else if (knownFont && STANDARD_UNICODE_FONTS.has(knownFont.toLowerCase())) {
            cellHTML = '<span class="run-normal-font">' + escapeHTML(cellText) + '</span>';
          } else {
            cellHTML = renderCellHTML(cellText, false);
          }
        }
        rowHTML += '<td ' + attrs + '>' + cellHTML + '</td>';
      }
      return rowHTML + '</tr>';
    }

    function renderMoreRows(count) {
      if (!renderState) return;
      const end = Math.min(renderState.nextRow + count, renderState.numRows);
      let html = '';
      for (let r = renderState.nextRow; r < end; r++) {
        html += buildRowHTML(r, renderState.spanInfo, renderState.jsonData, renderState.maxCols, renderState.cellFonts, renderState.forceEnglish);
      }
      let tbody = outputTable.querySelector('tbody');
      if (!tbody) {
        tbody = document.createElement('tbody');
        outputTable.appendChild(tbody);
      }
      tbody.insertAdjacentHTML('beforeend', html);
      renderState.nextRow = end;

      const remaining = renderState.numRows - renderState.nextRow;
      if (remaining > 0) {
        loadMoreRow.style.display = 'block';
        loadMoreBtn.textContent = t('loadMoreLabel', { count: remaining.toLocaleString(currentLang === 'en' ? 'en-IN' : 'hi-IN') });
      } else {
        loadMoreRow.style.display = 'none';
      }
    }

    loadMoreBtn.addEventListener('click', () => renderMoreRows(ROWS_PER_CHUNK));

    // Search and export must see the WHOLE sheet, not just whatever chunk
    // happens to be loaded on screen — silently searching or exporting a
    // partial table would be worse than the freeze this pagination avoids.
    function ensureFullyLoaded() {
      if (renderState && renderState.nextRow < renderState.numRows) {
        renderMoreRows(renderState.numRows - renderState.nextRow);
      }
    }

    function renderSheet(sheetName) {
      currentSheetName = sheetName;
      const worksheet = currentWorkbook.Sheets[sheetName];
      // raw:false reads the FORMATTED text (how Excel actually displays a
      // cell) instead of the raw underlying value — otherwise a real date
      // cell shows as "45631" and a percentage shows as "0.15".
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

      if (!jsonData.length) {
        setStatus('इस शीट में कोई डेटा नहीं मिला।', 'error');
        tableWrapper.style.display = 'none';
        emptyState.style.display = 'block';
        tableInfo.textContent = 'कोई डेटा उपलब्ध नहीं।';
        sheetMeta.textContent = 'शीट: ' + sheetName;
        return;
      }

      // Use the sheet's own declared range for column/row counts — guessing
      // from row lengths would silently drop a column that happens to be
      // blank in every row (row lengths only reflect the last non-empty cell).
      const range = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']) : null;
      const maxCols = range ? (range.e.c - range.s.c + 1) : Math.max(...jsonData.map(row => row.length));
      const numRows = range ? (range.e.r - range.s.r + 1) : jsonData.length;

      // Reconstruct merged cells (title banners, multi-row headers, etc.)
      // exactly like Excel does, instead of assuming row 0 is "the header"
      // and leaving every merged-away cell looking blank.
      const spanInfo = Array.from({ length: numRows }, () => Array(maxCols).fill(null));
      const merges = worksheet['!merges'] || [];
      merges.forEach(m => {
        if (m.s.r >= numRows || m.s.c >= maxCols) return;
        const rowspan = Math.min(m.e.r, numRows - 1) - m.s.r + 1;
        const colspan = Math.min(m.e.c, maxCols - 1) - m.s.c + 1;
        spanInfo[m.s.r][m.s.c] = { rowspan, colspan };
        for (let r = m.s.r; r <= Math.min(m.e.r, numRows - 1); r++) {
          for (let c = m.s.c; c <= Math.min(m.e.c, maxCols - 1); c++) {
            if (r === m.s.r && c === m.s.c) continue;
            spanInfo[r][c] = 'skip';
          }
        }
      });

      // Ground-truth per-cell fonts, straight from the file itself — this
      // is what actually eliminates guessing, for the cells where it's
      // available (XLSX only; old .xls falls back to the heuristic below).
      const cellFonts = getSheetCellFonts(currentWorkbook, sheetName);

      outputTable.innerHTML = '';
      renderState = { jsonData, spanInfo, cellFonts, maxCols, numRows, nextRow: 0, forceEnglish: englishSheets.has(sheetName) };
      if (sheetEnglishToggle) sheetEnglishToggle.checked = renderState.forceEnglish;
      renderMoreRows(ROWS_PER_CHUNK);

      tableWrapper.style.display = 'block';
      emptyState.style.display = 'none';
      document.body.classList.add('viewer-active');
      tableInfo.textContent = 'फाइल सफलतापूर्वक पढ़ी गई। नीचे तालिका देखें।';
      sheetMeta.textContent = 'शीट: ' + sheetName + ' • पंक्तियाँ: ' + jsonData.length + ' • कॉलम: ' + maxCols;
      setStatus(customFontLoaded ? 'फाइल खुल गई।' : 'फाइल खुल गई, पर फॉन्ट के बिना — रूप सही नहीं होगा।', customFontLoaded ? 'success' : 'error');
    }


// ---- File loading ----
    function readExcel() {
      if (!fileInput.files.length) {
        setStatus('पहले कोई एक्सेल फाइल चुनें।', 'error');
        return;
      }
      if (typeof XLSX === 'undefined') {
        setStatus('ज़रूरी लाइब्रेरी लोड नहीं हुई — पेज को दोबारा खोलकर देखें।', 'error');
        return;
      }
      if (!customFontLoaded) {
        setStatus('फॉन्ट चुना नहीं गया — फिर भी दिखाया जा रहा है, पर रूप सही नहीं होगा...', 'loading');
      } else {
        setStatus('फाइल खोली जा रही है...', 'loading');
      }

      tableWrapper.style.display = 'none';
      emptyState.style.display = 'none';
      outputTable.innerHTML = '';
      tableInfo.textContent = 'फाइल प्रोसेस हो रही है...';
      sheetMeta.textContent = 'डेटा तैयार किया जा रहा है...';

      const file = fileInput.files[0];
      const reader = new FileReader();

      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          currentWorkbook = XLSX.read(data, { type: 'array', bookFiles: true });
          englishSheets = new Set();
          workbookFontCache = parseWorkbookFontMaps(currentWorkbook);
          sheetCellFontCache = {};
          // No xl/styles.xml means this isn't a zip/xlsx at all — it's the
          // old binary .xls format, which stores font info differently
          // (see biffFontParser.js). Try reading it directly from the raw
          // bytes rather than falling back to guessing.
          biffFontCache = null;
          if (!workbookFontCache && typeof parseBiffFontMap === 'function') {
            try { biffFontCache = parseBiffFontMap(data); } catch (err) { console.error('BIFF font parse failed:', err); }
          }
          detectFontNameInFile(data, currentWorkbook, file.name);

          const sheetSelector = document.getElementById('sheetSelector');
          if (currentWorkbook.SheetNames.length > 1) {
            sheetSelector.innerHTML = currentWorkbook.SheetNames
              .map(name => '<option value="' + escapeHTML(name) + '">' + escapeHTML(name) + '</option>')
              .join('');
            sheetSelector.style.display = 'inline-block';
          } else {
            sheetSelector.style.display = 'none';
          }

          renderSheet(currentWorkbook.SheetNames[0]);

          setTimeout(() => {
            tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 120);
        } catch (error) {
          console.error(error);
          const msg = String((error && error.message) || '');
          let userMsg, infoMsg;
          if (/password/i.test(msg)) {
            userMsg = 'यह फाइल पासवर्ड-सुरक्षित है — इसे यहाँ सीधे नहीं खोला जा सकता।';
            infoMsg = 'पहले Excel में पासवर्ड हटाकर फिर से कोशिश करें।';
          } else {
            userMsg = 'यह फाइल नहीं खुल पाई। यह दूषित (corrupted) हो सकती है या असमर्थित प्रारूप में हो सकती है।';
            infoMsg = 'सही .xlsx या .xls फाइल चुनकर देखें।';
          }
          setStatus(userMsg, 'error');
          tableWrapper.style.display = 'none';
          emptyState.style.display = 'block';
          tableInfo.textContent = 'फाइल खोलने में गड़बड़ी हुई।';
          sheetMeta.textContent = infoMsg;
        }
      };

      reader.onerror = function() {
        setStatus('फाइल लोड नहीं हुई। दोबारा कोशिश करें।', 'error');
      };

      reader.readAsArrayBuffer(file);
    }


// ---- Sheet switcher, download-as-HTML, misc event wiring ----
    document.getElementById('sheetSelector').addEventListener('change', (e) => {
      if (currentWorkbook) renderSheet(e.target.value);
    });

    function downloadCurrentHTML() {
      ensureFullyLoaded();
      const htmlContent = '<!DOCTYPE html>\n' + document.documentElement.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'yatharoop.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }

    fileInput.addEventListener('change', updateFileName);
    fontFileInput.addEventListener('change', handleFontUpload);
    readBtn.addEventListener('click', readExcel);
    scrollTopBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    newFileBtn.addEventListener('click', () => {
      document.body.classList.remove('viewer-active');
      tableWrapper.style.display = 'none';
      emptyState.style.display = 'block';
      outputTable.innerHTML = '';
      renderState = null;
      englishSheets = new Set();
      currentWorkbook = null;
      currentSheetName = null;
      fileInput.value = '';
      fileNameBox.style.display = 'none';
      tableInfo.textContent = 'अभी कोई फाइल नहीं खोली गई है।';
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    downloadHtmlBtn.addEventListener('click', downloadCurrentHTML);

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.add('dragover');
      });
    });
    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault(); e.stopPropagation();
        dropzone.classList.remove('dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (files && files.length) { fileInput.files = files; updateFileName(); }
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));


    // ============================================================
    // Kruti Dev -> Unicode converter (used ONLY for the "Unicode Excel"
    // export button below, never for on-screen viewing — the font-based
    // view stays the primary, most-accurate way to look at the file).
    // ============================================================
// Kruti Dev -> Unicode Hindi converter
// Ported from https://github.com/ltrc/kru2uni (LTRC, IIIT Hyderabad)
// via https://github.com/anthro-ai/krutidev-unicode (ISC licensed JS port)
// Adapted here into a single dependency-free browser function.


// ---- PDF export ----
    async function exportToPdf() {
      if (!outputTable.querySelector('tr')) {
        setStatus('पहले कोई फाइल खोलें।', 'error');
        return;
      }
      ensureFullyLoaded();
      exportPdfBtn.disabled = true;
      const originalLabel = exportPdfBtn.textContent;
      exportPdfBtn.textContent = 'PDF बन रहा है...';
      try {
        // Capture each row's vertical position BEFORE rasterizing, so page
        // breaks can land between rows instead of slicing through the
        // middle of one (which is what a fixed-height slice would do).
        const tableRect = outputTable.getBoundingClientRect();
        const rowBoundaries = [...outputTable.querySelectorAll('tr')].map(tr => {
          const r = tr.getBoundingClientRect();
          return r.bottom - tableRect.top; // bottom edge, relative to table top, in CSS px
        });

        const canvas = await html2canvas(outputTable, { scale: 2, backgroundColor: '#ffffff' });
        const { jsPDF } = window.jspdf;
        const pageWidthMm = 287; // A4 landscape usable width minus margins
        const pageHeightMm = 190; // A4 landscape usable height minus margins
        const pxPerMm = canvas.width / pageWidthMm;
        const pageHeightPx = Math.floor(pageHeightMm * pxPerMm);
        const cssToCanvasScale = canvas.width / tableRect.width;
        const rowBoundariesPx = rowBoundaries.map(b => b * cssToCanvasScale);

        function findBreakPoint(fromPx, maxPx) {
          const target = Math.min(fromPx + maxPx, canvas.height);
          if (target >= canvas.height) return canvas.height;
          // Find the last row boundary that fits within this page's budget.
          let best = -1;
          for (const b of rowBoundariesPx) {
            if (b > fromPx && b <= target) best = b;
          }
          // No row fits at all (a single row taller than a full page) —
          // fall back to a hard cut rather than looping forever.
          return best > fromPx ? best : target;
        }

        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        let renderedPx = 0;
        let firstPage = true;
        while (renderedPx < canvas.height) {
          const breakPx = findBreakPoint(renderedPx, pageHeightPx);
          const sliceHeightPx = breakPx - renderedPx;
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeightPx;
          const ctx = pageCanvas.getContext('2d');
          ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
          const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
          if (!firstPage) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 10, 10, pageWidthMm, sliceHeightPx / pxPerMm);
          renderedPx = breakPx;
          firstPage = false;
        }
        pdf.save('yatharoop.pdf');
      } catch (err) {
        console.error(err);
        setStatus('PDF नहीं बन पाया।', 'error');
      } finally {
        exportPdfBtn.disabled = false;
        exportPdfBtn.textContent = originalLabel;
      }
    }


// ---- Search / filter ----
function filterTable() {
  const filter = searchInput.value.trim().toUpperCase();
  if (filter) ensureFullyLoaded(); // a search must see every row, not just the loaded chunk
  const rows = outputTable.querySelectorAll('tbody tr');
  rows.forEach(row => {
    const text = row.textContent.toUpperCase();
    row.style.display = text.includes(filter) ? '' : 'none';
  });
}
if (searchInput) searchInput.addEventListener('input', filterTable);

// ---- Final wiring ----
    exportPdfBtn.addEventListener('click', exportToPdf);
    exportUnicodeBtn.addEventListener('click', exportToUnicodeExcel);
    document.getElementById('langBtnHi').addEventListener('click', () => setLanguage('hi'));
    document.getElementById('langBtnEn').addEventListener('click', () => setLanguage('en'));
    applyTranslations();

    detectInstalledFonts();
