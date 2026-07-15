// bigrams.js
// A tiny offline statistical signal for the hardest ambiguity in this app:
// a short word with no digit anchor and no font metadata, that could
// genuinely be real English OR a Kruti Dev letter-fragment (both alphabets
// share the same ASCII bytes). A flat dictionary/exception list already
// catches known words, but real English SURNAMES and place names that
// happen to also be common Kruti Dev fragments ('das', 'sen', 'shah',
// 'modi', 'rana' — the exact examples that broke the old dictionary-based
// approach, see js/data/dictionary.js) were previously unrecoverable.
//
// This is a from-scratch, entirely offline character-bigram model — NOT an
// LLM call, no network, no API key, nothing leaves the browser. It answers
// "does this letter sequence statistically look more like English or more
// like Kruti Dev" by comparing letter-PAIR frequency against two small
// tables:
//   - ENG_BIGRAMS: built once from the existing English dictionary
//     (js/data/dictionary.js), ~274k words.
//   - KD_BIGRAMS: built once from real Kruti Dev letter-fragments found in
//     actual sample government files (Beat reports, staff reports, wildlife
//     case files) — genuine ground truth for what this specific legacy
//     font's letter-key patterns actually look like in practice, not a
//     synthetic guess.
// Both tables are tiny (a few KB total) and computed offline in advance;
// nothing about scoring a word at runtime touches the network.
//
// Known limitation, stated plainly: this does NOT solve proper nouns well
// (surnames/place names like 'Uikey' or 'Kurai' don't follow common-word
// letter statistics any better than a dictionary would) — it specifically
// helps the "real short/common word vs. Kruti Dev fragment" case, which is
// where the old approach broke down hardest.

