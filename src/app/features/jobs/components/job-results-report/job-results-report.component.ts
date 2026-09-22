import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
import type { WritableSignal } from "@angular/core";
import { DOCUMENT } from "@angular/common";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import {
  EMPTY,
  Subscription,
  catchError,
  finalize,
  forkJoin,
  map,
  of,
} from "rxjs";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowPath,
  heroChevronDoubleLeft,
  heroEllipsisVertical,
  heroExclamationCircle,
  heroLifebuoy,
  heroXMark,
} from "@ng-icons/heroicons/outline";
import {
  BINDER_COLOR,
  MolstarViewerComponent,
  StructureSource,
  TARGET_COLOR,
} from "../../../workflows/components/molstar-viewer/molstar-viewer.component";
import { JobResultsTableComponent } from "../job-results-table/job-results-table.component";
import { PlddtLegendComponent } from "../plddt-legend/plddt-legend.component";
import { LoadingComponent } from "../../../../components/loading/loading.component";
import { TooltipComponent } from "../../../../components/tooltip/tooltip.component";
import { ResultsService } from "../../services/results.service";
import { ResultFileRef } from "../../shared/prediction-results.utils";
import {
  ReportRow,
  ReportSources,
  getJobResultsAdapter,
} from "../../shared/job-results-report.utils";
import "../../shared/bindcraft-results.utils";
import "../../shared/rfdiffusion-results.utils";
import "../../shared/interaction-screening-results.utils";
import "../../shared/bulk-prediction-results.utils";

@Component({
  selector: "app-job-results-report",
  imports: [
    MolstarViewerComponent,
    JobResultsTableComponent,
    PlddtLegendComponent,
    LoadingComponent,
    TooltipComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({
      heroArrowPath,
      heroChevronDoubleLeft,
      heroEllipsisVertical,
      heroExclamationCircle,
      heroLifebuoy,
      heroXMark,
    }),
  ],
  templateUrl: "./job-results-report.component.html",
  styleUrl: "./job-results-report.component.scss",
})
export class JobResultsReportComponent {
  runId = input.required<string>();
  /** Normalised workflow name; picks the adapter together with `tool`. */
  workflow = input<string>("");
  tool = input<string>("");
  files = input<readonly ResultFileRef[]>([]);
  filesLoading = input(false);
  filesError = input<string | null>(null);

  /** Falls back to the packaged report when nothing can be shown. */
  unavailable = output<void>();

