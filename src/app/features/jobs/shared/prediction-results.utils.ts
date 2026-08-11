/** Locating and parsing the result artifacts behind the single-prediction view. */

export type StructureFormat = "pdb" | "mmcif";

export interface ResultFileRef {
  label: string;
  /** Pre-signed download URL. */
  url: string;
  /** S3 object key, used to read the file back through the API. */
  key: string;
  category: string;
}

export interface StructureArtifact extends ResultFileRef {
  format: StructureFormat;
}

/** Row-major N x N predicted aligned error matrix, in Angstroms. */
export interface PaeMatrix {
  size: number;
  values: Float32Array;
  min: number;
  max: number;
}

/** A polymer residue identified by author chain id and author sequence number. */
export interface ResidueRef {
  chain: string;
  seq: number;
}

export interface ChainSegment {
  chain: string;
  /** Inclusive start index into the ordered residue list. */
  start: number;
  /** Inclusive end index into the ordered residue list. */
  end: number;
}

/** Beyond this the ImageData allocation alone would be hundreds of megabytes. */
export const MAX_PAE_SIZE = 4000;

const STRUCTURE_FORMATS: Array<{ pattern: RegExp; format: StructureFormat }> = [
  { pattern: /\.(?:cif|mmcif)$/i, format: "mmcif" },
  { pattern: /\.(?:pdb|ent)$/i, format: "pdb" },
];

/** The backend classifies predicted structures under this download category. */
const STRUCTURE_CATEGORY = "pdb";

/**
 * Pick the structure to render: mmCIF over PDB, and files the backend classified
 * as structures over look-alikes such as an uploaded input PDB.
 */
export function findStructureArtifact(
  files: readonly ResultFileRef[]
): StructureArtifact | null {
  let best: { artifact: StructureArtifact; rank: number } | null = null;

  for (const file of files) {
    const name = basename(file.label || file.url);
    const match = STRUCTURE_FORMATS.find((entry) => entry.pattern.test(name));
    if (!match) continue;

    const categoryRank =
      file.category?.toLowerCase() === STRUCTURE_CATEGORY ? 0 : 2;
    const formatRank = match.format === "mmcif" ? 0 : 1;
    const rank = categoryRank + formatRank;

    if (!best || rank < best.rank) {
      best = { artifact: { ...file, format: match.format }, rank };
    }
  }

  return best?.artifact ?? null;
}

/**
 * Pick the PAE matrix for model 0 — a run emits one per predicted model, and
 * only index 0 is the structure in `top_ranked_structures`. Any other index,
 * then a loose `*pae*.tsv`, are fallbacks.
 */
export function findPaeArtifact(
  files: readonly ResultFileRef[]
): ResultFileRef | null {
  let best: { file: ResultFileRef; rank: number } | null = null;

  for (const file of files) {
    const name = basename(file.label || file.url).toLowerCase();
    // "pae" as its own token: `_ipsae.tsv` contains it but is another metric.
    if (
      !name.endsWith(".tsv") ||
      !/(?:^|[^a-z0-9])pae(?:[^a-z0-9]|$)/.test(name)
    ) {
      continue;
    }

    let rank = 2;
    if (/(?:_pae_0|_0_pae)\.tsv$/.test(name)) {
      rank = 0;
    } else if (/(?:_pae_\d+|_\d+_pae)\.tsv$/.test(name)) {
      rank = 1;
    }

    if (!best || rank < best.rank) {
      best = { file, rank };
    }
  }

  return best?.file ?? null;
}

/** Global confidence metrics a run reports as `<sample>_<metric>.tsv`. */
export type PredictionMetric = "ptm" | "iptm";

/** One chain pair's score, from a `<sample>_chainwise_<metric>.tsv`. */
export interface ChainPairScore {
  pair: string;
  value: number;
}

export interface MsaCoverage {
  /** Aligned sequences in the file, including any beyond the drawn cap. */
  totalSequences: number;
  /** Sequences represented in `covered`. */
  sequences: number;
  /** Residue positions. */
  length: number;
  /** Row-major bitmap, 1 where a sequence covers a position. */
  covered: Uint8Array;
  /** Sequences covering each position, counted over every row in the file. */
  perPosition: Uint32Array;
  /** Identity to the query per retained sequence, most-similar first. */
  identity: Float32Array;
}

