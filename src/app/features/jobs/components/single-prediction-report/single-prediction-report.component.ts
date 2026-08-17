import {
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from "@angular/core";
import type { WritableSignal } from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { EMPTY, Observable, catchError, finalize } from "rxjs";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowPath,
  heroExclamationCircle,
  heroLifebuoy,
} from "@ng-icons/heroicons/outline";
import {
  MolstarViewerComponent,
  StructureSource,
} from "../../../workflows/components/molstar-viewer/molstar-viewer.component";
import { ChainMatrixComponent } from "../chain-matrix/chain-matrix.component";
import { MsaCoverageComponent } from "../msa-coverage/msa-coverage.component";
import { PaeMatrixComponent } from "../pae-matrix/pae-matrix.component";
import { LoadingComponent } from "../../../../components/loading/loading.component";
import { TooltipComponent } from "../../../../components/tooltip/tooltip.component";
import { ResultsService } from "../../services/results.service";
import {
  ChainPairScore,
  MsaCoverage,
  PaeMatrix,
  PredictionMetric,
  ResidueRef,
  ResultFileRef,
  buildChainPairMatrix,
  countStructureTokens,
  findChainwiseArtifact,
  findMetricArtifact,
  findMsaArtifact,
  findPaeArtifact,
  findStructureArtifact,
  parseChainPairScores,
  parseModelScore,
  parseMsaCoverage,
  parsePaeMatrix,
  residueIndicesToTokens,
} from "../../shared/prediction-results.utils";

/** The predicted structure beside its PAE matrix, sharing one residue selection. */
@Component({
  selector: "app-single-prediction-report",
  imports: [
    MolstarViewerComponent,
    PaeMatrixComponent,
    MsaCoverageComponent,
    ChainMatrixComponent,
    LoadingComponent,
    TooltipComponent,
    NgIconComponent,
  ],
  providers: [
    provideIcons({ heroArrowPath, heroExclamationCircle, heroLifebuoy }),
  ],
  templateUrl: "./single-prediction-report.component.html",
  styleUrl: "./single-prediction-report.component.scss",
})
export class SinglePredictionReportComponent {
  runId = input.required<string>();
  files = input<readonly ResultFileRef[]>([]);
  filesLoading = input(false);
  filesError = input<string | null>(null);

  private readonly resultsService = inject(ResultsService);
  private readonly destroyRef = inject(DestroyRef);

  readonly structureSource = signal<StructureSource | null>(null);
  readonly structureError = signal<string | null>(null);

  readonly paeMatrix = signal<PaeMatrix | null>(null);
  readonly paeError = signal<string | null>(null);

  /** Outstanding requests, so the report shows one spinner and renders at once. */
  private readonly pendingRequests = signal(0);

  readonly loading = computed(
    () => this.filesLoading() || this.pendingRequests() > 0
  );

  readonly residueIndex = signal<ResidueRef[]>([]);
  /** The viewer reports its index after the structure loads, not before. */
  private readonly indexReported = signal(false);
  readonly selectedIndices = signal<number[]>([]);
  /** Fresh object each request so an identical selection still re-applies. */
  readonly viewerSelectionRequest = signal<{ tokens: string } | null>(null);

  private structureRequest = 0;
  private paeRequest = 0;

  readonly structureArtifact = computed(() =>
    findStructureArtifact(this.files())
  );
  readonly paeArtifact = computed(() => findPaeArtifact(this.files()));
  readonly ptmArtifact = computed(() =>
    findMetricArtifact(this.files(), "ptm")
  );
  readonly iptmArtifact = computed(() =>
    findMetricArtifact(this.files(), "iptm")
  );

  readonly msaArtifact = computed(() => findMsaArtifact(this.files()));
  readonly ipsaeArtifact = computed(() =>
    findChainwiseArtifact(this.files(), "ipsae")
  );
  readonly chainIptmArtifact = computed(() =>
    findChainwiseArtifact(this.files(), "iptm")
  );

  private readonly ptm = signal<number | null>(null);
  private readonly iptm = signal<number | null>(null);

  readonly msaCoverage = signal<MsaCoverage | null>(null);
  readonly msaError = signal<string | null>(null);

  private readonly ipsaeScores = signal<ChainPairScore[]>([]);
  private readonly chainIptmScores = signal<ChainPairScore[]>([]);

  readonly ipsaeMatrix = computed(() =>
    buildChainPairMatrix(this.ipsaeScores())
  );
  readonly chainIptmMatrix = computed(() =>
    buildChainPairMatrix(this.chainIptmScores())
  );
  readonly hasIpsaeMatrix = computed(
    () => this.ipsaeMatrix().chains.length > 0
  );
  readonly hasChainIptmMatrix = computed(
    () => this.chainIptmMatrix().chains.length > 0
  );
  readonly hasInterfaceMatrices = computed(
    () => this.hasIpsaeMatrix() || this.hasChainIptmMatrix()
  );

