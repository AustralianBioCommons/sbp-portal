import { parsePositiveInteger, parseWholeNumber } from "./number-input.utils";

describe("parseWholeNumber", () => {
  it("accepts whole numbers including zero", () => {
    expect(parseWholeNumber("0")).toBe(0);
    expect(parseWholeNumber(" 12 ")).toBe(12);
  });

  it("rejects decimals, negatives and non-numeric text", () => {
    expect(parseWholeNumber("3.5")).toBeNull();
    expect(parseWholeNumber("3.0")).toBeNull();
    expect(parseWholeNumber("-2")).toBeNull();
    expect(parseWholeNumber("+2")).toBeNull();
    expect(parseWholeNumber("1e3")).toBeNull();
    expect(parseWholeNumber("0x1a")).toBeNull();
    expect(parseWholeNumber("")).toBeNull();
    expect(parseWholeNumber("abc")).toBeNull();
  });

  it("rejects digit strings beyond safe integer precision", () => {
    expect(parseWholeNumber("99999999999999999999")).toBeNull();
  });
});

describe("parsePositiveInteger", () => {
  it("accepts whole positive numbers", () => {
    expect(parsePositiveInteger("1")).toBe(1);
    expect(parsePositiveInteger(" 12 ")).toBe(12);
  });

  it("rejects zero, decimals, negatives and non-numeric text", () => {
    expect(parsePositiveInteger("0")).toBeNull();
    expect(parsePositiveInteger("3.5")).toBeNull();
    expect(parsePositiveInteger("-2")).toBeNull();
    expect(parsePositiveInteger("")).toBeNull();
    expect(parsePositiveInteger("abc")).toBeNull();
  });
});