/** Gap/padding token in these MSA matrices; 0-20 are residue types. */
const MSA_GAP_TOKEN = 21;

/** Rows kept for the coverage bitmap. Deeper alignments are strided down. */
export const MAX_MSA_ROWS = 2048;

/** Find the MSA matrix, emitted as `<sample>[_<tool>]_msa.tsv`. */
export function findMsaArtifact(
  files: readonly ResultFileRef[]
): ResultFileRef | null {
  return (
    files.find((file) =>
      basename(file.label || file.url)
        .toLowerCase()
        .endsWith("_msa.tsv")
    ) ?? null
  );
}

export function findChainwiseArtifact(
  files: readonly ResultFileRef[],
  metric: "ipsae" | PredictionMetric
): ResultFileRef | null {
  const suffix = `_chainwise_${metric}.tsv`;
  return (
    files.find((file) =>
      basename(file.label || file.url)
        .toLowerCase()
        .endsWith(suffix)
    ) ?? null
  );
}

/**
 * Parse `<chain>:<chain>\t<score>` rows, highest first. The leading `\t0` header
 * line has no pair label and is skipped.
 */
export function parseChainPairScores(text: string): ChainPairScore[] {
  const scores: ChainPairScore[] = [];

  for (const line of text.split(/\r?\n/)) {
    const cells = line.split(/\t/).map((cell) => cell.trim());
    if (cells.length < 2) continue;

    const pair = cells[0];
    const value = Number(cells[cells.length - 1]);
    if (!pair || !pair.includes(":") || !Number.isFinite(value)) continue;
    scores.push({ pair, value });
  }

  return scores.sort((a, b) => b.value - a.value);
}

export interface ChainPairMatrix {
  chains: string[];
  /** Row-major, symmetric; null on the diagonal and for any missing pair. */
  rows: Array<Array<number | null>>;
}

/**
 * Arrange chain-pair scores as a symmetric matrix. The files list each pair once
 * (`A:B`, never `B:A`), so both halves come from the one entry; the diagonal
 * stays empty as a chain has no interface with itself.
 */
export function buildChainPairMatrix(
  scores: readonly ChainPairScore[]
): ChainPairMatrix {
  const byPair = new Map<string, number>();
  const seen = new Set<string>();

  for (const { pair, value } of scores) {
    const [left, right] = pair.split(":");
    if (!left || !right) continue;
    seen.add(left);
    seen.add(right);
    byPair.set(`${left}:${right}`, value);
    byPair.set(`${right}:${left}`, value);
  }

  // Codepoint order, so A-Z sorts before a-z the way the chain labels run.
  const chains = [...seen].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

  const rows = chains.map((rowChain) =>
    chains.map((colChain) =>
      rowChain === colChain
        ? null
        : byPair.get(`${rowChain}:${colChain}`) ?? null
    )
  );

  return { chains, rows };
}

/**
 * Parse the MSA token matrix into a coverage bitmap plus per-position depth.
 * Rows beyond `MAX_MSA_ROWS` still count toward the depth but are left out of
 * the bitmap, which only has to fill a couple of hundred pixels of height.
 */