  /** Global confidence scores; ipTM only exists for multimers. */
  readonly scores = computed(() => {
    const items: Array<{ label: string; value: string; hint: string }> = [];
    const ptm = this.ptm();
    const iptm = this.iptm();
    if (iptm !== null) {
      items.push({
        label: "ipTM",
        value: iptm.toFixed(3),
        hint: "Predicted TM-score across the chain interfaces (0–1, higher is better)",
      });
    }
    if (ptm !== null) {
      items.push({
        label: "pTM",
        value: ptm.toFixed(3),
        hint: "Predicted TM-score for the structure as a whole (0–1, higher is better)",
      });
    }
    return items;
  });

  /** One tooltip for every score; it renders pre-line, so blank lines separate them. */
  readonly scoresHint = computed(() =>
    this.scores()
      .map((score) => `${score.label}: ${score.hint}`)
      .join("\n\n")
  );

  /** Tooltip instructions */
  readonly viewerHelp = [
    "To move around:",
    "- Scroll up/down to zoom in and out",
    "- Click & drag to rotate the structure",
    "- CTRL + click & drag to move the structure",
    "- Click a residue to centre and zoom in on it",
    "- SHIFT + scroll to slice through the front of the structure",
    "- Use the button above to reset the view",
    "",
    "To make a selection:",
    "- Drag a block on the PAE matrix to select those residues",
    "- The rest of the structure is greyed out while a block is selected",
    "- Clear the selection with the (×) button in the corner of the block",
  ].join("\n");

  /** Hexes taken from Mol*'s plddt-confidence theme, so the legend cannot drift. */
  readonly plddtLegend = [
    { label: "Very high", range: "pLDDT > 90", color: "#0053d6" },
    { label: "High", range: "90 > pLDDT > 70", color: "#65cbf3" },
    { label: "Low", range: "70 > pLDDT > 50", color: "#ffdb13" },
    { label: "Very low", range: "pLDDT < 50", color: "#ff7d45" },
  ];

  /** Hands the page over to the packaged report. A missing score does not count. */
  unavailable = output<void>();

  readonly coreUnavailable = computed(
    () =>
      !this.loading() &&
      (!!this.filesError() ||
        this.missingArtifacts().length > 0 ||
        !!this.structureError() ||
        !!this.paeError() ||
        this.tokenMismatch())
  );

  /**
   * The matrix and structure have different token counts, which would offset labels
   * and highlights. Use the structure count while loading, with the viewer index as
   * a backstop.
   */
  readonly tokenMismatch = computed(() => {
    const matrix = this.paeMatrix();
    if (!matrix) return false;

    const counted = this.expectedTokens();
    if (counted !== null && counted !== matrix.size) return true;

    return this.indexReported() && this.residueIndex().length !== matrix.size;
  });

  /** Rows implied by the structure, or null if they can't be counted. */
  private readonly expectedTokens = computed(() => {
    const source = this.structureSource();
    return source ? countStructureTokens(source.content, source.format) : null;
  });

  readonly missingArtifacts = computed(() => {
    if (this.filesLoading() || this.filesError()) return [];
    const missing: string[] = [];
    if (!this.structureArtifact()) missing.push("a structure file (.cif/.pdb)");
    if (!this.paeArtifact()) missing.push("a PAE matrix (*_pae_0.tsv)");
    return missing;
  });

  constructor() {
    effect(() => {
      if (this.coreUnavailable()) this.unavailable.emit();
    });

    effect(() => {
      const runId = this.runId();
      const artifact = this.structureArtifact();
      if (!artifact) {
        this.structureSource.set(null);
        this.structureError.set(null);
        return;
      }
      this.loadStructure(runId, artifact.key, artifact.format, artifact.label);
    });

    effect(() => {
      const runId = this.runId();
      const artifact = this.paeArtifact();
      if (!artifact) {
        this.paeMatrix.set(null);
        this.paeError.set(null);
        return;
      }
      this.loadPae(runId, artifact.key);
    });

    effect(() => {
      const runId = this.runId();
      const artifact = this.ptmArtifact();
      this.ptm.set(null);
      if (artifact) this.loadScore(runId, artifact.key, "ptm");
    });

    effect(() => {
      const runId = this.runId();
      const artifact = this.iptmArtifact();
      this.iptm.set(null);
      if (artifact) this.loadScore(runId, artifact.key, "iptm");
    });

    effect(() => {
      const runId = this.runId();
      const artifact = this.msaArtifact();
      if (!artifact) {
        this.msaCoverage.set(null);
        this.msaError.set(null);
        return;
      }
      this.loadMsa(runId, artifact.key);
    });

    effect(() => {
      const runId = this.runId();
      const artifact = this.ipsaeArtifact();
      this.ipsaeScores.set([]);
      if (artifact) {
        this.loadChainPairScores(runId, artifact.key, this.ipsaeScores, () =>
          this.ipsaeArtifact()
        );
      }
    });

    effect(() => {
      const runId = this.runId();
      const artifact = this.chainIptmArtifact();
      this.chainIptmScores.set([]);
      if (artifact) {
        this.loadChainPairScores(
          runId,
          artifact.key,
          this.chainIptmScores,
          () => this.chainIptmArtifact()
        );
      }
    });
  }

