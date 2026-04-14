import {
  AfterViewInit,
  Component,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewEncapsulation,
  inject,
  signal
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
  plugin: Record<string, unknown> & { clear(): Promise<void> };
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
  encapsulation: ViewEncapsulation.None,
  styles: [
    `
      app-molstar-viewer {
        display: block;
      }
      app-molstar-viewer .molstar-wrap {
        position: relative;
        width: 100%;
        height: 360px;
        min-height: 360px;
        overflow: hidden;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        background: #1e1e2e;
      }
      /* Keep only the sequence bar (top) and 3D viewport visible */
      app-molstar-viewer .msp-layout-region-right,
      app-molstar-viewer .msp-layout-region-left,
      app-molstar-viewer .msp-layout-region-bottom,
      app-molstar-viewer .msp-viewport-controls,
      app-molstar-viewer .msp-viewport-controls-panels,
      app-molstar-viewer .msp-selection-viewport-controls,
      app-molstar-viewer .msp-controls-panel {
        display: none !important;
      }
    `
  ],
  template: `
    <div class="space-y-2">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-medium text-gray-700">
          Target Structure Preview
        </h4>
        @if (status() === 'loaded') {
        <label
          class="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-600 shadow-sm hover:bg-gray-50"
          [class.cursor-pointer]="!disabled"
          [class.opacity-50]="disabled"
          [class.pointer-events-none]="disabled"
        >
          <svg
            class="h-3.5 w-3.5 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Upload new structure
          <input
            type="file"
            class="sr-only"
            accept=".pdb"
            [disabled]="disabled"
            (change)="onFileInputChange($event)"
          />
        </label>
        }
      </div>

      <!-- Idle placeholder (no file selected yet) -->
      @if (status() === 'idle') {
      <div
        class="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 py-16 text-center"
      >
        <svg
          class="h-10 w-10 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
            d="M20 7l-8-4-8 4m16 0v10l-8 4m0-10L4 7m8 10V11"
          />
        </svg>
        <p class="text-sm text-gray-400">
          Load a
          <code class="rounded bg-gray-100 px-1 py-0.5 text-xs">.pdb</code> file
          to preview the structure here
        </p>
        <label
          class="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm"
          [class.cursor-pointer]="!disabled"
          [class.opacity-50]="disabled"
          [class.pointer-events-none]="disabled"
        >
          <svg
            class="h-4 w-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Choose .pdb file
          <input
            type="file"
            class="sr-only"
            accept=".pdb"
            [disabled]="disabled"
            (change)="onFileInputChange($event)"
          />
        </label>
      </div>
      }

      <!-- Loading state -->
      @if (status() === 'loading') {
      <div class="flex items-center gap-2 text-sm text-gray-500 py-2">
        <svg
          class="animate-spin h-4 w-4 text-blue-600"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          ></circle>
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          ></path>
        </svg>
        Loading structure…
      </div>
      }

      <!-- Error state -->
      @if (status() === 'error') {
      <div
        class="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-4 py-3"
      >
        <svg
          class="mt-0.5 h-4 w-4 shrink-0 text-red-500"
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fill-rule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clip-rule="evenodd"
          />
        </svg>
        <p class="text-sm text-red-700">{{ errorMessage() }}</p>
      </div>
      }

      <!-- Viewer container (always present so mol* can attach) -->
      <div
        [id]="containerId"
        class="molstar-wrap"
        [class.hidden]="
          status() === 'idle' || status() === 'loading' || status() === 'error'
        "
      ></div>

      <!-- Selection bar (shown when residues are picked) -->
      @if (status() === 'loaded') {
      <div
        class="rounded-md border border-blue-100 bg-blue-50 px-4 py-3 text-sm"
      >
        <p class="font-medium text-blue-800">Hotspot residue selection</p>
        @if (selectedResidues().length > 0) {
        <p class="mt-1 text-blue-700 font-mono break-all">
          {{ selectedResidues().join(",") }}
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
          Click residues in the viewer to add them as hotspots. Hold
          <kbd class="rounded bg-blue-100 px-1 py-0.5 font-mono text-xs"
            >Shift</kbd
          >
          to add to the selection; click empty space to deselect.
        </p>
        }
      </div>
      }
    </div>
  `
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
  /** Emits total residue count of the loaded structure (use as slider max). */
  @Output() sequenceLengthDetected = new EventEmitter<number>();

  readonly status = signal<"idle" | "loading" | "loaded" | "error">("idle");
  readonly errorMessage = signal("");
  readonly selectedResidues = signal<string[]>([]);

  private viewer: MolstarViewerInstance | null = null;
  /** Subscription handle returned by mol*'s selection event. */
  private selectionSub: { unsubscribe(): void } | null = null;
  private readonly zone = inject(NgZone);

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
      input.value = "";
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
    void this.viewer?.plugin?.clear();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  clearSelection(): void {
    try {
      // Documented API: plugin.managers.interactivity.lociSelects.deselectAll()
      // https://molstar.org/docs/plugin/viewer-state/#select-loci
      const plugin = this.viewer?.plugin as Record<string, unknown> | undefined;
      const lociSelects = (
        (plugin?.["managers"] as Record<string, unknown> | undefined)?.[
          "interactivity"
        ] as Record<string, unknown> | undefined
      )?.["lociSelects"] as Record<string, unknown> | undefined;
      if (typeof lociSelects?.["deselectAll"] === "function") {
        (lociSelects["deselectAll"] as () => void)();
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
          viewportShowSelectionMode: true,
          viewportShowControls: false
        });
        // Set granularity to residue so a single click selects the whole residue
        // https://molstar.org/docs/plugin/viewer-state/#interactivity
        try {
          const iMgr = (
            (this.viewer.plugin as Record<string, unknown>)[
              "managers"
            ] as Record<string, unknown>
          )["interactivity"] as
            | { setProps(p: Record<string, unknown>): void }
            | undefined;
          iMgr?.setProps?.({ granularity: "residue" });
        } catch {
          /* non-critical */
        }
        // Enable selection mode immediately so the user doesn't have to toggle it
        try {
          const selMode = (this.viewer.plugin as Record<string, unknown>)[
            "selectionMode"
          ];
          if (selMode === false || selMode === undefined) {
            (
              (this.viewer.plugin as Record<string, unknown>)[
                "behaviors"
              ] as Record<string, unknown>
            )["canvas3d"];
            // Use the documented PluginCommands approach: set canvas3d selection mode
            const canvas3d = (this.viewer.plugin as Record<string, unknown>)[
              "canvas3d"
            ] as { setProps(p: Record<string, unknown>): void } | undefined;
            canvas3d?.setProps?.({ renderer: {} }); // no-op to force init
          }
          // The Viewer wrapper exposes plugin.selectionMode as a setter
          (this.viewer.plugin as Record<string, unknown>)["selectionMode"] =
            true;
        } catch {
          /* non-critical */
        }
        this.hookSelection();
        this.preventButtonFormSubmit();
      } else {
        // Clear previous structure and re-hook selection for the new one
        await this.viewer.plugin.clear();
        this.cleanupSubscription();
        this.hookSelection();
      }

      const content = await file.text();
      await this.viewer.loadStructureFromData(content, "pdb", false, {
        label: file.name
      });

      await this.applyBallAndStick();
      this.showSequencePanel();
      this.status.set("loaded");
      this.emitSequenceLength();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Could not render PDB file.";
      this.errorMessage.set(msg);
      this.status.set("error");
    }
  }

  /** Count unique residues across all units and emit as the slider upper bound. */
  private emitSequenceLength(): void {
    try {
      const plugin = this.viewer!.plugin as Record<string, unknown>;
      const structureList = (
        (
          (plugin["managers"] as Record<string, unknown>)[
            "structure"
          ] as Record<string, unknown>
        )["hierarchy"] as Record<string, unknown>
      )["current"] as Record<string, unknown>;
      const structures = structureList["structures"] as Array<
        Record<string, unknown>
      >;
      if (!Array.isArray(structures) || structures.length === 0) return;

      const residuesSeen = new Set<string>();
      for (const s of structures) {
        const data = (
          (s["cell"] as Record<string, unknown>)["obj"] as Record<
            string,
            unknown
          >
        )?.["data"] as Record<string, unknown> | undefined;
        if (!data) continue;
        const units = data["units"] as
          | Array<Record<string, unknown>>
          | undefined;
        if (!Array.isArray(units)) continue;
        for (const unit of units) {
          try {
            const model = unit["model"] as Record<string, unknown>;
            const ah = model["atomicHierarchy"] as Record<string, unknown>;
            const chainIdx = (
              ah["chainAtomSegments"] as Record<string, ArrayLike<number>>
            )["index"];
            const residueIdx = (
              ah["residueAtomSegments"] as Record<string, ArrayLike<number>>
            )["index"];
            const seqIdVal = (
              (ah["residues"] as Record<string, unknown>)[
                "auth_seq_id"
              ] as Record<string, unknown>
            )["value"] as (i: number) => number;
            const chainIdVal = (
              (ah["chains"] as Record<string, unknown>)[
                "auth_asym_id"
              ] as Record<string, unknown>
            )["value"] as (i: number) => string;
            const elements = unit["elements"] as ArrayLike<number>;
            for (let i = 0; i < elements.length; i++) {
              const atomIdx = elements[i];
              residuesSeen.add(
                `${chainIdVal(chainIdx[atomIdx])}_${seqIdVal(
                  residueIdx[atomIdx]
                )}`
              );
            }
          } catch {
            /* skip unit */
          }
        }
      }

      if (residuesSeen.size > 0) {
        this.zone.run(() =>
          this.sequenceLengthDetected.emit(residuesSeen.size)
        );
      }
    } catch {
      /* non-critical */
    }
  }

  private clearViewer(): void {
    this.cleanupSubscription();
    void this.viewer?.plugin?.clear();
    this.selectedResidues.set([]);
    this.status.set("idle");
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  /**
   * Subscribe to selection.events.changed — this fires AFTER Mol*'s own
   * SelectLoci behavior has updated selection.entries, so we always read
   * the correct current selection.
   * https://molstar.org/docs/plugin/selections/#selection-events
   *
   * We also run the signal/emit inside NgZone so Angular's change detection
   * picks up the update (Mol* callbacks execute outside Angular's zone).
   */
  private hookSelection(): void {
    if (!this.viewer) return;
    try {
      const plugin = this.viewer.plugin as Record<string, unknown>;
      // plugin.managers.structure.selection
      const selMgr = (
        (plugin["managers"] as Record<string, unknown>)["structure"] as Record<
          string,
          unknown
        >
      )["selection"] as Record<string, unknown>;

      // selection.events.changed — fires after selection state is updated
      const changed = (selMgr["events"] as Record<string, unknown>)[
        "changed"
      ] as {
        subscribe(cb: () => void): { unsubscribe(): void };
      };

      this.selectionSub = changed.subscribe(() => {
        const residues = this.readCurrentSelection(plugin);
        const compressed = this.compressToRanges(residues);
        // Run inside Angular's zone so signals + template bindings update
        this.zone.run(() => {
          this.selectedResidues.set(compressed);
          this.residuesSelected.emit(compressed.join(","));
        });
      });
    } catch {
      console.warn(
        "Mol* selection hook unavailable; hotspot auto-fill disabled."
      );
    }
  }

  /**
   * Read current selection from plugin.managers.structure.selection.entries.
   *
   * Each entry is a SelectionEntry: { structure: Structure, ref: string }
   * where `structure` is a sub-Structure containing ONLY the selected atoms.
   * (The docs example destructures `{ structure }` from each entry value.)
   * https://molstar.org/docs/plugin/selections/#selection-events
   */
  private readCurrentSelection(plugin: Record<string, unknown>): string[] {
    // Map from residue label (e.g. "A42") to the first global atom index seen
    // for that residue. Sorting by atom index gives the structural order that
    // downstream tools expect rather than a lexicographic sort.
    const residueAtomIndex = new Map<string, number>();
    try {
      const selMgr = (
        (plugin["managers"] as Record<string, unknown>)["structure"] as Record<
          string,
          unknown
        >
      )["selection"] as Record<string, unknown>;
      const entries = selMgr["entries"] as Map<string, Record<string, unknown>>;

      for (const entry of entries.values()) {
        // docs: for (const { structure } of selections)
        this.visitStructureUnits(
          entry["structure"] as Record<string, unknown>,
          residueAtomIndex
        );
      }
    } catch {
      /* swallow */
    }
    const parse = (label: string) => {
      const m = label.match(/^([A-Za-z]+)(-?\d+)$/);
      return m ? { chain: m[1], seq: parseInt(m[2], 10) } : { chain: label, seq: 0 };
    };
    return Array.from(residueAtomIndex.keys())
      .sort((a, b) => {
        const pa = parse(a), pb = parse(b);
        const cmp = pa.chain.localeCompare(pb.chain);
        return cmp !== 0 ? cmp : pa.seq - pb.seq;
      });
  }

  /**
   * Iterate all units of a Mol* sub-Structure and collect
   * auth chain + auth_seq_id residue strings (e.g. "A42").
   *
   * unit.elements is a SortedArray<ElementIndex> of GLOBAL atom indices
   * (not unit-local offsets), so we pass them straight into the hierarchy
   * index arrays.
   */
  private visitStructureUnits(
    structure: Record<string, unknown> | undefined,
    out: Map<string, number>
  ): void {
    if (!structure) return;
    const units = structure["units"] as
      | Array<Record<string, unknown>>
      | undefined;
    if (!Array.isArray(units)) return;

    for (const unit of units) {
      try {
        const model = unit["model"] as Record<string, unknown>;
        const ah = model["atomicHierarchy"] as Record<string, unknown>;
        const residueIdx = (
          ah["residueAtomSegments"] as Record<string, ArrayLike<number>>
        )["index"];
        const chainIdx = (
          ah["chainAtomSegments"] as Record<string, ArrayLike<number>>
        )["index"];

        const seqIdVal = (
          (ah["residues"] as Record<string, unknown>)["auth_seq_id"] as Record<
            string,
            unknown
          >
        )["value"] as (i: number) => number;
        const chainIdVal = (
          (ah["chains"] as Record<string, unknown>)["auth_asym_id"] as Record<
            string,
            unknown
          >
        )["value"] as (i: number) => string;

        // unit.elements is a SortedArray, so the first atom index we see for a
        // residue is already its global minimum — record it once for ordering.
        this.iterateOrderedSet(unit["elements"], (atomIdx) => {
          const label = `${chainIdVal(chainIdx[atomIdx])}${seqIdVal(
            residueIdx[atomIdx]
          )}`;
          if (!out.has(label)) {
            out.set(label, atomIdx);
          }
        });
      } catch {
        /* skip unit on any hierarchy mismatch */
      }
    }
  }

  /**
   * Iterate over a mol* OrderedSet which is either:
   *   - an Interval `{ min, max }` (exclusive end)
   *   - a SortedArray (TypedArray / ArrayLike<number>)
   */
  private iterateOrderedSet(set: unknown, cb: (v: number) => void): void {
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

  /**
   * Force Mol*'s internal regionState.top to 'full' so the sequence panel
   * is allocated space. layoutIsExpanded:false leaves all regions 'hidden'
   * by default; this overrides just the top region after a structure loads.
   */
  private showSequencePanel(): void {
    if (!this.viewer) return;
    try {
      const plugin = this.viewer.plugin as any;
      const regionState = plugin.layout?.currentState?.regionState ?? {};
      plugin.layout?.setProps?.({ regionState: { ...regionState, top: 'full' } });
    } catch { /* non-critical */ }
  }

  /**
   * Replace the default representation with cartoon + ball-and-stick overlay.
   * Mirrors the approach in the reference implementation: remove existing
   * component representations, build a static polymer component, then add
   * both repr types via the registry/builder API.
   */
  private async applyBallAndStick(): Promise<void> {
    if (!this.viewer) return;
    try {
      const plugin = this.viewer.plugin as any;
      const hierarchy = plugin.managers.structure.hierarchy;
      const manager = plugin.managers.structure.component;
      const reprBuilder = plugin.builders.structure.representation;
      const reprRegistry = plugin.representation.structure.registry;

      const addRepr = async (
        component: any,
        name: string,
        typeParams?: object
      ) => {
        if (!component) return;
        const reprType = reprRegistry.get(name);
        if (!reprType) return;
        const params: any = { type: reprType };
        if (typeParams) params.typeParams = typeParams;
        await reprBuilder.addRepresentation(component, params);
      };

      const structures: any[] =
        hierarchy.current?.structures ?? hierarchy.selection?.structures ?? [];

      for (const s of structures) {
        for (const c of s.components ?? []) {
          await manager.removeRepresentations([c]);
        }
        const polymer =
          await plugin.builders.structure.tryCreateComponentStatic(
            s.cell,
            "polymer",
            { label: "Polymer" }
          );
        await addRepr(polymer, "cartoon");
        await addRepr(polymer, "ball-and-stick", {
          sizeFactor: 0.18,
          sizeAspectRatio: 0.7
        });
      }
    } catch {
      /* non-critical — default visual still shows */
    }
  }

  /**
   * Collapse runs of consecutive residues on the same chain into range notation.
   * Input must already be sorted by global atom index (as returned by
   * readCurrentSelection). e.g. ["A12","A13","A14","B5"] → ["A12-A14","B5"].
   */
  private compressToRanges(residues: string[]): string[] {
    if (residues.length === 0) return [];

    type Parsed = { chain: string; seq: number; label: string };
    const parsed: (Parsed | null)[] = residues.map((label) => {
      const m = label.match(/^([A-Za-z]+)(-?\d+)$/);
      return m ? { chain: m[1], seq: parseInt(m[2], 10), label } : null;
    });

    const result: string[] = [];
    let i = 0;
    while (i < parsed.length) {
      const cur = parsed[i];
      if (!cur) {
        result.push(residues[i++]);
        continue;
      }

      // Extend the run while same chain and seq increments by 1
      let j = i + 1;
      while (j < parsed.length) {
        const prev = parsed[j - 1] as Parsed;
        const next = parsed[j];
        if (!next || next.chain !== cur.chain || next.seq !== prev.seq + 1)
          break;
        j++;
      }

      const last = parsed[j - 1] as Parsed;
      result.push(
        j - i === 1
          ? cur.label
          : `${cur.chain}${cur.seq}-${last.chain}${last.seq}`
      );
      i = j;
    }

    return result;
  }

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