export function parseMsaCoverage(text: string): MsaCoverage {
  const firstLine = readLine(text, 0);
  if (firstLine === null) {
    throw new Error("The MSA file is empty.");
  }

  const length = splitCells(firstLine.content).length;
  if (length === 0) {
    throw new Error("The MSA file contains no residue positions.");
  }

  const totalRows = countDataLines(text, firstLine.start);
  const stride = Math.max(1, Math.ceil(totalRows / MAX_MSA_ROWS));
  const keptRows = Math.ceil(totalRows / stride);

  const covered = new Uint8Array(keptRows * length);
  const perPosition = new Uint32Array(length);
  const identity = new Float32Array(keptRows);
  // Row 0 is the query; every other row's identity is measured against it.
  const query = new Int16Array(length).fill(MSA_GAP_TOKEN);

  let cursor = firstLine.start;
  let row = 0;
  let keptRow = 0;
  let col = 0;
  let keepingRow = true;
  let aligned = 0;
  let matches = 0;

  const finishRow = () => {
    if (keepingRow && keptRow < keptRows) {
      identity[keptRow] = aligned > 0 ? matches / aligned : 0;
      keptRow++;
    }
    row++;
    keepingRow = row % stride === 0;
    col = 0;
    aligned = 0;
    matches = 0;
  };

  while (cursor < text.length) {
    const code = text.charCodeAt(cursor);

    if (code === NEWLINE || code === RETURN) {
      if (col > 0) finishRow();
      cursor++;
      continue;
    }

    if (isSeparator(code)) {
      cursor++;
      continue;
    }

    const end = scanNumberEnd(text, cursor);
    if (col < length) {
      const token = Number(text.slice(cursor, end));
      if (row === 0) query[col] = token;
      if (token < MSA_GAP_TOKEN) {
        perPosition[col]++;
        aligned++;
        if (token === query[col]) matches++;
        if (keepingRow && keptRow < keptRows) {
          covered[keptRow * length + col] = 1;
        }
      }
    }

    col++;
    cursor = end;
  }
  if (col > 0) finishRow();

  const sequences = Math.min(keptRow, keptRows);
  const sorted = sortRowsByIdentity(covered, identity, sequences, length);

  return {
    totalSequences: row,
    sequences,
    length,
    covered: sorted.covered,
    perPosition,
    identity: sorted.identity,
  };
}

/**
 * Order sequences most-similar-to-the-query first, as MSA coverage plots are
 * conventionally drawn — this is what turns the image from a noisy band into a
 * readable gradient.
 */
function sortRowsByIdentity(
  covered: Uint8Array,
  identity: Float32Array,
  sequences: number,
  length: number
): { covered: Uint8Array; identity: Float32Array } {
  const order = Array.from({ length: sequences }, (_, index) => index).sort(
    (a, b) => identity[b] - identity[a]
  );

  const sortedCovered = new Uint8Array(covered.length);
  const sortedIdentity = new Float32Array(identity.length);

  order.forEach((from, to) => {
    sortedCovered.set(
      covered.subarray(from * length, (from + 1) * length),
      to * length
    );
    sortedIdentity[to] = identity[from];
  });

  return { covered: sortedCovered, identity: sortedIdentity };
}

/**
 * Find the TSV holding a global confidence score, excluding the per-chain-pair
 * breakdowns. ipTM is only produced for multimers, so a missing file is expected
 * rather than an error.
 */
export function findMetricArtifact(
  files: readonly ResultFileRef[],
  metric: PredictionMetric
): ResultFileRef | null {
  const suffix = `_${metric}.tsv`;
  for (const file of files) {
    const name = basename(file.label || file.url).toLowerCase();
    if (name.includes("chainwise")) continue;
    if (name.endsWith(suffix)) return file;
  }
  return null;
}

/**
 * Read a `<model index>\t<score>` TSV and return model 0's score — the model
 * `top_ranked_structures` holds. Falls back to the first row if there is no index.
 */
export function parseModelScore(text: string): number | null {
  let fallback: number | null = null;

  for (const line of text.split(/\r?\n/)) {
    const cells = splitCells(line);
    if (cells.length === 0) continue;

    const value = Number(cells[cells.length - 1]);
    if (!Number.isFinite(value)) continue;

    if (cells.length === 1) {
      if (fallback === null) fallback = value;
      continue;
    }
    if (Number(cells[0]) === 0) return value;
    if (fallback === null) fallback = value;
  }

  return fallback;
}

/**
 * Parse a PAE matrix TSV into a flat row-major matrix, tolerating tab or comma
 * separators, an optional header row, and an optional leading index column.
 *
 * @throws Error with a user-presentable message when the file is not a square
 * numeric matrix.
 */
