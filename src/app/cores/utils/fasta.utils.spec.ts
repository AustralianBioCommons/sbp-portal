import {
  lookupCcdCompound,
  CCD_COMPOUNDS,
  isValidSmiles,
  parseMultiFasta,
  validateDnaSequence,
  validateMultiFastaProtein,
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
        errorMessage: "Protein sequence is required.",
      });
    });

    it("rejects invalid protein characters", () => {
      expect(validateProteinSequence("ATG123")).toEqual({
        valid: false,
        errorMessage:
          "Protein sequence must contain only the 20 canonical amino acid letters.",
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
        errorMessage: "DNA sequence is required.",
      });
    });

    it("rejects invalid DNA characters", () => {
      expect(validateDnaSequence("AUGC")).toEqual({
        valid: false,
        errorMessage:
          "DNA sequence must use valid DNA characters only (A, T, G, C).",
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
        errorMessage: "RNA sequence is required.",
      });
    });

    it("rejects invalid RNA characters", () => {
      expect(validateRnaSequence("ATGC")).toEqual({
        valid: false,
        errorMessage:
          "RNA sequence must use valid RNA characters only (A, U, G, C).",
      });
    });
  });

  describe("lookupCcdCompound", () => {
    it("returns the compound name for a known code", () => {
      expect(lookupCcdCompound("ATP")).toEqual({
        valid: true,
        name: "Adenosine triphosphate",
      });
    });

    it("normalizes the code to uppercase before lookup", () => {
      expect(lookupCcdCompound("atp")).toEqual({
        valid: true,
        name: "Adenosine triphosphate",
      });
    });

    it("returns an error for an unsupported code", () => {
      expect(lookupCcdCompound("XYZ")).toEqual({
        valid: false,
        errorMessage: '"XYZ" is not in the supported CCD list.',
      });
    });

    it("returns valid=true for every supported CCD code", () => {
      Object.entries(CCD_COMPOUNDS).forEach(([code, name]) => {
        expect(lookupCcdCompound(code)).withContext(code).toEqual({
          valid: true,
          name,
        });
      });
    });

    it("rejects invalid CCD formats", () => {
      expect(lookupCcdCompound("AT!")).toEqual({
        valid: false,
        errorMessage:
          "Ligand CCD code must be 1–5 alphanumeric characters (e.g. ATP, HEM).",
      });
    });

    it("rejects codes longer than 5 characters", () => {
      expect(lookupCcdCompound("TOOLONG").valid).toBe(false);
    });

    it("trims whitespace before lookup", () => {
      expect(lookupCcdCompound("  HEM  ")).toEqual({
        valid: true,
        name: "Heme",
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

  describe("validateMultiFastaProtein", () => {
    it("rejects empty input", () => {
      expect(validateMultiFastaProtein("")).toEqual({
        valid: false,
        errorMessage: "At least one FASTA sequence is required.",
        sequenceCount: 0,
      });
    });

    it("rejects whitespace-only input", () => {
      expect(validateMultiFastaProtein("  \n  ")).toEqual({
        valid: false,
        errorMessage: "At least one FASTA sequence is required.",
        sequenceCount: 0,
      });
    });

    it("rejects input without a FASTA header", () => {
      expect(validateMultiFastaProtein("MKTAYIAK")).toEqual({
        valid: false,
        errorMessage:
          'Input must be in FASTA format: each entry needs a header line starting with ">".',
        sequenceCount: 0,
      });
    });

    it("rejects an entry with an empty header", () => {
      expect(validateMultiFastaProtein(">\nMKTAYIAK")).toEqual({
        valid: false,
        errorMessage:
          'FASTA header cannot be empty (the ">" line must contain text after it).',
        sequenceCount: 0,
      });
    });

    it("rejects an entry with no sequence after the header", () => {
      expect(validateMultiFastaProtein(">seq1\n")).toEqual({
        valid: false,
        errorMessage: 'No sequence found for header "seq1".',
        sequenceCount: 0,
      });
    });

    it("rejects non-canonical amino acid characters", () => {
      const result = validateMultiFastaProtein(">seq1\nMKTBBBIAK");
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('"seq1"');
      expect(result.errorMessage).toContain("ARNDCQEGHILKMFPSTWYV");
    });

    it("rejects duplicate headers within the same input", () => {
      const result = validateMultiFastaProtein(
        ">seq1\nMKTAYIAK\n>seq1\nACDEFGHIK"
      );
      expect(result.valid).toBe(false);
      expect(result.errorMessage).toContain('Duplicate FASTA header: "seq1"');
    });

    it("accepts a single valid entry", () => {
      expect(validateMultiFastaProtein(">seq1\nMKTAYIAK")).toEqual({
        valid: true,
        sequenceCount: 1,
      });
    });

    it("accepts multiple valid entries and counts them correctly", () => {
      expect(
        validateMultiFastaProtein(">seq1\nMKTAYIAK\n>seq2\nACDEFGHIK")
      ).toEqual({ valid: true, sequenceCount: 2 });
    });

    it("accepts multiline sequences by joining continuation lines", () => {
      expect(validateMultiFastaProtein(">seq1\nMKTAY\nIAK")).toEqual({
        valid: true,
        sequenceCount: 1,
      });
    });

    it("normalises sequence to uppercase before validation", () => {
      expect(validateMultiFastaProtein(">seq1\nmktayiak")).toEqual({
        valid: true,
        sequenceCount: 1,
      });
    });

    it("rejects spaces within sequence content", () => {
      expect(validateMultiFastaProtein(">seq1\nACD EFG HIK LMN")).toEqual({
        valid: false,
        errorMessage: 'Sequence for "seq1" must not contain spaces.',
        sequenceCount: 0,
      });
    });

    it("accepts entry where only leading/trailing spaces surround the header and sequence lines", () => {
      expect(validateMultiFastaProtein("    >seq1\n    ACDEFGHIKLMN")).toEqual({
        valid: true,
        sequenceCount: 1,
      });
    });

    it("ignores leading and trailing whitespace around the whole input", () => {
      expect(validateMultiFastaProtein("  \n>seq1\nMKTAYIAK\n  ")).toEqual({
        valid: true,
        sequenceCount: 1,
      });
    });
  });

  describe("parseMultiFasta", () => {
    it("parses a single entry", () => {
      expect(parseMultiFasta(">seq1\nMKTAYIAK")).toEqual([
        { header: "seq1", sequence: "MKTAYIAK" },
      ]);
    });

    it("parses multiple entries", () => {
      expect(parseMultiFasta(">seq1\nMKTAYIAK\n>seq2\nACDEFGHIK")).toEqual([
        { header: "seq1", sequence: "MKTAYIAK" },
        { header: "seq2", sequence: "ACDEFGHIK" },
      ]);
    });

    it("normalises sequence to uppercase and strips internal whitespace", () => {
      expect(parseMultiFasta(">seq1\nmkt ayiak")).toEqual([
        { header: "seq1", sequence: "MKTAYIAK" },
      ]);
    });

    it("joins multiline sequence content into one string", () => {
      expect(parseMultiFasta(">seq1\nMKTAY\nIAK")).toEqual([
        { header: "seq1", sequence: "MKTAYIAK" },
      ]);
    });

    it("trims whitespace from header text", () => {
      expect(parseMultiFasta(">  seq1  \nMKTAYIAK")).toEqual([
        { header: "seq1", sequence: "MKTAYIAK" },
      ]);
    });
  });
});
