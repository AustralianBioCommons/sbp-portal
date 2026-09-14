/**
 * Chain roles and alignment for the de novo design viewer.
 *
 * Each design is its own prediction of the same complex, so the target ends up
 * somewhere slightly different every time. Lining each design up on the first
 * one's target holds the target still, so only the binder moves as you click
 * through the table.
 *
 * The atoms come from the structure Mol* has already loaded, so nothing here
 * reads a file.
 */

import { Mat4 } from "molstar/lib/mol-math/linear-algebra/3d/mat4";
import { MinimizeRmsd } from "molstar/lib/mol-math/linear-algebra/3d/minimize-rmsd";

/** One alpha carbon — enough to identify a residue and locate it. */
export interface CaAtom {
  chain: string;
  seq: number;
  x: number;
  y: number;
  z: number;
}

export function chainResidueCounts(
  atoms: readonly CaAtom[]
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const atom of atoms) {
    counts.set(atom.chain, (counts.get(atom.chain) ?? 0) + 1);
  }
  return counts;
}

/**
 * Finds the chain holding the binder. The design's length usually gives it away,
 * which keeps this working even if a run's chain order is not the usual one.
 * Falls back to `declared` when the length matches no chain, or more than one.
 */
export function findBinderChain(
  counts: ReadonlyMap<string, number>,
  designLength: number | null,
  declared: string
): string {
  if (designLength !== null) {
    const matches = [...counts].filter(([, count]) => count === designLength);
    if (matches.length === 1) return matches[0][0];
  }
  return declared;
}

/** Everything that is not the binder, in file order. */
export function targetChains(
  counts: ReadonlyMap<string, number>,
  binderChain: string
): string[] {
  return [...counts.keys()].filter((chain) => chain !== binderChain);
}

function residueKey(atom: CaAtom): string {
  return `${atom.chain}:${atom.seq}`;
}

/**
 * Works out how to move `moving` onto `reference` using the target residues the
 * two share. Returns null if too few line up to fit.
 *
 * Residues are matched by chain and number rather than by position, so a design
 * missing a target residue still lines up on the rest.
 */
export function superposeOnTargetChains(
  reference: readonly CaAtom[],
  moving: readonly CaAtom[],
  chains: readonly string[]
): Mat4 | null {
  if (chains.length === 0) return null;

  const wanted = new Set(chains);
  const referenceByResidue = new Map<string, CaAtom>();
  for (const atom of reference) {
    if (wanted.has(atom.chain)) referenceByResidue.set(residueKey(atom), atom);
  }

  const pairs: Array<[CaAtom, CaAtom]> = [];
  for (const atom of moving) {
    if (!wanted.has(atom.chain)) continue;
    const match = referenceByResidue.get(residueKey(atom));
    if (match) pairs.push([match, atom]);
  }

  // Fewer than three points cannot pin down a rotation.
  if (pairs.length < 3) return null;

  const a = MinimizeRmsd.Positions.empty(pairs.length);
  const b = MinimizeRmsd.Positions.empty(pairs.length);
  pairs.forEach(([referenceAtom, movingAtom], index) => {
    a.x[index] = referenceAtom.x;
    a.y[index] = referenceAtom.y;
    a.z[index] = referenceAtom.z;
    b.x[index] = movingAtom.x;
    b.y[index] = movingAtom.y;
    b.z[index] = movingAtom.z;
  });

  // bTransform moves b onto a, which is the direction we want.
  return MinimizeRmsd.compute({ a, b }).bTransform;
}
