export interface ParsedFastaResult {
  valid: boolean;
  errorMessage?: string;
  sequences: { header: string; sequence: string }[];
}

/**
 * Parse and validate a multi-FASTA string.
 * Rules: https://en.wikipedia.org/wiki/FASTA_format
 *  – Each record starts with a '>' header line containing an identifier.
 *  – Sequence lines must only contain IUPAC nucleic acid codes:
 *    A C G T U I R Y K M S W B D H V N (case-insensitive) and '-' (gap).
 *  – Blank lines between records are allowed and skipped.
 */
export function parseFasta(text: string): ParsedFastaResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      valid: false,
      errorMessage: "Sequence is required",
      sequences: []
    };
  }

  const lines = trimmed.split(/\r?\n/);
  if (!lines[0].trimStart().startsWith(">")) {
    return {
      valid: false,
      errorMessage: "Invalid FASTA format: first line must start with '>'",
      sequences: []
    };
  }

  // IUPAC nucleic acid codes + gap character
  const validChars = /^[ACGTUIRYKMSWBDHVNi-]+$/i;
  const sequences: { header: string; sequence: string }[] = [];
  let currentHeader = "";
  let currentSeq = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith(">")) {
      if (currentHeader) {
        if (!currentSeq) {
          return {
            valid: false,
            errorMessage: `Sequence for '${currentHeader}' is empty`,
            sequences: []
          };
        }
        sequences.push({ header: currentHeader, sequence: currentSeq });
      }
      currentHeader = line.slice(1).trim();
      if (!currentHeader) {
        return {
          valid: false,
          errorMessage:
            "Invalid FASTA format: '>' header must have an identifier",
          sequences: []
        };
      }
      currentSeq = "";
    } else {
      if (!validChars.test(line)) {
        return {
          valid: false,
          errorMessage: `Invalid characters in sequence for '${currentHeader}': "${line}"`,
          sequences: []
        };
      }
      currentSeq += line.toUpperCase();
    }
  }

  if (currentHeader) {
    if (!currentSeq) {
      return {
        valid: false,
        errorMessage: `Sequence for '${currentHeader}' is empty`,
        sequences: []
      };
    }
    sequences.push({ header: currentHeader, sequence: currentSeq });
  }

  if (sequences.length === 0) {
    return { valid: false, errorMessage: "No sequences found", sequences: [] };
  }

  return { valid: true, sequences };
}
