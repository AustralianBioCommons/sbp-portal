import {
  lookupCcdCompound,
  CCD_COMPOUNDS,
  isValidSmiles,
  validateDnaSequence,
  validateProteinSequence,
  validateRnaSequence
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
          "Protein sequence must contain only the 20 canonical amino acid letters."
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

  describe("isValidSmiles", () => {
    it("accepts a simple molecule", () => {
      expect(isValidSmiles("CCO")).toBe(true);
    });

    it("accepts caffeine SMILES", () => {
      expect(isValidSmiles("Cn1cnc2c1c(=O)n(c(=O)n2C)C")).toBe(true);
    });

    it("accepts SMILES with ring closures and branches", () => {
      expect(isValidSmiles("C1=CC=CC=C1")).toBe(true); // benzene
    });

    it("accepts SMILES with square-bracket atoms", () => {
      expect(isValidSmiles("[NH4+]")).toBe(true);
    });

    it("accepts SMILES with charges and isotopes", () => {
      expect(isValidSmiles("[13CH4]")).toBe(true);
    });

    it("rejects empty string", () => {
      expect(isValidSmiles("")).toBe(false);
    });

    it("rejects strings containing whitespace", () => {
      expect(isValidSmiles("CC O")).toBe(false);
      expect(isValidSmiles("CC\tO")).toBe(false);
    });

    it("rejects strings with no letter characters", () => {
      expect(isValidSmiles("123")).toBe(false);
    });

    it("rejects characters outside the allowed set", () => {
      expect(isValidSmiles("CC!O")).toBe(false);
      expect(isValidSmiles("CC{O}")).toBe(false);
    });

    it("rejects mismatched parentheses", () => {
      expect(isValidSmiles("C(C")).toBe(false);
      expect(isValidSmiles("C)C")).toBe(false);
    });

    it("rejects mismatched square brackets", () => {
      expect(isValidSmiles("[NH4")).toBe(false);
      expect(isValidSmiles("NH4]")).toBe(false);
    });

    it("rejects mismatched mixed brackets", () => {
      expect(isValidSmiles("C([NH4)")).toBe(false);
    });
  });
});
