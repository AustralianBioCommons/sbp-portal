import { Component, input, output } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Subject, of, throwError } from "rxjs";

import { SinglePredictionReportComponent } from "./single-prediction-report.component";
import { ResultsService } from "../../services/results.service";
import {
  MolstarViewerComponent,
  StructureSource,
} from "../../../workflows/components/molstar-viewer/molstar-viewer.component";
import {
  ResidueRef,
  ResultFileRef,
} from "../../shared/prediction-results.utils";

/** Stands in for the real viewer so tests never boot a WebGL context. */
@Component({
  selector: "app-molstar-viewer",
  template: "",
})
class MolstarViewerStubComponent {
  structureSource = input<StructureSource | null>(null);
  enableUpload = input(true);
  roundBottomRight = input(false);
  selectionRequest = input<{ tokens: string } | null>(null);
  representation = input<"cartoon" | "cartoon-and-sticks">(
    "cartoon-and-sticks"
  );
  colorTheme = input<"default" | "plddt">("default");
  showSequencePanel = input(true);
  enablePicking = input(true);
  isolateSelection = input(false);
  hint = input("");
  residueIndexDetected = output<ResidueRef[]>();
  loadError = output<string>();
  resetCamera(): void {
    /* the real viewer moves the camera; nothing to do without one */
  }
}

const STRUCTURE_KEY = "run-1/boltz/top_ranked_structures/sample.cif";
const PAE_KEY = "run-1/boltz/sample/paes/sample_0_pae.tsv";

const files: ResultFileRef[] = [
  {
    label: "sample.cif",
    key: STRUCTURE_KEY,
    url: "https://s3.test/sample.cif?sig=1",
    category: "pdb",
  },
  {
    label: "sample_0_pae.tsv",
    key: PAE_KEY,
    url: "https://s3.test/sample_0_pae.tsv?sig=1",
    category: "stats_csv",
  },
  {
    label: "sample_report.html",
    key: "run-1/reports/sample_report.html",
    url: "https://s3.test/sample_report.html?sig=1",
    category: "report",
  },
];

const residues: ResidueRef[] = [
  { chain: "A", seq: 1 },
  { chain: "A", seq: 2 },
  { chain: "A", seq: 3 },
];

const PTM_KEY = "run-1/boltz/sample/sample_ptm.tsv";
const IPTM_KEY = "run-1/boltz/sample/sample_iptm.tsv";

const scoreFiles: ResultFileRef[] = [
  {
    label: "sample_ptm.tsv",
    key: PTM_KEY,
    url: "https://s3.test/sample_ptm.tsv?sig=1",
    category: "stats_csv",
  },
  {
    label: "sample_iptm.tsv",
    key: IPTM_KEY,
    url: "https://s3.test/sample_iptm.tsv?sig=1",
    category: "stats_csv",
  },
];

const MSA_KEY = "run-1/mmseqs/sample_boltz_msa.tsv";
const IPSAE_KEY = "run-1/boltz/sample/sample_chainwise_ipsae.tsv";

const msaFile: ResultFileRef = {
  label: "sample_boltz_msa.tsv",
  key: MSA_KEY,
  url: "https://s3.test/sample_boltz_msa.tsv?sig=1",
  category: "stats_csv",
};

const ipsaeFile: ResultFileRef = {
  label: "sample_chainwise_ipsae.tsv",
  key: IPSAE_KEY,
  url: "https://s3.test/sample_chainwise_ipsae.tsv?sig=1",
  category: "stats_csv",
};

const CHAIN_IPTM_KEY = "run-1/boltz/sample/sample_chainwise_iptm.tsv";

const chainIptmFile: ResultFileRef = {
  label: "sample_chainwise_iptm.tsv",
  key: CHAIN_IPTM_KEY,
  url: "https://s3.test/sample_chainwise_iptm.tsv?sig=1",
  category: "stats_csv",
};

const MSA_TSV = "1\t2\t3\n1\t21\t3\n";
const IPSAE_TSV = "\t0\r\nA:B\t0.2000\r\nA:C\t0.8000\r\n";
const CHAIN_IPTM_TSV = "\t0\r\nA:B\t0.6000\r\n";

