import { Component, input, output } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Subject, of, throwError } from "rxjs";

import { DeNovoDesignReportComponent } from "./de-novo-design-report.component";
import { DesignResultsTableComponent } from "../design-results-table/design-results-table.component";
import { ResultsService } from "../../services/results.service";
import {
  MolstarViewerComponent,
  StructureSource,
} from "../../../workflows/components/molstar-viewer/molstar-viewer.component";
import { ResultFileRef } from "../../shared/prediction-results.utils";

/** Stands in for the real viewer so tests never boot a WebGL context. */
@Component({
  selector: "app-molstar-viewer",
  template: "",
})
class MolstarViewerStubComponent {
  structureSource = input<StructureSource | null>(null);
  sourceLoading = input(false);
  enableUpload = input(true);
  roundBottomRight = input(false);
  representation = input<"cartoon" | "cartoon-and-sticks">(
    "cartoon-and-sticks"
  );
  colorTheme = input<"default" | "plddt" | "binder-target">("default");
  binderChainId = input("A");
  designLength = input<number | null>(null);
  superposeKey = input("");
  showSequencePanel = input(true);
  enablePicking = input(true);
  hint = input("");
  loadError = output<string>();
  resetCamera(): void {
    /* the real viewer moves the camera; nothing to do without one */
  }
}

const RUN = "11111111-2222-4333-8444-555555555555";
const STATS_KEY = `${RUN}/ranker/demo-binder_final_design_stats.csv`;
const RANKED = `${RUN}/ranker/demo-binder_Ranked`;

const files: ResultFileRef[] = [
  {
    label: "demo-binder_final_design_stats.csv",
    key: STATS_KEY,
    url: "https://s3.test/stats.csv?sig=1",
    category: "stats_csv",
  },
  {
    label: "1_demo-binder_l135_s866737_mpnn3_model1.pdb",
    key: `${RANKED}/1_demo-binder_l135_s866737_mpnn3_model1.pdb`,
    url: "https://s3.test/1.pdb?sig=1",
    category: "pdb",
  },
  {
    label: "2_demo-binder_l135_s866737_mpnn2_model1.pdb",
    key: `${RANKED}/2_demo-binder_l135_s866737_mpnn2_model1.pdb`,
    url: "https://s3.test/2.pdb?sig=1",
    category: "pdb",
  },
];

const statsCsv =
  "Rank,Design,Length,Sequence,Average_i_pTM\n" +
  "1,demo-binder_l135_s866737_mpnn3,135,GEMGVHDFLL,0.85\n" +
  "2,demo-binder_l135_s866737_mpnn2,135,GVMSVYDFLL,0.85\n";

/** A CA line with the columns where the PDB format fixes them. */
function ca(serial: number, chain: string, seq: number, x: number): string {
  return (
    "ATOM  " +
    String(serial).padStart(5) +
    "  CA  ALA " +
    chain +
    String(seq).padStart(4) +
    "    " +
    x.toFixed(3).padStart(8) +
    "   0.000".padStart(8) +
    "   0.000".padStart(8) +
    "  1.00 82.80           C"
  );
}

/**
 * BindCraft order: chain A is the target, chain B the 2-residue binder.
 * `shift` moves the whole complex, as a fresh prediction would.
 */
function bindCraftPdb(shift = 0): string {
  return [
    ca(1, "A", 1, 0 + shift),
    ca(2, "A", 2, 10 + shift),
    ca(3, "A", 3, 20 + shift),
    ca(4, "A", 4, 30 + shift),
    ca(5, "B", 1, 5 + shift),
    ca(6, "B", 2, 6 + shift),
  ].join("\n");
}

const PDB = bindCraftPdb();

