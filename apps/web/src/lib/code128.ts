/**
 * Minimal Code 128 (subset B) encoder. Returns the bar layout in modules so
 * the caller can draw it at any size.
 */

// Bar/space widths for symbol values 0–106 (106 is the stop pattern).
// prettier-ignore
const PATTERNS = [
  "212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
  "221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
  "221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
  "212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
  "231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
  "231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
  "314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
  "112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
  "111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
  "214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
  "114131", "311141", "411131", "211412", "211214", "211232", "2331112",
];

const START_B = 104;
const STOP = 106;

export interface Bar {
  /** Offset from the left edge, in modules. */
  x: number;
  /** Width in modules. */
  width: number;
}

export interface Code128 {
  bars: Bar[];
  /** Total width in modules, without quiet zone. */
  width: number;
}

/** Characters that subset B can encode: printable ASCII 32–126. */
export function isEncodable(text: string): boolean {
  return /^[\x20-\x7e]*$/.test(text);
}

export function code128Values(text: string): number[] {
  if (!isEncodable(text)) throw new Error("Code 128 B only encodes printable ASCII.");
  const data = Array.from(text, (ch) => ch.charCodeAt(0) - 32);
  const checksum = data.reduce((sum, value, i) => sum + value * (i + 1), START_B) % 103;
  return [START_B, ...data, checksum, STOP];
}

export function encodeCode128(text: string): Code128 {
  const bars: Bar[] = [];
  let x = 0;
  for (const value of code128Values(text)) {
    const pattern = PATTERNS[value];
    for (let i = 0; i < pattern.length; i++) {
      const width = Number(pattern[i]);
      // Even positions are bars, odd positions are spaces.
      if (i % 2 === 0) bars.push({ x, width });
      x += width;
    }
  }
  return { bars, width: x };
}
