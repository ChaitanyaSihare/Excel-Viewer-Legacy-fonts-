// converter.js
// Kruti Dev -> Unicode Hindi converter, plus the shared Devanagari-detection
// regex used by the UI to protect genuine Devanagari runs.
// Ported from https://github.com/ltrc/kru2uni (LTRC, IIIT Hyderabad)
// via https://github.com/anthro-ai/krutidev-unicode (ISC licensed JS port).
// Pure text transform: no DOM, no XLSX, no globals besides what it defines.

    const DEVANAGARI_RANGE = /[\u0900-\u097F]/;

function replaceAllLiteral(text, find, replace) {
  if (find === '') return text;
  return text.split(find).join(replace);
}

const KD_CONSONANTS = [
  'd','[k','x','?k','\u00b3','p','N','t','>','\u00a5','V','B','M','<','.k','r','Fk','n','/k','u','u',
  'i','Q','c','Hk','e',';','j','j','y','G','\u0934','o','\'k','"k','l','g',
  'd','[k','x','t','M+','<+','Q',';',
  'D','[','X','?','\u00b3~','P','N~','T','\u00f7','\u00a5~','V~','B~','M~','<~','.','R','F','n~','/','\u00cb','\u00e8',
  'U','I','\u00b6','C','H','E','\u00b8','Z','Y','O','\'','\u00dc','"','L','\u00ba'
];

const KD_UNATTACHED = ['k','f','h','q','w','`','s','S','ks','kS','a','%','\u00a1','W'];

const UNICODE_VOWEL_SIGNS = ['\u093e','\u093f','\u0940','\u0941','\u0942','\u0943','\u0947','\u0948','\u094b','\u094c','\u0902','\u0903','\u0901','\u0945'];

