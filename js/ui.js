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
    const viewModeUnicodeBtn = document.getElementById('viewModeUnicodeBtn');
    const viewModeLegacyBtn = document.getElementById('viewModeLegacyBtn');
    const viewModeWarning = document.getElementById('viewModeWarning');
    const aiAssistBtn = document.getElementById('aiAssistBtn');
    const aiAssistStatus = document.getElementById('aiAssistStatus');
    const downloadHtmlBtn = document.getElementById('downloadHtmlBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportUnicodeBtn = document.getElementById('exportUnicodeBtn');
    const searchInput = document.getElementById('searchInput');
    const dictionaryToggle = document.getElementById('dictionaryToggle');
    const tableScrollBox = document.getElementById('tableScrollBox');

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
        resumeTitle: 'पिछली फ़ाइल मिली',
        resumeOpen: 'फिर से खोलें',
        resumeDismiss: 'हटाएँ',
        savedOnDevice: 'इस डिवाइस पर सेव हो गई — अगली बार सीधे खुलेगी',
        clearSavedLabel: 'सेव की गई कॉपी मिटाएँ',
        fsaPickLabel: 'फ़ाइल सिस्टम से चुनें — अगली बार सीधे याद रहेगी',
        formulaCellTitle: 'यह मान फॉर्मूला से गणना हुआ है: {formula}',
        recentFilesTitle: 'हाल की फ़ाइलें',
        recentFilesClear: 'सब मिटाएँ',
        recentFilesRemove: 'सूची से हटाएँ',
        recentFileMissing: 'यह सेव की गई फाइल अब उपलब्ध नहीं है।',
        sheetMetaInitial: 'शीट की जानकारी यहाँ दिखेगी।',
        scrollTopLabel: 'ऊपर जाएं',
        editHint: 'किसी भी सेल पर टैप करके उसे सीधे ठीक किया जा सकता है। अगर कोई शब्द गलती से अंग्रेज़ी मानकर छोड़ दिया गया हो, उस पर टैप करें — अगली बार से यह ऐसी गलती नहीं दोहराएगा।',
        footerText: 'यथारूप पूरी तरह ब्राउज़र में चलता है — कोई फाइल कभी किसी सर्वर पर नहीं जाती। इस पेज को अपने पास सहेजने के लिए ऊपर "HTML फाइल के रूप में सहेजें" दबाएँ। ध्यान रहे, दोबारा खोलने पर फॉन्ट फिर से चुनना होगा।',
        footerCredit: 'बनाया: चैतन्य द्वारा, Claude (Anthropic) की सहायता से।',

        fileUsesFont: 'इस फाइल में यह फॉन्ट दर्ज है: {fonts} — यही फॉन्ट चुनें तो रूप सही आएगा।',
        fileUsesStandardFont: 'इस फाइल में सामान्य फॉन्ट है: {fonts} — कोई पुराना फॉन्ट चुनने की ज़रूरत नहीं, यह पहले से सही दिखेगी।',
        fontMissingSearchPrefix: 'यह फॉन्ट आपके फोन में नहीं मिला। खोजें:',
        fontMissingSearchWarn: '(हम कोई फॉन्ट खुद नहीं देते — डाउनलोड से पहले साइट पर भरोसा करें।)',
        exportSkippedSummary: 'यूनिकोड फाइल बन गई, लेकिन कुछ सेल नहीं बदले जा सके — इनके लिए अभी कोई कनवर्टर नहीं है: {details}',
        exportSkippedDetail: '{font} ({count} सेल)',
        exportSkippedJoiner: ', ',
        exportSkippedUnknownFont: 'अज्ञात फॉन्ट',
        exportMismatchSummary: '{count} सेल में फॉन्ट जानकारी उलझी लग रही है — इन्हें हाथ से जांच लें: {addresses}',
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
        viewModeLegacy: 'मूल फॉन्ट',
        viewModeUnicode: 'यूनिकोड अनुमान',
        viewModeUnicodeWarning: 'यह एक अनुमान है, हमेशा सही नहीं होगा — पक्का देखने के लिए मूल फॉन्ट में देखें।',
        readingWorkbook: 'वर्कबुक पढ़ी जा रही है',
        detectingFonts: 'फॉन्ट पहचाने जा रहे हैं',
        preparingPreview: 'पूर्वावलोकन तैयार हो रहा है...',
        openWorkbookLabel: 'वर्कबुक खोलें',
        summarySheetsRows: '{sheets} शीट • कुल {rows} पंक्तियाँ',
        summaryFontDetected: 'फॉन्ट मिला: {font}',
        summaryFontNotDetected: 'कोई फॉन्ट जानकारी नहीं मिली — अनुमान से दिखाया जाएगा',
        newFileLabel: 'नई फाइल खोलें',
        searchPlaceholder: 'डेटा खोजें...',
        dictionaryToggleLabel: 'बिना फॉन्ट-जानकारी वाले सेल में शब्दकोश और सांख्यिकीय अनुमान से पता लगाएं (जोखिम भरा — बंद रहना बेहतर)',
        aiAssistLabel: 'अस्पष्ट शब्दों की जांच इस डिवाइस के AI से करें',
        aiAssistUnavailable: 'इस ब्राउज़र/डिवाइस पर कोई ऑन-डिवाइस AI उपलब्ध नहीं मिला। कुछ भी कहीं नहीं भेजा गया।',
        aiAssistChecking: 'AI से जांच हो रही है... ({done}/{total})',
        aiAssistDone: 'पूरा हुआ — {count} शब्द ठीक किए गए।',
        aiAssistNoneFound: 'जांचने के लिए कोई अस्पष्ट शब्द नहीं मिला।',
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
        resumeTitle: 'Found your last file',
        resumeOpen: 'Open again',
        resumeDismiss: 'Discard',
        savedOnDevice: 'Saved on this device — will open directly next time',
        clearSavedLabel: 'Clear saved copy',
        fsaPickLabel: 'Pick via file system — remembers directly next time',
        formulaCellTitle: 'This value is calculated by a formula: {formula}',
        recentFilesTitle: 'Recent files',
        recentFilesClear: 'Clear all',
        recentFilesRemove: 'Remove from list',
        recentFileMissing: 'This saved file is no longer available.',
        sheetMetaInitial: 'Sheet info will appear here.',
        scrollTopLabel: 'Scroll to top',
        editHint: 'Tap any cell to fix it directly. If a word got wrongly left as English, tap it — it won\'t make that mistake again next time.',
        footerText: 'Yatharoop runs entirely in the browser — no file is ever sent to a server. To save this page, press "Save as HTML file" above. Note: you\'ll need to choose the font again when reopening it.',
        footerCredit: 'Made by Chaitanya, with help from Claude (Anthropic).',

        fileUsesFont: 'This file uses the font: {fonts} — choose this font for the correct look.',
        fileUsesStandardFont: 'This file uses a standard font: {fonts} — no legacy font needed, it should already look correct.',
        fontMissingSearchPrefix: "This font wasn't found on your device. Search:",
        fontMissingSearchWarn: "(We don't host or provide any font ourselves — check the site before downloading.)",
        exportSkippedSummary: "Unicode file created, but some cells couldn't be converted — no converter yet for: {details}",
        exportSkippedDetail: '{font} ({count} cell{plural})',
        exportSkippedJoiner: ', ',
        exportSkippedUnknownFont: 'unknown font',
        exportMismatchSummary: '{count} cell{plural} have font info that looks inconsistent with their content — worth checking by hand: {addresses}',
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
        viewModeLegacy: 'Original font',
        viewModeUnicode: 'Unicode guess',
        viewModeUnicodeWarning: 'This is a best-effort guess, not always accurate — switch to Original font to check for sure.',
        readingWorkbook: 'Reading workbook',
        detectingFonts: 'Detecting fonts',
        preparingPreview: 'Preparing preview...',
        openWorkbookLabel: 'Open Workbook',
        summarySheetsRows: '{sheets} sheets • {rows} total rows',
        summaryFontDetected: 'Font found: {font}',
        summaryFontNotDetected: 'No font info found — will show a best-effort guess',
        newFileLabel: 'Open new file',
        searchPlaceholder: 'Search data...',
        dictionaryToggleLabel: 'Use dictionary + statistical guessing for cells with no font info (risky — best left off)',
        aiAssistLabel: 'Check ambiguous words using this device\'s AI',
        aiAssistUnavailable: 'No on-device AI was found on this browser/device. Nothing was sent anywhere.',
        aiAssistChecking: 'Checking with AI... ({done}/{total})',
        aiAssistDone: 'Done — {count} words corrected.',
        aiAssistNoneFound: 'No ambiguous words found to check.',
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

      const toggleLabel = document.getElementById('langToggleLabel');
      if (toggleLabel) {
        // Button shows the OTHER language — tapping it switches TO that one.
        toggleLabel.textContent = currentLang === 'hi' ? 'EN' : 'हिं';
      }
    }

    function setLanguage(lang) {
      currentLang = lang;
      try { localStorage.setItem('yatharoopLang', lang); } catch (err) { /* ignore */ }
      applyTranslations();
    }

    function toggleLanguage() {
      setLanguage(currentLang === 'hi' ? 'en' : 'hi');
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
      if (file) detectFontFromSelectedFile(file);
    }

    // Runs the SAME detection readExcel() would eventually do, but the
    // moment a file is picked — before the user has to guess which font to
    // choose. This is a self-contained probe: it parses its own throwaway
    // copy of the workbook purely to populate the hint box, and doesn't
    // touch currentWorkbook or any render state, so it can never conflict
    // with the real parse that happens later when "खोलें" is pressed.
    function detectFontFromSelectedFile(file) {
      const hintBox = document.getElementById('fileFontHint');
      if (hintBox) { hintBox.style.display = 'none'; hintBox.innerHTML = ''; }
      if (typeof XLSX === 'undefined') return;

      const reader = new FileReader();
      reader.onload = function(e) {
        try {
          const data = new Uint8Array(e.target.result);
          const probeWorkbook = XLSX.read(data, { type: 'array', bookFiles: true });
          const probeStylesMap = parseWorkbookFontMaps(probeWorkbook);
          let probeBiffMap = null;
          if (!probeStylesMap && typeof parseBiffFontMap === 'function') {
            try { probeBiffMap = parseBiffFontMap(data); } catch (err) { /* ignore */ }
          }
          detectFontNameInFile(data, probeWorkbook, file.name, probeBiffMap);
        } catch (err) {
          // Not fatal — "खोलें" will surface the real error with a proper
          // message. This probe just silently gives up on the early hint.
          console.warn('early font detection failed (non-fatal):', err);
        }
      };
      reader.readAsArrayBuffer(file);
    }

