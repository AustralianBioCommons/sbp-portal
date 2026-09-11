import { Mat4, Vec3 } from "molstar/lib/mol-math/linear-algebra";

import {
  CaAtom,
  findBinderChain,
  superposeOnTargetChains,
  targetChains,
} from "./design-superposition.utils";

describe("chain roles", () => {
  const counts = new Map([
    ["A", 74],
    ["B", 115],
  ]);

  it("names the binder from the design's own length", () => {
    // RFdiffusion writes the binder as chain A, BindCraft as chain B, so the
    // length is what settles it rather than the position.
    expect(findBinderChain(counts, 74, "B")).toBe("A");
    expect(findBinderChain(counts, 115, "A")).toBe("B");
  });

  it("falls back to the declared chain when no length matches", () => {
    expect(findBinderChain(counts, 999, "B")).toBe("B");
    expect(findBinderChain(counts, null, "B")).toBe("B");
  });

  it("falls back when the length cannot tell two chains apart", () => {
    const ambiguous = new Map([
      ["A", 74],
      ["B", 74],
    ]);
    expect(findBinderChain(ambiguous, 74, "B")).toBe("B");
  });

  it("treats every chain that is not the binder as target", () => {
    const threeChains = new Map([
      ["A", 74],
      ["B", 115],
      ["C", 90],
    ]);
    expect(targetChains(threeChains, "A")).toEqual(["B", "C"]);
  });
});

describe("superposeOnTargetChains", () => {
  /** A target spread out enough that a fit is well determined. */
  const target: CaAtom[] = [
    { chain: "B", seq: 1, x: 0, y: 0, z: 0 },
    { chain: "B", seq: 2, x: 10, y: 0, z: 0 },
    { chain: "B", seq: 3, x: 0, y: 10, z: 0 },
    { chain: "B", seq: 4, x: 0, y: 0, z: 10 },
  ];

  function moved(atoms: readonly CaAtom[], transform: Mat4): CaAtom[] {
    return atoms.map((atom) => {
      const out = Vec3.transformMat4(
        Vec3(),
        Vec3.create(atom.x, atom.y, atom.z),
        transform
      );
      return { ...atom, x: out[0], y: out[1], z: out[2] };
    });
  }

  it("recovers the rigid motion between two copies of the target", () => {
    const applied = Mat4.mul(
      Mat4(),
      Mat4.fromTranslation(Mat4(), Vec3.create(5, -3, 12)),
      Mat4.fromRotation(Mat4(), Math.PI / 3, Vec3.create(0, 1, 0))
    );
    const shifted = moved(target, applied);

    const transform = superposeOnTargetChains(target, shifted, ["B"]);
    expect(transform).not.toBeNull();

    // Applying it should put the moved copy back onto the reference.
    for (const atom of moved(shifted, transform!)) {
      const original = target.find((candidate) => candidate.seq === atom.seq)!;
      expect(atom.x).toBeCloseTo(original.x, 4);
      expect(atom.y).toBeCloseTo(original.y, 4);
      expect(atom.z).toBeCloseTo(original.z, 4);
    }
  });

  it("ignores the binder chain when fitting", () => {
    // The binder sits somewhere different in each design; including it would
    // drag the target off its reference position.
    const withBinder = [
      ...target,
      { chain: "A", seq: 1, x: 100, y: 100, z: 100 },
    ];
    const shifted = [
      ...moved(target, Mat4.fromTranslation(Mat4(), Vec3.create(4, 0, 0))),
      { chain: "A", seq: 1, x: -50, y: 0, z: 0 },
    ];

    const transform = superposeOnTargetChains(withBinder, shifted, ["B"]);
    const realigned = moved(shifted, transform!).filter(
      (atom) => atom.chain === "B"
    );

    for (const atom of realigned) {
      const original = target.find((candidate) => candidate.seq === atom.seq)!;
      expect(atom.x).toBeCloseTo(original.x, 4);
    }
  });

  it("pairs residues by number, not by order", () => {
    const reordered = [...target].reverse();
    const transform = superposeOnTargetChains(target, reordered, ["B"]);

    expect(transform).not.toBeNull();
    // Same residues in a different order is not a motion.
    expect(Mat4.areEqual(transform!, Mat4.identity(), 1e-6)).toBeTrue();
  });

  it("aligns on the residues the two structures share", () => {
    const shift = Mat4.fromTranslation(Mat4(), Vec3.create(7, 0, 0));
    const missingOne = moved(target, shift).filter((atom) => atom.seq !== 2);

    const transform = superposeOnTargetChains(target, missingOne, ["B"]);

    for (const atom of moved(missingOne, transform!)) {
      const original = target.find((candidate) => candidate.seq === atom.seq)!;
      expect(atom.x).toBeCloseTo(original.x, 4);
    }
  });

  it("returns null when too few residues line up to fix a rotation", () => {
    const twoResidues = target.slice(0, 2);
    expect(superposeOnTargetChains(target, twoResidues, ["B"])).toBeNull();
    expect(superposeOnTargetChains(target, target, [])).toBeNull();
    expect(superposeOnTargetChains(target, target, ["Z"])).toBeNull();
  });
});
