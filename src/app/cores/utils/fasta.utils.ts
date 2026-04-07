export interface SequenceValidationResult {
  valid: boolean;
  errorMessage?: string;
}

export interface CcdLookupResult {
  valid: boolean;
  name?: string;
  errorMessage?: string;
}

/**
 * Supported Chemical Component Dictionary (CCD) ligand codes.
 * CCD codes are standardised by the wwPDB: https://www.wwpdb.org/data/ccd
 * A searchable list of all CCD entries is available at:
 * https://www.ebi.ac.uk/pdbe-srv/pdbechem/ and https://www.rcsb.org/ligand
 *
 * Note: this list of 20 compounds is consistent with the ligands supported
 * by the standard AlphaFold Server
 * (https://alphafoldserver.com/faq#what-biological-molecule-types-can-be-modeled-with-alphafold-server).
 */
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

/**
 * Validates a protein sequence against the 20 canonical amino acids
 * (ARNDCQEGHILKMFPSTWYV). This is consistent with the standard AlphaFold
 * Server input: https://alphafoldserver.com
 * Whitespace is stripped before validation.
 */
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

  if (!/^[A-Za-z0-9@+\-[\]()=#$\\/%.:*]+$/.test(value)) {
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

