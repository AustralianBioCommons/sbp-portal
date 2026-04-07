export interface SequenceValidationResult {
  valid: boolean;
  errorMessage?: string;
}

const CANONICAL_AA = /^[ARNDCQEGHILKMFPSTWYV]+$/i;

export function validateProteinSequence(sequence: string): SequenceValidationResult {
  const normalized = sequence.replace(/\s+/g, "");
  if (!normalized) {
    return { valid: false, errorMessage: "Protein sequence is required." };
  }
  if (!CANONICAL_AA.test(normalized)) {
    return {
      valid: false,
      errorMessage: "Protein sequence must contain only the 20 canonical amino acid letters."
    };
  }
  return { valid: true };
}

export function validateDnaSequence(sequence: string): SequenceValidationResult {
  const normalized = sequence.replace(/\s+/g, "").toUpperCase();
  if (!normalized) {
    return { valid: false, errorMessage: "DNA sequence is required." };
  }
  if (!/^[ATGC]+$/.test(normalized)) {
    return {
      valid: false,
      errorMessage: "DNA sequence must use valid DNA characters only (A, T, G, C)."
    };
  }
  return { valid: true };
}

export function validateRnaSequence(sequence: string): SequenceValidationResult {
  const normalized = sequence.replace(/\s+/g, "").toUpperCase();
  if (!normalized) {
    return { valid: false, errorMessage: "RNA sequence is required." };
  }
  if (!/^[AUGC]+$/.test(normalized)) {
    return {
      valid: false,
      errorMessage: "RNA sequence must use valid RNA characters only (A, U, G, C)."
    };
  }
  return { valid: true };
}

