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

/**
 * One row/column of the PAE matrix. Boltz scores per token: a residue for protein,
 * RNA and DNA, but one per *atom* for a ligand, so a ligand contributes several
 * tokens that share a chain and seq and differ only by `atom`.
 */
export interface ResidueRef {
  chain: string;
  seq: number;
  /** Atom name, set only for ligand tokens. */
  atom?: string;
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
 * Every filename this file could be known by, with the original case kept.
 * The label is sometimes a display name like "Structure PDB" rather than a
 * filename, so the key and the URL are read too.
 */
export function resultFilenames(file: ResultFileRef): string[] {
  const names = [file.key, file.label, file.url]
    .filter((value): value is string => !!value)
    .map((value) => basename(value))
    .filter((name) => name.length > 0);
  return [...new Set(names)];
}

/** The same names lower-cased, for the case-insensitive matching below. */
function filenameCandidates(file: ResultFileRef): string[] {
  return [...new Set(resultFilenames(file).map((name) => name.toLowerCase()))];
}

/** mmCIF over PDB, and a classified structure over a look-alike input file. */
export function findStructureArtifact(
  files: readonly ResultFileRef[]
): StructureArtifact | null {
  let best: { artifact: StructureArtifact; rank: number } | null = null;

  for (const file of files) {
    const candidates = filenameCandidates(file);
    // Ordered mmCIF first, so this also settles a file whose fields disagree.
    const match = STRUCTURE_FORMATS.find((entry) =>
      candidates.some((name) => entry.pattern.test(name))
    );
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
 * Model 0 is the structure on screen, so it wins; another index, then a loose
 * `*pae*.tsv`, are fallbacks.
 */
export function findPaeArtifact(
  files: readonly ResultFileRef[]
): ResultFileRef | null {
  let best: { file: ResultFileRef; rank: number } | null = null;

  for (const file of files) {
    for (const name of filenameCandidates(file)) {
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
      filenameCandidates(file).some((name) => name.endsWith("_msa.tsv"))
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
      filenameCandidates(file).some((name) => name.endsWith(suffix))
    ) ?? null
  );
}

/**
 * How many PAE rows a structure should have: one per polymer residue, one per
 * ligand atom. Lets a run be checked against its matrix before the viewer loads.
 *
 * Returns null when the text yields no atoms, so an unreadable file is left to
 * the viewer to report rather than judged here.
 */
export function countStructureTokens(
  text: string,
  format: StructureFormat
): number | null {
  const residues = new Set<string>();
  let ligandAtoms = 0;
  let columns: string[] | null = null;

  for (const line of text.split("\n")) {
    if (format === "mmcif" && line.startsWith("_atom_site.")) {
      columns ??= [];
      columns.push(line.trim().slice("_atom_site.".length));
      continue;
    }

    const isAtom = line.startsWith("ATOM");
    if (!isAtom && !line.startsWith("HETATM")) {
      // Only the first model counts; the rest repeat the same tokens.
      if (line.startsWith("ENDMDL")) break;
      continue;
    }

    const key =
      format === "mmcif"
        ? mmcifResidueKey(line, columns)
        : `${line.slice(21, 22)}:${line.slice(22, 27).trim()}`;
    if (key === null) continue;

    if (isAtom) residues.add(key);
    else ligandAtoms++;
  }

  const total = residues.size + ligandAtoms;
  return total > 0 ? total : null;
}

/** `<chain>:<seq>` from an mmCIF atom row, using the loop's own column order. */
function mmcifResidueKey(
  line: string,
  columns: string[] | null
): string | null {
  if (!columns) return null;
  const cells = line.trim().split(/\s+/);
  const chain = columns.indexOf("auth_asym_id");
  const seq = columns.indexOf("auth_seq_id");
  if (chain < 0 || seq < 0 || chain >= cells.length || seq >= cells.length) {
    return null;
  }
  return `${cells[chain]}:${cells[seq]}`;
}

/**
 * `A:B\t0.39` rows, highest first. One column per model, named by the header
 * (`\t0`, or `\t1..\t5` for ColabFold); the lowest index is the model on screen.
 */
export function parseChainPairScores(text: string): ChainPairScore[] {
  const rows = text.split(/\r?\n/);
  const valueColumn = topRankedColumn(rows);
  const scores: ChainPairScore[] = [];

  for (const row of rows) {
    const cells = row.split(/\t/).map((cell) => cell.trim());
    const pair = cells[0];
    if (!pair || !pair.includes(":")) continue;

    const value = Number(cells[valueColumn] ?? cells[cells.length - 1]);
    if (!Number.isFinite(value)) continue;
    scores.push({ pair, value });
  }

  return scores.sort((a, b) => b.value - a.value);
}

/** The lowest-numbered model's column, or the first value column. */
function topRankedColumn(rows: readonly string[]): number {
  for (const row of rows) {
    const cells = row.split(/\t/);
    // The header is the one row with no pair label.
    if (cells.length < 2 || cells[0].trim()) continue;

    const models = cells.slice(1).map((cell) => Number(cell.trim()));
    if (!models.length || !models.every((model) => Number.isFinite(model))) {
      break;
    }
    let best = 0;
    models.forEach((model, index) => {
      if (model < models[best]) best = index;
    });
    return best + 1;
  }
  return 1;
}

export interface ChainPairMatrix {
  chains: string[];
  /**
   * Row-major and directional: `rows[i][j]` is chain i against chain j, which may
   * differ from `rows[j][i]`. Null on the diagonal and for any direction the file
   * leaves out, so never fill a null from its opposite.
   */
  rows: Array<Array<number | null>>;
}

/**
 * Row against column, filling only the directions the file lists — ipTM gives both
 * and they differ, ipSAE gives one. The diagonal is always empty.
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
 * Into a coverage bitmap plus per-position depth. Rows past `MAX_MSA_ROWS` still
 * count toward the depth but are left out of the bitmap, which is only pixels tall.
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

/** Most-similar-first, which is what makes the image a gradient not a noisy band. */
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

/** ipTM only exists for multimers, so a missing file is expected, not an error. */
export function findMetricArtifact(
  files: readonly ResultFileRef[],
  metric: PredictionMetric
): ResultFileRef | null {
  const suffix = `_${metric}.tsv`;
  for (const file of files) {
    const candidates = filenameCandidates(file);
    // Chainwise in any field rules the file out as the global score.
    if (candidates.some((name) => name.includes("chainwise"))) continue;
    if (candidates.some((name) => name.endsWith(suffix))) return file;
  }
  return null;
}

/** `0\t0.274` rows; model 0 is the one on screen. Falls back to the first row. */
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
 * Tolerates tab or comma separators, an optional header row and an index column.
 *
 * @throws Error with a user-presentable message when the file is not square.
 */
export function parsePaeMatrix(text: string): PaeMatrix {
  // 100+ MB files, so scan once instead of allocating a string per value.
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
      // Needs a cell, so a CRLF's second half is not read as an empty row.
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
 * Header row, index column and width. The row count is what tells an index column
 * apart, since a real first column often reads 0, 1, 2, ... too.
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

  // One cell wider than tall, counting from 0 or 1. Verified again while parsing.
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

/**
 * `"A42"` to the token indices it covers. A ligand residue covers one index per
 * atom, so selecting it in the viewer highlights every one of its matrix rows.
 */
export function buildResidueLookup(
  residues: readonly ResidueRef[]
): Map<string, number[]> {
  const lookup = new Map<string, number[]>();
  residues.forEach((residue, index) => {
    const key = formatResidueToken(residue);
    const found = lookup.get(key);
    if (found) found.push(index);
    else lookup.set(key, [index]);
  });
  return lookup;
}

/**
 * The `A42` format the Mol* viewer exchanges. Always residue-level: the viewer
 * selects whole residues, so every atom of a ligand shares one token.
 */
export function formatResidueToken(residue: ResidueRef): string {
  return `${residue.chain}${residue.seq}`;
}

/** How a token reads on screen. Ligand atoms share a seq, so they use their name. */
export function formatTokenLabel(residue: ResidueRef): string {
  return residue.atom
    ? `${residue.chain}:${residue.atom}`
    : `${residue.chain}${residue.seq}`;
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
    // A ligand's atoms all resolve to the same residue token, so repeats of the
    // one already open are folded into it rather than emitted again.
    if (
      runEnd &&
      runEnd.chain === residue.chain &&
      runEnd.seq === residue.seq
    ) {
      continue;
    }

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
  lookup: ReadonlyMap<string, readonly number[]>
): number[] {
  const indices = new Set<number>();
  const add = (key: string) => {
    for (const index of lookup.get(key) ?? []) indices.add(index);
  };

  for (const token of tokenString.split(",")) {
    const trimmed = token.trim();
    if (!trimmed) continue;

    const range = trimmed.match(/^([A-Za-z]+)(-?\d+)-([A-Za-z]+)(-?\d+)$/);
    if (range && range[1] === range[3]) {
      const from = parseInt(range[2], 10);
      const to = parseInt(range[4], 10);
      for (let seq = Math.min(from, to); seq <= Math.max(from, to); seq++) {
        add(`${range[1]}${seq}`);
      }
      continue;
    }

    add(trimmed);
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
