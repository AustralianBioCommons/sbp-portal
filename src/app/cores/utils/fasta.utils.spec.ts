import {
  lookupCcdCompound,
  CCD_COMPOUNDS,
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
      expect(validateDnaSequence("ATGC")).toEqual({ valid: true });
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
          "DNA sequence must use valid DNA characters only (A, T, G, C)."
      });
    });
  });

  describe("validateRnaSequence", () => {
    it("accepts valid RNA characters", () => {
      expect(validateRnaSequence("AUGC")).toEqual({ valid: true });
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
          "RNA sequence must use valid RNA characters only (A, U, G, C)."
      });
    });
  });

  describe("lookupCcdCompound", () => {
    it("returns the compound name for a known code", () => {
      expect(lookupCcdCompound("ATP")).toEqual({
        valid: true,
        name: "Adenosine triphosphate"
      });
    });

    it("normalizes the code to uppercase before lookup", () => {
      expect(lookupCcdCompound("atp")).toEqual({
        valid: true,
        name: "Adenosine triphosphate"
      });
    });

    it("returns an error for an unsupported code", () => {
      expect(lookupCcdCompound("XYZ")).toEqual({
        valid: false,
        errorMessage: "\"XYZ\" is not in the supported CCD list."
      });
    });

    it("returns valid=true for every supported CCD code", () => {
      Object.entries(CCD_COMPOUNDS).forEach(([code, name]) => {
        expect(lookupCcdCompound(code)).withContext(code).toEqual({
          valid: true,
          name
        });
      });
    });

    it("rejects invalid CCD formats", () => {
      expect(lookupCcdCompound("AT!")).toEqual({
        valid: false,
        errorMessage: "Ligand CCD code must be 1–5 alphanumeric characters (e.g. ATP, HEM)."
      });
    });

    it("rejects codes longer than 5 characters", () => {
      expect(lookupCcdCompound("TOOLONG").valid).toBe(false);
    });

    it("trims whitespace before lookup", () => {
      expect(lookupCcdCompound("  HEM  ")).toEqual({
        valid: true,
        name: "Heme"
      });
    });
  });
});