describe("DeNovoDesignReportComponent", () => {
  let fixture: ComponentFixture<DeNovoDesignReportComponent>;
  let component: DeNovoDesignReportComponent;
  let resultsService: jasmine.SpyObj<ResultsService>;

  /** Answers each key with its own fixture, so order of requests does not matter. */
  const respondWith = (bodies: Record<string, string>) => {
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      key in bodies
        ? of(bodies[key])
        : throwError(() => new Error(`no fixture for ${key}`))
    );
  };

  const render = (
    inputs: Partial<{
      tool: string;
      files: ResultFileRef[];
      filesLoading: boolean;
      filesError: string | null;
    }> = {}
  ) => {
    fixture = TestBed.createComponent(DeNovoDesignReportComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("runId", RUN);
    fixture.componentRef.setInput("tool", inputs.tool ?? "BindCraft");
    fixture.componentRef.setInput("files", inputs.files ?? files);
    fixture.componentRef.setInput("filesLoading", inputs.filesLoading ?? false);
    fixture.componentRef.setInput("filesError", inputs.filesError ?? null);
    fixture.detectChanges();
  };

  const viewer = () =>
    fixture.debugElement.query(By.directive(MolstarViewerStubComponent))
      ?.componentInstance as MolstarViewerStubComponent | undefined;

  const table = () =>
    fixture.debugElement.query(By.directive(DesignResultsTableComponent))
      ?.componentInstance as DesignResultsTableComponent | undefined;

  beforeEach(async () => {
    resultsService = jasmine.createSpyObj<ResultsService>("ResultsService", [
      "getResultFileText",
    ]);
    respondWith({
      [STATS_KEY]: statsCsv,
      [`${RANKED}/1_demo-binder_l135_s866737_mpnn3_model1.pdb`]: PDB,
      [`${RANKED}/2_demo-binder_l135_s866737_mpnn2_model1.pdb`]: `${PDB}ATOM 2\n`,
    });

    await TestBed.configureTestingModule({
      imports: [DeNovoDesignReportComponent],
      providers: [{ provide: ResultsService, useValue: resultsService }],
    })
      // The real viewer needs WebGL, which the test browser lacks.
      .overrideComponent(DeNovoDesignReportComponent, {
        remove: { imports: [MolstarViewerComponent] },
        add: { imports: [MolstarViewerStubComponent] },
      })
      .compileComponents();
  });

  it("builds the table from the run's stats file", () => {
    render();

    expect(resultsService.getResultFileText).toHaveBeenCalledWith(
      RUN,
      STATS_KEY
    );
    expect(component.rows().length).toBe(2);
    expect(table()!.rows().length).toBe(2);
    expect(
      table()!
        .columns()
        .map((column) => column.heading)
    ).toEqual([
      "Rank",
      "ipTM",
      "Design Length",
      "Design Sequence",
      "Design name",
    ]);
  });

  it("shows the top-ranked design without waiting for a click", () => {
    render();

    expect(component.selectedId()).toBe(component.rows()[0].id);
    expect(viewer()!.structureSource()?.content).toBe(PDB);
    expect(viewer()!.structureSource()?.format).toBe("pdb");
  });

  it("sets the binder apart from the target, in cartoon", () => {
    render();

    expect(viewer()!.colorTheme()).toBe("binder-target");
    expect(viewer()!.representation()).toBe("cartoon");
    // BindCraft writes the target first, so chain B holds the binder.
    expect(viewer()!.binderChainId()).toBe("B");
  });

  it("names the legend after the target and the selected design", () => {
    render();

    expect(component.chainLegend().map((band) => band.label)).toEqual([
      "Target",
      "demo-binder_l135_s866737_mpnn3",
    ]);
    expect(component.chainLegend()[0].color).not.toBe(
      component.chainLegend()[1].color
    );
    const legend = fixture.nativeElement.textContent as string;
    expect(legend).toContain("Target");
    expect(legend).toContain("demo-binder_l135_s866737_mpnn3");
  });

  it("renames the binder band as the selection changes", () => {
    render();

    table()!.rowSelected.emit(component.rows()[1]);
    fixture.detectChanges();

    expect(component.chainLegend()[1].label).toBe(
      "demo-binder_l135_s866737_mpnn2"
    );
  });

  // --- Keeping the target still between selections ------------------------

  it("tells the viewer which chain the pipeline puts the binder on", () => {
    render();

    expect(viewer()!.binderChainId()).toBe("B");
    // The design's own length is what settles it when chains are ambiguous.
    expect(viewer()!.designLength()).toBe(135);
  });

  it("gives designs of one run a shared key, so they line up on each other", () => {
    render();

    const key = viewer()!.superposeKey();
    expect(key).toBe(RUN);

    table()!.rowSelected.emit(component.rows()[1]);
    fixture.detectChanges();
    expect(viewer()!.superposeKey()).toBe(key);
  });

  it("starts a new key when the run changes", () => {
    render();

    fixture.componentRef.setInput(
      "runId",
      "99999999-2222-4333-8444-555555555555"
    );
    fixture.detectChanges();

    expect(viewer()!.superposeKey()).not.toBe(RUN);
  });

  it("loads the structure of whichever row is selected", () => {
    render();

    table()!.rowSelected.emit(component.rows()[1]);
    fixture.detectChanges();

    expect(resultsService.getResultFileText).toHaveBeenCalledWith(
      RUN,
      `${RANKED}/2_demo-binder_l135_s866737_mpnn2_model1.pdb`
    );
    expect(viewer()!.structureSource()?.content).toContain("ATOM 2");
  });

  it("passes the selection back down so the table can mark the row", () => {
    render();

    table()!.rowSelected.emit(component.rows()[1]);
    fixture.detectChanges();

    expect(table()!.selectedId()).toBe(component.rows()[1].id);
  });

  it("clears the viewer for a design with no structure file", () => {
    render({ files: [files[0]] });

    expect(component.rows().length).toBe(2);
    expect(viewer()!.structureSource()).toBeNull();
    expect(fixture.nativeElement.textContent).toContain(
      "No structure file was found for this design"
    );
  });

  it("ignores a superseded structure response", () => {
    const first = new Subject<string>();
    const second = new Subject<string>();
    respondWith({ [STATS_KEY]: statsCsv });
    resultsService.getResultFileText.and.callFake((_runId, key) => {
      if (key === STATS_KEY) return of(statsCsv);
      return key.includes("/1_") ? first : second;
    });

    render();
    table()!.rowSelected.emit(component.rows()[1]);
    fixture.detectChanges();

    // Row 1's structure arrives after row 2 was picked.
    first.next("STALE");
    second.next(PDB);
    fixture.detectChanges();

    expect(viewer()!.structureSource()?.content).toBe(PDB);
  });

  it("keeps the viewer loading while a superseded response finalizes", () => {
    const first = new Subject<string>();
    const second = new Subject<string>();
    resultsService.getResultFileText.and.callFake((_runId, key) => {
      if (key === STATS_KEY) return of(statsCsv);
      return key.includes("/1_") ? first : second;
    });

    render();
    table()!.rowSelected.emit(component.rows()[1]);
    fixture.detectChanges();

    // Row 1's fetch ending must not clear the flag row 2's fetch is holding.
    first.next("STALE");
    first.complete();
    fixture.detectChanges();

    expect(component.structureLoading()).toBeTrue();
    expect(viewer()!.structureSource()).toBeNull();

    // `complete` is what HttpClient does after a body; the flag waits for it.
    second.next(PDB);
    second.complete();
    fixture.detectChanges();

    expect(component.structureLoading()).toBeFalse();
    expect(viewer()!.structureSource()?.content).toBe(PDB);
  });

  it("stops loading when the row picked next has no structure", () => {
    const pending = new Subject<string>();
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      key === STATS_KEY ? of(statsCsv) : pending
    );

    render();

    expect(component.structureLoading()).toBeTrue();

    // A row the table knows nothing about resolves to no structure at all.
    table()!.rowSelected.emit({
      ...component.rows()[0],
      id: "no-such-row",
    });
    fixture.detectChanges();

    expect(component.structureLoading()).toBeFalse();
    expect(viewer()!.structureSource()).toBeNull();
    expect(component.structureError()).toBeNull();
  });

  // ── The designs panel ─────────────────────────────────────────────────────

  /** Width changes on the panel are animated; tests measure the end state. */
  const settleLayout = () => {
    const panel = fixture.nativeElement.querySelector(
      "#designs-panel"
    ) as HTMLElement;
    panel.style.transition = "none";
  };

  const divider = () =>
    fixture.nativeElement.querySelector(
      '[role="separator"]'
    ) as HTMLElement | null;

  it("opens beside the viewer, with the table in the panel", () => {
    render();

    // null = following the default share.
    expect(component.panelWidth()).toBeNull();
    expect(component.panelStyleWidth()).toBe("60%");
    expect(divider()).not.toBeNull();
    expect(
      fixture.nativeElement.querySelector("#designs-panel")
    ).not.toBeNull();
    // The panel draws the card, so the table drops its frame.
    expect(table()!.framed()).toBeFalse();
  });

  it("counts the designs in the panel's heading", () => {
    render();
    const heading = () =>
      (
        fixture.nativeElement.querySelector(
          "#designs-panel span.flex-1"
        ) as HTMLElement
      ).textContent!.trim();

    expect(component.rows().length).toBe(2);
    expect(heading()).toBe("Ranked designs (2)");
  });

  it("leaves the heading bare when the table has nothing to count", () => {
    respondWith({ [STATS_KEY]: "Rank,Design\n" });
    render();

    expect(component.panelHeading()).toBe("Ranked designs");
  });

  it("hands the viewer the loading state instead of drawing its own", () => {
    const pending = new Subject<string>();
    resultsService.getResultFileText.and.callFake((_runId, key) =>
      key === STATS_KEY ? of(statsCsv) : pending
    );

    render();

    expect(viewer()!.sourceLoading()).toBeTrue();
    // One spinner between the two components, and it is the viewer's.
    expect(fixture.nativeElement.querySelectorAll("app-loading").length).toBe(
      0
    );

    pending.next(PDB);
    pending.complete();
    fixture.detectChanges();

    expect(viewer()!.sourceLoading()).toBeFalse();
  });

  it("takes the clipped panel out of reach while it is closed", () => {
    render();
    const clipped = () =>
      fixture.nativeElement.querySelector(
        "#designs-panel .overflow-hidden"
      ) as HTMLElement;
    const close = () =>
      clipped().querySelector('button[title="Close"]') as HTMLButtonElement;

    close().focus();
    expect(document.activeElement).toBe(close());

    component.closePanel();
    fixture.detectChanges();

    expect(clipped().hasAttribute("inert")).toBeTrue();
    // Inert content cannot take focus, so the pill is the first stop. Chrome
    // leaves an already-focused element current, so let go of it first.
    close().blur();
    close().focus();
    expect(document.activeElement).not.toBe(close());

    component.openPanel();
    fixture.detectChanges();

    expect(clipped().hasAttribute("inert")).toBeFalse();
    close().focus();
    expect(document.activeElement).toBe(close());
  });

  it("keeps the reopen pill off the viewer's controls", () => {
    render();
    // The panel animates its width, so measure where it lands, not mid-slide.
    settleLayout();
    component.closePanel();
    fixture.detectChanges();

    const pill = fixture.nativeElement.querySelector(
      "#designs-panel button"
    ) as HTMLElement;
    const controls = fixture.nativeElement.querySelector(
      "section div.absolute.right-4"
    ) as HTMLElement;
    const a = pill.getBoundingClientRect();
    const b = controls.getBoundingClientRect();

    // They share this corner; only the vertical offset separates them.
    expect(a.left).toBeLessThan(b.right);
    expect(a.bottom).toBeLessThanOrEqual(b.top);
  });

  it("keeps the panel's close button inside the card on a narrow screen", () => {
    render();
    settleLayout();
    const host = fixture.nativeElement as HTMLElement;

    for (const width of [1200, 560, 420]) {
      host.style.width = `${width}px`;
      fixture.detectChanges();

      const panel = host.querySelector("#designs-panel") as HTMLElement;
      const close = panel.querySelector('button[title="Close"]') as HTMLElement;
      // The card clips overflow, so anything past its right edge is lost.
      expect(close.getBoundingClientRect().right).toBeLessThanOrEqual(
        panel.parentElement!.getBoundingClientRect().right + 0.5
      );
    }
    host.style.width = "";
  });

  it("collapses to give the viewer the full width, and reopens", () => {
    render();

    component.closePanel();
    fixture.detectChanges();

    expect(component.panelWidth()).toBe(0);
    expect(component.isPanelOpen()).toBeFalse();
    expect(divider()).toBeNull();
    const pill = fixture.nativeElement.querySelector(
      "#designs-panel button"
    ) as HTMLButtonElement;
    expect(pill.textContent).toContain("Ranked designs");

    pill.click();
    fixture.detectChanges();
    // null = following the default share.
    expect(component.panelWidth()).toBeNull();
    expect(component.panelStyleWidth()).toBe("60%");
    expect(divider()).not.toBeNull();
  });

  it("rounds the viewer's corner only once the panel is out of the way", () => {
    render();
    expect(viewer()!.roundBottomRight()).toBeFalse();

    component.closePanel();
    fixture.detectChanges();

    expect(viewer()!.roundBottomRight()).toBeTrue();
  });

  it("reports its rendered width before anything drags it", () => {
    render();
    const panel = fixture.nativeElement.querySelector(
      "#designs-panel"
    ) as HTMLElement;

    // The panel follows a share of the container until a drag sets pixels.
    expect(component.panelWidth()).toBeNull();
    expect(divider()!.getAttribute("aria-valuenow")).toBe(
      String(Math.round(panel.offsetWidth))
    );
    expect(divider()!.getAttribute("aria-valuetext")).toBe(
      `${Math.round(panel.offsetWidth)} pixels`
    );
  });

  it("keeps the reported range around the width it reports", () => {
    render();
    divider()!.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 500, bubbles: true })
    );
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 10_000 }));
    document.dispatchEvent(new MouseEvent("mouseup"));
    fixture.detectChanges();

    const now = Number(divider()!.getAttribute("aria-valuenow"));
    const min = Number(divider()!.getAttribute("aria-valuemin"));
    const max = Number(divider()!.getAttribute("aria-valuemax"));

    expect(now).toBe(component.minPanelWidth);
    expect(min).toBeLessThanOrEqual(now);
    expect(max).toBeGreaterThanOrEqual(now);
  });

  it("drops its drag listeners when destroyed mid-drag", () => {
    render();
    divider()!.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 500, bubbles: true })
    );
    const width = component.panelWidth();

    fixture.destroy();
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 200 }));

    expect(component.panelWidth()).toBe(width);
  });

  it("resizes by dragging the divider, within its limits", () => {
    render();

    divider()!.dispatchEvent(
      new MouseEvent("mousedown", { clientX: 500, bubbles: true })
    );
    // The drag starts from the measured width.
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 440 }));
    const widened = component.panelWidth()!;
    expect(widened).toBeGreaterThanOrEqual(component.minPanelWidth);

    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 10_000 }));
    expect(component.panelWidth()).toBe(component.minPanelWidth);

    document.dispatchEvent(new MouseEvent("mousemove", { clientX: -10_000 }));
    expect(component.panelWidth()).toBe(component.maxPanelWidth);

    document.dispatchEvent(new MouseEvent("mouseup"));
    expect(component.isDragging()).toBeFalse();

    // Listeners gone: the panel no longer tracks the pointer.
    const settled = component.panelWidth();
    document.dispatchEvent(new MouseEvent("mousemove", { clientX: 0 }));
    expect(component.panelWidth()).toBe(settled);
  });

  it("resizes from the keyboard too", () => {
    render();

    const press = (key: string) =>
      divider()!.dispatchEvent(
        new KeyboardEvent("keydown", { key, bubbles: true })
      );

    press("ArrowLeft");
    const widened = component.panelWidth()!;
    press("ArrowRight");
    expect(component.panelWidth()!).toBeLessThan(widened);
    press("Home");
    expect(component.panelWidth()).toBe(component.maxPanelWidth);
    press("End");
    expect(component.panelWidth()).toBe(component.minPanelWidth);

    press("Escape");
    expect(component.panelWidth()).toBe(component.minPanelWidth);
  });

  // ── Nothing to show ───────────────────────────────────────────────────────

  it("hands over to the packaged report when the run has no stats file", () => {
    const unavailable = jasmine.createSpy("unavailable");
    fixture = TestBed.createComponent(DeNovoDesignReportComponent);
    component = fixture.componentInstance;
    component.unavailable.subscribe(unavailable);
    fixture.componentRef.setInput("runId", RUN);
    fixture.componentRef.setInput("tool", "BindCraft");
    fixture.componentRef.setInput("files", [files[1]]);
    fixture.detectChanges();

    expect(unavailable).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain(
      "_final_design_stats.csv"
    );
  });

  it("hands over for a de novo tool no adapter is registered for", () => {
    const unavailable = jasmine.createSpy("unavailable");
    fixture = TestBed.createComponent(DeNovoDesignReportComponent);
    component = fixture.componentInstance;
    component.unavailable.subscribe(unavailable);
    fixture.componentRef.setInput("runId", RUN);
    fixture.componentRef.setInput("tool", "BoltzGen");
    fixture.componentRef.setInput("files", files);
    fixture.detectChanges();

    // No adapter, so nothing is even looked for.
    expect(component.adapter()).toBeNull();
    expect(component.missingResults()).toBeNull();
    expect(unavailable).toHaveBeenCalled();
    expect(resultsService.getResultFileText).not.toHaveBeenCalled();
  });

  it("reports a stats file that could not be read", () => {
    respondWith({});

    render();

    expect(component.resultsError()).toBe(
      "Failed to load the design results file."
    );
    expect(fixture.nativeElement.textContent).toContain(
      "Failed to load the design results file."
    );
  });

  it("reports a stats file with a header and no designs", () => {
    respondWith({ [STATS_KEY]: "Rank,Design\n" });

    render();

    expect(component.resultsError()).toBe(
      "The design results file contains no designs."
    );
  });

  it("reports a structure file that could not be read", () => {
    respondWith({ [STATS_KEY]: statsCsv });

    render();

    expect(component.structureError()).toBe(
      "Failed to load the design structure file."
    );
  });

  it("reports an empty structure file", () => {
    respondWith({
      [STATS_KEY]: statsCsv,
      [`${RANKED}/1_demo-binder_l135_s866737_mpnn3_model1.pdb`]: "   ",
    });

    render();

    expect(component.structureError()).toBe("The structure file is empty.");
  });

  it("reports a structure Mol* itself could not parse", () => {
    render();

    viewer()!.loadError.emit("boom");
    fixture.detectChanges();

    expect(component.structureError()).toBe(
      "Failed to load the design structure file."
    );
  });

  it("ignores a viewer error once the structure is gone", () => {
    respondWith({ [STATS_KEY]: statsCsv });
    render();
    component.structureError.set(null);

    component.onViewerLoadError();

    expect(component.structureError()).toBeNull();
  });

  it("shows the file error instead of the report", () => {
    render({ filesError: "Failed to load files." });

    expect(fixture.nativeElement.textContent).toContain(
      "Failed to load files."
    );
    expect(table()).toBeUndefined();
  });

  it("waits quietly while the file list is still loading", () => {
    const unavailable = jasmine.createSpy("unavailable");
    fixture = TestBed.createComponent(DeNovoDesignReportComponent);
    component = fixture.componentInstance;
    component.unavailable.subscribe(unavailable);
    fixture.componentRef.setInput("runId", RUN);
    fixture.componentRef.setInput("tool", "BindCraft");
    fixture.componentRef.setInput("files", []);
    fixture.componentRef.setInput("filesLoading", true);
    fixture.detectChanges();

    expect(unavailable).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain("Loading designs...");
  });

  // --- RFdiffusion, whose designs live inside one tarball -------------------

  describe("an RFdiffusion run", () => {
    const RFD_CSV = `${RUN}/results/ranked_designs.csv`;
    const RFD_DESIGN = `${RUN}/results/ranked_designs/1_fold_3_seq_0_af2pred.pdb`;

    const rfdFiles: ResultFileRef[] = [
      {
        label: "ranked_designs.csv",
        key: RFD_CSV,
        url: "https://s3.test/ranked_designs.csv?sig=1",
        category: "stats_csv",
      },
      {
        label: "1_fold_3_seq_0_af2pred.pdb",
        key: RFD_DESIGN,
        url: "https://s3.test/1.pdb?sig=1",
        category: "pdb",
      },
    ];

    // Columns as the real ranked_designs.csv writes them.
    const rfdCsv =
      "rank,description,fold_id,seq_id,af2_pae_interaction," +
      "af2_plddt_overall,af2_plddt_binder,seq_length,sequence\n" +
      "1,fold_3_seq_0_af2pred,3,0,27.06,91.3,87.18,10,GEMGVHDFLL\n" +
      "2,fold_0_seq_1_af2pred,0,1,27.15,88.1,72.52,10,GVMSVYDFLL\n";

    const renderRfd = () => {
      respondWith({ [RFD_CSV]: rfdCsv, [RFD_DESIGN]: PDB });
      render({ tool: "RFdiffusion", files: rfdFiles });
    };

    it("builds the table from the ranked designs csv", () => {
      renderRfd();

      expect(resultsService.getResultFileText).toHaveBeenCalledWith(
        RUN,
        RFD_CSV
      );
      expect(component.rows().length).toBe(2);
      expect(
        table()!
          .columns()
          .map((column) => column.heading)
      ).toEqual([
        "Rank",
        "pLDDT",
        "pLDDT (Binder)",
        "PAE Interaction",
        "Design Length",
        "Design Sequence",
        "Design name",
      ]);
    });

    it("sets apart chain A, the opposite chain to BindCraft's", () => {
      renderRfd();

      // ProteinDJ diffuses the binder first; BindCraft writes the target first.
      expect(viewer()!.binderChainId()).toBe("A");
      expect(component.chainLegend()[0].label).toBe("Target");
      expect(component.chainLegend()[1].label).toBe("fold_3_seq_0_af2pred");
    });

    it("reads the design's own published file", () => {
      renderRfd();

      // The top-ranked design is selected on load.
      expect(resultsService.getResultFileText).toHaveBeenCalledWith(
        RUN,
        RFD_DESIGN
      );
      expect(viewer()!.structureSource()?.content).toContain("ATOM");
    });

    it("still shows the table when no design file was published", () => {
      respondWith({ [RFD_CSV]: rfdCsv });
      render({ tool: "RFdiffusion", files: [rfdFiles[0]] });

      expect(component.rows().length).toBe(2);
      expect(component.resultsError()).toBeNull();
      expect(component.selectedRow()?.structure).toBeNull();
      expect(fixture.nativeElement.textContent).toContain(
        "No structure file was found for this design."
      );
    });

    it("names the ranked csv when the run never produced one", () => {
      const unavailable = jasmine.createSpy("unavailable");
      respondWith({});
      fixture = TestBed.createComponent(DeNovoDesignReportComponent);
      component = fixture.componentInstance;
      component.unavailable.subscribe(unavailable);
      fixture.componentRef.setInput("runId", RUN);
      fixture.componentRef.setInput("tool", "RFdiffusion");
      fixture.componentRef.setInput("files", []);
      fixture.detectChanges();

      expect(component.missingResults()).toBe("ranked_designs.csv");
      expect(unavailable).toHaveBeenCalled();
    });
  });
});