  // ── Selection wiring ──────────────────────────────────────────────────────

  onMatrixSelectionChange(indices: number[]): void {
    this.selectedIndices.set(indices);
    this.viewerSelectionRequest.set({
      tokens: residueIndicesToTokens(indices, this.residueIndex()).join(","),
    });
  }

  onResidueIndexDetected(residues: ResidueRef[]): void {
    this.residueIndex.set(residues);
    this.indexReported.set(true);
  }

  /**
   * Mol*'s message names a parser internal, so report it as a load failure.
   * Ignored once the source is gone: a superseded load must not condemn its
   * replacement.
   */
  onViewerLoadError(): void {
    if (!this.structureSource()) return;
    this.structureError.set("Failed to load the predicted structure file.");
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  /** `finalize` covers success, failure and unsubscribe, so the count cannot stick. */
  private fetchText(runId: string, key: string): Observable<string> {
    this.pendingRequests.update((count) => count + 1);
    return this.resultsService.getResultFileText(runId, key).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.pendingRequests.update((count) => count - 1))
    );
  }

  private loadStructure(
    runId: string,
    key: string,
    format: StructureSource["format"],
    label: string
  ): void {
    const request = ++this.structureRequest;
    this.structureError.set(null);
    this.structureSource.set(null);
    this.residueIndex.set([]);
    this.indexReported.set(false);

    this.fetchText(runId, key)
      .pipe(
        catchError((err) => {
          console.error("Error loading structure file:", err);
          if (request === this.structureRequest) {
            this.structureError.set(
              "Failed to load the predicted structure file."
            );
          }
          return EMPTY;
        })
      )
      .subscribe((content) => {
        if (request !== this.structureRequest) return;
        if (!content.trim()) {
          this.structureError.set("The structure file is empty.");
          return;
        }
        this.structureSource.set({ content, format, label });
      });
  }

  private loadMsa(runId: string, key: string): void {
    this.msaError.set(null);
    this.msaCoverage.set(null);

    this.fetchText(runId, key)
      .pipe(
        catchError((err) => {
          console.error("Error loading the MSA:", err);
          if (this.msaArtifact()?.key === key) {
            this.msaError.set("Failed to load the alignment file.");
          }
          return EMPTY;
        })
      )
      .subscribe((content) => {
        if (this.msaArtifact()?.key !== key) return;
        try {
          this.msaCoverage.set(parseMsaCoverage(content));
        } catch (err) {
          this.msaError.set(
            err instanceof Error ? err.message : "Could not read the alignment."
          );
        }
      });
  }

  /** The chain-pair tables are supplementary: a failure just omits one. */
  private loadChainPairScores(
    runId: string,
    key: string,
    target: WritableSignal<ChainPairScore[]>,
    current: () => ResultFileRef | null
  ): void {
    this.fetchText(runId, key)
      .pipe(
        catchError((err) => {
          console.warn(`Could not load per-chain scores from ${key}:`, err);
          return EMPTY;
        })
      )
      .subscribe((content) => {
        // Ignore a response for an artifact we have since moved off.
        if (current()?.key !== key) return;
        target.set(parseChainPairScores(content));
      });
  }

  /** Scores are supplementary: a failure omits the value rather than erroring. */
  private loadScore(
    runId: string,
    key: string,
    metric: PredictionMetric
  ): void {
    const target = metric === "ptm" ? this.ptm : this.iptm;

    this.fetchText(runId, key)
      .pipe(
        catchError((err) => {
          console.warn(`Could not load the ${metric} score:`, err);
          return EMPTY;
        })
      )
      .subscribe((content) => {
        const current =
          metric === "ptm" ? this.ptmArtifact() : this.iptmArtifact();
        // Ignore a response for an artifact we have since moved off.
        if (current?.key !== key) return;
        target.set(parseModelScore(content));
      });
  }

  private loadPae(runId: string, key: string): void {
    const request = ++this.paeRequest;
    this.paeError.set(null);
    this.paeMatrix.set(null);

    this.fetchText(runId, key)
      .pipe(
        catchError((err) => {
          console.error("Error loading PAE matrix:", err);
          if (request === this.paeRequest) {
            this.paeError.set("Failed to load the PAE matrix file.");
          }
          return EMPTY;
        })
      )
      .subscribe((content) => {
        if (request !== this.paeRequest) return;
        try {
          this.paeMatrix.set(parsePaeMatrix(content));
        } catch (err) {
          this.paeError.set(
            err instanceof Error
              ? err.message
              : "Could not read the PAE matrix."
          );
        }
      });
  }
}