  private readonly resultsService = inject(ResultsService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  readonly adapter = computed(() =>
    getJobResultsAdapter(this.workflow(), this.tool())
  );

  readonly rows = signal<ReportRow[]>([]);
  /** A stats file that loaded fine but ranked nothing: not an error. */
  readonly resultsEmpty = signal(false);
  readonly resultsError = signal<string | null>(null);

  /** Kept so an adapter that varies its columns can read the file again. */
  private readonly resultsText = signal<string | null>(null);
  private readonly resultsSources = signal<ReportSources>({});

  readonly columns = computed(() => {
    const adapter = this.adapter();
    if (!adapter) return [];
    const text = this.resultsText();
    return text !== null && adapter.columnsFor
      ? adapter.columnsFor(text, this.resultsSources())
      : adapter.columns;
  });

  readonly selectedId = signal<string | null>(null);
  readonly structureSource = signal<StructureSource | null>(null);
  readonly structureError = signal<string | null>(null);

  private readonly resultsLoading = signal(false);
  readonly structureLoading = signal(false);

  readonly loading = computed(
    () => this.filesLoading() || this.resultsLoading()
  );

  private resultsFetch: Subscription | null = null;
  private structureFetch: Subscription | null = null;

  readonly resultsArtifact = computed(
    () => this.adapter()?.findResultsArtifact(this.files()) ?? null
  );

  /** A second file joined onto the rows, for adapters that need one. */
  readonly extraArtifact = computed(
    () => this.adapter()?.findExtraArtifact?.(this.files()) ?? null
  );

  readonly selectedRow = computed(
    () => this.rows().find((row) => row.id === this.selectedId()) ?? null
  );

  /** The chain the pipeline usually writes the highlighted molecule to. */
  readonly primaryChainId = computed(
    () => this.adapter()?.primaryChainId ?? "A"
  );

  /** Confirms that chain when exactly one chain is this long. */
  readonly primaryLength = computed(() => {
    const key = this.adapter()?.primaryLengthKey;
    const raw = key ? (this.selectedRow()?.values[key] ?? "").trim() : "";
    const length = Number(raw);
    return raw && Number.isFinite(length) ? length : null;
  });

  /** Rows of one run line up on each other; a new run starts over. Empty
   *  where the adapter's rows share nothing to superpose on. */
  readonly superposeKey = computed(() =>
    this.adapter()?.superpose && this.resultsArtifact() ? this.runId() : ""
  );

  /** Null until the files have loaded, so no message flashes. */
  readonly missingResults = computed(() => {
    if (this.filesLoading() || this.filesError() || !this.adapter())
      return null;
    return this.resultsArtifact() ? null : this.adapter()!.resultsFileName;
  });

  /**
   * A workflow only writes its ranked rows and their stats once at least one
   * survives filtering, so a missing artifact and an empty stats file both mean
   * the same thing: nothing passed, not that something is broken.
   */
  readonly noResultsAvailable = computed(
    () => !!this.missingResults() || this.resultsEmpty()
  );

  readonly emptyMessage = computed(
    () =>
      this.adapter()?.emptyMessage ?? "No results are available for this run."
  );

  readonly coreUnavailable = computed(
    () =>
      !this.loading() &&
      (!!this.filesError() || !this.adapter() || !!this.resultsError())
  );

  // The designs table panel
  readonly viewerSharePercent = 40;
  readonly minPanelWidth = 360;
  readonly maxPanelWidth = 1200;
  private readonly keyboardResizeStep = 24;

  private readonly panelElement =
    viewChild<ElementRef<HTMLElement>>("reportPanel");

  /** Width in pixels, 0 is collapsed, null follows the default share. */
  readonly panelWidth = signal<number | null>(null);
  readonly isDragging = signal(false);

  /** The rendered width, tracked so the separator can report a share. */
  private readonly measuredPanelWidth = signal(0);

  /** What the separator reports: the dragged width, or the rendered share. */
  readonly panelWidthNow = computed(() => {
    const dragged = this.panelWidth();
    if (dragged !== null) return dragged;
    // Before the first measurement the lower bound is the honest answer.
    return this.measuredPanelWidth() || this.minPanelWidth;
  });

  /** The reported range has to contain the reported width. */
  readonly panelWidthRange = computed(() => ({
    min: Math.min(this.minPanelWidth, this.panelWidthNow()),
    max: Math.max(this.maxPanelWidth, this.panelWidthNow()),
  }));

  readonly panelWidthText = computed(() => `${this.panelWidthNow()} pixels`);

  readonly panelTitle = computed(
    () => this.adapter()?.panelHeading ?? "Results"
  );

  readonly panelHeading = computed(() => {
    const count = this.rows().length;
    const title = this.panelTitle();
    return count ? `${title} (${count})` : title;
  });

  readonly isPanelOpen = computed(() => this.panelWidth() !== 0);

  readonly panelStyleWidth = computed(() => {
    const width = this.panelWidth();
    return width === null ? `${100 - this.viewerSharePercent}%` : `${width}px`;
  });

  private currentPanelWidth(): number {
    return (
      this.panelWidth() ??
      this.panelElement()?.nativeElement.offsetWidth ??
      this.minPanelWidth
    );
  }

  private dragStartX = 0;
  private dragStartPanelWidth = 0;

  readonly colorTheme = computed(
    () => this.adapter()?.colorTheme ?? "binder-target"
  );

  readonly showPlddtLegend = computed(() => this.colorTheme() === "plddt");

  readonly chainLegend = computed(() =>
    (this.adapter()?.legend ?? []).map((band) => ({
      // A band without a label of its own takes the selected row's.
      label: band.label ?? this.selectedRow()?.label ?? "",
      color: band.band === "primary" ? BINDER_COLOR : TARGET_COLOR,
    }))
  );

  /** Tooltip instructions. */
  readonly viewerHelp = [
    "To move around:",
    "- Scroll up/down to zoom in and out",
    "- Click & drag to rotate the structure",
    "- CTRL + click & drag to move the structure",
    "- SHIFT + scroll to slice through the front of the structure",
    "- Use the button above to reset the view",
    "",
    "Select a row in the table below to show that structure here.",
  ].join("\n");

  constructor() {
    effect(() => {
      if (this.coreUnavailable()) this.unavailable.emit();
    });

    effect(() => {
      const runId = this.runId();
      const adapter = this.adapter();
      const artifact = this.resultsArtifact();
      if (!adapter || !artifact) {
        this.cancelResultsFetch();
        this.rows.set([]);
        this.resultsText.set(null);
        this.selectedId.set(null);
        this.resultsError.set(null);
        this.resultsEmpty.set(false);
        return;
      }
      this.loadResults(runId, artifact.key, this.extraArtifact()?.key ?? null);
    });

    effect(() => {
      const runId = this.runId();
      const structure = this.selectedRow()?.structure ?? null;
      if (!structure) {
        // Not an error: the run simply has no file for this row.
        this.cancelStructureFetch();
        this.structureSource.set(null);
        this.structureError.set(null);
        return;
      }
      this.loadStructure(
        runId,
        structure.key,
        structure.format,
        structure.label
      );
    });

    // The separator has to report a width before any drag sets one, and has
    // to keep reporting the right one as the container resizes under it.
    effect((onCleanup) => {
      const element = this.panelElement()?.nativeElement;
      if (!element) return;

      this.measuredPanelWidth.set(Math.round(element.offsetWidth));
      if (typeof ResizeObserver === "undefined") return;

      const observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        // Not laid out, or collapsed: keep the last width worth reporting.
        if (width > 0) this.measuredPanelWidth.set(Math.round(width));
      });
      observer.observe(element);
      onCleanup(() => observer.disconnect());
    });

