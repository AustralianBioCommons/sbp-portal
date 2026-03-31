import {
  validateDnaSequence,
  validateProteinSequence,
  validateRnaSequence,
} from "./fasta.utils";

describe("fasta.utils", () => {
  describe("validateProteinSequence", () => {
    it("accepts valid protein characters", () => {
      expect(validateProteinSequence("MKT AYI").valid).toBe(true);
    });

    it("rejects empty protein input", () => {
      expect(validateProteinSequence(" \n\t ")).toEqual({
        valid: false,
        errorMessage: "Protein sequence is required."
      });
    });

    it("rejects invalid protein characters", () => {
      expect(validateProteinSequence("ATG123")).toEqual({
        valid: false,
        errorMessage:
          "Protein sequence must use valid 20 canonical amino acids characters only."
      });
    });
  });

  describe("validateDnaSequence", () => {
    it("accepts valid DNA characters", () => {
      expect(validateDnaSequence("ATGCN")).toEqual({ valid: true });
    });

    it("rejects empty DNA input", () => {
      expect(validateDnaSequence("")).toEqual({
        valid: false,
        errorMessage: "DNA sequence is required."
      });
    });

    it("rejects invalid DNA characters", () => {
      expect(validateDnaSequence("AUGC")).toEqual({
        valid: false,
        errorMessage:
          "DNA sequence must use valid DNA characters only (A, T, G, C, N)."
      });
    });
  });

  describe("validateRnaSequence", () => {
    it("accepts valid RNA characters", () => {
      expect(validateRnaSequence("AUGCN")).toEqual({ valid: true });
    });

    it("rejects empty RNA input", () => {
      expect(validateRnaSequence("")).toEqual({
        valid: false,
        errorMessage: "RNA sequence is required."
      });
    });

    it("rejects invalid RNA characters", () => {
      expect(validateRnaSequence("ATGC")).toEqual({
        valid: false,
        errorMessage:
          "RNA sequence must use valid RNA characters only (A, U, G, C, N)."
      });
    });
  });
});

