// https://github.com/JLHwung/grapheme-splitter/tree/next
const CR = 0,
  LF = 1,
  Control = 2,
  Extend = 3,
  Regional_Indicator = 4,
  SpacingMark = 5,
  L = 6,
  V = 7,
  T = 8,
  LV = 9,
  LVT = 10,
  Other = 11,
  Prepend = 12,
  E_Base = 13,
  E_Modifier = 14,
  ZWJ = 15,
  Glue_After_Zwj = 16,
  E_Base_GAZ = 17;

/**
 * The Emoji character property is an extension of UCD but shares the same namespace and structure
 * @see http:
 *
 * Here we model Extended_Pictograhpic only to implement UAX #29 GB11
 * \p{Extended_Pictographic} Extend* ZWJ	×	\p{Extended_Pictographic}
 *
 * The Emoji character property should not be mixed with Grapheme_Cluster_Break since they are not exclusive
 */
const Extended_Pictographic = 101;

const NotBreak = 0,
  BreakStart = 1,
  Break = 2,
  BreakLastRegional = 3,
  BreakPenultimateRegional = 4;

class GSHelper {
  /**
   * Check if the the character at the position {pos} of the string is surrogate
   * @param str {string}
   * @param pos {number}
   * @returns {boolean}
   */
  static isSurrogate(str, pos) {
    return (
      0xd800 <= str.charCodeAt(pos) &&
      str.charCodeAt(pos) <= 0xdbff &&
      0xdc00 <= str.charCodeAt(pos + 1) &&
      str.charCodeAt(pos + 1) <= 0xdfff
    );
  }

  /**
   * The String.prototype.codePointAt polyfill
   * Private function, gets a Unicode code point from a JavaScript UTF-16 string
   * handling surrogate pairs appropriately
   * @param str {string}
   * @param idx {number}
   * @returns {number}
   */
  static codePointAt(str, idx) {
    if (idx === undefined) {
      idx = 0;
    }
    const code = str.charCodeAt(idx);

    
    if (0xd800 <= code && code <= 0xdbff && idx < str.length - 1) {
      const hi = code;
      const low = str.charCodeAt(idx + 1);
      if (0xdc00 <= low && low <= 0xdfff) {
        return (hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
      }
      return hi;
    }

    
    if (0xdc00 <= code && code <= 0xdfff && idx >= 1) {
      const hi = str.charCodeAt(idx - 1);
      const low = code;
      if (0xd800 <= hi && hi <= 0xdbff) {
        return (hi - 0xd800) * 0x400 + (low - 0xdc00) + 0x10000;
      }
      return low;
    }

    
    
    return code;
  }

  
  /**
   * Private function, returns whether a break is allowed between the two given grapheme breaking classes
   * Implemented the UAX #29 3.1.1 Grapheme Cluster Boundary Rules on extended grapheme clusters
   * @param start {number}
   * @param mid {Array<number>}
   * @param end {number}
   * @param startEmoji {number}
   * @param midEmoji {Array<number>}
   * @param endEmoji {number}
   * @returns {number}
   */
  static shouldBreak(start, mid, end, startEmoji, midEmoji, endEmoji) {
    const all = [start].concat(mid).concat([end]);
    const allEmoji = [startEmoji].concat(midEmoji).concat([endEmoji]);
    const previous = all[all.length - 2];
    const next = end;
    const nextEmoji = endEmoji;

    
    
    
    const rIIndex = all.lastIndexOf(Regional_Indicator);
    if (
      rIIndex > 0 &&
      all.slice(1, rIIndex).every(function (c) {
        return c === Regional_Indicator;
      }) &&
      [Prepend, Regional_Indicator].indexOf(previous) === -1
    ) {
      if (
        all.filter(function (c) {
          return c === Regional_Indicator;
        }).length %
          2 ===
        1
      ) {
        return BreakLastRegional;
      }
      return BreakPenultimateRegional;
    }

    
    if (previous === CR && next === LF) {
      return NotBreak;
    }
    
    else if (previous === Control || previous === CR || previous === LF) {
      return BreakStart;
    }
    
    else if (next === Control || next === CR || next === LF) {
      return BreakStart;
    }
    
    else if (
      previous === L &&
      (next === L || next === V || next === LV || next === LVT)
    ) {
      return NotBreak;
    }
    
    else if (
      (previous === LV || previous === V) &&
      (next === V || next === T)
    ) {
      return NotBreak;
    }
    
    else if ((previous === LVT || previous === T) && next === T) {
      return NotBreak;
    }
    
    else if (next === Extend || next === ZWJ) {
      return NotBreak;
    }
    
    else if (next === SpacingMark) {
      return NotBreak;
    }
    
    else if (previous === Prepend) {
      return NotBreak;
    }

    
    const previousNonExtendIndex = allEmoji
      .slice(0, -1)
      .lastIndexOf(Extended_Pictographic);
    if (
      previousNonExtendIndex !== -1 &&
      allEmoji[previousNonExtendIndex] === Extended_Pictographic &&
      all.slice(previousNonExtendIndex + 1, -2).every(function (c) {
        return c === Extend;
      }) &&
      previous === ZWJ &&
      nextEmoji === Extended_Pictographic
    ) {
      return NotBreak;
    }

    
    
    if (mid.indexOf(Regional_Indicator) !== -1) {
      return Break;
    }
    if (previous === Regional_Indicator && next === Regional_Indicator) {
      return NotBreak;
    }

    
    return BreakStart;
  }
}
export default class GraphemeSplitter {
  /**
   * Returns the next grapheme break in the string after the given index
   * @param string {string}
   * @param index {number}
   * @returns {number}
   */
  nextBreak(string, index) {
    if (index === undefined) {
      index = 0;
    }
    if (index < 0) {
      return 0;
    }
    if (index >= string.length - 1) {
      return string.length;
    }
    const prevCP = GSHelper.codePointAt(string, index);
    const prev = GraphemeSplitter.getGraphemeBreakProperty(prevCP);
    const prevEmoji = GraphemeSplitter.getEmojiProperty(prevCP);
    const mid = [];
    const midEmoji = [];
    for (let i = index + 1; i < string.length; i++) {
      
      if (GSHelper.isSurrogate(string, i - 1)) {
        continue;
      }

      const nextCP = GSHelper.codePointAt(string, i);
      const next = GraphemeSplitter.getGraphemeBreakProperty(nextCP);
      const nextEmoji = GraphemeSplitter.getEmojiProperty(nextCP);
      if (
        GSHelper.shouldBreak(prev, mid, next, prevEmoji, midEmoji, nextEmoji)
      ) {
        return i;
      }

      mid.push(next);
      midEmoji.push(nextEmoji);
    }
    return string.length;
  }

  /**
   * Breaks the given string into an array of grapheme cluster strings
   * @param str {string}
   * @returns {string[]}
   */
  splitGraphemes(str) {
    let res = [];
    let index = 0;
    let brk;
    while ((brk = this.nextBreak(str, index)) < str.length) {
      res.push(str.slice(index, brk));
      index = brk;
    }
    if (index < str.length) {
      res.push(str.slice(index));
    }
    return res;
  }

  /**
   * Returns the iterator of grapheme clusters there are in the given string
   * @param str {string}
   * @returns {Iterator<string|undefined>}
   */
  iterateGraphemes(str) {
    let index = 0;
    const res = {
      next: () => {
        let brk;
        if ((brk = this.nextBreak(str, index)) < str.length) {
          const value = str.slice(index, brk);
          index = brk;
          return { value: value, done: false };
        }
        if (index < str.length) {
          const value = str.slice(index);
          index = str.length;
          return { value: value, done: false };
        }
        return { value: undefined, done: true };
      }
    };
    
    if (typeof Symbol !== "undefined" && Symbol.iterator) {
      res[Symbol.iterator] = function () {
        return res;
      };
    }
    return res;
  }

  /**
   * Returns the number of grapheme clusters there are in the given string
   * @param str {string}
   * @returns {number}
   */
  countGraphemes(str) {
    let count = 0;
    let index = 0;
    let brk;
    while ((brk = this.nextBreak(str, index)) < str.length) {
      index = brk;
      count++;
    }
    if (index < str.length) {
      count++;
    }
    return count;
  }