const ENG_BIGRAMS = {"^a": 16097, "aa": 208, "a$": 5398, "ah": 998, "h$": 3186, "he": 13868, "ed": 26141, "d$": 24322, "hi": 10414, "in": 51705, "ng": 29246, "g$": 19673, "hs": 1419, "s$": 106202, "al": 25535, "l$": 8609, "li": 25235, "ii": 103, "i$": 1517, "is": 30174, "ls": 4211, "ar": 21646, "rd": 4028, "dv": 283, "va": 3607, "rk": 1797, "k$": 2226, "ks": 2688, "dw": 394, "wo": 2669, "ol": 13018, "lf": 687, "f$": 511, "lv": 708, "ve": 11982, "es": 60210, "rg": 2334, "gh": 2426, "rr": 3973, "hh": 65, "rt": 5973, "ti": 37808, "as": 14337, "sv": 87, "vo": 1882, "og": 8095, "ge": 9009, "el": 12905, "ab": 8592, "b$": 352, "ba": 6436, "ac": 11158, "c$": 6125, "ca": 14797, "ci": 8279, "ck": 6240, "cs": 1257, "ct": 7035, "te": 30690, "er": 49841, "ri": 25555, "ia": 10497, "na": 11234, "ll": 13053, "ly": 11124, "y$": 19737, "to": 13873, "or": 19861, "r$": 13909, "rs": 14674, "cu": 5018, "us": 10845, "se": 22667, "af": 1642, "ft": 1085, "t$": 13147, "ak": 2191, "ka": 1796, "lo": 13297, "on": 30844, "ne": 23366, "e$": 27655, "am": 7971, "mp": 5233, "p$": 1502, "pe": 12143, "re": 29792, "ps": 3157, "an": 24399, "nd": 9959, "de": 16147, "di": 13877, "do": 5177, "n$": 12005, "dl": 2067, "ee": 6138, "ni": 14496, "nm": 695, "me": 13708, "en": 26848, "nt": 19409, "ts": 9869, "ns": 15290, "nw": 565, "wa": 3991, "ds": 4208, "ap": 7247, "pi": 7715, "ic": 20813, "em": 8355, "sh": 9085, "hl": 1134, "le": 24115, "ss": 16421, "hm": 626, "si": 12553, "sk": 1689, "at": 30782, "ta": 14170, "bl": 7966, "tt": 4883, "oi": 3627, "ir": 5579, "tu": 5142, "u$": 364, "ur": 10218, "ax": 871, "xi": 1466, "il": 11943, "ay": 2124, "ya": 1224, "bb": 1517, "ie": 16966, "cy": 1869, "be": 6284, "ey": 1474, "ys": 2593, "bo": 5668, "ot": 8641, "tc": 1611, "ip": 4540, "br": 4169, "ev": 2497, "vi": 5177, "io": 16301, "ry": 4049, "bs": 1280, "bc": 222, "ce": 9520, "co": 16714, "ou": 12874, "ul": 9123, "om": 10737, "mb": 3380, "bd": 244, "da": 4580, "iv": 5546, "mi": 12581, "no": 9491, "op": 8966, "pl": 5203, "la": 16554, "st": 26365, "ty": 4076, "du": 2498, "uc": 3314, "ea": 10513, "m$": 4535, "ec": 9357, "eg": 3127, "gg": 1943, "gi": 6689, "ei": 2986, "ig": 5170, "lm": 888, "mo": 8387, "os": 10200, "rn": 2996, "et": 12876, "th": 10467, "hy": 4296, "ra": 24471, "nc": 8946, "tl": 2292, "tm": 582, "bf": 79, "fa": 2909, "ad": 6850, "bh": 121, "nr": 856, "ho": 10356, "gs": 4422, "bi": 6948, "id": 7676, "dd": 1663, "gl": 3853, "ga": 5355, "ai": 5412, "it": 17478, "tr": 14140, "ro": 19622, "ph": 9575, "bj": 194, "je": 818, "tn": 531, "jo": 817, "ju": 960, "un": 13442, "au": 3883, "ut": 7303, "az": 1146, "ze": 5243, "sm": 5513, "ms": 4100, "oo": 6327, "ow": 3950, "w$": 592, "lu": 4680, "ue": 2559, "ma": 12648, "bm": 143, "mh": 49, "o$": 1804, "bn": 93, "rm": 4192, "oa": 2587, "od": 4769, "oh": 501, "ux": 257, "x$": 554, "ha": 9341, "ae": 2090, "sa": 7121, "su": 6543, "um": 6059, "nn": 2804, "if": 3988, "ua": 2948, "ug": 1909, "ht": 1841, "ov": 4263, "eb": 2184, "gr": 5807, "ch": 13609, "xe": 1147, "xa": 600, "ye": 1352, "yi": 1303, "zo": 1185, "oc": 6599, "dg": 931, "gm": 579, "im": 6203, "ok": 1524, "ke": 6117, "ki": 4301, "ru": 4385, "up": 3503, "pt": 2755, "sc": 6993, "dn": 995, "so": 6065, "iz": 7065, "zi": 2159, "rb": 2371, "ef": 2835, "rp": 2322, "sq": 684, "qu": 4105, "sl": 2609, "sn": 2255, "bt": 317, "bu": 3532, "ub": 3274, "ui": 3053, "ld": 1852, "ag": 6063, "uz": 255, "zz": 665, "z$": 153, "bv": 95, "lt": 2730, "bw": 65, "by": 405, "my": 1240, "aj": 212, "lc": 829, "ep": 5682, "eo": 3200, "hu": 1987, "pn": 289, "iu": 1157, "gy": 1204, "po": 8711, "sy": 2057, "ud": 2275, "cc": 1552, "gn": 1939, "ib": 3003, "ln": 820, "cl": 3795, "za": 1998, "oy": 880, "mm": 2826, "pa": 8644, "ny": 1056, "eu": 2285, "yl": 2114, "cr": 6075, "ew": 2005, "we": 2869, "wi": 2784, "ws": 871, "mu": 3121, "eq": 625, "rv": 1165, "vu": 362, "eh": 991, "yd": 835, "fi": 5465, "fy": 622, "nu": 2129, "ox": 1304, "xy": 387, "hk": 58, "rh": 1160, "dr": 3416, "hr": 2444, "dh": 315, "dy": 1086, "fo": 3844, "ob": 3313, "kn": 634, "wl": 512, "wn": 900, "cm": 24, "cn": 103, "oe": 1917, "yt": 1411, "cq": 141, "aw": 1693, "fl": 3263, "av": 2535, "rc": 3655, "yc": 1425, "ym": 1507, "sp": 6205, "py": 1073, "oz": 549, "nl": 932, "yo": 985, "rl": 1920, "pr": 8940, "pu": 2767, "rw": 599, "yp": 2251, "dj": 175, "ja": 1045, "ji": 372, "go": 3388, "uv": 326, "dm": 415, "ix": 550, "xt": 787, "ex": 3629, "ik": 1510, "dp": 170, "uk": 458, "fu": 2826, "yn": 1385, "dz": 50, "zu": 117, "gu": 2680, "uo": 636, "of": 1386, "nk": 1891, "kt": 191, "fe": 3758, "ff": 2516, "np": 831, "xm": 16, "nz": 286, "fr": 2138, "pp": 2870, "tf": 550, "fg": 10, "j$": 12, "wt": 173, "sw": 1267, "lw": 203, "tp": 331, "yz": 159, "gt": 137, "ko": 827, "hc": 108, "uh": 80, "df": 255, "mf": 218, "ml": 271, "tw": 930, "rf": 1149, "fs": 472, "hb": 253, "zl": 256, "jw": 4, "kh": 341, "kk": 123, "kr": 303, "kv": 40, "lb": 471, "rz": 99, "xo": 456, "aq": 242, "ez": 367, "rj": 124, "lg": 507, "iq": 397, "iy": 84, "lk": 772, "ky": 518, "yw": 249, "lh": 193, "zy": 308, "mn": 544, "sg": 224, "fn": 34, "lp": 848, "nh": 780, "lr": 128, "uf": 843, "mr": 81, "kw": 199, "ek": 567, "hn": 795, "xu": 246, "yg": 481, "yr": 1118, "sf": 404, "ku": 361, "sb": 420, "tv": 54, "mt": 46, "gd": 77, "yx": 93, "nb": 797, "vy": 88, "nx": 71, "cd": 44, "nf": 1976, "gk": 19, "kl": 990, "gw": 134, "ih": 232, "tb": 476, "mw": 69, "nv": 1091, "pm": 129, "ij": 86, "kb": 251, "ej": 287, "iw": 101, "wh": 1272, "wr": 610, "yb": 445, "yh": 129, "ao": 184, "pg": 62, "nq": 307, "uy": 109, "hd": 82, "hf": 172, "hg": 58, "hp": 125, "hw": 292, "fv": 2, "mc": 69, "mg": 29, "rq": 118, "wg": 39, "ww": 44, "wy": 92, "sd": 201, "sr": 207, "lz": 46, "tk": 45, "km": 159, "xp": 680, "oj": 140, "vg": 5, "vr": 88, "vv": 77, "wd": 251, "wf": 122, "wk": 166, "wm": 115, "xl": 45, "xs": 74, "yu": 153, "^b": 14561, "bk": 25, "yf": 133, "kc": 65, "kd": 71, "kf": 158, "kg": 37, "kp": 114, "gf": 84, "gp": 35, "jr": 12, "db": 351, "dt": 107, "nj": 336, "xr": 6, "tz": 334, "zv": 23, "mk": 20, "oq": 224, "yk": 71, "tg": 270, "wb": 225, "wc": 63, "dk": 29, "yy": 4, "uj": 49, "dc": 187, "dq": 8, "fb": 37, "fc": 16, "fw": 17, "zp": 12, "pb": 164, "pd": 78, "pw": 114, "zc": 10, "zn": 9, "kj": 23, "pv": 8, "zk": 16, "wp": 110, "wu": 93, "wz": 26, "tj": 72, "gb": 148, "bp": 77, "fh": 34, "hv": 14, "uq": 28, "xb": 18, "xc": 391, "xf": 31, "xh": 134, "xk": 2, "xw": 19, "vl": 27, "zs": 5, "pk": 50, "jy": 4, "qs": 8, "qa": 38, "uu": 42, "zb": 16, "zw": 19, "^c": 24751, "fd": 16, "lq": 14, "lx": 5, "pc": 95, "pf": 129, "td": 168, "mv": 65, "vn": 23, "v$": 41, "vs": 39, "vt": 1, "pj": 24, "md": 58, "mj": 15, "bz": 8, "cw": 10, "xn": 8, "tq": 7, "bg": 37, "sj": 64, "mq": 5, "cz": 27, "^d": 16353, "gc": 25, "gv": 2, "yv": 53, "zh": 20, "^e": 11313, "hq": 8, "cb": 10, "cp": 10, "fm": 18, "vh": 1, "vz": 2, "xq": 5, "^f": 10266, "qi": 26, "gj": 20, "qh": 2, "zg": 8, "fj": 5, "xg": 8, "zt": 4, "^g": 9070, "zm": 21, "sz": 5, "^h": 10375, "jj": 6, "fp": 22, "mz": 19, "vd": 7, "hj": 11, "fk": 5, "^i": 10000, "jt": 2, "^j": 2199, "jh": 4, "jn": 6, "^k": 3257, "lj": 10, "uw": 10, "^l": 7759, "wv": 2, "^m": 15544, "hz": 6, "jl": 4, "rx": 1, "yj": 16, "vk": 5, "zq": 4, "xd": 4, "zj": 2, "^n": 6444, "^o": 8832, "^p": 24013, "jk": 3, "xv": 3, "pz": 2, "^q": 1377, "qo": 6, "qw": 3, "^r": 14777, "jp": 2, "js": 4, "^s": 31078, "zd": 2, "vq": 2, "qe": 2, "wj": 7, "jd": 2, "q$": 6, "^t": 14186, "yq": 2, "^u": 9336, "^v": 4477, "^w": 5643, "qf": 2, "^x": 306, "^y": 999, "^z": 1124, "gz": 15};
const ENG_BIGRAM_TOTAL = 2805375;
const KD_BIGRAMS = {"^m": 38, "mi": 18, "io": 14, "ou": 115, "ue": 24, "e$": 39, "my": 16, "y$": 60, "^i": 111, "if": 17, "fj": 25, "j$": 119, "^k": 181, "ks": 101, "s$": 118, "^l": 76, "lg": 12, "gk": 16, "k$": 198, "^o": 105, "oa": 14, "a$": 126, "^c": 38, "ch": 21, "hv": 21, "v$": 23, "^e": 119, "es": 50, "sa": 62, "in": 28, "nl": 11, "lf": 46, "fk": 43, "^d": 140, "de": 12, "ez": 15, "zp": 11, "pk": 21, "kf": 20, "dh": 12, "h$": 182, "lw": 4, "wp": 3, "ph": 3, "ek": 53, "sc": 14, "ck": 20, "kb": 10, "by": 3, "^u": 47, "ec": 6, "cj": 5, "kg": 21, "g$": 11, "^t": 8, "tw": 3, "wu": 3, "u$": 50, "^f": 105, "fl": 51, "fr": 22, "r$": 62, "dk": 70, "uk": 52, "ke": 38, "kj": 64, "jh": 100, "n$": 16, "bz": 15, "zy": 9, "ua": 10, "nf": 14, "iz": 36, "zh": 6, "hk": 17, "kk": 50, "fn": 21, "nu": 24, "ka": 42, "ad": 28, "d$": 78, "fd": 10, "dl": 3, "l$": 17, "^v": 59, "vf": 12, "f$": 24, "kd": 36, "jk": 43, "vk": 45, "kn": 13, "ns": 11, "sv": 3, "vu": 5, "fo": 16, "oo": 3, "oj": 5, "va": 2, "af": 2, "dr": 2, "dj": 12, "js": 19, "lo": 31, "uh": 37, "lk": 15, "ds": 25, "so": 3, "oy": 1, "yk": 22, "kv": 8, "ju": 2, "^j": 104, "ft": 1, "te": 4, "ku": 17, "^z": 12, "zo": 14, "ok": 37, "gd": 11, "an": 6, "nh": 4, "vj": 5, "jf": 4, "un": 27, "nz": 12, "z$": 42, "lj": 8, "kz": 18, "zb": 1, "bh": 1, "uj": 35, "ik": 42, "^a": 2, "aj": 1, "jo": 5, "sj": 14, "sz": 5, "zr": 3, "rh": 7, "hl": 3, "kt": 15, "ts": 6, "dq": 23, "qe": 19, "cs": 2, "sy": 16, "yo": 1, "kh": 21, "ss": 3, "el": 8, "lz": 4, "zd": 12, "ys": 13, "ly": 3, "ko": 14, "o$": 18, "^b": 9, "bk": 2, "vs": 4, "ve": 8, "hi": 4, "zl": 2, "mb": 7, "si": 4, "ih": 7, "^g": 18, "gs": 4, "se": 1, "ep": 1, "pu": 6, "bu": 1, "uo": 4, "kr": 12, "ui": 14, "ky": 38, "fi": 7, "kq": 6, "q$": 7, "^x": 16, "xm": 2, "jc": 1, "cu": 4, "^h": 4, "uq": 1, "qi": 1, "rk": 4, "ki": 8, "la": 7, "ag": 8, "vd": 1, "dv": 1, "vq": 1, "qv": 11, "fu": 7, "ur": 4, "rs": 14, "ij": 6, "jr": 3, "kx": 13, "x$": 10, "^p": 4, "fh": 2, "th": 3, "hr": 2, "ea": 43, "ax": 2, "^y": 10, "^r": 22, "rq": 1, "em": 1, "mh": 3, "os": 6, "sd": 6, "iu": 1, "zs": 6, "am": 14, "mn": 1, "^q": 3, "qy": 9, "su": 14, "ql": 1, "lh": 3, "hz": 1, "zi": 1, "je": 4, "bd": 7, "ho": 2, "kl": 7, "lr": 10, "ro": 2, "he": 8, "ef": 10, "xk": 10, "dy": 3, "yi": 4, "iq": 7, "qj": 9, "hn": 2, "tk": 7, "yy": 4, "oh": 3, "sx": 2, "mk": 4, "le": 6, "sr": 1, "xh": 5, "km": 2, "ny": 5, "ey": 1, "od": 5, "xo": 1, "ex": 1, "xj": 2, "yh": 2, "i$": 17, "^n": 27, "nk": 9, "xs": 1, "sg": 8, "gx": 3, "kw": 6, "wo": 3, "eg": 8, "jt": 2, "xg": 1, "gy": 1, "sn": 1, "uf": 2, "cd": 2, "sm": 3, "ml": 1, "lq": 4, "qu": 1, "gj": 4, "lu": 2, "sf": 7, "fm": 2, "m$": 13, "on": 9, "ej": 5, "nj": 1, "vt": 2, "t$": 30, "qq": 2, "qd": 1, "yd": 1, "rj": 1, "ip": 1, "iv": 3, "vy": 2, "nq": 4, "yg": 1, "us": 1, "ls": 18, "ac": 1, "rf": 4, "ff": 2, "dz": 1, "jb": 5, "w$": 1, "zn": 1, "qo": 3, "fp": 2, "pp": 3, "py": 1, "ym": 1, "^s": 5, "qm": 1, "kc": 1, "cw": 1, "wy": 6, "uy": 1, "md": 1, "fe": 3, "do": 1, "sl": 3, "jn": 2, "ng": 1, "pa": 2, "au": 1, "mg": 2, "hy": 1, "ye": 1, "ce": 1, "zu": 1, "li": 1, "ii": 2, "eh": 3, "fc": 3, "cn": 1, "oe": 1, "eu": 1, "ia": 3, "mj": 3, "cq": 1, "vv": 1, "gq": 9, "cc": 2, "cb": 2, "ed": 1, "xq": 2, "eq": 3, "dd": 1, "cg": 1, "yu": 1, "td": 1, "jm": 1, "mm": 1, "up": 1, "hj": 1, "at": 9, "wv": 9, "tv": 1, "gh": 5, "hx": 1, "ru": 1, "no": 1, "dt": 15, "ul": 2, "hc": 2, "c$": 2, "xl": 2, "yx": 8, "xa": 2, "zk": 16, "vo": 14, "ol": 10, "fg": 9, "gr": 9, "op": 5, "hu": 5, "ji": 2, "yc": 2, "ct": 8, "lv": 2, "xz": 6, "du": 2, "ld": 2, "gu": 6, "nw": 8, "wj": 2, "tl": 4, "ut": 2, "wf": 2, "ms": 2, "dp": 2, "qw": 2, "im": 6, "aa": 4, "xi": 2, "nr": 6, "yr": 9, "om": 2, "me": 2, "di": 3, "ir": 3, "re": 9, "to": 3, "or": 3, "ra": 3, "of": 3, "ev": 3, "en": 3, "nv": 3, "st": 3, "ti": 6, "ig": 3, "ga": 3, "na": 6, "gp": 3, "gi": 8, "al": 3, "ni": 6, "it": 3, "il": 3, "rc": 3, "bl": 5, "ew": 5};
const KD_BIGRAM_TOTAL = 5935;
const BIGRAM_VOCAB_SIZE = 28; // 26 letters + word-start/end markers, for Laplace smoothing

