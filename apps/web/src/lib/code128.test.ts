import { describe, expect, it } from "vitest";
import { code128Values, encodeCode128, isEncodable } from "./code128";

describe("code128", () => {
  it("adds start, checksum and stop symbols", () => {
    // "A" has value 33; checksum = (104 + 33 * 1) % 103 = 34.
    expect(code128Values("A")).toEqual([104, 33, 34, 106]);
  });

  it("weights the checksum by position", () => {
    // "AB": (104 + 33 * 1 + 34 * 2) % 103 = 102.
    expect(code128Values("AB")).toEqual([104, 33, 34, 102, 106]);
  });

  it("lays out 11 modules per symbol and 13 for the stop pattern", () => {
    const { width, bars } = encodeCode128("twyPtm");
    expect(width).toBe((1 + 6 + 1) * 11 + 13);
    expect(bars[0]).toEqual({ x: 0, width: 2 });
  });

  it("only accepts printable ASCII", () => {
    expect(isEncodable("abc-123_XY")).toBe(true);
    expect(isEncodable("äö")).toBe(false);
    expect(() => code128Values("ä")).toThrow();
  });
});