  /**
   * Given a Unicode code point, determines this symbol's grapheme break property
   * @param code {number} Unicode code point
   * @returns {number}
   */
  static getGraphemeBreakProperty(code) {
    
    
    
    

    if (
      (0x0600 <= code && code <= 0x0605) || 
      0x06dd === code || 
      0x070f === code || 
      0x08e2 === code || 
      0x0d4e === code || 
      0x110bd === code || 
      0x110cd === code || 
      (0x111c2 <= code && code <= 0x111c3) || 
      0x11a3a === code || 
      (0x11a86 <= code && code <= 0x11a89) || 
      0x11d46 === code 
    ) {
      return Prepend;
    }
    if (
      0x000d === code 
    ) {
      return CR;
    }
    if (
      0x000a === code 
    ) {
      return LF;
    }
    if (
      (0x0000 <= code && code <= 0x0009) || 
      (0x000b <= code && code <= 0x000c) || 
      (0x000e <= code && code <= 0x001f) || 
      (0x007f <= code && code <= 0x009f) || 
      0x00ad === code || 
      0x061c === code || 
      0x180e === code || 
      0x200b === code || 
      (0x200e <= code && code <= 0x200f) || 
      0x2028 === code || 
      0x2029 === code || 
      (0x202a <= code && code <= 0x202e) || 
      (0x2060 <= code && code <= 0x2064) || 
      0x2065 === code || 
      (0x2066 <= code && code <= 0x206f) || 
      (0xd800 <= code && code <= 0xdfff) || 
      0xfeff === code || 
      (0xfff0 <= code && code <= 0xfff8) || 
      (0xfff9 <= code && code <= 0xfffb) || 
      (0x1bca0 <= code && code <= 0x1bca3) || 
      (0x1d173 <= code && code <= 0x1d17a) || 
      0xe0000 === code || 
      0xe0001 === code || 
      (0xe0002 <= code && code <= 0xe001f) || 
      (0xe0080 <= code && code <= 0xe00ff) || 
      (0xe01f0 <= code && code <= 0xe0fff) 
    ) {
      return Control;
    }
    if (
      (0x0300 <= code && code <= 0x036f) || 
      (0x0483 <= code && code <= 0x0487) || 
      (0x0488 <= code && code <= 0x0489) || 
      (0x0591 <= code && code <= 0x05bd) || 
      0x05bf === code || 
      (0x05c1 <= code && code <= 0x05c2) || 
      (0x05c4 <= code && code <= 0x05c5) || 
      0x05c7 === code || 
      (0x0610 <= code && code <= 0x061a) || 
      (0x064b <= code && code <= 0x065f) || 
      0x0670 === code || 
      (0x06d6 <= code && code <= 0x06dc) || 
      (0x06df <= code && code <= 0x06e4) || 
      (0x06e7 <= code && code <= 0x06e8) || 
      (0x06ea <= code && code <= 0x06ed) || 
      0x0711 === code || 
      (0x0730 <= code && code <= 0x074a) || 
      (0x07a6 <= code && code <= 0x07b0) || 
      (0x07eb <= code && code <= 0x07f3) || 
      0x07fd === code || 
      (0x0816 <= code && code <= 0x0819) || 
      (0x081b <= code && code <= 0x0823) || 
      (0x0825 <= code && code <= 0x0827) || 
      (0x0829 <= code && code <= 0x082d) || 
      (0x0859 <= code && code <= 0x085b) || 
      (0x08d3 <= code && code <= 0x08e1) || 
      (0x08e3 <= code && code <= 0x0902) || 
      0x093a === code || 
      0x093c === code || 
      (0x0941 <= code && code <= 0x0948) || 
      0x094d === code || 
      (0x0951 <= code && code <= 0x0957) || 
      (0x0962 <= code && code <= 0x0963) || 
      0x0981 === code || 
      0x09bc === code || 
      0x09be === code || 
      (0x09c1 <= code && code <= 0x09c4) || 
      0x09cd === code || 
      0x09d7 === code || 
      (0x09e2 <= code && code <= 0x09e3) || 
      0x09fe === code || 
      (0x0a01 <= code && code <= 0x0a02) || 
      0x0a3c === code || 
      (0x0a41 <= code && code <= 0x0a42) || 
      (0x0a47 <= code && code <= 0x0a48) || 
      (0x0a4b <= code && code <= 0x0a4d) || 
      0x0a51 === code || 
      (0x0a70 <= code && code <= 0x0a71) || 
      0x0a75 === code || 
      (0x0a81 <= code && code <= 0x0a82) || 
      0x0abc === code || 
      (0x0ac1 <= code && code <= 0x0ac5) || 
      (0x0ac7 <= code && code <= 0x0ac8) || 
      0x0acd === code || 
      (0x0ae2 <= code && code <= 0x0ae3) || 
      (0x0afa <= code && code <= 0x0aff) || 
      0x0b01 === code || 
      0x0b3c === code || 
      0x0b3e === code || 
      0x0b3f === code || 
      (0x0b41 <= code && code <= 0x0b44) || 
      0x0b4d === code || 
      0x0b56 === code || 
      0x0b57 === code || 
      (0x0b62 <= code && code <= 0x0b63) || 
      0x0b82 === code || 
      0x0bbe === code || 
      0x0bc0 === code || 
      0x0bcd === code || 
      0x0bd7 === code || 
      0x0c00 === code || 
      0x0c04 === code || 
      (0x0c3e <= code && code <= 0x0c40) || 
      (0x0c46 <= code && code <= 0x0c48) || 
      (0x0c4a <= code && code <= 0x0c4d) || 
      (0x0c55 <= code && code <= 0x0c56) || 
      (0x0c62 <= code && code <= 0x0c63) || 
      0x0c81 === code || 
      0x0cbc === code || 
      0x0cbf === code || 
      0x0cc2 === code || 
      0x0cc6 === code || 
      (0x0ccc <= code && code <= 0x0ccd) || 
      (0x0cd5 <= code && code <= 0x0cd6) || 
      (0x0ce2 <= code && code <= 0x0ce3) || 
      (0x0d00 <= code && code <= 0x0d01) || 
      (0x0d3b <= code && code <= 0x0d3c) || 
      0x0d3e === code || 
      (0x0d41 <= code && code <= 0x0d44) || 
      0x0d4d === code || 
      0x0d57 === code || 
      (0x0d62 <= code && code <= 0x0d63) || 
      0x0dca === code || 
      0x0dcf === code || 
      (0x0dd2 <= code && code <= 0x0dd4) || 
      0x0dd6 === code || 
      0x0ddf === code || 
      0x0e31 === code || 
      (0x0e34 <= code && code <= 0x0e3a) || 
      (0x0e47 <= code && code <= 0x0e4e) || 
      0x0eb1 === code || 
      (0x0eb4 <= code && code <= 0x0eb9) || 
      (0x0ebb <= code && code <= 0x0ebc) || 
      (0x0ec8 <= code && code <= 0x0ecd) || 
      (0x0f18 <= code && code <= 0x0f19) || 
      0x0f35 === code || 
      0x0f37 === code || 
      0x0f39 === code || 
      (0x0f71 <= code && code <= 0x0f7e) || 
      (0x0f80 <= code && code <= 0x0f84) || 
      (0x0f86 <= code && code <= 0x0f87) || 
      (0x0f8d <= code && code <= 0x0f97) || 
      (0x0f99 <= code && code <= 0x0fbc) || 
      0x0fc6 === code || 
      (0x102d <= code && code <= 0x1030) || 
      (0x1032 <= code && code <= 0x1037) || 
      (0x1039 <= code && code <= 0x103a) || 
      (0x103d <= code && code <= 0x103e) || 
      (0x1058 <= code && code <= 0x1059) || 
      (0x105e <= code && code <= 0x1060) || 
      (0x1071 <= code && code <= 0x1074) || 
      0x1082 === code || 
      (0x1085 <= code && code <= 0x1086) || 
      0x108d === code || 
      0x109d === code || 
      (0x135d <= code && code <= 0x135f) || 
      (0x1712 <= code && code <= 0x1714) || 
      (0x1732 <= code && code <= 0x1734) || 
      (0x1752 <= code && code <= 0x1753) || 
      (0x1772 <= code && code <= 0x1773) || 
      (0x17b4 <= code && code <= 0x17b5) || 
      (0x17b7 <= code && code <= 0x17bd) || 
      0x17c6 === code || 
      (0x17c9 <= code && code <= 0x17d3) || 
      0x17dd === code || 
      (0x180b <= code && code <= 0x180d) || 
      (0x1885 <= code && code <= 0x1886) || 
      0x18a9 === code || 
      (0x1920 <= code && code <= 0x1922) || 
      (0x1927 <= code && code <= 0x1928) || 
      0x1932 === code || 
      (0x1939 <= code && code <= 0x193b) || 
      (0x1a17 <= code && code <= 0x1a18) || 
      0x1a1b === code || 
      0x1a56 === code || 
      (0x1a58 <= code && code <= 0x1a5e) || 
      0x1a60 === code || 
      0x1a62 === code || 
      (0x1a65 <= code && code <= 0x1a6c) || 
      (0x1a73 <= code && code <= 0x1a7c) || 
      0x1a7f === code || 
      (0x1ab0 <= code && code <= 0x1abd) || 
      0x1abe === code || 
      (0x1b00 <= code && code <= 0x1b03) || 
      0x1b34 === code || 
      (0x1b36 <= code && code <= 0x1b3a) || 
      0x1b3c === code || 
      0x1b42 === code || 
      (0x1b6b <= code && code <= 0x1b73) || 
      (0x1b80 <= code && code <= 0x1b81) || 
      (0x1ba2 <= code && code <= 0x1ba5) || 
      (0x1ba8 <= code && code <= 0x1ba9) || 
      (0x1bab <= code && code <= 0x1bad) || 
      0x1be6 === code || 
      (0x1be8 <= code && code <= 0x1be9) || 
      0x1bed === code || 
      (0x1bef <= code && code <= 0x1bf1) || 
      (0x1c2c <= code && code <= 0x1c33) || 
      (0x1c36 <= code && code <= 0x1c37) || 
      (0x1cd0 <= code && code <= 0x1cd2) || 
      (0x1cd4 <= code && code <= 0x1ce0) || 
      (0x1ce2 <= code && code <= 0x1ce8) || 
      0x1ced === code || 
      0x1cf4 === code || 
      (0x1cf8 <= code && code <= 0x1cf9) || 
      (0x1dc0 <= code && code <= 0x1df9) || 
      (0x1dfb <= code && code <= 0x1dff) || 
      0x200c === code || 
      (0x20d0 <= code && code <= 0x20dc) || 
      (0x20dd <= code && code <= 0x20e0) || 
      0x20e1 === code || 
      (0x20e2 <= code && code <= 0x20e4) || 
      (0x20e5 <= code && code <= 0x20f0) || 
      (0x2cef <= code && code <= 0x2cf1) || 
      0x2d7f === code || 
      (0x2de0 <= code && code <= 0x2dff) || 
      (0x302a <= code && code <= 0x302d) || 
      (0x302e <= code && code <= 0x302f) || 
      (0x3099 <= code && code <= 0x309a) || 
      0xa66f === code || 
      (0xa670 <= code && code <= 0xa672) || 
      (0xa674 <= code && code <= 0xa67d) || 
      (0xa69e <= code && code <= 0xa69f) || 
      (0xa6f0 <= code && code <= 0xa6f1) || 
      0xa802 === code || 
      0xa806 === code || 
      0xa80b === code || 
      (0xa825 <= code && code <= 0xa826) || 
      (0xa8c4 <= code && code <= 0xa8c5) || 
      (0xa8e0 <= code && code <= 0xa8f1) || 
      0xa8ff === code || 
      (0xa926 <= code && code <= 0xa92d) || 
      (0xa947 <= code && code <= 0xa951) || 
      (0xa980 <= code && code <= 0xa982) || 
      0xa9b3 === code || 
      (0xa9b6 <= code && code <= 0xa9b9) || 
      0xa9bc === code || 
      0xa9e5 === code || 
      (0xaa29 <= code && code <= 0xaa2e) || 
      (0xaa31 <= code && code <= 0xaa32) || 
      (0xaa35 <= code && code <= 0xaa36) || 
      0xaa43 === code || 
      0xaa4c === code || 
      0xaa7c === code || 
      0xaab0 === code || 
      (0xaab2 <= code && code <= 0xaab4) || 
      (0xaab7 <= code && code <= 0xaab8) || 
      (0xaabe <= code && code <= 0xaabf) || 
      0xaac1 === code || 
      (0xaaec <= code && code <= 0xaaed) || 
      0xaaf6 === code || 
      0xabe5 === code || 
      0xabe8 === code || 
      0xabed === code || 
      0xfb1e === code || 
      (0xfe00 <= code && code <= 0xfe0f) || 
      (0xfe20 <= code && code <= 0xfe2f) || 
      (0xff9e <= code && code <= 0xff9f) || 
      0x101fd === code || 
      0x102e0 === code || 
      (0x10376 <= code && code <= 0x1037a) || 
      (0x10a01 <= code && code <= 0x10a03) || 
      (0x10a05 <= code && code <= 0x10a06) || 
      (0x10a0c <= code && code <= 0x10a0f) || 
      (0x10a38 <= code && code <= 0x10a3a) || 
      0x10a3f === code || 
      (0x10ae5 <= code && code <= 0x10ae6) || 
      (0x10d24 <= code && code <= 0x10d27) || 
      (0x10f46 <= code && code <= 0x10f50) || 
      0x11001 === code || 
      (0x11038 <= code && code <= 0x11046) || 
      (0x1107f <= code && code <= 0x11081) || 
      (0x110b3 <= code && code <= 0x110b6) || 
      (0x110b9 <= code && code <= 0x110ba) || 
      (0x11100 <= code && code <= 0x11102) || 
      (0x11127 <= code && code <= 0x1112b) || 
      (0x1112d <= code && code <= 0x11134) || 
      0x11173 === code || 
      (0x11180 <= code && code <= 0x11181) || 
      (0x111b6 <= code && code <= 0x111be) || 
      (0x111c9 <= code && code <= 0x111cc) || 
      (0x1122f <= code && code <= 0x11231) || 
      0x11234 === code || 
      (0x11236 <= code && code <= 0x11237) || 
      0x1123e === code || 
      0x112df === code || 
      (0x112e3 <= code && code <= 0x112ea) || 
      (0x11300 <= code && code <= 0x11301) || 
      (0x1133b <= code && code <= 0x1133c) || 
      0x1133e === code || 
      0x11340 === code || 
      0x11357 === code || 
      (0x11366 <= code && code <= 0x1136c) || 
      (0x11370 <= code && code <= 0x11374) || 
      (0x11438 <= code && code <= 0x1143f) || 
      (0x11442 <= code && code <= 0x11444) || 
      0x11446 === code || 
      0x1145e === code || 
      0x114b0 === code || 
      (0x114b3 <= code && code <= 0x114b8) || 
      0x114ba === code || 
      0x114bd === code || 
      (0x114bf <= code && code <= 0x114c0) || 
      (0x114c2 <= code && code <= 0x114c3) || 
      0x115af === code || 
      (0x115b2 <= code && code <= 0x115b5) || 
      (0x115bc <= code && code <= 0x115bd) || 
      (0x115bf <= code && code <= 0x115c0) || 
      (0x115dc <= code && code <= 0x115dd) || 
      (0x11633 <= code && code <= 0x1163a) || 
      0x1163d === code || 
      (0x1163f <= code && code <= 0x11640) || 
      0x116ab === code || 
      0x116ad === code || 
      (0x116b0 <= code && code <= 0x116b5) || 
      0x116b7 === code || 
      (0x1171d <= code && code <= 0x1171f) || 
      (0x11722 <= code && code <= 0x11725) || 
      (0x11727 <= code && code <= 0x1172b) || 
      (0x1182f <= code && code <= 0x11837) || 
      (0x11839 <= code && code <= 0x1183a) || 
      (0x11a01 <= code && code <= 0x11a0a) || 
      (0x11a33 <= code && code <= 0x11a38) || 
      (0x11a3b <= code && code <= 0x11a3e) || 
      0x11a47 === code || 
      (0x11a51 <= code && code <= 0x11a56) || 
      (0x11a59 <= code && code <= 0x11a5b) || 
      (0x11a8a <= code && code <= 0x11a96) || 
      (0x11a98 <= code && code <= 0x11a99) || 
      (0x11c30 <= code && code <= 0x11c36) || 
      (0x11c38 <= code && code <= 0x11c3d) || 
      0x11c3f === code || 
      (0x11c92 <= code && code <= 0x11ca7) || 
      (0x11caa <= code && code <= 0x11cb0) || 
      (0x11cb2 <= code && code <= 0x11cb3) || 
      (0x11cb5 <= code && code <= 0x11cb6) || 
      (0x11d31 <= code && code <= 0x11d36) || 
      0x11d3a === code || 
      (0x11d3c <= code && code <= 0x11d3d) || 
      (0x11d3f <= code && code <= 0x11d45) || 
      0x11d47 === code || 
      (0x11d90 <= code && code <= 0x11d91) || 
      0x11d95 === code || 
      0x11d97 === code || 
      (0x11ef3 <= code && code <= 0x11ef4) || 
      (0x16af0 <= code && code <= 0x16af4) || 
      (0x16b30 <= code && code <= 0x16b36) || 
      (0x16f8f <= code && code <= 0x16f92) || 
      (0x1bc9d <= code && code <= 0x1bc9e) || 
      0x1d165 === code || 
      (0x1d167 <= code && code <= 0x1d169) || 
      (0x1d16e <= code && code <= 0x1d172) || 
      (0x1d17b <= code && code <= 0x1d182) || 
      (0x1d185 <= code && code <= 0x1d18b) || 
      (0x1d1aa <= code && code <= 0x1d1ad) || 
      (0x1d242 <= code && code <= 0x1d244) || 
      (0x1da00 <= code && code <= 0x1da36) || 
      (0x1da3b <= code && code <= 0x1da6c) || 
      0x1da75 === code || 
      0x1da84 === code || 
      (0x1da9b <= code && code <= 0x1da9f) || 
      (0x1daa1 <= code && code <= 0x1daaf) || 
      (0x1e000 <= code && code <= 0x1e006) || 
      (0x1e008 <= code && code <= 0x1e018) || 
      (0x1e01b <= code && code <= 0x1e021) || 
      (0x1e023 <= code && code <= 0x1e024) || 
      (0x1e026 <= code && code <= 0x1e02a) || 
      (0x1e8d0 <= code && code <= 0x1e8d6) || 
      (0x1e944 <= code && code <= 0x1e94a) || 
      (0x1f3fb <= code && code <= 0x1f3ff) || 
      (0xe0020 <= code && code <= 0xe007f) || 
      (0xe0100 <= code && code <= 0xe01ef) 
    ) {
      return Extend;
    }
    if (
      0x1f1e6 <= code &&
      code <= 0x1f1ff 
    ) {
      return Regional_Indicator;
    }
    if (
      0x0903 === code || 
      0x093b === code || 
      (0x093e <= code && code <= 0x0940) || 
      (0x0949 <= code && code <= 0x094c) || 
      (0x094e <= code && code <= 0x094f) || 
      (0x0982 <= code && code <= 0x0983) || 
      (0x09bf <= code && code <= 0x09c0) || 
      (0x09c7 <= code && code <= 0x09c8) || 
      (0x09cb <= code && code <= 0x09cc) || 
      0x0a03 === code || 
      (0x0a3e <= code && code <= 0x0a40) || 
      0x0a83 === code || 
      (0x0abe <= code && code <= 0x0ac0) || 
      0x0ac9 === code || 
      (0x0acb <= code && code <= 0x0acc) || 
      (0x0b02 <= code && code <= 0x0b03) || 
      0x0b40 === code || 
      (0x0b47 <= code && code <= 0x0b48) || 
      (0x0b4b <= code && code <= 0x0b4c) || 
      0x0bbf === code || 
      (0x0bc1 <= code && code <= 0x0bc2) || 
      (0x0bc6 <= code && code <= 0x0bc8) || 
      (0x0bca <= code && code <= 0x0bcc) || 
      (0x0c01 <= code && code <= 0x0c03) || 
      (0x0c41 <= code && code <= 0x0c44) || 
      (0x0c82 <= code && code <= 0x0c83) || 
      0x0cbe === code || 
      (0x0cc0 <= code && code <= 0x0cc1) || 
      (0x0cc3 <= code && code <= 0x0cc4) || 
      (0x0cc7 <= code && code <= 0x0cc8) || 
      (0x0cca <= code && code <= 0x0ccb) || 
      (0x0d02 <= code && code <= 0x0d03) || 
      (0x0d3f <= code && code <= 0x0d40) || 
      (0x0d46 <= code && code <= 0x0d48) || 
      (0x0d4a <= code && code <= 0x0d4c) || 
      (0x0d82 <= code && code <= 0x0d83) || 
      (0x0dd0 <= code && code <= 0x0dd1) || 
      (0x0dd8 <= code && code <= 0x0dde) || 
      (0x0df2 <= code && code <= 0x0df3) || 
      0x0e33 === code || 
      0x0eb3 === code || 
      (0x0f3e <= code && code <= 0x0f3f) || 
      0x0f7f === code || 
      0x1031 === code || 
      (0x103b <= code && code <= 0x103c) || 
      (0x1056 <= code && code <= 0x1057) || 
      0x1084 === code || 
      0x17b6 === code || 
      (0x17be <= code && code <= 0x17c5) || 
      (0x17c7 <= code && code <= 0x17c8) || 
      (0x1923 <= code && code <= 0x1926) || 
      (0x1929 <= code && code <= 0x192b) || 
      (0x1930 <= code && code <= 0x1931) || 
      (0x1933 <= code && code <= 0x1938) || 
      (0x1a19 <= code && code <= 0x1a1a) || 
      0x1a55 === code || 
      0x1a57 === code || 
      (0x1a6d <= code && code <= 0x1a72) || 
      0x1b04 === code || 
      0x1b35 === code || 
      0x1b3b === code || 
      (0x1b3d <= code && code <= 0x1b41) || 
      (0x1b43 <= code && code <= 0x1b44) || 
      0x1b82 === code || 
      0x1ba1 === code || 
      (0x1ba6 <= code && code <= 0x1ba7) || 
      0x1baa === code || 
      0x1be7 === code || 
      (0x1bea <= code && code <= 0x1bec) || 
      0x1bee === code || 
      (0x1bf2 <= code && code <= 0x1bf3) || 
      (0x1c24 <= code && code <= 0x1c2b) || 
      (0x1c34 <= code && code <= 0x1c35) || 
      0x1ce1 === code || 
      (0x1cf2 <= code && code <= 0x1cf3) || 
      0x1cf7 === code || 
      (0xa823 <= code && code <= 0xa824) || 
      0xa827 === code || 
      (0xa880 <= code && code <= 0xa881) || 
      (0xa8b4 <= code && code <= 0xa8c3) || 
      (0xa952 <= code && code <= 0xa953) || 
      0xa983 === code || 
      (0xa9b4 <= code && code <= 0xa9b5) || 
      (0xa9ba <= code && code <= 0xa9bb) || 
      (0xa9bd <= code && code <= 0xa9c0) || 
      (0xaa2f <= code && code <= 0xaa30) || 
      (0xaa33 <= code && code <= 0xaa34) || 
      0xaa4d === code || 
      0xaaeb === code || 
      (0xaaee <= code && code <= 0xaaef) || 
      0xaaf5 === code || 
      (0xabe3 <= code && code <= 0xabe4) || 
      (0xabe6 <= code && code <= 0xabe7) || 
      (0xabe9 <= code && code <= 0xabea) || 
      0xabec === code || 
      0x11000 === code || 
      0x11002 === code || 
      0x11082 === code || 
      (0x110b0 <= code && code <= 0x110b2) || 
      (0x110b7 <= code && code <= 0x110b8) || 
      0x1112c === code || 
      (0x11145 <= code && code <= 0x11146) || 
      0x11182 === code || 
      (0x111b3 <= code && code <= 0x111b5) || 
      (0x111bf <= code && code <= 0x111c0) || 
      (0x1122c <= code && code <= 0x1122e) || 
      (0x11232 <= code && code <= 0x11233) || 
      0x11235 === code || 
      (0x112e0 <= code && code <= 0x112e2) || 
      (0x11302 <= code && code <= 0x11303) || 
      0x1133f === code || 
      (0x11341 <= code && code <= 0x11344) || 
      (0x11347 <= code && code <= 0x11348) || 
      (0x1134b <= code && code <= 0x1134d) || 
      (0x11362 <= code && code <= 0x11363) || 
      (0x11435 <= code && code <= 0x11437) || 
      (0x11440 <= code && code <= 0x11441) || 
      0x11445 === code || 
      (0x114b1 <= code && code <= 0x114b2) || 
      0x114b9 === code || 
      (0x114bb <= code && code <= 0x114bc) || 
      0x114be === code || 
      0x114c1 === code || 
      (0x115b0 <= code && code <= 0x115b1) || 
      (0x115b8 <= code && code <= 0x115bb) || 
      0x115be === code || 
      (0x11630 <= code && code <= 0x11632) || 
      (0x1163b <= code && code <= 0x1163c) || 
      0x1163e === code || 
      0x116ac === code || 
      (0x116ae <= code && code <= 0x116af) || 
      0x116b6 === code || 
      (0x11720 <= code && code <= 0x11721) || 
      0x11726 === code || 
      (0x1182c <= code && code <= 0x1182e) || 
      0x11838 === code || 
      0x11a39 === code || 
      (0x11a57 <= code && code <= 0x11a58) || 
      0x11a97 === code || 
      0x11c2f === code || 
      0x11c3e === code || 
      0x11ca9 === code || 
      0x11cb1 === code || 
      0x11cb4 === code || 
      (0x11d8a <= code && code <= 0x11d8e) || 
      (0x11d93 <= code && code <= 0x11d94) || 
      0x11d96 === code || 
      (0x11ef5 <= code && code <= 0x11ef6) || 
      (0x16f51 <= code && code <= 0x16f7e) || 
      0x1d166 === code || 
      0x1d16d === code 
    ) {
      return SpacingMark;
    }
    if (
      (0x1100 <= code && code <= 0x115f) || 
      (0xa960 <= code && code <= 0xa97c) 
    ) {
      return L;
    }
    if (
      (0x1160 <= code && code <= 0x11a7) || 
      (0xd7b0 <= code && code <= 0xd7c6) 
    ) {
      return V;
    }
    if (
      (0x11a8 <= code && code <= 0x11ff) || 
      (0xd7cb <= code && code <= 0xd7fb) 
    ) {
      return T;
    }
    if (
      0xac00 === code || 
      0xac1c === code || 
      0xac38 === code || 
      0xac54 === code || 
      0xac70 === code || 
      0xac8c === code || 
      0xaca8 === code || 
      0xacc4 === code || 
      0xace0 === code || 
      0xacfc === code || 
      0xad18 === code || 
      0xad34 === code || 
      0xad50 === code || 
      0xad6c === code || 
      0xad88 === code || 
      0xada4 === code || 
      0xadc0 === code || 
      0xaddc === code || 
      0xadf8 === code || 
      0xae14 === code || 
      0xae30 === code || 
      0xae4c === code || 
      0xae68 === code || 
      0xae84 === code || 
      0xaea0 === code || 
      0xaebc === code || 
      0xaed8 === code || 
      0xaef4 === code || 
      0xaf10 === code || 
      0xaf2c === code || 
      0xaf48 === code || 
      0xaf64 === code || 
      0xaf80 === code || 
      0xaf9c === code || 
      0xafb8 === code || 
      0xafd4 === code || 
      0xaff0 === code || 
      0xb00c === code || 
      0xb028 === code || 
      0xb044 === code || 
      0xb060 === code || 
      0xb07c === code || 
      0xb098 === code || 
      0xb0b4 === code || 
      0xb0d0 === code || 
      0xb0ec === code || 
      0xb108 === code || 
      0xb124 === code || 
      0xb140 === code || 
      0xb15c === code || 
      0xb178 === code || 
      0xb194 === code || 
      0xb1b0 === code || 
      0xb1cc === code || 
      0xb1e8 === code || 
      0xb204 === code || 
      0xb220 === code || 
      0xb23c === code || 
      0xb258 === code || 
      0xb274 === code || 
      0xb290 === code || 
      0xb2ac === code || 
      0xb2c8 === code || 
      0xb2e4 === code || 
      0xb300 === code || 
      0xb31c === code || 
      0xb338 === code || 
      0xb354 === code || 
      0xb370 === code || 
      0xb38c === code || 
      0xb3a8 === code || 
      0xb3c4 === code || 
      0xb3e0 === code || 
      0xb3fc === code || 
      0xb418 === code || 
      0xb434 === code || 
      0xb450 === code || 
      0xb46c === code || 
      0xb488 === code || 
      0xb4a4 === code || 
      0xb4c0 === code || 
      0xb4dc === code || 
      0xb4f8 === code || 
      0xb514 === code || 
      0xb530 === code || 
      0xb54c === code || 
      0xb568 === code || 
      0xb584 === code || 
      0xb5a0 === code || 
      0xb5bc === code || 
      0xb5d8 === code || 
      0xb5f4 === code || 
      0xb610 === code || 
      0xb62c === code || 
      0xb648 === code || 
      0xb664 === code || 
      0xb680 === code || 
      0xb69c === code || 
      0xb6b8 === code || 
      0xb6d4 === code || 
      0xb6f0 === code || 
      0xb70c === code || 
      0xb728 === code || 
      0xb744 === code || 
      0xb760 === code || 
      0xb77c === code || 
      0xb798 === code || 
      0xb7b4 === code || 
      0xb7d0 === code || 
      0xb7ec === code || 
      0xb808 === code || 
      0xb824 === code || 
      0xb840 === code || 
      0xb85c === code || 
      0xb878 === code || 
      0xb894 === code || 
      0xb8b0 === code || 
      0xb8cc === code || 
      0xb8e8 === code || 
      0xb904 === code || 
      0xb920 === code || 
      0xb93c === code || 
      0xb958 === code || 
      0xb974 === code || 
      0xb990 === code || 
      0xb9ac === code || 
      0xb9c8 === code || 
      0xb9e4 === code || 
      0xba00 === code || 
      0xba1c === code || 
      0xba38 === code || 
      0xba54 === code || 
      0xba70 === code || 
      0xba8c === code || 
      0xbaa8 === code || 
      0xbac4 === code || 
      0xbae0 === code || 
      0xbafc === code || 
      0xbb18 === code || 
      0xbb34 === code || 
      0xbb50 === code || 
      0xbb6c === code || 
      0xbb88 === code || 
      0xbba4 === code || 
      0xbbc0 === code || 
      0xbbdc === code || 
      0xbbf8 === code || 
      0xbc14 === code || 
      0xbc30 === code || 
      0xbc4c === code || 
      0xbc68 === code || 
      0xbc84 === code || 
      0xbca0 === code || 
      0xbcbc === code || 
      0xbcd8 === code || 
      0xbcf4 === code || 
      0xbd10 === code || 
      0xbd2c === code || 
      0xbd48 === code || 
      0xbd64 === code || 
      0xbd80 === code || 
      0xbd9c === code || 
      0xbdb8 === code || 
      0xbdd4 === code || 
      0xbdf0 === code || 
      0xbe0c === code || 
      0xbe28 === code || 
      0xbe44 === code || 
      0xbe60 === code || 
      0xbe7c === code || 
      0xbe98 === code || 
      0xbeb4 === code || 
      0xbed0 === code || 
      0xbeec === code || 
      0xbf08 === code || 
      0xbf24 === code || 
      0xbf40 === code || 
      0xbf5c === code || 
      0xbf78 === code || 
      0xbf94 === code || 
      0xbfb0 === code || 
      0xbfcc === code || 
      0xbfe8 === code || 
      0xc004 === code || 
      0xc020 === code || 
      0xc03c === code || 
      0xc058 === code || 
      0xc074 === code || 
      0xc090 === code || 
      0xc0ac === code || 
      0xc0c8 === code || 
      0xc0e4 === code || 
      0xc100 === code || 
      0xc11c === code || 
      0xc138 === code || 
      0xc154 === code || 
      0xc170 === code || 
      0xc18c === code || 
      0xc1a8 === code || 
      0xc1c4 === code || 
      0xc1e0 === code || 
      0xc1fc === code || 
      0xc218 === code || 
      0xc234 === code || 
      0xc250 === code || 
      0xc26c === code || 
      0xc288 === code || 
      0xc2a4 === code || 
      0xc2c0 === code || 
      0xc2dc === code || 
      0xc2f8 === code || 
      0xc314 === code || 
      0xc330 === code || 
      0xc34c === code || 
      0xc368 === code || 
      0xc384 === code || 
      0xc3a0 === code || 
      0xc3bc === code || 
      0xc3d8 === code || 
      0xc3f4 === code || 
      0xc410 === code || 
      0xc42c === code || 
      0xc448 === code || 
      0xc464 === code || 
      0xc480 === code || 
      0xc49c === code || 
      0xc4b8 === code || 
      0xc4d4 === code || 
      0xc4f0 === code || 
      0xc50c === code || 
      0xc528 === code || 
      0xc544 === code || 
      0xc560 === code || 
      0xc57c === code || 
      0xc598 === code || 
      0xc5b4 === code || 
      0xc5d0 === code || 
      0xc5ec === code || 
      0xc608 === code || 
      0xc624 === code || 
      0xc640 === code || 
      0xc65c === code || 
      0xc678 === code || 
      0xc694 === code || 
      0xc6b0 === code || 
      0xc6cc === code || 
      0xc6e8 === code || 
      0xc704 === code || 
      0xc720 === code || 
      0xc73c === code || 
      0xc758 === code || 
      0xc774 === code || 
      0xc790 === code || 
      0xc7ac === code || 
      0xc7c8 === code || 
      0xc7e4 === code || 
      0xc800 === code || 
      0xc81c === code || 
      0xc838 === code || 
      0xc854 === code || 
      0xc870 === code || 
      0xc88c === code || 
      0xc8a8 === code || 
      0xc8c4 === code || 
      0xc8e0 === code || 
      0xc8fc === code || 
      0xc918 === code || 
      0xc934 === code || 
      0xc950 === code || 
      0xc96c === code || 
      0xc988 === code || 
      0xc9a4 === code || 
      0xc9c0 === code || 
      0xc9dc === code || 
      0xc9f8 === code || 
      0xca14 === code || 
      0xca30 === code || 
      0xca4c === code || 
      0xca68 === code || 
      0xca84 === code || 
      0xcaa0 === code || 
      0xcabc === code || 
      0xcad8 === code || 
      0xcaf4 === code || 
      0xcb10 === code || 
      0xcb2c === code || 
      0xcb48 === code || 
      0xcb64 === code || 
      0xcb80 === code || 
      0xcb9c === code || 
      0xcbb8 === code || 
      0xcbd4 === code || 
      0xcbf0 === code || 
      0xcc0c === code || 
      0xcc28 === code || 
      0xcc44 === code || 
      0xcc60 === code || 
      0xcc7c === code || 
      0xcc98 === code || 
      0xccb4 === code || 
      0xccd0 === code || 
      0xccec === code || 
      0xcd08 === code || 
      0xcd24 === code || 
      0xcd40 === code || 
      0xcd5c === code || 
      0xcd78 === code || 
      0xcd94 === code || 
      0xcdb0 === code || 
      0xcdcc === code || 
      0xcde8 === code || 
      0xce04 === code || 
      0xce20 === code || 
      0xce3c === code || 
      0xce58 === code || 
      0xce74 === code || 
      0xce90 === code || 
      0xceac === code || 
      0xcec8 === code || 
      0xcee4 === code || 
      0xcf00 === code || 
      0xcf1c === code || 
      0xcf38 === code || 
      0xcf54 === code || 
      0xcf70 === code || 
      0xcf8c === code || 
      0xcfa8 === code || 
      0xcfc4 === code || 
      0xcfe0 === code || 
      0xcffc === code || 
      0xd018 === code || 
      0xd034 === code || 
      0xd050 === code || 
      0xd06c === code || 
      0xd088 === code || 
      0xd0a4 === code || 
      0xd0c0 === code || 
      0xd0dc === code || 
      0xd0f8 === code || 
      0xd114 === code || 
      0xd130 === code || 
      0xd14c === code || 
      0xd168 === code || 
      0xd184 === code || 
      0xd1a0 === code || 
      0xd1bc === code || 
      0xd1d8 === code || 
      0xd1f4 === code || 
      0xd210 === code || 
      0xd22c === code || 
      0xd248 === code || 
      0xd264 === code || 
      0xd280 === code || 
      0xd29c === code || 
      0xd2b8 === code || 
      0xd2d4 === code || 
      0xd2f0 === code || 
      0xd30c === code || 
      0xd328 === code || 
      0xd344 === code || 
      0xd360 === code || 
      0xd37c === code || 
      0xd398 === code || 
      0xd3b4 === code || 
      0xd3d0 === code || 
      0xd3ec === code || 
      0xd408 === code || 
      0xd424 === code || 
      0xd440 === code || 
      0xd45c === code || 
      0xd478 === code || 
      0xd494 === code || 
      0xd4b0 === code || 
      0xd4cc === code || 
      0xd4e8 === code || 
      0xd504 === code || 
      0xd520 === code || 
      0xd53c === code || 
      0xd558 === code || 
      0xd574 === code || 
      0xd590 === code || 
      0xd5ac === code || 
      0xd5c8 === code || 
      0xd5e4 === code || 
      0xd600 === code || 
      0xd61c === code || 
      0xd638 === code || 
      0xd654 === code || 
      0xd670 === code || 
      0xd68c === code || 
      0xd6a8 === code || 
      0xd6c4 === code || 
      0xd6e0 === code || 
      0xd6fc === code || 
      0xd718 === code || 
      0xd734 === code || 
      0xd750 === code || 
      0xd76c === code || 
      0xd788 === code 
    ) {
      return LV;
    }
    if (
      (0xac01 <= code && code <= 0xac1b) || 
      (0xac1d <= code && code <= 0xac37) || 
      (0xac39 <= code && code <= 0xac53) || 
      (0xac55 <= code && code <= 0xac6f) || 
      (0xac71 <= code && code <= 0xac8b) || 
      (0xac8d <= code && code <= 0xaca7) || 
      (0xaca9 <= code && code <= 0xacc3) || 
      (0xacc5 <= code && code <= 0xacdf) || 
      (0xace1 <= code && code <= 0xacfb) || 
      (0xacfd <= code && code <= 0xad17) || 
      (0xad19 <= code && code <= 0xad33) || 
      (0xad35 <= code && code <= 0xad4f) || 
      (0xad51 <= code && code <= 0xad6b) || 
      (0xad6d <= code && code <= 0xad87) || 
      (0xad89 <= code && code <= 0xada3) || 
      (0xada5 <= code && code <= 0xadbf) || 
      (0xadc1 <= code && code <= 0xaddb) || 
      (0xaddd <= code && code <= 0xadf7) || 
      (0xadf9 <= code && code <= 0xae13) || 
      (0xae15 <= code && code <= 0xae2f) || 
      (0xae31 <= code && code <= 0xae4b) || 
      (0xae4d <= code && code <= 0xae67) || 
      (0xae69 <= code && code <= 0xae83) || 
      (0xae85 <= code && code <= 0xae9f) || 
      (0xaea1 <= code && code <= 0xaebb) || 
      (0xaebd <= code && code <= 0xaed7) || 
      (0xaed9 <= code && code <= 0xaef3) || 
      (0xaef5 <= code && code <= 0xaf0f) || 
      (0xaf11 <= code && code <= 0xaf2b) || 
      (0xaf2d <= code && code <= 0xaf47) || 
      (0xaf49 <= code && code <= 0xaf63) || 
      (0xaf65 <= code && code <= 0xaf7f) || 
      (0xaf81 <= code && code <= 0xaf9b) || 
      (0xaf9d <= code && code <= 0xafb7) || 
      (0xafb9 <= code && code <= 0xafd3) || 
      (0xafd5 <= code && code <= 0xafef) || 
      (0xaff1 <= code && code <= 0xb00b) || 
      (0xb00d <= code && code <= 0xb027) || 
      (0xb029 <= code && code <= 0xb043) || 
      (0xb045 <= code && code <= 0xb05f) || 
      (0xb061 <= code && code <= 0xb07b) || 
      (0xb07d <= code && code <= 0xb097) || 
      (0xb099 <= code && code <= 0xb0b3) || 
      (0xb0b5 <= code && code <= 0xb0cf) || 
      (0xb0d1 <= code && code <= 0xb0eb) || 
      (0xb0ed <= code && code <= 0xb107) || 
      (0xb109 <= code && code <= 0xb123) || 
      (0xb125 <= code && code <= 0xb13f) || 
      (0xb141 <= code && code <= 0xb15b) || 
      (0xb15d <= code && code <= 0xb177) || 
      (0xb179 <= code && code <= 0xb193) || 
      (0xb195 <= code && code <= 0xb1af) || 
      (0xb1b1 <= code && code <= 0xb1cb) || 
      (0xb1cd <= code && code <= 0xb1e7) || 
      (0xb1e9 <= code && code <= 0xb203) || 
      (0xb205 <= code && code <= 0xb21f) || 
      (0xb221 <= code && code <= 0xb23b) || 
      (0xb23d <= code && code <= 0xb257) || 
      (0xb259 <= code && code <= 0xb273) || 
      (0xb275 <= code && code <= 0xb28f) || 
      (0xb291 <= code && code <= 0xb2ab) || 
      (0xb2ad <= code && code <= 0xb2c7) || 
      (0xb2c9 <= code && code <= 0xb2e3) || 
      (0xb2e5 <= code && code <= 0xb2ff) || 
      (0xb301 <= code && code <= 0xb31b) || 
      (0xb31d <= code && code <= 0xb337) || 
      (0xb339 <= code && code <= 0xb353) || 
      (0xb355 <= code && code <= 0xb36f) || 
      (0xb371 <= code && code <= 0xb38b) || 
      (0xb38d <= code && code <= 0xb3a7) || 
      (0xb3a9 <= code && code <= 0xb3c3) || 
      (0xb3c5 <= code && code <= 0xb3df) || 
      (0xb3e1 <= code && code <= 0xb3fb) || 
      (0xb3fd <= code && code <= 0xb417) || 
      (0xb419 <= code && code <= 0xb433) || 
      (0xb435 <= code && code <= 0xb44f) || 
      (0xb451 <= code && code <= 0xb46b) || 
      (0xb46d <= code && code <= 0xb487) || 
      (0xb489 <= code && code <= 0xb4a3) || 
      (0xb4a5 <= code && code <= 0xb4bf) || 
      (0xb4c1 <= code && code <= 0xb4db) || 
      (0xb4dd <= code && code <= 0xb4f7) || 
      (0xb4f9 <= code && code <= 0xb513) || 
      (0xb515 <= code && code <= 0xb52f) || 
      (0xb531 <= code && code <= 0xb54b) || 
      (0xb54d <= code && code <= 0xb567) || 
      (0xb569 <= code && code <= 0xb583) || 
      (0xb585 <= code && code <= 0xb59f) || 
      (0xb5a1 <= code && code <= 0xb5bb) || 
      (0xb5bd <= code && code <= 0xb5d7) || 
      (0xb5d9 <= code && code <= 0xb5f3) || 
      (0xb5f5 <= code && code <= 0xb60f) || 
      (0xb611 <= code && code <= 0xb62b) || 
      (0xb62d <= code && code <= 0xb647) || 
      (0xb649 <= code && code <= 0xb663) || 
      (0xb665 <= code && code <= 0xb67f) || 
      (0xb681 <= code && code <= 0xb69b) || 
      (0xb69d <= code && code <= 0xb6b7) || 
      (0xb6b9 <= code && code <= 0xb6d3) || 
      (0xb6d5 <= code && code <= 0xb6ef) || 
      (0xb6f1 <= code && code <= 0xb70b) || 
      (0xb70d <= code && code <= 0xb727) || 
      (0xb729 <= code && code <= 0xb743) || 
      (0xb745 <= code && code <= 0xb75f) || 
      (0xb761 <= code && code <= 0xb77b) || 
      (0xb77d <= code && code <= 0xb797) || 
      (0xb799 <= code && code <= 0xb7b3) || 
      (0xb7b5 <= code && code <= 0xb7cf) || 
      (0xb7d1 <= code && code <= 0xb7eb) || 
      (0xb7ed <= code && code <= 0xb807) || 
      (0xb809 <= code && code <= 0xb823) || 
      (0xb825 <= code && code <= 0xb83f) || 
      (0xb841 <= code && code <= 0xb85b) || 
      (0xb85d <= code && code <= 0xb877) || 
      (0xb879 <= code && code <= 0xb893) || 
      (0xb895 <= code && code <= 0xb8af) || 
      (0xb8b1 <= code && code <= 0xb8cb) || 
      (0xb8cd <= code && code <= 0xb8e7) || 
      (0xb8e9 <= code && code <= 0xb903) || 
      (0xb905 <= code && code <= 0xb91f) || 
      (0xb921 <= code && code <= 0xb93b) || 
      (0xb93d <= code && code <= 0xb957) || 
      (0xb959 <= code && code <= 0xb973) || 
      (0xb975 <= code && code <= 0xb98f) || 
      (0xb991 <= code && code <= 0xb9ab) || 
      (0xb9ad <= code && code <= 0xb9c7) || 
      (0xb9c9 <= code && code <= 0xb9e3) || 
      (0xb9e5 <= code && code <= 0xb9ff) || 
      (0xba01 <= code && code <= 0xba1b) || 
      (0xba1d <= code && code <= 0xba37) || 
      (0xba39 <= code && code <= 0xba53) || 
      (0xba55 <= code && code <= 0xba6f) || 
      (0xba71 <= code && code <= 0xba8b) || 
      (0xba8d <= code && code <= 0xbaa7) || 
      (0xbaa9 <= code && code <= 0xbac3) || 
      (0xbac5 <= code && code <= 0xbadf) || 
      (0xbae1 <= code && code <= 0xbafb) || 
      (0xbafd <= code && code <= 0xbb17) || 
      (0xbb19 <= code && code <= 0xbb33) || 
      (0xbb35 <= code && code <= 0xbb4f) || 
      (0xbb51 <= code && code <= 0xbb6b) || 
      (0xbb6d <= code && code <= 0xbb87) || 
      (0xbb89 <= code && code <= 0xbba3) || 
      (0xbba5 <= code && code <= 0xbbbf) || 
      (0xbbc1 <= code && code <= 0xbbdb) || 
      (0xbbdd <= code && code <= 0xbbf7) || 
      (0xbbf9 <= code && code <= 0xbc13) || 
      (0xbc15 <= code && code <= 0xbc2f) || 
      (0xbc31 <= code && code <= 0xbc4b) || 
      (0xbc4d <= code && code <= 0xbc67) || 
      (0xbc69 <= code && code <= 0xbc83) || 
      (0xbc85 <= code && code <= 0xbc9f) || 
      (0xbca1 <= code && code <= 0xbcbb) || 
      (0xbcbd <= code && code <= 0xbcd7) || 
      (0xbcd9 <= code && code <= 0xbcf3) || 
      (0xbcf5 <= code && code <= 0xbd0f) || 
      (0xbd11 <= code && code <= 0xbd2b) || 
      (0xbd2d <= code && code <= 0xbd47) || 
      (0xbd49 <= code && code <= 0xbd63) || 
      (0xbd65 <= code && code <= 0xbd7f) || 
      (0xbd81 <= code && code <= 0xbd9b) || 
      (0xbd9d <= code && code <= 0xbdb7) || 
      (0xbdb9 <= code && code <= 0xbdd3) || 
      (0xbdd5 <= code && code <= 0xbdef) || 
      (0xbdf1 <= code && code <= 0xbe0b) || 
      (0xbe0d <= code && code <= 0xbe27) || 
      (0xbe29 <= code && code <= 0xbe43) || 
      (0xbe45 <= code && code <= 0xbe5f) || 
      (0xbe61 <= code && code <= 0xbe7b) || 
      (0xbe7d <= code && code <= 0xbe97) || 
      (0xbe99 <= code && code <= 0xbeb3) || 
      (0xbeb5 <= code && code <= 0xbecf) || 
      (0xbed1 <= code && code <= 0xbeeb) || 
      (0xbeed <= code && code <= 0xbf07) || 
      (0xbf09 <= code && code <= 0xbf23) || 
      (0xbf25 <= code && code <= 0xbf3f) || 
      (0xbf41 <= code && code <= 0xbf5b) || 
      (0xbf5d <= code && code <= 0xbf77) || 
      (0xbf79 <= code && code <= 0xbf93) || 
      (0xbf95 <= code && code <= 0xbfaf) || 
      (0xbfb1 <= code && code <= 0xbfcb) || 
      (0xbfcd <= code && code <= 0xbfe7) || 
      (0xbfe9 <= code && code <= 0xc003) || 
      (0xc005 <= code && code <= 0xc01f) || 
      (0xc021 <= code && code <= 0xc03b) || 
      (0xc03d <= code && code <= 0xc057) || 
      (0xc059 <= code && code <= 0xc073) || 
      (0xc075 <= code && code <= 0xc08f) || 
      (0xc091 <= code && code <= 0xc0ab) || 
      (0xc0ad <= code && code <= 0xc0c7) || 
      (0xc0c9 <= code && code <= 0xc0e3) || 
      (0xc0e5 <= code && code <= 0xc0ff) || 
      (0xc101 <= code && code <= 0xc11b) || 
      (0xc11d <= code && code <= 0xc137) || 
      (0xc139 <= code && code <= 0xc153) || 
      (0xc155 <= code && code <= 0xc16f) || 
      (0xc171 <= code && code <= 0xc18b) || 
      (0xc18d <= code && code <= 0xc1a7) || 
      (0xc1a9 <= code && code <= 0xc1c3) || 
      (0xc1c5 <= code && code <= 0xc1df) || 
      (0xc1e1 <= code && code <= 0xc1fb) || 
      (0xc1fd <= code && code <= 0xc217) || 
      (0xc219 <= code && code <= 0xc233) || 
      (0xc235 <= code && code <= 0xc24f) || 
      (0xc251 <= code && code <= 0xc26b) || 
      (0xc26d <= code && code <= 0xc287) || 
      (0xc289 <= code && code <= 0xc2a3) || 
      (0xc2a5 <= code && code <= 0xc2bf) || 
      (0xc2c1 <= code && code <= 0xc2db) || 
      (0xc2dd <= code && code <= 0xc2f7) || 
      (0xc2f9 <= code && code <= 0xc313) || 
      (0xc315 <= code && code <= 0xc32f) || 
      (0xc331 <= code && code <= 0xc34b) || 
      (0xc34d <= code && code <= 0xc367) || 
      (0xc369 <= code && code <= 0xc383) || 
      (0xc385 <= code && code <= 0xc39f) || 
      (0xc3a1 <= code && code <= 0xc3bb) || 
      (0xc3bd <= code && code <= 0xc3d7) || 
      (0xc3d9 <= code && code <= 0xc3f3) || 
      (0xc3f5 <= code && code <= 0xc40f) || 
      (0xc411 <= code && code <= 0xc42b) || 
      (0xc42d <= code && code <= 0xc447) || 
      (0xc449 <= code && code <= 0xc463) || 
      (0xc465 <= code && code <= 0xc47f) || 
      (0xc481 <= code && code <= 0xc49b) || 
      (0xc49d <= code && code <= 0xc4b7) || 
      (0xc4b9 <= code && code <= 0xc4d3) || 
      (0xc4d5 <= code && code <= 0xc4ef) || 
      (0xc4f1 <= code && code <= 0xc50b) || 
      (0xc50d <= code && code <= 0xc527) || 
      (0xc529 <= code && code <= 0xc543) || 
      (0xc545 <= code && code <= 0xc55f) || 
      (0xc561 <= code && code <= 0xc57b) || 
      (0xc57d <= code && code <= 0xc597) || 
      (0xc599 <= code && code <= 0xc5b3) || 
      (0xc5b5 <= code && code <= 0xc5cf) || 
      (0xc5d1 <= code && code <= 0xc5eb) || 
      (0xc5ed <= code && code <= 0xc607) || 
      (0xc609 <= code && code <= 0xc623) || 
      (0xc625 <= code && code <= 0xc63f) || 
      (0xc641 <= code && code <= 0xc65b) || 
      (0xc65d <= code && code <= 0xc677) || 
      (0xc679 <= code && code <= 0xc693) || 
      (0xc695 <= code && code <= 0xc6af) || 
      (0xc6b1 <= code && code <= 0xc6cb) || 
      (0xc6cd <= code && code <= 0xc6e7) || 
      (0xc6e9 <= code && code <= 0xc703) || 
      (0xc705 <= code && code <= 0xc71f) || 
      (0xc721 <= code && code <= 0xc73b) || 
      (0xc73d <= code && code <= 0xc757) || 
      (0xc759 <= code && code <= 0xc773) || 
      (0xc775 <= code && code <= 0xc78f) || 
      (0xc791 <= code && code <= 0xc7ab) || 
      (0xc7ad <= code && code <= 0xc7c7) || 
      (0xc7c9 <= code && code <= 0xc7e3) || 
      (0xc7e5 <= code && code <= 0xc7ff) || 
      (0xc801 <= code && code <= 0xc81b) || 
      (0xc81d <= code && code <= 0xc837) || 
      (0xc839 <= code && code <= 0xc853) || 
      (0xc855 <= code && code <= 0xc86f) || 
      (0xc871 <= code && code <= 0xc88b) || 
      (0xc88d <= code && code <= 0xc8a7) || 
      (0xc8a9 <= code && code <= 0xc8c3) || 
      (0xc8c5 <= code && code <= 0xc8df) || 
      (0xc8e1 <= code && code <= 0xc8fb) || 
      (0xc8fd <= code && code <= 0xc917) || 
      (0xc919 <= code && code <= 0xc933) || 
      (0xc935 <= code && code <= 0xc94f) || 
      (0xc951 <= code && code <= 0xc96b) || 
      (0xc96d <= code && code <= 0xc987) || 
      (0xc989 <= code && code <= 0xc9a3) || 
      (0xc9a5 <= code && code <= 0xc9bf) || 
      (0xc9c1 <= code && code <= 0xc9db) || 
      (0xc9dd <= code && code <= 0xc9f7) || 
      (0xc9f9 <= code && code <= 0xca13) || 
      (0xca15 <= code && code <= 0xca2f) || 
      (0xca31 <= code && code <= 0xca4b) || 
      (0xca4d <= code && code <= 0xca67) || 
      (0xca69 <= code && code <= 0xca83) || 
      (0xca85 <= code && code <= 0xca9f) || 
      (0xcaa1 <= code && code <= 0xcabb) || 
      (0xcabd <= code && code <= 0xcad7) || 
      (0xcad9 <= code && code <= 0xcaf3) || 
      (0xcaf5 <= code && code <= 0xcb0f) || 
      (0xcb11 <= code && code <= 0xcb2b) || 
      (0xcb2d <= code && code <= 0xcb47) || 
      (0xcb49 <= code && code <= 0xcb63) || 
      (0xcb65 <= code && code <= 0xcb7f) || 
      (0xcb81 <= code && code <= 0xcb9b) || 
      (0xcb9d <= code && code <= 0xcbb7) || 
      (0xcbb9 <= code && code <= 0xcbd3) || 
      (0xcbd5 <= code && code <= 0xcbef) || 
      (0xcbf1 <= code && code <= 0xcc0b) || 
      (0xcc0d <= code && code <= 0xcc27) || 
      (0xcc29 <= code && code <= 0xcc43) || 
      (0xcc45 <= code && code <= 0xcc5f) || 
      (0xcc61 <= code && code <= 0xcc7b) || 
      (0xcc7d <= code && code <= 0xcc97) || 
      (0xcc99 <= code && code <= 0xccb3) || 
      (0xccb5 <= code && code <= 0xcccf) || 
      (0xccd1 <= code && code <= 0xcceb) || 
      (0xcced <= code && code <= 0xcd07) || 
      (0xcd09 <= code && code <= 0xcd23) || 
      (0xcd25 <= code && code <= 0xcd3f) || 
      (0xcd41 <= code && code <= 0xcd5b) || 
      (0xcd5d <= code && code <= 0xcd77) || 
      (0xcd79 <= code && code <= 0xcd93) || 
      (0xcd95 <= code && code <= 0xcdaf) || 
      (0xcdb1 <= code && code <= 0xcdcb) || 
      (0xcdcd <= code && code <= 0xcde7) || 
      (0xcde9 <= code && code <= 0xce03) || 
      (0xce05 <= code && code <= 0xce1f) || 
      (0xce21 <= code && code <= 0xce3b) || 
      (0xce3d <= code && code <= 0xce57) || 
      (0xce59 <= code && code <= 0xce73) || 
      (0xce75 <= code && code <= 0xce8f) || 
      (0xce91 <= code && code <= 0xceab) || 
      (0xcead <= code && code <= 0xcec7) || 
      (0xcec9 <= code && code <= 0xcee3) || 
      (0xcee5 <= code && code <= 0xceff) || 
      (0xcf01 <= code && code <= 0xcf1b) || 
      (0xcf1d <= code && code <= 0xcf37) || 
      (0xcf39 <= code && code <= 0xcf53) || 
      (0xcf55 <= code && code <= 0xcf6f) || 
      (0xcf71 <= code && code <= 0xcf8b) || 
      (0xcf8d <= code && code <= 0xcfa7) || 
      (0xcfa9 <= code && code <= 0xcfc3) || 
      (0xcfc5 <= code && code <= 0xcfdf) || 
      (0xcfe1 <= code && code <= 0xcffb) || 
      (0xcffd <= code && code <= 0xd017) || 
      (0xd019 <= code && code <= 0xd033) || 
      (0xd035 <= code && code <= 0xd04f) || 
      (0xd051 <= code && code <= 0xd06b) || 
      (0xd06d <= code && code <= 0xd087) || 
      (0xd089 <= code && code <= 0xd0a3) || 
      (0xd0a5 <= code && code <= 0xd0bf) || 
      (0xd0c1 <= code && code <= 0xd0db) || 
      (0xd0dd <= code && code <= 0xd0f7) || 
      (0xd0f9 <= code && code <= 0xd113) || 
      (0xd115 <= code && code <= 0xd12f) || 
      (0xd131 <= code && code <= 0xd14b) || 
      (0xd14d <= code && code <= 0xd167) || 
      (0xd169 <= code && code <= 0xd183) || 
      (0xd185 <= code && code <= 0xd19f) || 
      (0xd1a1 <= code && code <= 0xd1bb) || 
      (0xd1bd <= code && code <= 0xd1d7) || 
      (0xd1d9 <= code && code <= 0xd1f3) || 
      (0xd1f5 <= code && code <= 0xd20f) || 
      (0xd211 <= code && code <= 0xd22b) || 
      (0xd22d <= code && code <= 0xd247) || 
      (0xd249 <= code && code <= 0xd263) || 
      (0xd265 <= code && code <= 0xd27f) || 
      (0xd281 <= code && code <= 0xd29b) || 
      (0xd29d <= code && code <= 0xd2b7) || 
      (0xd2b9 <= code && code <= 0xd2d3) || 
      (0xd2d5 <= code && code <= 0xd2ef) || 
      (0xd2f1 <= code && code <= 0xd30b) || 
      (0xd30d <= code && code <= 0xd327) || 
      (0xd329 <= code && code <= 0xd343) || 
      (0xd345 <= code && code <= 0xd35f) || 
      (0xd361 <= code && code <= 0xd37b) || 
      (0xd37d <= code && code <= 0xd397) || 
      (0xd399 <= code && code <= 0xd3b3) || 
      (0xd3b5 <= code && code <= 0xd3cf) || 
      (0xd3d1 <= code && code <= 0xd3eb) || 
      (0xd3ed <= code && code <= 0xd407) || 
      (0xd409 <= code && code <= 0xd423) || 
      (0xd425 <= code && code <= 0xd43f) || 
      (0xd441 <= code && code <= 0xd45b) || 
      (0xd45d <= code && code <= 0xd477) || 
      (0xd479 <= code && code <= 0xd493) || 
      (0xd495 <= code && code <= 0xd4af) || 
      (0xd4b1 <= code && code <= 0xd4cb) || 
      (0xd4cd <= code && code <= 0xd4e7) || 
      (0xd4e9 <= code && code <= 0xd503) || 
      (0xd505 <= code && code <= 0xd51f) || 
      (0xd521 <= code && code <= 0xd53b) || 
      (0xd53d <= code && code <= 0xd557) || 
      (0xd559 <= code && code <= 0xd573) || 
      (0xd575 <= code && code <= 0xd58f) || 
      (0xd591 <= code && code <= 0xd5ab) || 
      (0xd5ad <= code && code <= 0xd5c7) || 
      (0xd5c9 <= code && code <= 0xd5e3) || 
      (0xd5e5 <= code && code <= 0xd5ff) || 
      (0xd601 <= code && code <= 0xd61b) || 
      (0xd61d <= code && code <= 0xd637) || 
      (0xd639 <= code && code <= 0xd653) || 
      (0xd655 <= code && code <= 0xd66f) || 
      (0xd671 <= code && code <= 0xd68b) || 
      (0xd68d <= code && code <= 0xd6a7) || 
      (0xd6a9 <= code && code <= 0xd6c3) || 
      (0xd6c5 <= code && code <= 0xd6df) || 
      (0xd6e1 <= code && code <= 0xd6fb) || 
      (0xd6fd <= code && code <= 0xd717) || 
      (0xd719 <= code && code <= 0xd733) || 
      (0xd735 <= code && code <= 0xd74f) || 
      (0xd751 <= code && code <= 0xd76b) || 
      (0xd76d <= code && code <= 0xd787) || 
      (0xd789 <= code && code <= 0xd7a3) 
    ) {
      return LVT;
    }
    if (
      0x200d === code 
    ) {
      return ZWJ;
    }

    
    return Other;
  }