export function parsePaeMatrix(text: string): PaeMatrix {
  // 100+ MB for a large complex, so this scans the string once with charCodeAt
  // rather than allocating tens of millions of per-value strings.
  const { size, offset, indexBase, dataStart } = readMatrixShape(text);

  if (size > MAX_PAE_SIZE) {
    throw new Error(
      `The PAE matrix is too large to display (${size} residues, limit ${MAX_PAE_SIZE}).`
    );
  }

  const values = new Float32Array(size * size);
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  let cursor = dataStart;
  const length = text.length;
  let row = 0;
  let col = -offset;

  while (cursor < length && row < size) {
    const code = text.charCodeAt(cursor);

    if (code === NEWLINE || code === RETURN) {
      // Only a row that consumed a cell ends here, so the second half of a CRLF
      // pair and any blank line are not read as empty rows.
      if (col > -offset) {
        if (col !== size) {
          throw new Error(
            `Row ${
              row + 1
            } of the PAE matrix has ${col} values, expected ${size}.`
          );
        }
        row++;
        col = -offset;
      }
      cursor++;
      continue;
    }

    if (isSeparator(code)) {
      cursor++;
      continue;
    }

    const end = scanNumberEnd(text, cursor);
    const value = Number(text.slice(cursor, end));
    if (!Number.isFinite(value)) {
      throw new Error(
        `The PAE matrix contains a non-numeric value at row ${
          row + 1
        }, column ${col + offset + 1}.`
      );
    }

    if (col >= 0) {
      if (col >= size) {
        throw new Error(
          `Row ${row + 1} of the PAE matrix has more than ${size} values.`
        );
      }
      values[row * size + col] = value;
      if (value < min) min = value;
      if (value > max) max = value;
    } else if (value !== indexBase + row) {
      throw new Error(
        `The PAE matrix index column does not match its row numbering at row ${
          row + 1
        }.`
      );
    }

    col++;
    cursor = end;
  }

  // A file with no trailing newline leaves the last row uncounted.
  if (col === size) {
    row++;
  } else if (col > -offset) {
    throw new Error(
      `Row ${row + 1} of the PAE matrix has ${col} values, expected ${size}.`
    );
  }
  if (row !== size) {
    throw new Error(`The PAE matrix has ${row} rows, expected ${size}.`);
  }

  return { size, values, min, max };
}

const NEWLINE = 10;
const RETURN = 13;

function isSeparator(code: number): boolean {
  // tab, space, comma
  return code === 9 || code === 32 || code === 44;
}

function scanNumberEnd(text: string, start: number): number {
  let cursor = start;
  const length = text.length;
  while (cursor < length) {
    const code = text.charCodeAt(cursor);
    if (code === NEWLINE || code === RETURN || isSeparator(code)) break;
    cursor++;
  }
  return cursor;
}

/**
 * Work out the matrix dimensions: header row, index column, and width.
 *
 * The row count is what disambiguates an index column, and has to be: a PAE
 * matrix's first column often reads 0, 1, 2, ... for a well-folded chain, which
 * by value alone is indistinguishable from a row index.
 */
function readMatrixShape(text: string): {
  size: number;
  offset: number;
  indexBase: number;
  dataStart: number;
} {
  const firstLine = readLine(text, 0);
  if (firstLine === null) {
    throw new Error("The PAE file is empty.");
  }

  let firstDataLine = firstLine;
  let cells = splitCells(firstDataLine.content);
  if (cells.some((cell) => !isNumeric(cell))) {
    const next = readLine(text, firstDataLine.end);
    if (next === null) {
      throw new Error("The PAE file contains no data rows.");
    }
    firstDataLine = next;
    cells = splitCells(firstDataLine.content);
  }

  const rows = countDataLines(text, firstDataLine.start);
  const width = cells.length;
  if (rows === 0 || width === 0) {
    throw new Error("The PAE file contains no data rows.");
  }

  // An index column makes each row one cell wider than the matrix is tall, and
  // counts from 0 or 1. Its values are verified row by row while parsing.
  const firstCell = Number(cells[0]);
  const offset =
    width === rows + 1 && (firstCell === 0 || firstCell === 1) ? 1 : 0;
  const size = width - offset;
  if (size !== rows) {
    throw new Error(
      `The PAE matrix is not square (${rows} rows by ${size} columns).`
    );
  }

  return {
    size,
    offset,
    indexBase: offset === 1 ? Number(cells[0]) : 0,
    dataStart: firstDataLine.start,
  };
}

function countDataLines(text: string, from: number): number {
  let count = 0;
  let hasContent = false;

  for (let cursor = from; cursor < text.length; cursor++) {
    const code = text.charCodeAt(cursor);
    if (code === NEWLINE || code === RETURN) {
      if (hasContent) count++;
      hasContent = false;
    } else if (code !== 32 && code !== 9) {
      hasContent = true;
    }
  }
  if (hasContent) count++;

  return count;
}