// ---- Legacy font file upload (user-supplied .ttf/.otf) ----
    async function applyLegacyFontBuffer(buffer, label) {
      fontStatusBox.className = 'status loading';
      fontStatusBox.style.display = 'block';
      fontStatusBox.textContent = 'फॉन्ट लोड हो रहा है...';
      try {
        const fontFace = new FontFace('LegacyOfficeFont', buffer);
        await fontFace.load();
        document.fonts.add(fontFace);
        customFontLoaded = true;
        activeFontFamily = 'LegacyOfficeFont';
        document.documentElement.style.setProperty('--legacy-font', "'LegacyOfficeFont'");
        fontStatusBox.className = 'status success';
        fontStatusBox.textContent = 'फॉन्ट तैयार है।';
        return true;
      } catch (err) {
        console.error(err);
        customFontLoaded = false;
        activeFontFamily = null;
        fontStatusBox.className = 'status error';
        fontStatusBox.textContent = 'यह फॉन्ट फाइल नहीं खुली। .ttf या .otf फाइल चुनें।';
        return false;
      }
    }

    async function handleFontUpload() {
      const file = fontFileInput.files[0];
      if (!file) return;
      fontNameBox.style.display = 'block';
      fontNameBox.innerHTML = '<strong>चयनित फॉन्ट:</strong> ' + escapeHTML(file.name);
      document.querySelectorAll('#detectedFontsList .btn').forEach(b => b.classList.remove('btn-primary'));
      document.getElementById('fontActiveBox').style.display = 'none';

      const buffer = await file.arrayBuffer();
      const ok = await applyLegacyFontBuffer(buffer, file.name);
      if (ok) {
        // Fire-and-forget: don't block the UI on the save completing. This
        // is purely so the SAME font doesn't have to be re-picked from
        // Downloads next time — it never leaves this device either way.
        saveLastFont(file.name, buffer);
      }
    }


