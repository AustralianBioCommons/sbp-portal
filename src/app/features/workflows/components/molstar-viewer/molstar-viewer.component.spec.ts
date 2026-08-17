import { TestBed } from "@angular/core/testing";

import { MolstarViewerComponent } from "./molstar-viewer.component";

interface Token {
  polymer: boolean;
  atoms: string[];
}

type MolstarViewerStatics = {
  toOrderedTokens: (
    chains: Map<string, Map<number, Token>>
  ) => Array<{ chain: string; seq: number; atom?: string }>;
};

const statics = () => MolstarViewerComponent as unknown as MolstarViewerStatics;

/** A polymer chain: one entry per residue, no atoms. */
const polymer = (...seqs: number[]) =>
  new Map(seqs.map((seq) => [seq, { polymer: true, atoms: [] }]));

describe("MolstarViewerComponent.toOrderedTokens", () => {
  it("orders chains alphabetically then residues ascending", () => {
    const chains = new Map([
      ["B", polymer(11, 10)],
      ["A", polymer(2, 1, 3)],
    ]);

    expect(statics().toOrderedTokens(chains)).toEqual([
      { chain: "A", seq: 1 },
      { chain: "A", seq: 2 },
      { chain: "A", seq: 3 },
      { chain: "B", seq: 10 },
      { chain: "B", seq: 11 },
    ]);
  });

  it("handles a single chain with non-contiguous numbering", () => {
    expect(
      statics().toOrderedTokens(new Map([["A", polymer(5, 9, 7)]]))
    ).toEqual([
      { chain: "A", seq: 5 },
      { chain: "A", seq: 7 },
      { chain: "A", seq: 9 },
    ]);
  });

  it("expands a ligand into one token per atom, in file order", () => {
    const chains = new Map([
      ["A", polymer(1)],
      ["B", new Map([[1, { polymer: false, atoms: ["PA", "O1A", "O2A"] }]])],
    ]);

    expect(statics().toOrderedTokens(chains)).toEqual([
      { chain: "A", seq: 1 },
      { chain: "B", seq: 1, atom: "PA" },
      { chain: "B", seq: 1, atom: "O1A" },
      { chain: "B", seq: 1, atom: "O2A" },
    ]);
  });

  it("keeps ligand chains in their alphabetical place between polymers", () => {
    const chains = new Map([
      ["E", polymer(1)],
      ["C", new Map([[1, { polymer: false, atoms: ["C7", "C8"] }]])],
      ["A", polymer(1)],
    ]);

    expect(
      statics()
        .toOrderedTokens(chains)
        .map((token) => token.chain)
    ).toEqual(["A", "C", "C", "E"]);
  });

  it("returns an empty list for an empty map", () => {
    expect(statics().toOrderedTokens(new Map())).toEqual([]);
  });
});

/** Called directly: feeding Mol* a bad file would boot a WebGL context. */
describe("MolstarViewerComponent load failures", () => {
  type Failable = { fail: (err: unknown, fallback: string) => void };

  const create = async () => {
    await TestBed.configureTestingModule({
      imports: [MolstarViewerComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(MolstarViewerComponent);
    return { fixture, component: fixture.componentInstance };
  };

  it("reports a render failure to the caller", async () => {
    const { component } = await create();
    const errors: string[] = [];
    component.loadError.subscribe((message) => errors.push(message));

    (component as unknown as Failable).fail(
      new Error("Invalid CIF: unexpected token"),
      "Could not render the structure."
    );

    expect(errors).toEqual(["Invalid CIF: unexpected token"]);
    expect(component.status()).toBe("error");
    expect(component.errorMessage()).toBe("Invalid CIF: unexpected token");
  });

  it("falls back to a readable message for a non-Error throw", async () => {
    const { component } = await create();
    const errors: string[] = [];
    component.loadError.subscribe((message) => errors.push(message));

    (component as unknown as Failable).fail(
      "boom",
      "Could not render the structure."
    );

    expect(errors).toEqual(["Could not render the structure."]);
    expect(component.errorMessage()).toBe("Could not render the structure.");
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
