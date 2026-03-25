import {
  parseFasta,
  validateDnaSequence,
  validateProteinSequence,
  validateRnaSequence,
} from "./fasta.utils";

describe("fasta.utils", () => {
  describe("validateProteinSequence", () => {
    it("accepts valid protein characters", () => {
      expect(validateProteinSequence("MKT AYI-X*").valid).toBe(true);
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
        errorMessage: "Protein sequence must use valid amino acid characters only.",
      });
    });
  });

  describe("validateDnaSequence", () => {
    it("accepts valid DNA characters", () => {
      expect(validateDnaSequence("ATGCN-\nAT")).toEqual({ valid: true });
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
        errorMessage: "DNA sequence must use valid DNA characters only (A, T, G, C, N, -).",
      });
    });
  });

  describe("validateRnaSequence", () => {
    it("accepts valid RNA characters", () => {
      expect(validateRnaSequence("AUGCN-\nAU")).toEqual({ valid: true });
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
        errorMessage: "RNA sequence must use valid RNA characters only (A, U, G, C, N, -).",
      });
    });
  });

  describe("parseFasta", () => {
    it("rejects empty input", () => {
      expect(parseFasta("   ")).toEqual({
        valid: false,
        errorMessage: "Sequence is required",
        sequences: [],
      });
    });

    it("rejects input without a header on the first line", () => {
      expect(parseFasta("ACGT")).toEqual({
        valid: false,
        errorMessage: "Invalid FASTA format: first line must start with '>'",
        sequences: [],
      });
    });

    it("rejects a header without an identifier", () => {
      expect(parseFasta(">\nACGT")).toEqual({
        valid: false,
        errorMessage: "Invalid FASTA format: '>' header must have an identifier",
        sequences: [],
      });
    });

    it("rejects invalid sequence characters", () => {
      expect(parseFasta(">seq1\nACGTZ")).toEqual({
        valid: false,
        errorMessage: `Invalid characters in sequence for 'seq1': "ACGTZ"`,
        sequences: [],
      });
    });

    it("rejects an empty sequence before the next header", () => {
      expect(parseFasta(">seq1\n>seq2\nACGT")).toEqual({
        valid: false,
        errorMessage: "Sequence for 'seq1' is empty",
        sequences: [],
      });
    });

    it("rejects an empty final sequence", () => {
      expect(parseFasta(">seq1\nACGT\n>seq2")).toEqual({
        valid: false,
        errorMessage: "Sequence for 'seq2' is empty",
        sequences: [],
      });
    });

    it("parses multiple sequences and normalizes case", () => {
      expect(parseFasta(">seq1\nacgt\n\n>seq2\nuunn-")).toEqual({
        valid: true,
        sequences: [
          { header: "seq1", sequence: "ACGT" },
          { header: "seq2", sequence: "UUNN-" },
        ],
      });
    });
  });
});