  static getEmojiProperty(code) {
    
    
    
    
    if (
      0x00a9 === code || 
      0x00ae === code || 
      0x203c === code || 
      0x2049 === code || 
      0x2122 === code || 
      0x2139 === code || 
      (0x2194 <= code && code <= 0x2199) || 
      (0x21a9 <= code && code <= 0x21aa) || 
      (0x231a <= code && code <= 0x231b) || 
      0x2328 === code || 
      0x2388 === code || 
      0x23cf === code || 
      (0x23e9 <= code && code <= 0x23f3) || 
      (0x23f8 <= code && code <= 0x23fa) || 
      0x24c2 === code || 
      (0x25aa <= code && code <= 0x25ab) || 
      0x25b6 === code || 
      0x25c0 === code || 
      (0x25fb <= code && code <= 0x25fe) || 
      (0x2600 <= code && code <= 0x2605) || 
      (0x2607 <= code && code <= 0x2612) || 
      (0x2614 <= code && code <= 0x2615) || 
      (0x2616 <= code && code <= 0x2617) || 
      0x2618 === code || 
      0x2619 === code || 
      (0x261a <= code && code <= 0x266f) || 
      (0x2670 <= code && code <= 0x2671) || 
      (0x2672 <= code && code <= 0x267d) || 
      (0x267e <= code && code <= 0x267f) || 
      (0x2680 <= code && code <= 0x2685) || 
      (0x2690 <= code && code <= 0x2691) || 
      (0x2692 <= code && code <= 0x269c) || 
      0x269d === code || 
      (0x269e <= code && code <= 0x269f) || 
      (0x26a0 <= code && code <= 0x26a1) || 
      (0x26a2 <= code && code <= 0x26b1) || 
      0x26b2 === code || 
      (0x26b3 <= code && code <= 0x26bc) || 
      (0x26bd <= code && code <= 0x26bf) || 
      (0x26c0 <= code && code <= 0x26c3) || 
      (0x26c4 <= code && code <= 0x26cd) || 
      0x26ce === code || 
      (0x26cf <= code && code <= 0x26e1) || 
      0x26e2 === code || 
      0x26e3 === code || 
      (0x26e4 <= code && code <= 0x26e7) || 
      (0x26e8 <= code && code <= 0x26ff) || 
      0x2700 === code || 
      (0x2701 <= code && code <= 0x2704) || 
      0x2705 === code || 
      (0x2708 <= code && code <= 0x2709) || 
      (0x270a <= code && code <= 0x270b) || 
      (0x270c <= code && code <= 0x2712) || 
      0x2714 === code || 
      0x2716 === code || 
      0x271d === code || 
      0x2721 === code || 
      0x2728 === code || 
      (0x2733 <= code && code <= 0x2734) || 
      0x2744 === code || 
      0x2747 === code || 
      0x274c === code || 
      0x274e === code || 
      (0x2753 <= code && code <= 0x2755) || 
      0x2757 === code || 
      (0x2763 <= code && code <= 0x2767) || 
      (0x2795 <= code && code <= 0x2797) || 
      0x27a1 === code || 
      0x27b0 === code || 
      0x27bf === code || 
      (0x2934 <= code && code <= 0x2935) || 
      (0x2b05 <= code && code <= 0x2b07) || 
      (0x2b1b <= code && code <= 0x2b1c) || 
      0x2b50 === code || 
      0x2b55 === code || 
      0x3030 === code || 
      0x303d === code || 
      0x3297 === code || 
      0x3299 === code || 
      (0x1f000 <= code && code <= 0x1f02b) || 
      (0x1f02c <= code && code <= 0x1f02f) || 
      (0x1f030 <= code && code <= 0x1f093) || 
      (0x1f094 <= code && code <= 0x1f09f) || 
      (0x1f0a0 <= code && code <= 0x1f0ae) || 
      (0x1f0af <= code && code <= 0x1f0b0) || 
      (0x1f0b1 <= code && code <= 0x1f0be) || 
      0x1f0bf === code || 
      0x1f0c0 === code || 
      (0x1f0c1 <= code && code <= 0x1f0cf) || 
      0x1f0d0 === code || 
      (0x1f0d1 <= code && code <= 0x1f0df) || 
      (0x1f0e0 <= code && code <= 0x1f0f5) || 
      (0x1f0f6 <= code && code <= 0x1f0ff) || 
      (0x1f10d <= code && code <= 0x1f10f) || 
      0x1f12f === code || 
      (0x1f16c <= code && code <= 0x1f16f) || 
      (0x1f170 <= code && code <= 0x1f171) || 
      0x1f17e === code || 
      0x1f17f === code || 
      0x1f18e === code || 
      (0x1f191 <= code && code <= 0x1f19a) || 
      (0x1f1ad <= code && code <= 0x1f1e5) || 
      (0x1f201 <= code && code <= 0x1f202) || 
      (0x1f203 <= code && code <= 0x1f20f) || 
      0x1f21a === code || 
      0x1f22f === code || 
      (0x1f232 <= code && code <= 0x1f23a) || 
      (0x1f23c <= code && code <= 0x1f23f) || 
      (0x1f249 <= code && code <= 0x1f24f) || 
      (0x1f250 <= code && code <= 0x1f251) || 
      (0x1f252 <= code && code <= 0x1f25f) || 
      (0x1f260 <= code && code <= 0x1f265) || 
      (0x1f266 <= code && code <= 0x1f2ff) || 
      (0x1f300 <= code && code <= 0x1f320) || 
      (0x1f321 <= code && code <= 0x1f32c) || 
      (0x1f32d <= code && code <= 0x1f32f) || 
      (0x1f330 <= code && code <= 0x1f335) || 
      0x1f336 === code || 
      (0x1f337 <= code && code <= 0x1f37c) || 
      0x1f37d === code || 
      (0x1f37e <= code && code <= 0x1f37f) || 
      (0x1f380 <= code && code <= 0x1f393) || 
      (0x1f394 <= code && code <= 0x1f39f) || 
      (0x1f3a0 <= code && code <= 0x1f3c4) || 
      0x1f3c5 === code || 
      (0x1f3c6 <= code && code <= 0x1f3ca) || 
      (0x1f3cb <= code && code <= 0x1f3ce) || 
      (0x1f3cf <= code && code <= 0x1f3d3) || 
      (0x1f3d4 <= code && code <= 0x1f3df) || 
      (0x1f3e0 <= code && code <= 0x1f3f0) || 
      (0x1f3f1 <= code && code <= 0x1f3f7) || 
      (0x1f3f8 <= code && code <= 0x1f3fa) || 
      (0x1f400 <= code && code <= 0x1f43e) || 
      0x1f43f === code || 
      0x1f440 === code || 
      0x1f441 === code || 
      (0x1f442 <= code && code <= 0x1f4f7) || 
      0x1f4f8 === code || 
      (0x1f4f9 <= code && code <= 0x1f4fc) || 
      (0x1f4fd <= code && code <= 0x1f4fe) || 
      0x1f4ff === code || 
      (0x1f500 <= code && code <= 0x1f53d) || 
      (0x1f546 <= code && code <= 0x1f54a) || 
      (0x1f54b <= code && code <= 0x1f54f) || 
      (0x1f550 <= code && code <= 0x1f567) || 
      (0x1f568 <= code && code <= 0x1f579) || 
      0x1f57a === code || 
      (0x1f57b <= code && code <= 0x1f5a3) || 
      0x1f5a4 === code || 
      (0x1f5a5 <= code && code <= 0x1f5fa) || 
      (0x1f5fb <= code && code <= 0x1f5ff) || 
      0x1f600 === code || 
      (0x1f601 <= code && code <= 0x1f610) || 
      0x1f611 === code || 
      (0x1f612 <= code && code <= 0x1f614) || 
      0x1f615 === code || 
      0x1f616 === code || 
      0x1f617 === code || 
      0x1f618 === code || 
      0x1f619 === code || 
      0x1f61a === code || 
      0x1f61b === code || 
      (0x1f61c <= code && code <= 0x1f61e) || 
      0x1f61f === code || 
      (0x1f620 <= code && code <= 0x1f625) || 
      (0x1f626 <= code && code <= 0x1f627) || 
      (0x1f628 <= code && code <= 0x1f62b) || 
      0x1f62c === code || 
      0x1f62d === code || 
      (0x1f62e <= code && code <= 0x1f62f) || 
      (0x1f630 <= code && code <= 0x1f633) || 
      0x1f634 === code || 
      (0x1f635 <= code && code <= 0x1f640) || 
      (0x1f641 <= code && code <= 0x1f642) || 
      (0x1f643 <= code && code <= 0x1f644) || 
      (0x1f645 <= code && code <= 0x1f64f) || 
      (0x1f680 <= code && code <= 0x1f6c5) || 
      (0x1f6c6 <= code && code <= 0x1f6cf) || 
      0x1f6d0 === code || 
      (0x1f6d1 <= code && code <= 0x1f6d2) || 
      (0x1f6d3 <= code && code <= 0x1f6d4) || 
      (0x1f6d5 <= code && code <= 0x1f6df) || 
      (0x1f6e0 <= code && code <= 0x1f6ec) || 
      (0x1f6ed <= code && code <= 0x1f6ef) || 
      (0x1f6f0 <= code && code <= 0x1f6f3) || 
      (0x1f6f4 <= code && code <= 0x1f6f6) || 
      (0x1f6f7 <= code && code <= 0x1f6f8) || 
      0x1f6f9 === code || 
      (0x1f6fa <= code && code <= 0x1f6ff) || 
      (0x1f774 <= code && code <= 0x1f77f) || 
      (0x1f7d5 <= code && code <= 0x1f7d8) || 
      (0x1f7d9 <= code && code <= 0x1f7ff) || 
      (0x1f80c <= code && code <= 0x1f80f) || 
      (0x1f848 <= code && code <= 0x1f84f) || 
      (0x1f85a <= code && code <= 0x1f85f) || 
      (0x1f888 <= code && code <= 0x1f88f) || 
      (0x1f8ae <= code && code <= 0x1f8ff) || 
      (0x1f90c <= code && code <= 0x1f90f) || 
      (0x1f910 <= code && code <= 0x1f918) || 
      (0x1f919 <= code && code <= 0x1f91e) || 
      0x1f91f === code || 
      (0x1f920 <= code && code <= 0x1f927) || 
      (0x1f928 <= code && code <= 0x1f92f) || 
      0x1f930 === code || 
      (0x1f931 <= code && code <= 0x1f932) || 
      (0x1f933 <= code && code <= 0x1f93a) || 
      (0x1f93c <= code && code <= 0x1f93e) || 
      0x1f93f === code || 
      (0x1f940 <= code && code <= 0x1f945) || 
      (0x1f947 <= code && code <= 0x1f94b) || 
      0x1f94c === code || 
      (0x1f94d <= code && code <= 0x1f94f) || 
      (0x1f950 <= code && code <= 0x1f95e) || 
      (0x1f95f <= code && code <= 0x1f96b) || 
      (0x1f96c <= code && code <= 0x1f970) || 
      (0x1f971 <= code && code <= 0x1f972) || 
      (0x1f973 <= code && code <= 0x1f976) || 
      (0x1f977 <= code && code <= 0x1f979) || 
      0x1f97a === code || 
      0x1f97b === code || 
      (0x1f97c <= code && code <= 0x1f97f) || 
      (0x1f980 <= code && code <= 0x1f984) || 
      (0x1f985 <= code && code <= 0x1f991) || 
      (0x1f992 <= code && code <= 0x1f997) || 
      (0x1f998 <= code && code <= 0x1f9a2) || 
      (0x1f9a3 <= code && code <= 0x1f9af) || 
      (0x1f9b0 <= code && code <= 0x1f9b9) || 
      (0x1f9ba <= code && code <= 0x1f9bf) || 
      0x1f9c0 === code || 
      (0x1f9c1 <= code && code <= 0x1f9c2) || 
      (0x1f9c3 <= code && code <= 0x1f9cf) || 
      (0x1f9d0 <= code && code <= 0x1f9e6) || 
      (0x1f9e7 <= code && code <= 0x1f9ff) || 
      (0x1fa00 <= code && code <= 0x1fa5f) || 
      (0x1fa60 <= code && code <= 0x1fa6d) || 
      (0x1fa6e <= code && code <= 0x1fffd) 
    ) {
      return Extended_Pictographic;
    }

    return Other;
  }
}