// Main character/glyph mapping table, longest & most specific patterns first
const MAIN_MAP = [
  ['\u00f1','\u0970'], ['Q+Z','QZ+'], ['sas','sa'], ['aa','a'],
  [')Z','\u0930\u094d\u0926\u094d\u0927'], ['ZZ','Z'],
  ['\u2018','"'], ['\u2019','"'], ['\u201c','\''], ['\u201d','\''],
  ['\u00e5','\u0966'], ['\u0192','\u0967'], ['\u201e','\u0968'], ['\u2026','\u0969'],
  ['\u2020','\u096a'], ['\u2021','\u096b'], ['\u02c6','\u096c'], ['\u2030','\u096d'],
  ['\u0160','\u096e'], ['\u2039','\u096f'],
  ['\u00b6+','\u095e\u094d'], ['d+','\u0958'], ['[+k','\u0959'], ['[+','\u0959\u094d'],
  ['x+','\u095a'], ['T+','\u091c\u093c\u094d'], ['t+','\u095b'], ['M+','\u095c'],
  ['<+','\u095d'], ['Q+','\u095e'], [';+','\u095f'], ['j+','\u0931'], ['u+','\u0929'],
  ['\u00d9k','\u0924\u094d\u0924'], ['\u00d9','\u0924\u094d\u0924\u094d'], ['\u00e4','\u0915\u094d\u0924'],
  ['\u2013','\u0926\u0943'], ['\u2014','\u0915\u0943'],
  ['\u00e9','\u0928\u094d\u0928'], ['\u2122','\u0928\u094d\u0928\u094d'],
  ['=kk','=k'], ['f=k','f='],
  ['\u00e0','\u0939\u094d\u0928'], ['\u00e1','\u0939\u094d\u092f'], ['\u00e2','\u0939\u0943'],
  ['\u00e3','\u0939\u094d\u092e'], ['\u00baz','\u0939\u094d\u0930'], ['\u00ba','\u0939\u094d'],
  ['\u00ed','\u0926\u094d\u0926'],
  ['{k','\u0915\u094d\u0937'], ['{','\u0915\u094d\u0937\u094d'],
  ['=','\u0924\u094d\u0930'], ['\u00ab','\u0924\u094d\u0930\u094d'],
  ['N\u00ee','\u091b\u094d\u092f'], ['V\u00ee','\u091f\u094d\u092f'], ['B\u00ee','\u0920\u094d\u092f'],
  ['M\u00ee','\u0921\u094d\u092f'], ['<\u00ee','\u0922\u094d\u092f'],
  ['|','\u0926\u094d\u092f'], ['K','\u091c\u094d\u091e'], ['}','\u0926\u094d\u0935'], ['J','\u0936\u094d\u0930'],
  ['V\u00aa','\u091f\u094d\u0930'], ['M\u00aa','\u0921\u094d\u0930'], ['<\u00aa\u00aa','\u0922\u094d\u0930'],
  ['N\u00aa','\u091b\u094d\u0930'], ['\u00d8','\u0915\u094d\u0930'], ['\u00dd','\u092b\u094d\u0930'],
  ['nzZ','\u0930\u094d\u0926\u094d\u0930'], ['\u00e6','\u0926\u094d\u0930'], ['\u00e7','\u092a\u094d\u0930'],
  ['\u00c1','\u092a\u094d\u0930'], ['xz','\u0917\u094d\u0930'],
  ['#','\u0930\u0941'], [':','\u0930\u0942'],
  ['v\u201a','\u0911'], ['vks','\u0913'], ['vkS','\u0914'], ['vk','\u0906'], ['v','\u0905'],
  ['b\u00b1','\u0908\u0902'], ['\u00c3','\u0908'], ['bZ','\u0908'], ['b','\u0907'], ['m','\u0909'], ['\u00c5','\u090a'],
  [',s','\u0910'], [',','\u090f'], ['_','\u090b'],
  ['\u00f4','\u0915\u094d\u0915'], ['d','\u0915'], ['Dk','\u0915'], ['D','\u0915\u094d'],
  ['[k','\u0916'], ['[','\u0916\u094d'],
  ['x','\u0917'], ['Xk','\u0917'], ['X','\u0917\u094d'],
  ['\u00c4','\u0918'], ['?k','\u0918'], ['?','\u0918\u094d'],
  ['\u00b3','\u0919'],
  ['pkS','\u091a\u0948'], ['p','\u091a'], ['Pk','\u091a'], ['P','\u091a\u094d'],
  ['N','\u091b'],
  ['t','\u091c'], ['Tk','\u091c'], ['T','\u091c\u094d'],
  ['>','\u091d'], ['\u00f7','\u091d\u094d'], ['\u00a5','\u091e'],
  ['\u00ea','\u091f\u094d\u091f'], ['\u00eb','\u091f\u094d\u0920'], ['V','\u091f'], ['B','\u0920'],
  ['\u00ec','\u0921\u094d\u0921'], ['\u00ef','\u0921\u094d\u0922'], ['M+','\u0921\u093c'], ['<+','\u0922\u093c'],
  ['M','\u0921'], ['<','\u0922'],
  ['.k','\u0923'], ['.','\u0923\u094d'],
  ['r','\u0924'], ['Rk','\u0924'], ['R','\u0924\u094d'],
  ['Fk','\u0925'], ['F','\u0925\u094d'],
  [')','\u0926\u094d\u0927'], ['n','\u0926'],
  ['/k','\u0927'], ['/','\u0927\u094d'], ['\u00cb','\u0927\u094d'], ['\u00e8','\u0927'],
  ['u','\u0928'], ['Uk','\u0928'], ['U','\u0928\u094d'],
  ['i','\u092a'], ['Ik','\u092a'], ['I','\u092a\u094d'],
  ['Q','\u092b'], ['\u00b6','\u092b\u094d'],
  ['c','\u092c'], ['Ck','\u092c'], ['C','\u092c\u094d'],
  ['Hk','\u092d'], ['H','\u092d\u094d'],
  ['e','\u092e'], ['Ek','\u092e'], ['E','\u092e\u094d'],
  [';','\u092f'], ['\u00b8','\u092f\u094d'],
  ['j','\u0930'],
  ['y','\u0932'], ['Yk','\u0932'], ['Y','\u0932\u094d'],
  ['G','\u0933'],
  ['o','\u0935'], ['Ok','\u0935'], ['O','\u0935\u094d'],
  ['\'k','\u0936'], ['\'','\u0936\u094d'],
  ['"k','\u0937'], ['"','\u0937\u094d'],
  ['l','\u0938'], ['Lk','\u0938'], ['L','\u0938\u094d'],
  ['g','\u0939'],
  ['\u00c8','\u0940\u0902'], ['saz','\u094d\u0930\u0947\u0902'], ['z','\u094d\u0930'],
  ['\u00cc','\u0926\u094d\u0926'], ['\u00cd','\u091f\u094d\u091f'], ['\u00ce','\u091f\u094d\u0920'],
  ['\u00cf','\u0921\u094d\u0921'], ['\u00d1','\u0915\u0943'], ['\u00d2','\u092d'], ['\u00d3','\u094d\u092f'],
  ['\u00d4','\u0921\u094d\u0922'], ['\u00d6','\u091d\u094d'], ['\u00d8','\u0915\u094d\u0930'],
  ['\u00d9','\u0924\u094d\u0924\u094d'], ['\u00dck','\u0936'], ['\u00dc','\u0936\u094d'],
  ['\u201a','\u0949'],
  ['kas','\u094b\u0902'], ['ks','\u094b'], ['kS','\u094c'],
  ['\u00a1k','\u093e\u0901'], ['ak','k\u0902'], ['k','\u093e'],
  ['ah','\u0940\u0902'], ['h','\u0940'],
  ['aq','\u0941\u0902'], ['q','\u0941'],
  ['aw','\u0942\u0902'], ['\u00a1w','\u0942\u0901'], ['w','\u0942'],
  ['`','\u0943'], ['\u0300','\u0943'],
  ['as','\u0947\u0902'], ['\u00b1s','s\u00b1'], ['s','\u0947'],
  ['aS','\u0948\u0902'], ['S','\u0948'],
  ['a\u00aa','\u094d\u0930\u0902'], ['\u00aa','\u094d\u0930'],
  ['fa','\u0902f'], ['a','\u0902'], ['\u00a1','\u0901'],
  ['%',':'],
  ['W','\u0945'],
  ['\u2022','\u093d'], ['\u00b7','\u093d'], ['\u2219','\u093d'],
  ['~j','\u094d\u0930'], ['~','\u094d'],
  ['\\','?'], ['+','\u093c'],
  ['^','\u2018'], ['*','\u2019'], ['\u00de','\u201c'], ['\u00df','\u201d'],
  ['(',';'], ['\u00bc','('], ['\u00bd',')'], ['\u00c0','}'], ['\u00be','='],
  ['A','\u0964'], ['-','.'], ['&','-'], ['&','\u00b5'], ['\u03bc','-'],
  ['\u0152','\u0970'], [']',','], ['~ ','\u094d '], ['@','/'],
  ['\u00ae','\u0948\u0902']
];

