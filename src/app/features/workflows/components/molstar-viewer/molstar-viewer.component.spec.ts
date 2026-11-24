import { TestBed } from "@angular/core/testing";
import { Vec3 } from "molstar/lib/mol-math/linear-algebra";
import type { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";

import {
  MolstarViewerComponent,
  defaultCameraSnapshot,
} from "./molstar-viewer.component";

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

describe("MolstarViewerComponent coloring", () => {
  it("finishes an active repaint before clearing and skips obsolete queued requests", async () => {
    await TestBed.configureTestingModule({
      imports: [MolstarViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(MolstarViewerComponent);
    const component = fixture.componentInstance as unknown as {
      applyExternalSelection(tokens: string): Promise<void>;
      applySelection(tokens: string): Promise<void>;
    };
    let finishFirst!: () => void;
    const firstPaint = new Promise<void>((resolve) => {
      finishFirst = resolve;
    });
    const paint = spyOn(component, "applySelection").and.callFake((tokens) =>
      tokens === "A1" ? firstPaint : Promise.resolve()
    );
    fixture.detectChanges();

    const first = component.applyExternalSelection("A1");
    await Promise.resolve();
    const obsolete = component.applyExternalSelection("A2");
    const clear = component.applyExternalSelection("");
    expect(paint.calls.allArgs()).toEqual([["A1"]]);

    finishFirst();
    await Promise.all([first, obsolete, clear]);
    expect(paint.calls.allArgs()).toEqual([["A1"], [""]]);

    const abandoned = component.applyExternalSelection("A3");
    fixture.destroy();
    await abandoned;
    expect(paint.calls.allArgs()).toEqual([["A1"], [""]]);
  });

  it("updates every loaded component in place and applies a pending theme after loading", async () => {
    await TestBed.configureTestingModule({
      imports: [MolstarViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(MolstarViewerComponent);
    const component = fixture.componentInstance;
    const components = [{}, {}, {}];
    const updateTheme = jasmine.createSpy("updateTheme").and.resolveTo();
    const plugin = {
      managers: {
        structure: {
          hierarchy: {
            current: {
              structures: [
                { components: components.slice(0, 2) },
                { components: components.slice(2) },
              ],
            },
          },
          component: { updateRepresentationsTheme: updateTheme },
        },
      },
    };
    spyOnProperty(
      component as unknown as { readonly plugin: PluginUIContext },
      "plugin",
      "get"
    ).and.returnValue(plugin as unknown as PluginUIContext);
    const reselect = spyOn(
      component as unknown as {
        applyExternalSelection(tokens: string): Promise<void>;
      },
      "applyExternalSelection"
    ).and.resolveTo();
    fixture.componentRef.setInput("isolateSelection", true);
    fixture.componentRef.setInput("selectionRequest", { tokens: "A1" });
    fixture.detectChanges();

    fixture.componentRef.setInput("colorTheme", "plddt");
    component.status.set("loading");
    fixture.detectChanges();
    expect(updateTheme).not.toHaveBeenCalled();

    fixture.componentRef.setInput("colorTheme", "chain-id");
    fixture.detectChanges();
    expect(updateTheme).not.toHaveBeenCalled();

    component.status.set("loaded");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(updateTheme).toHaveBeenCalledOnceWith(components, {
      color: "chain-id",
    });
    expect(reselect).not.toHaveBeenCalled();

    fixture.componentRef.setInput("colorTheme", "plddt");
    fixture.detectChanges();
    await fixture.whenStable();
    expect(updateTheme.calls.mostRecent().args).toEqual([
      components,
      { color: "plddt-confidence" },
    ]);
    expect(reselect).not.toHaveBeenCalled();
    expect(component.status()).toBe("loaded");
  });
});

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

describe("defaultCameraSnapshot", () => {
  const targetDistance = (radius: number) => radius * 4;

  const sphere = { center: Vec3.create(3, 1, -2), radius: 5 };

  it("looks down -Z with +Y up, whichever way the camera was pointing", () => {
    const snapshot = defaultCameraSnapshot(sphere, targetDistance);
    const direction = Vec3.sub(Vec3(), snapshot.target, snapshot.position);
    Vec3.normalize(direction, direction);

    expect([...direction]).toEqual([0, 0, -1]);
    expect([...snapshot.up]).toEqual([0, 1, 0]);
  });

  it("centres on the structure and backs off far enough to frame it", () => {
    const snapshot = defaultCameraSnapshot(sphere, targetDistance);

    expect([...snapshot.target]).toEqual([3, 1, -2]);
    expect([...snapshot.position]).toEqual([3, 1, -2 + 20]);
    expect(snapshot.radius).toBe(5);
  });

  it("keeps a degenerate sphere off the camera's own position", () => {
    const snapshot = defaultCameraSnapshot(
      { center: Vec3.create(0, 0, 0), radius: 0 },
      targetDistance
    );

    expect(snapshot.radius).toBe(0.01);
    expect(snapshot.position[2]).toBeGreaterThan(0);
  });

  it("copies the centre rather than aliasing the scene's own vector", () => {
    const center = Vec3.create(1, 2, 3);
    const snapshot = defaultCameraSnapshot(
      { center, radius: 1 },
      targetDistance
    );
    Vec3.set(center, 9, 9, 9);

    expect([...snapshot.target]).toEqual([1, 2, 3]);
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

describe("MolstarViewerComponent keyboard upload", () => {
  it("shows focus on the visible drop zone", async () => {
    await TestBed.configureTestingModule({
      imports: [MolstarViewerComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(MolstarViewerComponent);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const input =
      element.querySelector<HTMLInputElement>('input[type="file"]')!;
    const label = input.closest("label")!;
    label.style.transition = "none";

    input.focus();

    expect(document.activeElement).toBe(input);
    expect(getComputedStyle(label).outlineStyle).toBe("solid");
    expect(getComputedStyle(label).outlineWidth).toBe("2px");
    expect(getComputedStyle(label).outlineOffset).toBe("-2px");
  });
});

describe("MolstarViewerComponent drag and drop", () => {
  const create = async () => {
    await TestBed.configureTestingModule({
      imports: [MolstarViewerComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(MolstarViewerComponent);
    return fixture.componentInstance;
  };

  const dragEvent = (files: File[] = []) => {
    const event = {
      preventDefault: jasmine.createSpy("preventDefault"),
      dataTransfer: { files, dropEffect: "" },
    };
    return event as unknown as DragEvent;
  };

  const pdbFile = () => new File(["ATOM"], "structure.pdb");

  it("highlights the drop zone on dragenter and clears it on dragleave", async () => {
    const component = await create();

    component.onDragEnter(dragEvent());
    expect(component.isDraggingOver()).toBeTrue();

    component.onDragLeave(dragEvent());
    expect(component.isDraggingOver()).toBeFalse();
  });

  it("keeps the highlight while a nested dragleave still leaves one dragenter outstanding", async () => {
    const component = await create();

    component.onDragEnter(dragEvent());
    component.onDragEnter(dragEvent());
    component.onDragLeave(dragEvent());
    expect(component.isDraggingOver()).toBeTrue();

    component.onDragLeave(dragEvent());
    expect(component.isDraggingOver()).toBeFalse();
  });

  it("emits the dropped file and clears the highlight", async () => {
    const component = await create();
    const picked: File[] = [];
    component.filePicked.subscribe((file) => picked.push(file));
    const file = pdbFile();

    component.onDragEnter(dragEvent());
    component.onDrop(dragEvent([file]));

    expect(picked).toEqual([file]);
    expect(component.isDraggingOver()).toBeFalse();
  });

  it("ignores drag and drop while disabled", async () => {
    const component = await create();
    (component as unknown as { disabled: () => boolean }).disabled = () => true;
    const picked: File[] = [];
    component.filePicked.subscribe((file) => picked.push(file));

    component.onDragEnter(dragEvent());
    expect(component.isDraggingOver()).toBeFalse();

    component.onDrop(dragEvent([pdbFile()]));
    expect(picked).toEqual([]);
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
