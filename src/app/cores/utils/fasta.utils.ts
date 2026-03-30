export interface SequenceValidationResult {
  valid: boolean;
  errorMessage?: string;
}

const CANONICAL_AA_CHARS = /^[ARNDCQEGHILKMFPSTWYV]+$/i;

export function validateProteinSequence(sequence: string): SequenceValidationResult {
  const normalized = sequence.replace(/\s+/g, "").toUpperCase();

  if (!normalized) {
    return {
      valid: false,
      errorMessage: "Protein sequence is required."
    };
  }

  if (!CANONICAL_AA_CHARS.test(normalized)) {
    return {
      valid: false,
      errorMessage:
        "Protein sequence must use valid 20 canonical amino acids FASTA characters only."
    };
  }

  return { valid: true };
}

export function validateDnaSequence(sequence: string): SequenceValidationResult {
  const normalized = sequence.replace(/\s+/g, "").toUpperCase();

  if (!normalized) {
    return {
      valid: false,
      errorMessage: "DNA sequence is required."
    };
  }

  if (!/^[ATGCN]+$/.test(normalized)) {
    return {
      valid: false,
      errorMessage:
        "DNA sequence must use valid DNA characters only (A, T, G, C, N, -)."
    };
  }

  return { valid: true };
}

export function validateRnaSequence(sequence: string): SequenceValidationResult {
  const normalized = sequence.replace(/\s+/g, "").toUpperCase();

  if (!normalized) {
    return {
      valid: false,
      errorMessage: "RNA sequence is required."
    };
  }

  if (!/^[AUGCN]+$/.test(normalized)) {
    return {
      valid: false,
      errorMessage:
        "RNA sequence must use valid RNA characters only (A, U, G, C, N, -)."
    };
  }

  return { valid: true };
}
