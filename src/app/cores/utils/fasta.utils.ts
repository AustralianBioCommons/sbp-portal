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
        "Protein sequence must use valid 20 canonical amino acids characters only."
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
        "DNA sequence must use valid DNA characters only (A, T, G, C, N)."
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
        "RNA sequence must use valid RNA characters only (A, U, G, C, N)."
    };
  }

  return { valid: true };
}

export function isValidSmiles(value: string): boolean {
  if (!value || /\s/.test(value)) {
    return false;
  }

  if (!/^[A-Za-z0-9@+\-\[\]\(\)=#$\\/%.:*]+$/.test(value)) {
    return false;
  }

  const stack: string[] = [];
  const pairs: Record<string, string> = {
    ")": "(",
    "]": "["
  };

  for (const char of value) {
    if (char === "(" || char === "[") {
      stack.push(char);
    } else if (char === ")" || char === "]") {
      const expected = pairs[char];
      if (stack.pop() !== expected) {
        return false;
      }
    }
  }

  return stack.length === 0 && /[A-Za-z]/.test(value);
}
