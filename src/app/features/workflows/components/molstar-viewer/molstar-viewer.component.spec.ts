import { MolstarViewerComponent } from "./molstar-viewer.component";

type MolstarViewerStatics = {
  toOrderedResidues: (
    residues: Map<string, Set<number>>
  ) => Array<{ chain: string; seq: number }>;
};

const statics = () => MolstarViewerComponent as unknown as MolstarViewerStatics;

describe("MolstarViewerComponent.toOrderedResidues", () => {
  it("orders chains alphabetically then residues ascending", () => {
    const residues = new Map([
      ["B", new Set([11, 10])],
      ["A", new Set([2, 1, 3])],
    ]);

    expect(statics().toOrderedResidues(residues)).toEqual([
      { chain: "A", seq: 1 },
      { chain: "A", seq: 2 },
      { chain: "A", seq: 3 },
      { chain: "B", seq: 10 },
      { chain: "B", seq: 11 },
    ]);
  });

  it("handles a single chain with non-contiguous numbering", () => {
    const residues = new Map([["A", new Set([5, 9, 7])]]);

    expect(statics().toOrderedResidues(residues)).toEqual([
      { chain: "A", seq: 5 },
      { chain: "A", seq: 7 },
      { chain: "A", seq: 9 },
    ]);
  });

  it("returns an empty list for an empty map", () => {
    expect(statics().toOrderedResidues(new Map())).toEqual([]);
  });
});

describe("MolstarViewerComponent.parseResidueToken", () => {
  it("parses a single residue token", () => {
    expect(MolstarViewerComponent.parseResidueToken("A56")).toEqual({
      chain: "A",
      resStart: 56,
      resEnd: 56,
    });
  });

  it("parses a same-chain range token", () => {
    expect(MolstarViewerComponent.parseResidueToken("A12-A14")).toEqual({
      chain: "A",
      resStart: 12,
      resEnd: 14,
    });
  });

  it("rejects a range that spans two chains", () => {
    expect(MolstarViewerComponent.parseResidueToken("A12-B14")).toBeNull();
  });

  it("rejects an unrecognised token", () => {
    expect(MolstarViewerComponent.parseResidueToken("nonsense")).toBeNull();
  });
});