    // Navigating away mid-drag would otherwise leave both listeners attached.
    this.destroyRef.onDestroy(() => this.releaseDragListeners());
  }

  onRowSelected(row: ReportRow): void {
    this.selectedId.set(row.id);
  }

  // ── Designs panel ─────────────────────────────────────────────────────────

  /** Back to the default share, not the last dragged width. */
  openPanel(): void {
    this.panelWidth.set(null);
  }

  closePanel(): void {
    this.panelWidth.set(0);
  }

  private clampPanelWidth(width: number): number {
    return Math.max(this.minPanelWidth, Math.min(this.maxPanelWidth, width));
  }

  onDividerMouseDown(event: MouseEvent): void {
    if (!this.isPanelOpen()) return;
    this.isDragging.set(true);
    this.dragStartX = event.clientX;

    this.dragStartPanelWidth = this.currentPanelWidth();
    event.preventDefault();

    this.document.addEventListener("mousemove", this.onDocumentMouseMove);
    this.document.addEventListener("mouseup", this.onDocumentMouseUp);
  }

  private readonly onDocumentMouseMove = (event: MouseEvent): void => {
    const delta = this.dragStartX - event.clientX;
    this.panelWidth.set(this.clampPanelWidth(this.dragStartPanelWidth + delta));
  };

  private readonly onDocumentMouseUp = (): void => {
    this.isDragging.set(false);
    this.releaseDragListeners();
  };

  private releaseDragListeners(): void {
    this.document.removeEventListener("mousemove", this.onDocumentMouseMove);
    this.document.removeEventListener("mouseup", this.onDocumentMouseUp);
  }

  onDividerKeydown(event: KeyboardEvent): void {
    if (!this.isPanelOpen()) return;
    const current = this.currentPanelWidth();
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = current + this.keyboardResizeStep;
        break;
      case "ArrowRight":
        next = current - this.keyboardResizeStep;
        break;
      case "Home":
        next = this.maxPanelWidth;
        break;
      case "End":
        next = this.minPanelWidth;
        break;
      default:
        return;
    }
    event.preventDefault();
    this.panelWidth.set(this.clampPanelWidth(next));
  }

  onViewerLoadError(): void {
    if (!this.structureSource()) return;
    this.structureError.set("Failed to load the structure file.");
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  /**
   * `finalize` covers every outcome, cancellation included, so the flag cannot
   * stick. Only one fetch per flag may be live at a time — see the callers.
   */
  private fetchFlagged(
    runId: string,
    key: string,
    busy: WritableSignal<boolean>
  ) {
    busy.set(true);
    return this.resultsService.getResultFileText(runId, key).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => busy.set(false))
    );
  }

  /** Drop an in-flight fetch, so neither its flag nor its body can land. */
  private cancelResultsFetch(): void {
    this.resultsFetch?.unsubscribe();
    this.resultsFetch = null;
  }

  private cancelStructureFetch(): void {
    this.structureFetch?.unsubscribe();
    this.structureFetch = null;
  }

  private loadResults(
    runId: string,
    key: string,
    extraKey: string | null
  ): void {
    this.cancelResultsFetch();
    this.resultsError.set(null);
    this.resultsEmpty.set(false);
    this.rows.set([]);
    this.resultsText.set(null);
    this.resultsSources.set({});
    this.selectedId.set(null);

    // The joined file is optional: a run that never wrote one still renders,
    // just without the columns it would have filled.
    const extra$ = extraKey
      ? this.resultsService.getResultFileText(runId, extraKey).pipe(
          catchError((err) => {
            console.warn("Could not read the joined results file:", err);
            return of(null);
          })
        )
      : of(null);

    // Some adapters cannot read their outputs without the original inputs. The
    // form goes in the same batch, so the rows are parsed once, with everything.
    const submitted$ = this.adapter()?.needsSubmittedInputs
      ? this.resultsService.getJobSettingParams(runId).pipe(
          map((response) => this.readSubmittedFasta(response.settingParams)),
          catchError((err) => {
            console.warn("Could not read the submitted form:", err);
            return of(null);
          })
        )
      : of(null);

    this.resultsLoading.set(true);
    this.resultsFetch = forkJoin([
      this.resultsService.getResultFileText(runId, key),
      extra$,
      submitted$,
    ])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.resultsLoading.set(false)),
        catchError((err) => {
          console.error("Error loading results:", err);
          this.resultsError.set("Failed to load the results file.");
          return EMPTY;
        })
      )
      .subscribe(([content, extraText, submittedFasta]) => {
        const sources: ReportSources = { extraText, submittedFasta };
        const rows =
          this.adapter()?.parseRows(content, this.files(), sources) ?? [];
        if (rows.length === 0) {
          this.resultsEmpty.set(true);
          return;
        }
        this.resultsText.set(content);
        this.resultsSources.set(sources);
        this.rows.set(rows);
        // Show the top-ranked row first.
        this.selectedId.set(rows[0].id);
      });
  }

  /** The FASTA the run was submitted with, if the form still carries it. */
  private readSubmittedFasta(
    settingParams: Record<string, unknown> | null | undefined
  ): string | null {
    const value = settingParams?.["fastaContent"];
    return typeof value === "string" && value.trim() ? value : null;
  }

  private loadStructure(
    runId: string,
    key: string,
    format: StructureSource["format"],
    label: string
  ): void {
    this.cancelStructureFetch();
    this.structureError.set(null);
    this.structureSource.set(null);

    this.structureFetch = this.fetchFlagged(runId, key, this.structureLoading)
      .pipe(
        catchError((err) => {
          console.error("Error loading structure file:", err);
          this.structureError.set("Failed to load the structure file.");
          return EMPTY;
        })
      )
      .subscribe((content) => {
        if (!content.trim()) {
          this.structureError.set("The structure file is empty.");
          return;
        }
        this.structureSource.set({ content, format, label });
      });
  }
}
