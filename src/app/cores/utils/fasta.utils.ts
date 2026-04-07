export interface SequenceValidationResult {
  valid: boolean;
  errorMessage?: string;
}

function createSequenceValidator(
  pattern: RegExp,
  emptyMessage: string,
  invalidMessage: string
): (sequence: string) => SequenceValidationResult {
  return (sequence: string): SequenceValidationResult => {
    const normalized = sequence.replace(/\s+/g, "").toUpperCase();
    if (!normalized) {
      return { valid: false, errorMessage: emptyMessage };
    }
    if (!pattern.test(normalized)) {
      return { valid: false, errorMessage: invalidMessage };
    }
    return { valid: true };
  };
}

export const validateProteinSequence = createSequenceValidator(
  /^[ARNDCQEGHILKMFPSTWYV]+$/,
  "Protein sequence is required.",
  "Protein sequence must contain only the 20 canonical amino acid letters."
);

export const validateDnaSequence = createSequenceValidator(
  /^[ATGC]+$/,
  "DNA sequence is required.",
  "DNA sequence must use valid DNA characters only (A, T, G, C)."
);

export const validateRnaSequence = createSequenceValidator(
  /^[AUGC]+$/,
  "RNA sequence is required.",
  "RNA sequence must use valid RNA characters only (A, U, G, C)."
);

