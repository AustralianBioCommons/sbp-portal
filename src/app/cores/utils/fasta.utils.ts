export interface SequenceValidationResult {
  valid: boolean;
  errorMessage?: string;
}

export interface CcdLookupResult {
  valid: boolean;
  name?: string;
  errorMessage?: string;
}

export const CCD_COMPOUNDS: Record<string, string> = {
  ADP: "Adenosine diphosphate",
  ATP: "Adenosine triphosphate",
  AMP: "Adenosine phosphate",
  GTP: "Guanosine-5'-triphosphate",
  GDP: "Guanosine-5'-diphosphate",
  FAD: "Flavin-adenine dinucleotide",
  NAD: "Nicotinamide-adenine-dinucleotide",
  NAP: "Nicotinamide-adenine-dinucleotide-phosphate (NADP)",
  NDP: "Dihydro-nicotinamide-adenine-dinucleotide-phosphate (NADPH)",
  HEM: "Heme",
  HEC: "Heme C",
  PLM: "Palmitic acid",
  OLA: "Oleic acid",
  MYR: "Myristic acid",
  CIT: "Citric acid",
  CLA: "Chlorophyll A",
  CHL: "Chlorophyll B",
  BCL: "Bacteriochlorophyll A",
  BCB: "Bacteriochlorophyll B"
};

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

  if (!/^[ATGC]+$/.test(normalized)) {
    return {
      valid: false,
      errorMessage:
        "DNA sequence must use valid DNA characters only (A, T, G, C)."
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

  if (!/^[AUGC]+$/.test(normalized)) {
    return {
      valid: false,
      errorMessage:
        "RNA sequence must use valid RNA characters only (A, U, G, C)."
    };
  }

  return { valid: true };
}

export function lookupCcdCompound(code: string): CcdLookupResult {
  const normalized = code.trim().toUpperCase();

  if (!/^[A-Z0-9]{1,5}$/.test(normalized)) {
    return {
      valid: false,
      errorMessage: "Ligand CCD code must be 1–5 alphanumeric characters (e.g. ATP, HEM)."
    };
  }

  const name = CCD_COMPOUNDS[normalized];
  if (name) {
    return { valid: true, name };
  }

  return {
    valid: false,
    errorMessage: `"${normalized}" is not in the supported CCD list.`
  };
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