// ---- Sheet rendering ----
    // Building the full DOM of a huge sheet in one go is the #1 documented
    // weakness of this kind of viewer — the tab freezes or the browser
    // flags the page as unresponsive well before 100,000 cells. This keeps
    // only a WINDOW of rows actually in the DOM at once
    // (VIRTUAL_WINDOW_ROWS), with two spacer <tr>s (empty, fixed-height)
    // standing in for everything above/below the window so the scrollbar
    // and scroll position behave exactly as if all rows were present.
    // Scrolling re-centers the window; row height is estimated from what's
    // actually on screen and self-corrects every re-render (title/header
    // rows are taller than plain data rows, so a single fixed guess would
    // drift). Search and export still need every row physically in the
    // DOM at once — see ensureFullyLoaded(), which renders everything and
    // switches this sheet out of windowed mode for the rest of its life
    // (same tradeoff the old chunked loader made: pay the full-render cost
    // once, permanently, rather than re-virtualize a sheet you already
    // know the user wants searched/exported in full).
    const VIRTUAL_WINDOW_ROWS = 600;
    let renderState = null; // { jsonData, spanInfo, cellFonts, maxCols, numRows, forceEnglish, windowStart, windowEnd, rowOriginFloor, avgRowHeight, fullyLoaded }

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
    let fileLoadToken = 0; // bumped on every load attempt; discards results from a superseded, slower read
    // View mode: 'unicode' shows a best-effort converted guess immediately,
    // no font file needed at all. 'legacy' shows the raw bytes through the
    // actual uploaded font — the only way to see EXACTLY what the original
    // author typed. Defaults to 'unicode'; the accuracy tradeoff is real
    // and shown as a standing warning whenever this mode is active.
    let viewMode = localStorage.getItem('krutiViewMode') || 'unicode';
    if (sheetEnglishToggle) {
      sheetEnglishToggle.addEventListener('change', () => {
        if (!currentSheetName) return;
        if (sheetEnglishToggle.checked) englishSheets.add(currentSheetName);
        else englishSheets.delete(currentSheetName);
        renderSheet(currentSheetName);
      });
    }

    function updateViewModeUI() {
      if (!viewModeUnicodeBtn || !viewModeLegacyBtn) return;
      viewModeUnicodeBtn.classList.toggle('btn-primary', viewMode === 'unicode');
      viewModeLegacyBtn.classList.toggle('btn-primary', viewMode === 'legacy');
      if (viewModeWarning) viewModeWarning.style.display = viewMode === 'unicode' ? 'block' : 'none';
    }
    function setViewMode(mode) {
      viewMode = mode;
      try { localStorage.setItem('krutiViewMode', mode); } catch (err) { /* ignore */ }
      updateViewModeUI();
      if (currentSheetName) renderSheet(currentSheetName);
    }
    if (viewModeUnicodeBtn && viewModeLegacyBtn) {
      viewModeUnicodeBtn.addEventListener('click', () => setViewMode('unicode'));
      viewModeLegacyBtn.addEventListener('click', () => setViewMode('legacy'));
      updateViewModeUI();
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

    function viewerIsProtectedWord(word) {
      const lower = word.toLowerCase();
      if (userExceptions.has(lower)) return true;
      if (useDictionaryGuess && ENGLISH_DICTIONARY.has(lower) && lower.length >= 3) return true;
      if (useDictionaryGuess && typeof looksStatisticallyEnglish === 'function' && looksStatisticallyEnglish(lower)) return true;
      return false;
    }

    // ---- Column labels for mobile card view ----
    // Card view (see index.html's @media max-width:640px rules) turns each
    // row into a stacked "label: value" card instead of a horizontally-
    // scrolling table. The label for a given cell is whatever this sheet's
    // OWN most recent merged header cell in that column said — reusing the
    // exact same isHeaderLike signal buildRowHTML already uses for desktop
    // styling (row-header-cell), not a new guess. A plain, unmerged header
    // row (no rowspan/colspan) doesn't trigger this — there's no reliable
    // way to tell "this is a header row" from "this is just the first data
    // row" without a merge signal, and mislabeling a real value as a
    // column name is worse than falling back to a column letter (A, B, C…).
    //
    // Stored as one sorted event list per column rather than a full
    // row×column grid — headers are rare compared to data rows, so this
    // stays cheap even on huge sheets, and a binary-search lookup means
    // jumping straight to a window deep into a 100,000-row sheet (as
    // virtual scrolling does) never needs to rescan everything above it.
    function computeHeaderEvents(spanInfo, jsonData, numRows, maxCols) {
      const headerEventsByCol = Array.from({ length: maxCols }, () => []);
      for (let r = 0; r < numRows; r++) {
        for (let c = 0; c < maxCols; c++) {
          const info = spanInfo[r][c];
          if (info === 'skip' || !info) continue;
          const cell = jsonData[r] ? jsonData[r][c] : undefined;
          const cellText = cell != null ? String(cell).trim() : '';
          if (!cellText) continue;
          const isTitleBar = info.colspan >= maxCols;
          const isHeaderLike = !isTitleBar && (info.rowspan > 1 || info.colspan > 1);
          if (!isHeaderLike) continue;
          for (let cc = c; cc < c + info.colspan && cc < maxCols; cc++) {
            headerEventsByCol[cc].push({ row: r, text: cellText });
          }
        }
      }
      return headerEventsByCol;
    }

    function headerLabelForColumn(headerEventsByCol, col, atRow) {
      const events = headerEventsByCol[col];
      if (!events || !events.length) return null;
      let lo = 0, hi = events.length - 1, found = -1;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (events[mid].row <= atRow) { found = mid; lo = mid + 1; } else hi = mid - 1;
      }
      return found === -1 ? null : events[found].text;
    }

    function buildRowHTML(r, spanInfo, jsonData, maxCols, cellFonts, forceEnglish, formulaCells, headerEventsByCol) {
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

        // Only plain data cells get a card-view label — a title/header
        // cell IS the label for the cells below it, so it stays a
        // full-width heading in card view instead of getting one itself.
        let cardAttrs = '';
        if (!isTitleBar && !isHeaderLike) {
          const label = headerEventsByCol ? headerLabelForColumn(headerEventsByCol, c, r) : null;
          cardAttrs = ' data-label="' + escapeHTML(label || colIndexToLetters(c)) + '"';
          if (!hasText) cardAttrs += ' data-empty="true"';
        }

        // Computed once, used both for the font lookup below and for the
        // formula marker — this is a calculated value, not typed input,
        // and a government report reader should be able to tell the
        // difference at a glance rather than assume every number was
        // entered by hand.
        const address = colIndexToLetters(c) + (r + 1);
        const isFormula = formulaCells && formulaCells.has(address);
        const formulaAttr = isFormula ? ' data-formula="true" title="' + escapeHTML(t('formulaCellTitle', { formula: formulaCells.get(address) || '' })) + '"' : '';

        const attrs = 'contenteditable="true" spellcheck="false"' +
          (span.rowspan > 1 ? ' rowspan="' + span.rowspan + '"' : '') +
          (span.colspan > 1 ? ' colspan="' + span.colspan + '"' : '') +
          cls + formulaAttr + cardAttrs;

        let cellHTML;
        if (forceEnglish) {
          cellHTML = '<span class="run-normal-font">' + escapeHTML(cellText) + '</span>';
        } else {
          const knownFont = cellFonts ? cellFonts[address] : null;
          if (viewMode === 'unicode') {
            // Best-effort preview: convert directly using the SAME
            // ground-truth-first, guessing-only-as-fallback logic the
            // export feature uses — no font file needed to read this view
            // at all. Not claimed to be perfectly accurate (see the
            // standing warning banner above the table).
            const needsConversion = knownFont ? (isLegacyFontName(knownFont) || looksLikeUnconvertedLegacyGlyphs(cellText)) :
              (!STANDARD_UNICODE_FONTS.has((knownFont || '').toLowerCase()) && /[^\u0900-\u097F0-9\s.,;:\-/()%]/.test(cellText));
            if (needsConversion) {
              const converter = pickConverterForCell(knownFont, cellText);
              const converted = converter ? converter(cellText, viewerIsProtectedWord) : cellText;
              cellHTML = '<span class="run-normal-font">' + escapeHTML(converted) + '</span>';
            } else {
              cellHTML = '<span class="run-normal-font">' + escapeHTML(cellText) + '</span>';
            }
          } else if (knownFont && (isLegacyFontName(knownFont) || looksLikeUnconvertedLegacyGlyphs(cellText))) {
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

    // For each row, the earliest row index whose rowspan reaches into it —
    // itself, if nothing spans into it. A window can only safely START at
    // a row where floor[row] === row; otherwise it would show a 'skip'
    // cell with no origin <td rowspan> above it to explain the gap. Built
    // from the merge list directly (cheap: bounded by how many merges the
    // sheet actually has, not by grid size) rather than scanning spanInfo.
    function computeRowOriginFloor(merges, numRows) {
      const floor = new Array(numRows);
      for (let r = 0; r < numRows; r++) floor[r] = r;
      merges.forEach(m => {
        if (m.e.r <= m.s.r) return; // rowspan of 1 — nothing to protect
        const lastRow = Math.min(m.e.r, numRows - 1);
        for (let r = m.s.r + 1; r <= lastRow; r++) {
          if (floor[r] > m.s.r) floor[r] = m.s.r;
        }
      });
      return floor;
    }

    function safeWindowStart(rs, desired) {
      let start = Math.max(0, Math.min(desired, rs.numRows - 1));
      let guard = 0;
      while (rs.rowOriginFloor[start] < start && guard++ < 100000) start = rs.rowOriginFloor[start];
      return start;
    }

    // Renders rows [start, end) into the table, with spacer <tr>s standing
    // in for whatever's above/below. desiredStart gets pulled back if it
    // would split a merged cell's rowspan (see safeWindowStart);
    // desiredEnd is just clamped to the sheet's actual row count.
    function renderWindow(rs, desiredStart, desiredEnd) {
      const prevWindowStart = rs.windowStart || 0;
      const prevAvgRowHeight = rs.avgRowHeight;

      const start = safeWindowStart(rs, desiredStart);
      const end = Math.min(desiredEnd, rs.numRows);
      if (start === rs.windowStart && end === rs.windowEnd) return; // nothing changed — e.g. already pinned at an edge

      const topCount = start;
      const bottomCount = rs.numRows - end;
      let html = '';
      if (topCount > 0) {
        html += '<tr class="vs-spacer" aria-hidden="true" style="height:' + Math.round(topCount * rs.avgRowHeight) +
          'px;"><td colspan="' + rs.maxCols + '" style="padding:0; border:0;"></td></tr>';
      }
      for (let r = start; r < end; r++) {
        html += buildRowHTML(r, rs.spanInfo, rs.jsonData, rs.maxCols, rs.cellFonts, rs.forceEnglish, rs.formulaCells, rs.headerEventsByCol);
      }
      if (bottomCount > 0) {
        html += '<tr class="vs-spacer" aria-hidden="true" style="height:' + Math.round(bottomCount * rs.avgRowHeight) +
          'px;"><td colspan="' + rs.maxCols + '" style="padding:0; border:0;"></td></tr>';
      }

      let tbody = outputTable.querySelector('tbody');
      if (!tbody) { tbody = document.createElement('tbody'); outputTable.appendChild(tbody); }
      tbody.innerHTML = html;
      rs.windowStart = start;
      rs.windowEnd = end;

      // Re-measure from what's actually rendered so the height estimate
      // (and therefore the spacer sizing / scrollbar proportions) drifts
      // toward reality instead of staying pinned to the initial guess.
      // Skipped for small windows (e.g. right after a search reveals only
      // a handful of matching rows) where a few outlier title rows could
      // swing the average too far.
      const dataRows = tbody.querySelectorAll('tr:not(.vs-spacer)');
      if (dataRows.length >= 5) {
        let total = 0;
        dataRows.forEach(tr => { total += tr.offsetHeight; });
        if (total > 0) rs.avgRowHeight = total / dataRows.length;
      }

      // The top spacer's height just changed (new window, possibly a
      // refined avgRowHeight) — compensate scrollTop by the same delta so
      // the rows the user was actually looking at don't jump on screen.
      if (tableScrollBox) {
        const prevTopSpacerHeight = prevWindowStart * prevAvgRowHeight;
        const newTopSpacerHeight = topCount * rs.avgRowHeight;
        const delta = newTopSpacerHeight - prevTopSpacerHeight;
        if (delta) tableScrollBox.scrollTop += delta;
      }
    }

    // Search and export need every row physically present at once — see
    // the comment above VIRTUAL_WINDOW_ROWS. Renders the whole sheet in
    // one pass (start=0, end=numRows collapses both spacers to zero) and
    // marks the sheet as fully loaded so scrolling stops re-windowing it.
    function ensureFullyLoaded() {
      if (!renderState || renderState.fullyLoaded) return;
      renderWindow(renderState, 0, renderState.numRows);
      renderState.fullyLoaded = true;
    }

    let vsScrollScheduled = false;
    function maybeReflowWindow() {
      const rs = renderState;
      if (!rs || rs.fullyLoaded || !tableScrollBox) return;
      const centerRow = Math.max(0, Math.round(tableScrollBox.scrollTop / rs.avgRowHeight));
      const margin = Math.floor(VIRTUAL_WINDOW_ROWS * 0.25);
      // Only re-window once the visible area gets close to the edge of
      // what's currently rendered — re-centering on every pixel of scroll
      // would mean tearing down and rebuilding the tbody constantly.
      if (centerRow < rs.windowStart + margin || centerRow > rs.windowEnd - margin) {
        const desiredStart = Math.max(0, centerRow - Math.floor(VIRTUAL_WINDOW_ROWS / 2));
        renderWindow(rs, desiredStart, desiredStart + VIRTUAL_WINDOW_ROWS);
      }
    }
    if (tableScrollBox) {
      tableScrollBox.addEventListener('scroll', () => {
        if (vsScrollScheduled) return;
        vsScrollScheduled = true;
        requestAnimationFrame(() => { vsScrollScheduled = false; maybeReflowWindow(); });
      }, { passive: true });
    }

    // ---- Sheet pills: big tappable buttons instead of a cramped dropdown ----
    function renderSheetPills(sheetNames, activeName) {
      const row = document.getElementById('sheetPillsRow');
      if (!row) return;
      if (sheetNames.length <= 1) { row.style.display = 'none'; row.innerHTML = ''; return; }
      row.innerHTML = sheetNames.map(name =>
        '<button class="btn ' + (name === activeName ? 'btn-primary' : 'btn-secondary') +
        '" type="button" data-sheet-pill="' + escapeHTML(name) + '">' + escapeHTML(name) + '</button>'
      ).join('');
      row.style.display = 'flex';
      row.querySelectorAll('[data-sheet-pill]').forEach(btn => {
        btn.addEventListener('click', () => {
          const name = btn.getAttribute('data-sheet-pill');
          try {
            renderSheet(name);
            renderSheetPills(sheetNames, name);
          } catch (err) {
            console.error('Failed to render sheet', name, err);
            setStatus('यह शीट नहीं खुल पाई। कोई दूसरी शीट चुनकर देखें।', 'error');
          }
        });
      });
    }

    // ---- Workbook summary: "yes, your file opened" confirmation before
    // throwing a giant table at someone — shows sheet count, a rough row
    // count per sheet, and whatever font info was actually found, with one
    // button to proceed. Skipped entirely for the silent "resume where I
    // left off" flow, which should jump straight back in instead. ----
    function showWorkbookSummary(fileName, workbook, biffFontCache, workbookFontCache) {
      const panel = document.getElementById('workbookSummary');
      if (!panel) { renderSheet(workbook.SheetNames[0]); return; }

      let totalRows = 0;
      workbook.SheetNames.forEach(name => {
        const ws = workbook.Sheets[name];
        if (ws['!ref']) {
          try { totalRows += XLSX.utils.decode_range(ws['!ref']).e.r + 1; } catch (err) { /* ignore */ }
        }
      });

      // Best-effort single headline font name for the summary card — the
      // per-cell detail is still handled properly by getSheetCellFonts
      // during actual rendering; this is just a friendly one-line hint.
      let fontLabel = null;
      if (workbookFontCache && workbookFontCache.fontIdToName) {
        fontLabel = Object.values(workbookFontCache.fontIdToName).find(isLegacyFontName);
      } else if (biffFontCache) {
        const firstSheetFonts = Object.values(biffFontCache)[0];
        if (firstSheetFonts) fontLabel = Object.values(firstSheetFonts).find(isLegacyFontName);
      }

      document.getElementById('summaryFileName').textContent = fileName;
      document.getElementById('summaryMeta').textContent =
        t('summarySheetsRows', { sheets: workbook.SheetNames.length, rows: totalRows.toLocaleString(currentLang === 'en' ? 'en-IN' : 'hi-IN') }) +
        ' — ' + (fontLabel ? t('summaryFontDetected', { font: fontLabel }) : t('summaryFontNotDetected'));

      const pillsBox = document.getElementById('summarySheetPills');
      pillsBox.innerHTML = workbook.SheetNames.map((name, i) =>
        '<button class="btn btn-secondary" type="button" data-summary-sheet="' + escapeHTML(name) + '">' + escapeHTML(name) + '</button>'
      ).join('');
      pillsBox.querySelectorAll('[data-summary-sheet]').forEach(btn => {
        btn.addEventListener('click', () => openSheetFromSummary(btn.getAttribute('data-summary-sheet')));
      });

      const openBtn = document.getElementById('summaryOpenBtn');
      openBtn.onclick = () => openSheetFromSummary(workbook.SheetNames[0]);

      panel.style.display = 'block';
      emptyState.style.display = 'none';
      tableWrapper.style.display = 'none';
      const pillsRowEl = document.getElementById('sheetPillsRow');
      if (pillsRowEl) pillsRowEl.style.display = 'none';
      tableInfo.textContent = '';
      setTimeout(() => panel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    }

    function openSheetFromSummary(sheetName) {
      const panel = document.getElementById('workbookSummary');
      if (panel) panel.style.display = 'none';
      renderSheet(sheetName);
      renderSheetPills(currentWorkbook.SheetNames, sheetName);
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

      // Formula cells: sheet_to_json above already gives us the CACHED
      // calculated value (the right thing to display — a reader wants the
      // number, not "=SUM(B2:B9)"), but that flattening throws away the
      // cell object itself, so this is a separate pass straight over the
      // raw worksheet to know which addresses were actually formulas.
      // Used only for the small "calculated, not typed" marker below —
      // the displayed VALUE is unaffected either way.
      const formulaCells = new Map();
      Object.keys(worksheet).forEach(addr => {
        if (addr.charAt(0) === '!') return;
        const c = worksheet[addr];
        if (c && typeof c.f === 'string' && c.f) formulaCells.set(addr, c.f);
      });

      outputTable.innerHTML = '';
      const rowOriginFloor = computeRowOriginFloor(merges, numRows);
      const headerEventsByCol = computeHeaderEvents(spanInfo, jsonData, numRows, maxCols);
      renderState = {
        jsonData, spanInfo, cellFonts, formulaCells, maxCols, numRows,
        forceEnglish: englishSheets.has(sheetName),
        windowStart: 0, windowEnd: 0, rowOriginFloor, headerEventsByCol,
        avgRowHeight: 32, // refined from real measurements after the first render
        fullyLoaded: false
      };
      if (sheetEnglishToggle) sheetEnglishToggle.checked = renderState.forceEnglish;
      if (tableScrollBox) tableScrollBox.scrollTop = 0; // a new sheet always starts scrolled to the top
      renderWindow(renderState, 0, VIRTUAL_WINDOW_ROWS);

      tableWrapper.style.display = 'block';
      emptyState.style.display = 'none';
      document.body.classList.add('viewer-active');
      tableInfo.textContent = 'फाइल सफलतापूर्वक पढ़ी गई। नीचे तालिका देखें।';
      sheetMeta.textContent = 'शीट: ' + sheetName + ' • पंक्तियाँ: ' + jsonData.length + ' • कॉलम: ' + maxCols;
      setStatus(customFontLoaded ? 'फाइल खुल गई।' : 'फाइल खुल गई, पर फॉन्ट के बिना — रूप सही नहीं होगा।', customFontLoaded ? 'success' : 'error');
    }


// ---- File loading ----
    function processWorkbookData(data, fileName, skipSummary) {
      try {
        if (!isValidExcelSignature(data)) {
          throw new Error('unrecognized file signature — not a valid .xlsx or .xls');
        }
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
        detectFontNameInFile(data, currentWorkbook, fileName, biffFontCache);

        renderSheetPills(currentWorkbook.SheetNames, currentWorkbook.SheetNames[0]);
        const sheetSelector = document.getElementById('sheetSelector');
        if (currentWorkbook.SheetNames.length > 1) {
          sheetSelector.innerHTML = currentWorkbook.SheetNames
            .map(name => '<option value="' + escapeHTML(name) + '">' + escapeHTML(name) + '</option>')
            .join('');
        }
        sheetSelector.style.display = 'none'; // pills are now the primary sheet switcher; kept in DOM for existing wiring

        // Save is fire-and-forget for rendering, but the badge only shows
        // once it actually succeeds — no more silent "did that even work?"
        saveLastFile(fileName, data.buffer).then(ok => {
          const badge = document.getElementById('saveBadge');
          const clearBtn = document.getElementById('clearSavedBtn');
          if (ok && badge) {
            badge.style.display = 'inline-flex';
            badge.textContent = '✓ ' + t('savedOnDevice');
          }
          if (ok && clearBtn) clearBtn.style.display = 'inline-block';
        });
        if (typeof addRecentFile === 'function') {
          addRecentFile(fileName, data.buffer).then(() => {
            if (typeof renderRecentFilesList === 'function') renderRecentFilesList();
          });
        }

        if (skipSummary) {
          renderSheet(currentWorkbook.SheetNames[0]);
          setTimeout(() => tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
        } else {
          showWorkbookSummary(fileName, currentWorkbook, biffFontCache, workbookFontCache);
        }
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
    }

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
      const workbookSummaryEl = document.getElementById('workbookSummary');
      if (workbookSummaryEl) workbookSummaryEl.style.display = 'none';
      outputTable.innerHTML = '';
      tableInfo.innerHTML = '✓ ' + t('readingWorkbook') + '<br>✓ ' + t('detectingFonts') + '<br>⋯ ' + t('preparingPreview');
      sheetMeta.textContent = 'डेटा तैयार किया जा रहा है...';

      const file = fileInput.files[0];
      const reader = new FileReader();
      const myLoadToken = ++fileLoadToken;

      reader.onload = function(e) {
        if (myLoadToken !== fileLoadToken) return; // a newer file load has since started — discard this stale result
        processWorkbookData(new Uint8Array(e.target.result), file.name);
      };

      reader.onerror = function() {
        setStatus('फाइल लोड नहीं हुई। दोबारा कोशिश करें।', 'error');
      };

      reader.readAsArrayBuffer(file);
    }


// ---- Sheet switcher, download-as-HTML, misc event wiring ----
    document.getElementById('sheetSelector').addEventListener('change', (e) => {
      if (!currentWorkbook) return;
      try {
        renderSheet(e.target.value);
      } catch (err) {
        console.error('Failed to render sheet', e.target.value, err);
        setStatus('यह शीट नहीं खुल पाई। कोई दूसरी शीट चुनकर देखें।', 'error');
      }
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

    const clearSavedBtn = document.getElementById('clearSavedBtn');
    if (clearSavedBtn) {
      clearSavedBtn.addEventListener('click', async () => {
        await clearSavedSession();
        clearSavedBtn.style.display = 'none';
        const badge = document.getElementById('saveBadge');
        if (badge) badge.style.display = 'none';
      });
    }

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

    // ---- PWA File Handling API ("Open With → यथारूप" from the OS file explorer) ----
    // Chromium-only (desktop Chrome/Edge; same support surface as the File
    // System Access API in fileSystemAccess.ts) and only fires once the app
    // is installed as a PWA with file_handlers declared in
    // manifest.webmanifest — absent everywhere else, including Safari/iOS,
    // where 'launchQueue' in window is simply false and this block never
    // runs. Deliberately mirrors the drag-drop handler just above: land the
    // launched file into the normal fileInput and populate the font hint,
    // then let the user pick a font and press "खोलें" themselves, same as
    // every other entry point. Auto-opening here would skip that step
    // silently, which is worse than one extra tap.
    if ('launchQueue' in window && window.launchQueue) {
      window.launchQueue.setConsumer(async (launchParams) => {
        if (!launchParams.files || !launchParams.files.length) return;
        try {
          const handle = launchParams.files[0];
          const file = await handle.getFile();
          const dt = new DataTransfer();
          dt.items.add(file);
          fileInput.files = dt.files;
          updateFileName();
        } catch (err) {
          console.warn('Could not read file opened via File Handling API:', err);
        }
      });
    }

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
      if (!currentWorkbook || !currentSheetName) {
        setStatus('पहले कोई फाइल खोलें।', 'error');
        return;
      }
      exportPdfBtn.disabled = true;
      const originalLabel = exportPdfBtn.textContent;
      exportPdfBtn.textContent = 'PDF बन रहा है...';
      const originalSheetName = currentSheetName;
      // A PDF export should always show the real report grid — never the
      // mobile card view — even when triggered from a phone under 640px.
      // Forced on the LIVE table (not just html2canvas's internal clone)
      // because the row-boundary measurements just below read real
      // getBoundingClientRect() values, which must match whatever layout
      // actually gets rasterized or the page-break math goes wrong.
      // Released in the finally block below no matter what happens.
      outputTable.classList.add('force-grid-layout');
      try {
        const { jsPDF } = window.jspdf;
        const pageWidthMm = 287; // A4 landscape usable width minus margins
        const pageHeightMm = 190; // A4 landscape usable height minus margins
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        let isFirstPageOverall = true;

        for (const sheetName of currentWorkbook.SheetNames) {
          const worksheet = currentWorkbook.Sheets[sheetName];
          const hasData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false }).length > 0;

          if (!isFirstPageOverall) pdf.addPage('a4', 'landscape');
          isFirstPageOverall = false;

          // The sheet-name header is rendered through the BROWSER's own
          // font (Hind — already loaded, already correct for Devanagari)
          // and captured as an image, same as the table below it — never
          // through jsPDF's own pdf.text(), whose built-in fonts have no
          // Devanagari glyphs at all and would silently render Hindi sheet
          // names as blank boxes.
          const headerEl = document.createElement('div');
          headerEl.textContent = sheetName;
          headerEl.style.cssText = 'position:fixed; top:-9999px; left:0; ' +
            'font-family:"Hind",sans-serif; font-size:22px; font-weight:700; ' +
            'padding:4px; color:#1f2a2a; background:#ffffff; white-space:nowrap;';
          document.body.appendChild(headerEl);
          const headerCanvas = await html2canvas(headerEl, { scale: 2, backgroundColor: '#ffffff' });
          headerEl.remove();
          // html2canvas at scale:2, 96 CSS px/inch: 1 canvas px ≈ 0.1323mm.
          const pxToMm = 25.4 / 96 / 2;
          const headerWidthMm = Math.min(headerCanvas.width * pxToMm, pageWidthMm);
          const headerHeightMm = headerCanvas.height * pxToMm;
          pdf.addImage(headerCanvas.toDataURL('image/png'), 'PNG', 10, 6, headerWidthMm, headerHeightMm);
          const tableStartYMm = 6 + headerHeightMm + 4;

          if (!hasData) {
            continue; // an empty sheet gets just its header — nothing to rasterize below it
          }

          renderSheet(sheetName);
          ensureFullyLoaded();
          // renderSheet() only mutates the DOM synchronously — give the
          // browser a paint cycle before measuring, or getBoundingClientRect
          // below could still reflect the PREVIOUS sheet's layout.
          await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

          // Capture each row's vertical position BEFORE rasterizing, so page
          // breaks can land between rows instead of slicing through the
          // middle of one (which is what a fixed-height slice would do).
          const tableRect = outputTable.getBoundingClientRect();
          const rowBoundaries = [...outputTable.querySelectorAll('tr')].map(tr => {
            const r = tr.getBoundingClientRect();
            return r.bottom - tableRect.top; // bottom edge, relative to table top, in CSS px
          });

          const canvas = await html2canvas(outputTable, { scale: 2, backgroundColor: '#ffffff' });
          const pxPerMm = canvas.width / pageWidthMm;
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

          let renderedPx = 0;
          let firstPageOfSheet = true;
          while (renderedPx < canvas.height) {
            // The sheet's very first page has less vertical room, since the
            // header image sits above it; later pages of the same sheet
            // start from the normal top margin.
            // Clamped with a floor: if the header ever measured taller than
            // expected, a negative/near-zero budget here would make
            // findBreakPoint return a point behind renderedPx, producing a
            // negative-height slice — better to under-use the header-page
            // budget than to emit a broken image.
            const budgetMm = Math.max(
              firstPageOfSheet ? (pageHeightMm - (tableStartYMm - 10)) : pageHeightMm,
              40
            );
            const breakPx = findBreakPoint(renderedPx, Math.floor(budgetMm * pxPerMm));
            const sliceHeightPx = breakPx - renderedPx;
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = canvas.width;
            pageCanvas.height = sliceHeightPx;
            const ctx = pageCanvas.getContext('2d');
            ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx);
            const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
            if (!firstPageOfSheet) pdf.addPage('a4', 'landscape');
            const yMm = firstPageOfSheet ? tableStartYMm : 10;
            pdf.addImage(imgData, 'JPEG', 10, yMm, pageWidthMm, sliceHeightPx / pxPerMm);
            renderedPx = breakPx;
            firstPageOfSheet = false;
          }
        }
        pdf.save('yatharoop.pdf');
      } catch (err) {
        console.error(err);
        setStatus('PDF नहीं बन पाया।', 'error');
      } finally {
        outputTable.classList.remove('force-grid-layout');
        if (currentWorkbook && originalSheetName) renderSheet(originalSheetName); // leave the viewer showing whatever the user actually had open
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
    document.getElementById('langToggleBtn').addEventListener('click', toggleLanguage);
    applyTranslations();

    detectInstalledFonts();

// ---- File System Access (progressive enhancement) ----
    // Chromium-only — see ts/fileSystemAccess.ts for the full explanation.
    // Wrapped in a function existence check throughout so this is a no-op
    // everywhere else rather than a crash.
    const fsaPickBtn = document.getElementById('fsaPickBtn');
    if (fsaPickBtn && typeof isFileSystemAccessSupported === 'function' && isFileSystemAccessSupported()) {
      fsaPickBtn.style.display = 'block';
      fsaPickBtn.addEventListener('click', async () => {
        const handle = await pickExcelFileViaFileSystemAccess();
        if (!handle) return; // user cancelled, or picker failed — already logged
        const file = await handle.getFile();
        const buffer = await file.arrayBuffer();
        fileNameBox.style.display = 'block';
        fileNameBox.innerHTML = '<strong>चयनित फाइल:</strong> ' + escapeHTML(file.name);
        detectFontFromSelectedFile(file);
        setStatus('फाइल खोली जा रही है...', 'loading');
        processWorkbookData(new Uint8Array(buffer), file.name);
        // Save the LIVE handle, not just a byte snapshot — this is what
        // lets the resume banner re-read current content next time
        // instead of showing what the file looked like at this moment.
        saveLastFileHandle(handle);
      });
    }


// ---- Resume last session (IndexedDB) ----
    // The saved copy stays local to this device — same privacy guarantee
    // as everything else here — this just spares a trip back to Downloads.
    // Where a live file handle is available (see fileSystemAccess.ts) it's
    // preferred over the frozen byte-snapshot, since it re-reads the
    // file's CURRENT content rather than showing a stale copy from
    // whenever it was last opened.
    async function initResumeBanner() {
      const banner = document.getElementById('resumeBanner');
      const nameEl = document.getElementById('resumeFileName');
      const openBtn = document.getElementById('resumeOpenBtn');
      const dismissBtn = document.getElementById('resumeDismissBtn');
      if (!banner || typeof getLastFile !== 'function') return;

      const hasFsaHandle = typeof getLastFileHandle === 'function';
      const handle = hasFsaHandle ? await getLastFileHandle() : null;
      const record = await getLastFile();
      if (!handle && (!record || !record.data)) return;

      const label = handle ? handle.name : record.fileName;
      const when = record ? new Date(record.savedAt) : null;
      const dateLabel = when ? when.toLocaleDateString(currentLang === 'en' ? 'en-IN' : 'hi-IN', {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
      }) : '';
      nameEl.textContent = dateLabel ? (label + ' — ' + dateLabel) : label;
      banner.style.display = 'flex';

      openBtn.addEventListener('click', async () => {
        banner.style.display = 'none';
        const myLoadToken = ++fileLoadToken;

        // Try the live handle first — this click IS the user gesture the
        // browser requires before it will grant/re-grant read permission.
        if (handle) {
          const result = await readFileHandleWithPermission(handle);
          if (myLoadToken !== fileLoadToken) return;
          if (result) {
            const fontRecord = await getLastFont();
            if (myLoadToken !== fileLoadToken) return;
            if (fontRecord && fontRecord.data) {
              await applyLegacyFontBuffer(fontRecord.data, fontRecord.fontLabel);
              fontNameBox.style.display = 'block';
              fontNameBox.innerHTML = '<strong>चयनित फॉन्ट:</strong> ' + escapeHTML(fontRecord.fontLabel);
            }
            if (myLoadToken !== fileLoadToken) return;
            setStatus('फाइल खोली जा रही है...', 'loading');
            processWorkbookData(result.data, result.name, true);
            return;
          }
          // Permission denied, or the file was moved/renamed/deleted since
          // the handle was saved — fall through to the byte-snapshot below
          // rather than leaving the user stuck.
          await clearLastFileHandle();
        }

        if (!record || !record.data) {
          setStatus('यह सेव की गई फाइल अब उपलब्ध नहीं है।', 'error');
          return;
        }
        const fontRecord = await getLastFont();
        if (myLoadToken !== fileLoadToken) return;
        if (fontRecord && fontRecord.data) {
          await applyLegacyFontBuffer(fontRecord.data, fontRecord.fontLabel);
          fontNameBox.style.display = 'block';
          fontNameBox.innerHTML = '<strong>चयनित फॉन्ट:</strong> ' + escapeHTML(fontRecord.fontLabel);
        }
        if (myLoadToken !== fileLoadToken) return;
        setStatus('फाइल खोली जा रही है...', 'loading');
        processWorkbookData(new Uint8Array(record.data), record.fileName, true);
      });

      dismissBtn.addEventListener('click', async () => {
        banner.style.display = 'none';
        await clearSavedSession();
        if (hasFsaHandle) await clearLastFileHandle();
      });
    }
    initResumeBanner();

// ---- Recent files list ----
    async function renderRecentFilesList() {
      const box = document.getElementById('recentFilesBox');
      const listEl = document.getElementById('recentFilesList');
      if (!box || !listEl || typeof getRecentFilesIndex !== 'function') return;

      const entries = await getRecentFilesIndex();
      if (!entries.length) {
        box.style.display = 'none';
        listEl.innerHTML = '';
        return;
      }

      listEl.innerHTML = entries.map(e => {
        const when = new Date(e.savedAt).toLocaleDateString(currentLang === 'en' ? 'en-IN' : 'hi-IN', {
          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
        });
        return '<li>' +
          '<button type="button" class="recent-file-open" data-id="' + escapeHTML(e.id) + '">' +
            '<span class="recent-file-name">' + escapeHTML(e.fileName) + '</span>' +
            '<span class="recent-file-date">' + escapeHTML(when) + '</span>' +
          '</button>' +
          '<button type="button" class="recent-file-remove" data-id="' + escapeHTML(e.id) + '" aria-label="' + escapeHTML(t('recentFilesRemove')) + '">✕</button>' +
        '</li>';
      }).join('');
      box.style.display = 'block';

      listEl.querySelectorAll('.recent-file-open').forEach(btn => {
        btn.addEventListener('click', async () => {
          const id = btn.getAttribute('data-id');
          const record = await getRecentFileData(id);
          if (!record || !record.data) {
            // Entry in the index but the bytes are gone (shouldn't normally
            // happen — addRecentFile keeps them in sync — but storage can
            // be cleared out from under the page by the browser itself).
            setStatus(t('recentFileMissing'), 'error');
            await removeRecentFile(id);
            renderRecentFilesList();
            return;
          }
          const myLoadToken = ++fileLoadToken;
          // Recent files don't each carry their own saved font — reuse
          // whichever font is already active/last-saved, since in practice
          // someone's files are almost always all the same legacy font.
          if (!customFontLoaded) {
            const fontRecord = await getLastFont();
            if (myLoadToken !== fileLoadToken) return;
            if (fontRecord && fontRecord.data) {
              await applyLegacyFontBuffer(fontRecord.data, fontRecord.fontLabel);
              fontNameBox.style.display = 'block';
              fontNameBox.innerHTML = '<strong>चयनित फॉन्ट:</strong> ' + escapeHTML(fontRecord.fontLabel);
            }
          }
          if (myLoadToken !== fileLoadToken) return;
          fileNameBox.style.display = 'block';
          fileNameBox.innerHTML = '<strong>चयनित फाइल:</strong> ' + escapeHTML(record.fileName);
          setStatus('फाइल खोली जा रही है...', 'loading');
          processWorkbookData(new Uint8Array(record.data), record.fileName, true);
        });
      });

      listEl.querySelectorAll('.recent-file-remove').forEach(btn => {
        btn.addEventListener('click', async (ev) => {
          ev.stopPropagation();
          await removeRecentFile(btn.getAttribute('data-id'));
          renderRecentFilesList();
        });
      });
    }

    const clearRecentFilesBtn = document.getElementById('clearRecentFilesBtn');
    if (clearRecentFilesBtn) {
      clearRecentFilesBtn.addEventListener('click', async () => {
        await clearAllRecentFiles();
        renderRecentFilesList();
      });
    }

    renderRecentFilesList();