function readLine(
  text: string,
  from: number
): { start: number; end: number; content: string } | null {
  let start = from;
  const length = text.length;

  while (start < length) {
    const code = text.charCodeAt(start);
    if (code === NEWLINE || code === RETURN) start++;
    else break;
  }
  if (start >= length) return null;

  let end = start;
  while (end < length) {
    const code = text.charCodeAt(end);
    if (code === NEWLINE || code === RETURN) break;
    end++;
  }

  const content = text.slice(start, end);
  if (!content.trim()) return null;
  return { start, end, content };
}

function splitCells(line: string): string[] {
  return line
    .trim()
    .split(/[\t, ]+/)
    .filter((cell) => cell.length > 0);
}

/** Map `"A42"` residue tokens to their index in the ordered residue list. */
export function buildResidueLookup(
  residues: readonly ResidueRef[]
): Map<string, number> {
  const lookup = new Map<string, number>();
  residues.forEach((residue, index) => {
    lookup.set(formatResidueToken(residue), index);
  });
  return lookup;
}

/** Render a residue as the `A42` token format the Mol* viewer exchanges. */
export function formatResidueToken(residue: ResidueRef): string {
  return `${residue.chain}${residue.seq}`;
}

/** Group an ordered residue list into contiguous per-chain segments. */
export function buildChainSegments(
  residues: readonly ResidueRef[]
): ChainSegment[] {
  const segments: ChainSegment[] = [];
  for (let index = 0; index < residues.length; index++) {
    const chain = residues[index].chain;
    const last = segments[segments.length - 1];
    if (last && last.chain === chain) {
      last.end = index;
    } else {
      segments.push({ chain, start: index, end: index });
    }
  }
  return segments;
}

/** Collapse sorted indices into `A12-A20` / `A56` tokens for the Mol* viewer. */
export function residueIndicesToTokens(
  indices: readonly number[],
  residues: readonly ResidueRef[]
): string[] {
  const tokens: string[] = [];
  const sorted = [...new Set(indices)]
    .filter((index) => index >= 0 && index < residues.length)
    .sort((a, b) => a - b);

  let runStart: ResidueRef | null = null;
  let runEnd: ResidueRef | null = null;

  const flush = () => {
    if (!runStart || !runEnd) return;
    tokens.push(
      runStart.seq === runEnd.seq
        ? formatResidueToken(runStart)
        : `${formatResidueToken(runStart)}-${formatResidueToken(runEnd)}`
    );
    runStart = null;
    runEnd = null;
  };

  for (const index of sorted) {
    const residue = residues[index];
    const continues =
      runEnd !== null &&
      runEnd.chain === residue.chain &&
      runEnd.seq + 1 === residue.seq;

    if (continues) {
      runEnd = residue;
    } else {
      flush();
      runStart = residue;
      runEnd = residue;
    }
  }
  flush();

  return tokens;
}

/** Parse the `A42,B11` / `A12-A14` token format the Mol* viewer emits. */
export function tokensToResidueIndices(
  tokenString: string,
  lookup: ReadonlyMap<string, number>
): number[] {
  const indices = new Set<number>();

  for (const token of tokenString.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const range = trimmed.match(/^([A-Za-z]+)(-?\d+)-([A-Za-z]+)(-?\d+)$/);
    if (range && range[1] === range[3]) {
      const from = parseInt(range[2], 10);
      const to = parseInt(range[4], 10);
      for (let seq = Math.min(from, to); seq <= Math.max(from, to); seq++) {
        const index = lookup.get(`${range[1]}${seq}`);
        if (index !== undefined) indices.add(index);
      }
      continue;
    }

    const index = lookup.get(trimmed);
    if (index !== undefined) indices.add(index);
  }

  return [...indices].sort((a, b) => a - b);
}

function basename(pathOrUrl: string): string {
  const withoutQuery = pathOrUrl.split(/[?#]/)[0];
  const parts = withoutQuery.split(/[/\\]/);
  return parts[parts.length - 1] ?? pathOrUrl;
}

function isNumeric(cell: string): boolean {
  return cell.length > 0 && Number.isFinite(Number(cell));
}