function krutiDevToUnicode(input, isProtectedWord) {
  if (!input || typeof input !== 'string') return input;
  let text = input;

  // ---- Protect case-number / date-like numeric tokens ----
  // The character map below is a blind, context-free substitution table: it
  // has no idea "35635/07" is a file number, or "48a" is a legal sub-clause
  // marker — it just sees valid Kruti Dev glyph codes and converts them,
  // because '/', '.', and single ASCII letters ARE legitimate Kruti Dev
  // characters in Devanagari text. So a real case number gets mangled:
  // "35635/07" -> "35635ध्07", "48a" -> "48ं". Fix: pull out anything that
  // looks like digits/dates/case-numbers (with up to 2 trailing letters,
  // e.g. "49b") BEFORE the substitution table runs, and splice the exact
  // original text back in afterward.
  const protectedTokens = [];
  text = text.replace(/\b\d[\d./]*[a-zA-Z]{0,2}\b/g, (match) => {
    protectedTokens.push(match);
    return '\u0000' + (protectedTokens.length - 1) + '\u0001';
  });

  // ---- Protect standalone English words (optional) ----
  // A digit anchor makes "48a" unambiguous, but a bare word like "Dt" has
  // none — the file's font metadata says the whole cell is Kruti Dev (true
  // for most of it), and there's no finer-grained signal to say "except
  // this word". That's a genuine ambiguity, not a missing-metadata bug: we
  // checked, real files here never mix two fonts inside one cell, so there
  // is nothing left to read. The caller can pass isProtectedWord(word) to
  // reuse the SAME dictionary/exception judgment the viewer already makes,
  // so a word already known to be real English stays real English on
  // export too, instead of export being a completely separate blind path.
  if (typeof isProtectedWord === 'function') {
    text = text.replace(/\b[A-Za-z]+\b/g, (word) => {
      if (!isProtectedWord(word)) return word;
      protectedTokens.push(word);
      return '\u0000' + (protectedTokens.length - 1) + '\u0001';
    });
  }

  // space + ्र glyphs collapse onto the previous char
  text = replaceAllLiteral(text, ' \u00aa', '\u00aa');
  text = replaceAllLiteral(text, ' ~j', '~j');
  text = replaceAllLiteral(text, ' z', 'z');

  // Run the main glyph substitution table, in order
  MAIN_MAP.forEach(([find, replace]) => {
    text = replaceAllLiteral(text, find, replace);
  });

  text = replaceAllLiteral(text, '\u00b1', 'Z\u0902');
  text = replaceAllLiteral(text, '\u00c6', '\u0930\u094df');

  // f + next char -> next char + ि  (pre-base vowel sign moves after the consonant)
  text = text.replace(/f(.?)/g, (m, next) => next + '\u093f');

  text = replaceAllLiteral(text, '\u00c7', 'fa');
  text = replaceAllLiteral(text, '\u00af', 'fa');
  text = replaceAllLiteral(text, '\u00c9', '\u0930\u094dfa');

  text = text.replace(/fa(.?)/g, (m, next) => next + '\u093f\u0902');

  text = replaceAllLiteral(text, '\u00ca', '\u0940Z');

  // ि् + next -> ् + next + ि
  text = text.replace(/\u093f\u094d(.?)/g, (m, next) => '\u094d' + next + '\u093f');

  text = replaceAllLiteral(text, '\u094dZ', 'Z');

  // र् (encoded as Z) needs to move before the consonant + any vowel signs it attaches to
  let idx = text.indexOf('Z');
  while (idx !== -1) {
    let start = idx - 1;
    while (start >= 0 && UNICODE_VOWEL_SIGNS.includes(text[start])) start -= 1;
    if (start >= 0) {
      const consonant = text.slice(start, idx);
      text = text.slice(0, start) + '\u0930\u094d' + consonant + text.slice(idx + 1);
      idx = text.indexOf('Z', start);
    } else {
      break;
    }
  }

  // space / comma / halant are illegal right before a vowel sign
  UNICODE_VOWEL_SIGNS.forEach((matra) => {
    text = replaceAllLiteral(text, ' ' + matra, matra);
    text = replaceAllLiteral(text, ',' + matra, matra + ',');
    text = replaceAllLiteral(text, '\u094d' + matra, matra + ',');
  });

  text = replaceAllLiteral(text, '\u094d\u094d\u0930', '\u094d\u0930');
  text = replaceAllLiteral(text, '\u094d\u0930\u094d', '\u0930\u094d');
  text = replaceAllLiteral(text, '\u094d\u094d', '\u094d');
  text = replaceAllLiteral(text, '\u094d ', ' ');

  // Restore the protected numeric/case-number tokens exactly as they were.
  text = text.replace(/\u0000(\d+)\u0001/g, (m, i) => protectedTokens[Number(i)]);

  return text.trim();
}