function bigramLogScore(word, table, total) {
  const padded = '^' + word.toLowerCase() + '$';
  let logProb = 0;
  let n = 0;
  for (let i = 0; i < padded.length - 1; i++) {
    const bg = padded[i] + padded[i + 1];
    const count = table[bg] || 0;
    // Add-1 (Laplace) smoothing so an unseen bigram doesn't produce -Infinity.
    logProb += Math.log((count + 1) / (total + BIGRAM_VOCAB_SIZE * BIGRAM_VOCAB_SIZE));
    n++;
  }
  return logProb / n; // average log-likelihood per letter-pair, length-independent
}

// Returns true only when the word confidently looks more like English than
// like a Kruti Dev fragment. Short words (<3 letters) are skipped entirely
// — bigram stats on 1-2 letter-pairs are too noisy to trust, and short
// abbreviations are exactly what the curated KNOWN_ENGLISH_TERMS list (see
// ui.js) is already for. The margin threshold (0.6) was picked by testing
// against real ambiguous words from actual sample files — loose enough to
// catch 'das'/'sen'/'shah'/'modi'/'rana', tight enough to still leave real
// Kruti Dev fragments like 'ifj'/'flouh'/'dezpkfj' alone.
function looksStatisticallyEnglish(word) {
  if (!word || word.length < 3) return false;
  const engScore = bigramLogScore(word, effectiveTable('eng'), effectiveTotal('eng'));
  const kdScore = bigramLogScore(word, effectiveTable('kd'), effectiveTotal('kd'));
  return (engScore - kdScore) > 0.6;
}

