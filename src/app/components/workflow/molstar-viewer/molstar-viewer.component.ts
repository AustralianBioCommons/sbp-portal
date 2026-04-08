import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";

/** Minimal typings for the Mol* CDN viewer (window.molstar). */
interface MolstarGlobal {
  Viewer: {
    create(
      containerId: string,
      options?: Record<string, unknown>
    ): Promise<MolstarViewerInstance>;
  };
}

interface MolstarViewerInstance {
  loadStructureFromData(
    data: string,
    format: string,
    isBinary?: boolean,
    options?: Record<string, unknown>
  ): Promise<void>;
  clear(): Promise<void>;
  plugin: Record<string, unknown>;
}

declare global {
  interface Window {
    molstar?: MolstarGlobal;
  }
}

const MOLSTAR_CSS =
  "https://cdn.jsdelivr.net/npm/molstar@4/build/viewer/molstar.css";
const MOLSTAR_JS =
  "https://cdn.jsdelivr.net/npm/molstar@4/build/viewer/molstar.js";

@Component({
  selector: "app-molstar-viewer",
  standalone: true,
  imports: [CommonModule],
  styles: [
    `
      :host {
        display: block;
      }
      .molstar-wrap {
        position: relative;
        width: 100%;
        height: 520px;
        min-height: 520px;
        overflow: hidden;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        background: #1e1e2e;
      }
      /* hide right panel to save space */
      .molstar-wrap :global(.msp-layout-region-right) {
        display: none !important;
      }
    `,
  ],
  template: `
    <div class="space-y-2">
      <h4 class="text-sm font-medium text-gray-700">Target Structure Preview</h4>

      <!-- Idle placeholder (no file selected yet) -->
      @if (status() === 'idle') {
        <div class="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center">
          <svg class="h-10 w-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
              d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 10V11" />
          </svg>
          <p class="text-sm text-gray-400">Load a <code class="rounded bg-gray-100 px-1 py-0.5 text-xs">.pdb</code> file to preview the structure here</p>
          <label
            class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
            [class.cursor-pointer]="!disabled"
            [class.opacity-50]="disabled"
            [class.pointer-events-none]="disabled"
          >
            <svg class="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Choose .pdb file
            <input type="file" class="sr-only" accept=".pdb" [disabled]="disabled" (change)="onFileInputChange($event)" />
          </label>
        </div>
      }

      <!-- Loading state -->
      @if (status() === 'loading') {
        <div class="flex items-center gap-2 text-sm text-gray-500 py-2">
          <svg class="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Loading structure…
        </div>
      }

      <!-- Error state -->
      @if (status() === 'error') {
        <div class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3">
          <svg class="mt-0.5 h-4 w-4 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clip-rule="evenodd" />
          </svg>
          <p class="text-sm text-red-700">{{ errorMessage() }}</p>
        </div>
      }

      <!-- Viewer container (always present so mol* can attach) -->
      <div
        [id]="containerId"
        class="molstar-wrap"
        [class.hidden]="status() === 'idle' || status() === 'loading' || status() === 'error'"
      ></div>

      <!-- Selection bar (shown when residues are picked) -->
      @if (status() === 'loaded') {
        <div class="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm">
          <p class="font-medium text-blue-800">
            Hotspot residue selection
          </p>
          @if (selectedResidues().length > 0) {
            <p class="mt-1 text-blue-700 font-mono break-all">
              {{ selectedResidues().join(',') }}
            </p>
            <button
              type="button"
              class="mt-2 text-xs text-blue-600 underline hover:text-blue-800"
              (click)="clearSelection()"
            >
              Clear selection
            </button>
          } @else {
            <p class="mt-1 text-blue-600">
              Click residues in the viewer to add them as hotspots.
              Hold <kbd class="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs">Shift</kbd>
              to add to the selection; click empty space to deselect.
            </p>
          }
        </div>
      }
    </div>
  `,
})
export class MolstarViewerComponent
  implements AfterViewInit, OnChanges, OnDestroy
{
  @Input() pdbFile: File | null = null;
  /** Emits a comma-separated residue string (e.g. "A42,A43,B11") on each selection change. */
  @Output() residuesSelected = new EventEmitter<string>();
  /** Disables the file picker embedded in the idle placeholder. */
  @Input() disabled = false;
  /** Emits the chosen File when the user picks one from the idle placeholder. */
  @Output() filePicked = new EventEmitter<File>();

  readonly status = signal<"idle" | "loading" | "loaded" | "error">("idle");
  readonly errorMessage = signal("");
  readonly selectedResidues = signal<string[]>([]);

  private viewer: MolstarViewerInstance | null = null;
  /** Subscription handle returned by mol*'s selection event. */
  private selectionSub: { unsubscribe(): void } | null = null;

  private static instanceCount = 0;
  readonly containerId = `molstar-viewer-${++MolstarViewerComponent.instanceCount}`;

  /** Shared promise so the CDN assets are only loaded once per page. */
  private static cdnLoadPromise: Promise<void> | null = null;

  // ── File input (idle placeholder) ────────────────────────────────────────

  onFileInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      this.filePicked.emit(file);
      // Reset so the same file can be re-picked after an external clear.
      input.value = '';
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  ngAfterViewInit(): void {
    if (this.pdbFile) {
      void this.loadFile(this.pdbFile);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes["pdbFile"] || changes["pdbFile"].isFirstChange()) return;
    if (this.pdbFile) {
      void this.loadFile(this.pdbFile);
    } else {
      this.clearViewer();
    }
  }

  ngOnDestroy(): void {
    this.cleanupSubscription();
    void this.viewer?.clear();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  clearSelection(): void {
    try {
      // Ask mol* to deselect everything
      const plugin = this.viewer?.plugin as Record<string, unknown> | undefined;
      const mgr = (
        plugin?.["managers"] as Record<string, unknown> | undefined
      )?.["structure"] as Record<string, unknown> | undefined;
      const sel = mgr?.["selection"] as
        | Record<string, unknown>
        | undefined;
      if (typeof sel?.["clear"] === "function") {
        (sel["clear"] as () => void)();
      }
    } catch {
      // swallow — best-effort
    }
    this.selectedResidues.set([]);
    this.residuesSelected.emit("");
  }

  // ── CDN loading ────────────────────────────────────────────────────────────

  private static loadCdnAssets(): Promise<void> {
    if (window.molstar?.Viewer) return Promise.resolve();
    if (MolstarViewerComponent.cdnLoadPromise) {
      return MolstarViewerComponent.cdnLoadPromise;
    }

    MolstarViewerComponent.cdnLoadPromise = new Promise<void>(
      (resolve, reject) => {
        // CSS (non-blocking)
        if (!document.getElementById("molstar-css")) {
          const link = document.createElement("link");
          link.id = "molstar-css";
          link.rel = "stylesheet";
          link.href = MOLSTAR_CSS;
          document.head.appendChild(link);
        }

        // JS
        if (document.getElementById("molstar-js")) {
          // Already in DOM but maybe still loading
          const existing = document.getElementById(
            "molstar-js"
          ) as HTMLScriptElement;
          if (window.molstar?.Viewer) {
            resolve();
          } else {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener(
              "error",
              () => reject(new Error("Failed to load Mol* viewer script.")),
              { once: true }
            );
          }
          return;
        }

        const script = document.createElement("script");
        script.id = "molstar-js";
        script.src = MOLSTAR_JS;
        script.addEventListener("load", () => resolve(), { once: true });
        script.addEventListener(
          "error",
          () => reject(new Error("Failed to load Mol* viewer script.")),
          { once: true }
        );
        document.head.appendChild(script);
      }
    );

    return MolstarViewerComponent.cdnLoadPromise;
  }

  // ── Viewer management ──────────────────────────────────────────────────────

  private async loadFile(file: File): Promise<void> {
    this.status.set("loading");
    this.errorMessage.set("");
    this.cleanupSubscription();

    try {
      await MolstarViewerComponent.loadCdnAssets();

      if (!window.molstar?.Viewer) {
        throw new Error("Mol* Viewer API not found after loading script.");
      }

      // Create the viewer if it doesn't exist yet
      if (!this.viewer) {
        this.viewer = await window.molstar.Viewer.create(this.containerId, {
          layoutIsExpanded: false,
          layoutShowControls: true,
          layoutShowSequence: true,
          layoutShowRemoteState: false,
          layoutShowLeftPanel: false,
          layoutShowRightPanel: false,
          collapseRightPanel: true,
          layoutShowLog: false,
        });
        this.hookSelection();
        this.preventButtonFormSubmit();
      } else {
        // Clear previous structure
        await this.viewer.clear();
      }

      const content = await file.text();
      await this.viewer.loadStructureFromData(content, "pdb", false, {
        label: file.name,
      });

      this.status.set("loaded");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not render PDB file.";
      this.errorMessage.set(msg);
      this.status.set("error");
    }
  }

  private clearViewer(): void {
    this.cleanupSubscription();
    void this.viewer?.clear();
    this.selectedResidues.set([]);
    this.status.set("idle");
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  private hookSelection(): void {
    if (!this.viewer) return;
    try {
      const plugin = this.viewer.plugin as Record<string, unknown>;
      const selectionMgr = ((plugin["managers"] as Record<string, unknown>)[
        "structure"
      ] as Record<string, unknown>)["selection"] as Record<string, unknown>;

      const events = selectionMgr["events"] as Record<string, unknown>;
      const changed = events["changed"] as {
        subscribe(cb: () => void): { unsubscribe(): void };
      };

      this.selectionSub = changed.subscribe(() => {
        const residues = this.extractSelectedResidues(selectionMgr);
        this.selectedResidues.set(residues);
        this.residuesSelected.emit(residues.join(","));
      });
    } catch {
      // Mol* API mismatch — selection events won't fire, but the viewer
      // still works for visual inspection.
      console.warn(
        "Mol* selection hook unavailable; hotspot auto-fill disabled."
      );
    }
  }

  /**
   * Extracts auth chain + auth_seq_id strings (e.g. "A42") from mol*'s
   * current selection using the atomic hierarchy stored in the model.
   */
  private extractSelectedResidues(
    selMgr: Record<string, unknown>
  ): string[] {
    const seen = new Set<string>();
    try {
      // sel.entries: Map<string, { loci: StructureElement.Loci }>
      const entries = selMgr["entries"] as
        | Map<string, Record<string, unknown>>
        | undefined;

      if (!entries) {
        // Fallback: try getLoci()
        const loci =
          typeof selMgr["getLoci"] === "function"
            ? (selMgr["getLoci"] as () => unknown)()
            : null;
        if (loci) this.visitLoci(loci as Record<string, unknown>, seen);
        return Array.from(seen).sort();
      }

      for (const [, entry] of entries) {
        this.visitLoci(entry["loci"] as Record<string, unknown>, seen);
      }
    } catch {
      // swallow — best-effort extraction
    }
    return Array.from(seen).sort();
  }

  /** Walk a single StructureElement.Loci and collect residue id strings. */
  private visitLoci(
    loci: Record<string, unknown>,
    out: Set<string>
  ): void {
    if (!loci || loci["kind"] !== "element-loci") return;

    const elements = loci["elements"] as Array<{
      unit: Record<string, unknown>;
      indices: unknown;
    }>;
    if (!Array.isArray(elements)) return;

    for (const { unit, indices } of elements) {
      try {
        const model = unit["model"] as Record<string, unknown>;
        const atomicHierarchy = model["atomicHierarchy"] as Record<
          string,
          unknown
        >;
        const residueSegments = atomicHierarchy[
          "residueAtomSegments"
        ] as Record<string, ArrayLike<number>>;
        const chainSegments = atomicHierarchy["chainAtomSegments"] as Record<
          string,
          ArrayLike<number>
        >;
        const residues = atomicHierarchy["residues"] as Record<
          string,
          unknown
        >;
        const chains = atomicHierarchy["chains"] as Record<string, unknown>;
        const unitElements = unit["elements"] as ArrayLike<number>;

        const seqIdCol = (
          (residues["auth_seq_id"] as Record<string, unknown>)["value"] as (
            i: number
          ) => number
        ).bind(residues["auth_seq_id"]);
        const chainIdCol = (
          (chains["auth_asym_id"] as Record<string, unknown>)["value"] as (
            i: number
          ) => string
        ).bind(chains["auth_asym_id"]);

        this.iterateOrderedSet(indices, (unitIdx) => {
          const atomIdx = unitElements[unitIdx];
          const rI = residueSegments["index"][atomIdx];
          const cI = chainSegments["index"][atomIdx];
          const seqId = seqIdCol(rI);
          const chainId = chainIdCol(cI);
          out.add(`${chainId}${seqId}`);
        });
      } catch {
        // skip this element group on any hierarchy mismatch
      }
    }
  }

  /**
   * Iterate over a mol* OrderedSet which is either:
   *   - an Interval `{ min, max }` (exclusive end)
   *   - a SortedArray (TypedArray / ArrayLike<number>)
   */
  private iterateOrderedSet(
    set: unknown,
    cb: (v: number) => void
  ): void {
    if (set === null || set === undefined) return;
    if (ArrayBuffer.isView(set)) {
      const arr = set as unknown as ArrayLike<number>;
      for (let i = 0; i < arr.length; i++) cb(arr[i]);
    } else if (
      typeof (set as Record<string, unknown>)["min"] === "number" &&
      typeof (set as Record<string, unknown>)["max"] === "number"
    ) {
      const { min, max } = set as { min: number; max: number };
      for (let v = min; v < max; v++) cb(v);
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Prevent any <button> inside the viewer from submitting the parent form. */
  private preventButtonFormSubmit(): void {
    const container = document.getElementById(this.containerId);
    if (!container) return;
    container.addEventListener(
      "click",
      (event) => {
        const btn = (event.target as Element | null)?.closest?.("button");
        if (btn && container.contains(btn)) {
          const t = (btn.getAttribute("type") ?? "").toLowerCase();
          if (!t || t === "submit") {
            btn.setAttribute("type", "button");
            event.preventDefault();
          }
        }
      },
      true
    );
  }

  private cleanupSubscription(): void {
    this.selectionSub?.unsubscribe();
    this.selectionSub = null;
  }
}
