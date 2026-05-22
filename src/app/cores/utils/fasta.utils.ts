export interface SequenceValidationResult {
  valid: boolean;
  errorMessage?: string;
}

export interface MultiFastaValidationResult {
  valid: boolean;
  errorMessage?: string;
  sequenceCount: number;
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
  BCB: "Bacteriochlorophyll B",
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

const CANONICAL_AA_REGEX = /^[ARNDCQEGHILKMFPSTWYV]+$/;

/**
 * Validates a protein sequence against the 20 canonical amino acids
 * (ARNDCQEGHILKMFPSTWYV). This is consistent with the standard AlphaFold
 * Server input: https://alphafoldserver.com
 * Whitespace is stripped before validation.
 */
export const validateProteinSequence = createSequenceValidator(
  CANONICAL_AA_REGEX,
  "Protein sequence is required.",
  "Protein sequence must contain only the 20 canonical amino acid letters."
);

/**
 * Validates a multi-FASTA protein input.
 * - Input must not be empty.
 * - Each entry must have a FASTA header line starting with ">".
 * - Headers must be unique within the input.
 * - Sequences must contain only canonical amino acids (ARNDCQEGHILKMFPSTWYV).
 */
export function validateMultiFastaProtein(
  input: string
): MultiFastaValidationResult {
  const trimmed = input.trim();

  if (!trimmed) {
    return {
      valid: false,
      errorMessage: "At least one FASTA sequence is required.",
      sequenceCount: 0,
    };
  }

  if (!trimmed.startsWith(">")) {
    return {
      valid: false,
      errorMessage:
        'Input must be in FASTA format: each entry needs a header line starting with ">".',
      sequenceCount: 0,
    };
  }

  const blocks = trimmed.split(/\n(?=>)/);
  const headers = new Set<string>();

  for (const block of blocks) {
    const lines = block.split("\n");
    const headerLine = lines[0];

    if (!headerLine.startsWith(">")) {
      return {
        valid: false,
        errorMessage: 'Each FASTA entry must begin with a ">" header line.',
        sequenceCount: 0,
      };
    }

    const header = headerLine.slice(1).trim();

    if (!header) {
      return {
        valid: false,
        errorMessage:
          'FASTA header cannot be empty (the ">" line must contain text after it).',
        sequenceCount: 0,
      };
    }

    if (headers.has(header)) {
      return {
        valid: false,
        errorMessage: `Duplicate FASTA header: "${header}". All headers must be unique.`,
        sequenceCount: 0,
      };
    }

    headers.add(header);

    const sequenceLines = lines.slice(1).map((l) => l.trim());
    const sequence = sequenceLines
      .filter((l) => l.length > 0)
      .join("")
      .toUpperCase();

    if (!sequence) {
      return {
        valid: false,
        errorMessage: `No sequence found for header "${header}".`,
        sequenceCount: 0,
      };
    }

    if (sequenceLines.some((l) => /\s/.test(l))) {
      return {
        valid: false,
        errorMessage: `Sequence for "${header}" must not contain spaces.`,
        sequenceCount: 0,
      };
    }

    if (!CANONICAL_AA_REGEX.test(sequence)) {
      return {
        valid: false,
        errorMessage: `Sequence for "${header}" contains invalid characters. Only canonical amino acids (ARNDCQEGHILKMFPSTWYV) are allowed.`,
        sequenceCount: 0,
      };
    }
  }

  return { valid: true, sequenceCount: headers.size };
}

/**
 * Parses a validated multi-FASTA string into an array of header/sequence pairs.
 * Assumes the input has already passed `validateMultiFastaProtein`.
 */
export function parseMultiFasta(
  input: string
): Array<{ header: string; sequence: string }> {
  return input
    .trim()
    .split(/\n(?=>)/)
    .map((block) => {
      const lines = block.split("\n");
      return {
        header: lines[0].slice(1).trim(),
        sequence: lines.slice(1).join("").replace(/\s+/g, "").toUpperCase(),
      };
    });
}

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
      errorMessage:
        "Ligand CCD code must be 1–5 alphanumeric characters (e.g. ATP, HEM).",
    };
  }

  const name = CCD_COMPOUNDS[normalized];
  if (name) {
    return { valid: true, name };
  }

  return {
    valid: false,
    errorMessage: `"${normalized}" is not in the supported CCD list.`,
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
    "]": "[",
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