// ---- Local self-learning ----
// Every time someone taps a word to correct it (in EITHER direction — "this
// IS real English" or "no, this IS Kruti Dev"), that's a confirmed, human
// -verified data point. Rather than only remembering that ONE exact word
// (userExceptions in ui.js already does that, and that exact-word memory
// is deterministic — a taught word ALWAYS displays correctly from then on,
// independent of this file). This is a softer, additional layer: it feeds
// the word's letter-pairs into the bigram model so it also gets a little
// better at OTHER, similar-looking words it hasn't seen taught yet. That's
// a statistical nudge, not a guarantee — a handful of corrections shift
// scoring gradually; there's no promise any specific new word flips. It
// gets more useful the more corrections accumulate on a given device.
// Stored entirely in this browser's localStorage — never sent anywhere,
// never shared across devices or users.
const LEARN_WEIGHT = 4000;
let learnedBigrams = { eng: {}, kd: {}, engTotal: 0, kdTotal: 0 };
try {
  const saved = localStorage.getItem('krutiLearnedBigrams');
  if (saved) learnedBigrams = JSON.parse(saved);
} catch (err) { /* ignore, start fresh */ }

function effectiveTable(which) {
  const base = which === 'eng' ? ENG_BIGRAMS : KD_BIGRAMS;
  const learned = which === 'eng' ? learnedBigrams.eng : learnedBigrams.kd;
  if (!learned || Object.keys(learned).length === 0) return base;
  const merged = Object.assign({}, base);
  for (const bg in learned) merged[bg] = (merged[bg] || 0) + learned[bg];
  return merged;
}

function effectiveTotal(which) {
  const base = which === 'eng' ? ENG_BIGRAM_TOTAL : KD_BIGRAM_TOTAL;
  const learnedTotal = which === 'eng' ? learnedBigrams.engTotal : learnedBigrams.kdTotal;
  return base + (learnedTotal || 0);
}

function learnWord(word, isEnglish) {
  if (!word || word.length < 3) return; // same noise floor as scoring itself
  const table = isEnglish ? learnedBigrams.eng : learnedBigrams.kd;
  const padded = '^' + word.toLowerCase() + '$';
  let added = 0;
  for (let i = 0; i < padded.length - 1; i++) {
    const bg = padded[i] + padded[i + 1];
    table[bg] = (table[bg] || 0) + LEARN_WEIGHT;
    added += LEARN_WEIGHT;
  }
  if (isEnglish) learnedBigrams.engTotal += added;
  else learnedBigrams.kdTotal += added;
  try { localStorage.setItem('krutiLearnedBigrams', JSON.stringify(learnedBigrams)); } catch (err) { /* ignore */ }
}