const PAE_TSV = "0\t1\t2\n1\t0\t3\n2\t3\t0";
const STRUCTURE_TEXT = "data_sample\n_entry.id sample\n";

describe("SinglePredictionReportComponent", () => {
  let fixture: ComponentFixture<SinglePredictionReportComponent>;
  let component: SinglePredictionReportComponent;
  let resultsService: jasmine.SpyObj<ResultsService>;

  const render = (fileList: ResultFileRef[] = files) => {
    fixture = TestBed.createComponent(SinglePredictionReportComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("runId", "run-1");
    fixture.componentRef.setInput("files", fileList);
    fixture.detectChanges();
  };

  beforeEach(async () => {
    resultsService = jasmine.createSpyObj("ResultsService", [
      "getResultFileText",
    ]);
    resultsService.getResultFileText.and.callFake((_runId, key) => {
      if (key === PAE_KEY) return of(PAE_TSV);
      if (key === PTM_KEY) return of("0\t0.287\r\n");
      if (key === IPTM_KEY) return of("0\t0.274\r\n");
      if (key === MSA_KEY) return of(MSA_TSV);
      if (key === IPSAE_KEY) return of(IPSAE_TSV);
      if (key === CHAIN_IPTM_KEY) return of(CHAIN_IPTM_TSV);
      return of(STRUCTURE_TEXT);
    });

    await TestBed.configureTestingModule({
      imports: [SinglePredictionReportComponent],
      providers: [{ provide: ResultsService, useValue: resultsService }],
    })
      .overrideComponent(SinglePredictionReportComponent, {
        remove: { imports: [MolstarViewerComponent] },
        add: { imports: [MolstarViewerStubComponent] },
      })
      .compileComponents();
  });

  // --- Artifact discovery and loading ---------------------------------------

  it("picks the structure and PAE artifacts out of the files list", () => {
    render();

    expect(component.structureArtifact()?.key).toBe(STRUCTURE_KEY);
    expect(component.structureArtifact()?.format).toBe("mmcif");
    expect(component.paeArtifact()?.key).toBe(PAE_KEY);
  });

  it("loads both artifacts through the API using their object keys", () => {
    render();

    expect(resultsService.getResultFileText).toHaveBeenCalledWith(
      "run-1",
      STRUCTURE_KEY
    );
    expect(resultsService.getResultFileText).toHaveBeenCalledWith(
      "run-1",
      PAE_KEY
    );
  });

  it("hands the fetched structure to the viewer with its format", () => {
    render();

    expect(component.structureSource()).toEqual({
      content: STRUCTURE_TEXT,
      format: "mmcif",
      label: "sample.cif",
    });
    expect(component.loading()).toBeFalse();
  });

  it("parses the fetched PAE matrix", () => {
    render();

    expect(component.paeMatrix()?.size).toBe(3);
    expect(component.paeMatrix()?.max).toBe(3);
    expect(component.paeError()).toBeNull();
  });

  it("reports a failed structure request", () => {
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      key === STRUCTURE_KEY ? throwError(() => new Error("nope")) : of(PAE_TSV)
    );
    render();

    expect(component.structureError()).toBe(
      "Failed to load the predicted structure file."
    );
    expect(component.loading()).toBeFalse();
  });

  it("reports a failed PAE request", () => {
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      key === PAE_KEY ? throwError(() => new Error("nope")) : of(STRUCTURE_TEXT)
    );
    render();

    expect(component.paeError()).toBe("Failed to load the PAE matrix file.");
  });

  it("surfaces a PAE parse failure as an error", () => {
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      of(key === PAE_KEY ? "9\t1\t2\n" : STRUCTURE_TEXT)
    );
    render();

    expect(component.paeMatrix()).toBeNull();
    expect(component.paeError()).toContain("not square");
  });

  it("treats an empty structure file as an error", () => {
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      of(key === STRUCTURE_KEY ? "   " : PAE_TSV)
    );
    render();

    expect(component.structureError()).toBe("The structure file is empty.");
  });

  it("names the artifacts that are missing", () => {
    render([files[2]]);

    expect(component.missingArtifacts()).toEqual([
      "a structure file (.cif/.pdb)",
      "a PAE matrix (*_pae_0.tsv)",
    ]);
    expect(resultsService.getResultFileText).not.toHaveBeenCalled();
  });

  // --- Single loading gate --------------------------------------------------

  it("shows one spinner and no panels until every fetch has settled", () => {
    const pae = new Subject<string>();
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      key === PAE_KEY ? pae.asObservable() : of(STRUCTURE_TEXT)
    );
    render([...files, ...scoreFiles, msaFile, ipsaeFile]);

    // The structure and the scores have landed; the PAE has not.
    expect(component.loading()).toBeTrue();
    let text: string = fixture.nativeElement.textContent;
    expect(text).toContain("Loading results");
    expect(fixture.nativeElement.querySelector("app-pae-matrix")).toBeNull();
    expect(fixture.nativeElement.querySelector("app-msa-coverage")).toBeNull();
    expect(text).not.toContain("pTM");

    pae.next(PAE_TSV);
    pae.complete();
    fixture.detectChanges();

    expect(component.loading()).toBeFalse();
    text = fixture.nativeElement.textContent;
    expect(text).not.toContain("Loading results");
    expect(
      fixture.nativeElement.querySelector("app-pae-matrix")
    ).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector("app-msa-coverage")
    ).not.toBeNull();
  });

  it("stops loading even when a fetch fails", () => {
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      key === PAE_KEY ? throwError(() => new Error("nope")) : of(STRUCTURE_TEXT)
    );
    render();

    expect(component.loading()).toBeFalse();
    expect(component.paeError()).toBe("Failed to load the PAE matrix file.");
  });

  it("keeps the spinner up while the parent is still listing files", () => {
    fixture = TestBed.createComponent(SinglePredictionReportComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("runId", "run-1");
    fixture.componentRef.setInput("files", []);
    fixture.componentRef.setInput("filesLoading", true);
    fixture.detectChanges();

    expect(component.loading()).toBeTrue();
    // Not the "missing artifacts" message — the list simply is not in yet.
    expect(fixture.nativeElement.textContent).not.toContain("is missing");
  });

  // --- Confidence scores ----------------------------------------------------

  it("shows pTM and ipTM when a run reports both", () => {
    render([...files, ...scoreFiles]);

    // ipTM leads: for a complex it is the score that matters most.
    expect(component.scores()).toEqual([
      { label: "ipTM", value: "0.274", hint: jasmine.any(String) },
      { label: "pTM", value: "0.287", hint: jasmine.any(String) },
    ]);
  });

  it("omits ipTM for a single-chain prediction that has no ipTM file", () => {
    render([...files, scoreFiles[0]]);

    expect(component.scores().map((s) => s.label)).toEqual(["pTM"]);
  });

  it("shows no scores when a run reports neither", () => {
    render();

    expect(component.scores()).toEqual([]);
  });

  it("keeps the view usable when a score request fails", () => {
    resultsService.getResultFileText.and.callFake((_runId, key) => {
      if (key === PTM_KEY) return throwError(() => new Error("nope"));
      if (key === PAE_KEY) return of(PAE_TSV);
      return of(STRUCTURE_TEXT);
    });
    render([...files, scoreFiles[0]]);

    expect(component.scores()).toEqual([]);
    expect(component.paeMatrix()?.size).toBe(3);
  });

  // --- MSA coverage and interface confidence --------------------------------

  it("parses the MSA into coverage", () => {
    render([...files, msaFile]);

    expect(component.msaCoverage()?.totalSequences).toBe(2);
    expect(component.msaCoverage()?.length).toBe(3);
    expect(component.msaError()).toBeNull();
  });

  it("arranges chain pairs as a matrix, leaving unlisted directions blank", () => {
    render([...files, ipsaeFile]);

    const matrix = component.ipsaeMatrix();
    expect(matrix.chains).toEqual(["A", "B", "C"]);
    expect(matrix.rows[0]).toEqual([null, 0.2, 0.8]);
    expect(matrix.rows[1][0]).toBeNull();
  });

  it("builds the chainwise ipTM matrix alongside ipSAE", () => {
    render([...files, ipsaeFile, chainIptmFile]);

    expect(component.hasIpsaeMatrix()).toBeTrue();
    expect(component.hasChainIptmMatrix()).toBeTrue();
    expect(component.chainIptmMatrix().rows[0]).toEqual([null, 0.6]);
  });

  it("shows ipSAE alone when the run has no chainwise ipTM", () => {
    render([...files, ipsaeFile]);

    expect(component.hasIpsaeMatrix()).toBeTrue();
    expect(component.hasChainIptmMatrix()).toBeFalse();
    expect(component.hasInterfaceMatrices()).toBeTrue();
  });

  it("has no chain matrices for a run without the chainwise files", () => {
    render();

    expect(component.hasInterfaceMatrices()).toBeFalse();
    expect(component.ipsaeMatrix().chains).toEqual([]);
    expect(component.chainIptmMatrix().chains).toEqual([]);
  });

  it("reports a failed MSA request without breaking the rest", () => {
    resultsService.getResultFileText.and.callFake((_runId, key) => {
      if (key === MSA_KEY) return throwError(() => new Error("nope"));
      if (key === PAE_KEY) return of(PAE_TSV);
      return of(STRUCTURE_TEXT);
    });
    render([...files, msaFile]);

    expect(component.msaError()).toBe("Failed to load the alignment file.");
    expect(component.paeMatrix()?.size).toBe(3);
  });

  // --- PAE Matrix drives the viewer --------------------------------------------

  it("mirrors a matrix selection onto the viewer as residue tokens", () => {
    render();
    component.onResidueIndexDetected(residues);

    component.onMatrixSelectionChange([0, 1]);

    expect(component.selectedIndices()).toEqual([0, 1]);
    expect(component.viewerSelectionRequest()).toEqual({ tokens: "A1-A2" });
  });

  it("clears the selection in both views when the matrix clears", () => {
    render();
    component.onResidueIndexDetected(residues);
    component.onMatrixSelectionChange([0, 1]);

    component.onMatrixSelectionChange([]);

    expect(component.selectedIndices()).toEqual([]);
    expect(component.viewerSelectionRequest()).toEqual({ tokens: "" });
  });

  it("re-applies an identical matrix selection with a fresh request object", () => {
    render();
    component.onResidueIndexDetected(residues);

    component.onMatrixSelectionChange([0]);
    const first = component.viewerSelectionRequest();
    component.onMatrixSelectionChange([0]);

    expect(component.viewerSelectionRequest()).not.toBe(first);
    expect(component.viewerSelectionRequest()).toEqual({ tokens: "A1" });
  });

  // --- Viewer render failures -----------------------------------------------

  const viewerStub = (): MolstarViewerStubComponent =>
    fixture.debugElement.query(By.directive(MolstarViewerStubComponent))
      .componentInstance;

  it("falls back when Mol* cannot render the fetched structure", () => {
    const unavailable = jasmine.createSpy("unavailable");
    render();
    component.unavailable.subscribe(unavailable);

    // The fetch succeeded, so only the viewer knows the file is unusable.
    expect(component.structureError()).toBeNull();
    viewerStub().loadError.emit("Invalid CIF: unexpected token");
    fixture.detectChanges();

    expect(component.structureError()).toBe(
      "Failed to load the predicted structure file."
    );
    expect(component.coreUnavailable()).toBeTrue();
    expect(unavailable).toHaveBeenCalled();
  });

  it("shows the render failure in place of the viewer", () => {
    render();
    viewerStub().loadError.emit("Invalid CIF");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Failed to load the predicted structure file."
    );
    expect(
      fixture.debugElement.query(By.directive(MolstarViewerStubComponent))
    ).toBeNull();
  });

  it("ignores a render failure once the structure is gone", () => {
    const unavailable = jasmine.createSpy("unavailable");
    render();
    component.unavailable.subscribe(unavailable);
    const stub = viewerStub();

    // A superseded load must not condemn the run that replaced it.
    component.structureSource.set(null);
    stub.loadError.emit("Invalid CIF");
    fixture.detectChanges();

    expect(component.structureError()).toBeNull();
  });

  // --- Token index vs matrix size -------------------------------------------

  it("accepts an index that lines up with the matrix", () => {
    const unavailable = jasmine.createSpy("unavailable");
    render();
    component.unavailable.subscribe(unavailable);

    component.onResidueIndexDetected(residues);
    fixture.detectChanges();

    expect(component.tokenMismatch()).toBeFalse();
    expect(unavailable).not.toHaveBeenCalled();
  });

  const cif = (rows: string[]) =>
    [
      "data_sample",
      "loop_",
      "_atom_site.group_PDB",
      "_atom_site.id",
      "_atom_site.label_atom_id",
      "_atom_site.label_comp_id",
      "_atom_site.auth_seq_id",
      "_atom_site.auth_asym_id",
      ...rows,
    ].join("\n");

  const renderWithStructure = (structure: string) => {
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      key === PAE_KEY ? of(PAE_TSV) : of(structure)
    );
    fixture = TestBed.createComponent(SinglePredictionReportComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("runId", "run-1");
    fixture.componentRef.setInput("files", files);
    const unavailable = jasmine.createSpy("unavailable");
    component.unavailable.subscribe(unavailable);
    fixture.detectChanges();
    return unavailable;
  };

  it("falls back on the first render when the counts disagree", () => {
    const unavailable = renderWithStructure(
      cif(["ATOM 1 CA MET 1 A", "ATOM 2 CA GLY 2 A"])
    );

    expect(component.residueIndex()).toEqual([]);
    expect(component.tokenMismatch()).toBeTrue();
    expect(unavailable).toHaveBeenCalled();
  });

  it("keeps a run whose ligand atoms make up the matrix", () => {
    const unavailable = renderWithStructure(
      cif(["ATOM 1 CA MET 1 A", "HETATM 2 C7 LIG 1 B", "HETATM 3 C8 LIG 1 B"])
    );

    expect(component.tokenMismatch()).toBeFalse();
    expect(unavailable).not.toHaveBeenCalled();
  });

  it("accepts a plain polymer run counted from the file", () => {
    const unavailable = renderWithStructure(
      cif(["ATOM 1 CA MET 1 A", "ATOM 2 CA GLY 2 A", "ATOM 3 CA SER 3 A"])
    );

    expect(component.tokenMismatch()).toBeFalse();
    expect(unavailable).not.toHaveBeenCalled();
  });

  it("gives up the interactive view when a ligand leaves the index short", () => {
    const unavailable = jasmine.createSpy("unavailable");
    render();
    component.unavailable.subscribe(unavailable);

    // A ligand is scored per atom, so the 3x3 matrix outruns two residues.
    component.onResidueIndexDetected(residues.slice(0, 2));
    fixture.detectChanges();

    expect(component.tokenMismatch()).toBeTrue();
    expect(component.coreUnavailable()).toBeTrue();
    expect(unavailable).toHaveBeenCalled();
  });

  it("gives up when a ligand-only run reports one entry per residue", () => {
    const unavailable = jasmine.createSpy("unavailable");
    render();
    component.unavailable.subscribe(unavailable);

    // A single ligand residue against a matrix of per-atom tokens.
    component.onResidueIndexDetected([{ chain: "B", seq: 1 }]);
    fixture.detectChanges();

    expect(component.tokenMismatch()).toBeTrue();
    expect(unavailable).toHaveBeenCalled();
  });

  it("waits for the viewer's index before judging the matrix", () => {
    const unavailable = jasmine.createSpy("unavailable");
    render();
    component.unavailable.subscribe(unavailable);
    fixture.detectChanges();

    // An index that has not arrived yet is not a mismatch.
    expect(component.paeMatrix()).not.toBeNull();
    expect(component.residueIndex()).toEqual([]);
    expect(component.tokenMismatch()).toBeFalse();
    expect(unavailable).not.toHaveBeenCalled();
  });

  it("re-checks the index when the run changes", () => {
    render();
    component.onResidueIndexDetected(residues);
    expect(component.tokenMismatch()).toBeFalse();

    fixture.componentRef.setInput("runId", "run-2");
    fixture.detectChanges();

    // A new structure load clears the index until the viewer reports again.
    expect(component.tokenMismatch()).toBeFalse();
    component.onResidueIndexDetected(residues.slice(0, 1));
    expect(component.tokenMismatch()).toBeTrue();
  });
});
