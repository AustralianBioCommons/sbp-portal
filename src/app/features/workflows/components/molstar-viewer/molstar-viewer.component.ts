import {
  AfterViewInit,
  Component,
  NgZone,
  OnDestroy,
  ViewEncapsulation,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowPath,
  heroArrowUpTray,
  heroExclamationCircle,
  heroFolder,
} from "@ng-icons/heroicons/outline";
import { Viewer } from "molstar/lib/apps/viewer/app";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { StructureSelectionManager } from "molstar/lib/mol-plugin-state/manager/structure/selection";
import { InteractivityManager } from "molstar/lib/mol-plugin-state/manager/interactivity";
import {
  StructureSelection,
  QueryContext,
  Structure,
  Unit,
} from "molstar/lib/mol-model/structure";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import { compile } from "molstar/lib/mol-script/runtime/query/compiler";
import { isPolymer } from "molstar/lib/mol-model/structure/model/types";
import { OrderedSet } from "molstar/lib/mol-data/int";
import {
  ResidueRef,
  StructureFormat,
} from "../../../jobs/shared/prediction-results.utils";

/**
 * Registered by Mol*'s quality-assessment extension. The cast is needed because
 * extension themes sit outside the colour union typing `addRepresentation`.
 */
const PLDDT_COLOR_THEME = "plddt-confidence" as "uniform";

export interface StructureSource {
  content: string;
  format: StructureFormat;
  /** Label shown in the Mol* state tree. */
  label: string;
}

@Component({
  selector: "app-molstar-viewer",
  imports: [CommonModule, NgIconComponent],
  providers: [
    provideIcons({
      heroArrowPath,
      heroArrowUpTray,
      heroExclamationCircle,
      heroFolder,
    }),
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: "./molstar-viewer.component.html",
  styleUrl: "./molstar-viewer.component.scss",
  host: { class: "block" },
})
export class MolstarViewerComponent implements AfterViewInit, OnDestroy {
  pdbFile = input<File | null>(null);
  /** Render in-memory content instead of a picked file; wins over `pdbFile`. */
  structureSource = input<StructureSource | null>(null);
  /** Disables the file picker embedded in the idle placeholder. */
  disabled = input(false);
  /** Show the idle upload placeholder. Off where the structure always arrives from outside. */
  enableUpload = input(true);
  /** Programmatically select residues from outside (e.g. manual form input).
   *  Accepts the same comma-separated token format the viewer emits:
   *  "A56,B12". Set to "" to clear the selection. */
  externalSelection = input("");
  /** As `externalSelection`, but a fresh object re-applies an unchanged token
   *  list — for selections that can legitimately be asked for twice. Wins when set. */
  selectionRequest = input<{ tokens: string } | null>(null);
  /** Round the viewport's bottom-right corner. Set when the viewer meets the
   *  container's right edge (e.g. the config panel is collapsed); the WebGL
   *  canvas must be rounded on its own container, not by an ancestor clip. */
  roundBottomRight = input(false);
  /** Overlay hint shown once a structure is on screen. Empty hides it. */
  hint = input("Click residues in the viewer to add them as hotspots");
  /** The default keeps the ball-and-stick overlay the design workflows pick
   *  residues with; "cartoon" is the plain fold view. */
  representation = input<"cartoon" | "cartoon-and-sticks">(
    "cartoon-and-sticks"
  );
  /** "plddt" uses the AlphaFold confidence palette, for predicted structures only. */
  colorTheme = input<"default" | "plddt">("default");
  showSequencePanel = input(true);

  /** Emits a comma-separated residue string (e.g. "A42,A43,B11") on each selection change. */
  residuesSelected = output<string>();
  /** Emits the chosen File when the user picks one from the idle placeholder. */
  filePicked = output<File>();
  /** Emits total residue count of the loaded structure (use as slider max). */
  sequenceLengthDetected = output<number>();
  /** Emits the full chain→residue-number map after a structure loads.
   *  The parent can use this for validation without re-parsing the PDB file. */
  structureResiduesDetected = output<Map<string, Set<number>>>();
  /** Polymer residues in sequence order; positions line up with PAE rows and columns. */
  residueIndexDetected = output<ResidueRef[]>();

  readonly status = signal<"idle" | "loading" | "loaded" | "error">("idle");
  readonly errorMessage = signal("");
  readonly selectedResidues = signal<string[]>([]);

  private viewer: Viewer | null = null;
  private selectionSub: { unsubscribe(): void } | null = null;
  private formSubmitAbortCtrl: AbortController | null = null;
  private readonly zone = inject(NgZone);
  /** True while a programmatic selection is being applied — suppresses the
   *  residuesSelected event so it doesn't echo back to the parent. */
  private _applyingExternalSelection = false;
  private _viewInitialized = false;

  private static instanceCount = 0;
  readonly containerId = `molstar-viewer-${++MolstarViewerComponent.instanceCount}`;

  constructor() {
    // React to structure input changes after view is ready.
    effect(() => {
      this.structureSource();
      this.pdbFile();
      untracked(() => {
        if (!this._viewInitialized) return;
        void this.loadRequestedStructure();
      });
    });

    // Replaces the externalSelection setter.
    effect(() => {
      const sel = this.externalSelection();
      untracked(() => {
        if (!this._viewInitialized) return;
        if (this.status() === "loaded") {
          this.zone.runOutsideAngular(
            () => void this.applyExternalSelection(sel)
          );
        }
      });
    });

    effect(() => {
      const request = this.selectionRequest();
      untracked(() => {
        if (!this._viewInitialized || !request) return;
        if (this.status() === "loaded") {
          this.zone.runOutsideAngular(
            () => void this.applyExternalSelection(request.tokens)
          );
        }
      });
    });
  }

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
    this._viewInitialized = true;
    void this.loadRequestedStructure();
  }

  ngOnDestroy(): void {
    this.cleanupSubscription();
    this.formSubmitAbortCtrl?.abort();
    this.formSubmitAbortCtrl = null;
    void this.viewer?.plugin?.clear();
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  clearSelection(): void {
    try {
      const lociSelects = this.plugin?.managers.interactivity.lociSelects as
        | InteractivityManager.LociSelectManager
        | undefined;
      lociSelects?.deselectAll();
    } catch {
      // best-effort
    }
    this.selectedResidues.set([]);
    this.residuesSelected.emit("");
  }

  // ── Viewer management ──────────────────────────────────────────────────────

  /** Load whichever structure input is set, preferring in-memory content. */
  private async loadRequestedStructure(): Promise<void> {
    const source = this.structureSource();
    if (source) {
      await this.loadStructure(source);
      return;
    }

    const file = this.pdbFile();
    if (file) {
      await this.loadFile(file);
      return;
    }

    this.clearViewer();
  }

  private async loadFile(file: File): Promise<void> {
    this.status.set("loading");
    this.errorMessage.set("");

    try {
      const content = await file.text();
      await this.loadStructure({ content, format: "pdb", label: file.name });
    } catch (err) {
      this.errorMessage.set(
        err instanceof Error ? err.message : "Could not read PDB file."
      );
      this.status.set("error");
    }
  }

  private async loadStructure(source: StructureSource): Promise<void> {
    this.status.set("loading");
    this.errorMessage.set("");
    this.cleanupSubscription();

    try {
      if (!this.viewer) {
        this.viewer = await Viewer.create(this.containerId, {
          layoutIsExpanded: false,
          layoutShowControls: true,
          layoutShowSequence: this.showSequencePanel(),
          layoutShowRemoteState: false,
          layoutShowLeftPanel: false,
          collapseRightPanel: true,
          layoutShowLog: false,
          viewportShowSelectionMode: true,
          viewportShowControls: false,
          viewportShowAnimation: false,
          viewportShowTrajectoryControls: false,
        });
        try {
          this.plugin?.managers.interactivity.setProps({
            granularity: "residue",
          });
        } catch {
          /* non-critical */
        }
        try {
          this.plugin!.selectionMode = true;
        } catch {
          /* non-critical */
        }
        this.hookSelection();
        this.preventButtonFormSubmit();
      } else {
        await this.viewer.plugin.clear();
        this.cleanupSubscription();
        this.hookSelection();
      }

      await this.viewer.loadStructureFromData(source.content, source.format, {
        dataLabel: source.label,
      });

      await this.applyRepresentation();
      this.applyTopRegion();
      this.status.set("loaded");
      this.emitStructureInfo();
      // Apply any selection that arrived before or while the structure was loading.
      const pendingSel =
        this.selectionRequest()?.tokens ?? this.externalSelection();
      if (pendingSel) {
        void this.applyExternalSelection(pendingSel);
      }
    } catch (err) {
      this.errorMessage.set(
        err instanceof Error ? err.message : "Could not render the structure."
      );
      this.status.set("error");
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
   * Subscribe to selection.events.changed — fires after Mol*'s SelectLoci
   * behavior updates entries, so we always read the current selection.
   * Callbacks run outside Angular's zone, so we re-enter via NgZone.run().
   */
  private hookSelection(): void {
    if (!this.viewer) return;
    try {
      const selMgr = this.selectionManager;
      this.selectionSub = selMgr.events.changed.subscribe(() => {
        // Suppress echo-back while we are applying an external selection.
        if (this._applyingExternalSelection) return;
        const residues = this.readCurrentSelection(selMgr);
        this.zone.run(() => {
          this.selectedResidues.set(residues);
          this.residuesSelected.emit(residues.join(","));
        });
      });
    } catch {
      console.warn(
        "Mol* selection hook unavailable; hotspot auto-fill disabled."
      );
    }
  }

  /** Programmatically select the residues described by a comma-separated token
   *  string (e.g. "A56,B12").  Suppresses the outgoing
   *  residuesSelected event so the parent form is not overwritten. */
  private async applyExternalSelection(residueString: string): Promise<void> {
    if (!this.plugin || this.status() !== "loaded") return;

    this._applyingExternalSelection = true;
    try {
      const lociSelects = this.plugin.managers.interactivity
        .lociSelects as InteractivityManager.LociSelectManager;
      lociSelects.deselectAll();

      if (!residueString.trim()) return;

      // Parse tokens → chain → Set<residueNumber>
      const targetResidues = new Map<string, Set<number>>();
      for (const token of residueString
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)) {
        const parsed = MolstarViewerComponent.parseResidueToken(token);
        if (!parsed) continue;
        if (!targetResidues.has(parsed.chain))
          targetResidues.set(parsed.chain, new Set());
        for (let i = parsed.resStart; i <= parsed.resEnd; i++)
          targetResidues.get(parsed.chain)!.add(i);
      }
      if (targetResidues.size === 0) return;

      // Build one MolScript atomGroups expression per chain, then merge.
      const chainExprs = Array.from(targetResidues.entries()).map(
        ([chain, residues]) =>
          MS.struct.generator.atomGroups({
            "chain-test": MS.core.rel.eq([MS.ammp("auth_asym_id"), chain]),
            "residue-test": MS.core.set.has([
              MS.set(...Array.from(residues)),
              MS.ammp("auth_seq_id"),
            ]),
          })
      );
      const expr =
        chainExprs.length === 1
          ? chainExprs[0]
          : MS.struct.combinator.merge(chainExprs);
      const query = compile<StructureSelection>(expr);

      // lociSelects.select applies the selection *marking* as well as the state,
      // which is what makes the representation and sequence panel show it.
      // Writing to the selection manager alone marks nothing.
      const structures =
        this.plugin.managers.structure.hierarchy.current?.structures ?? [];
      for (const s of structures) {
        const structure = s.cell.obj?.data as Structure | undefined;
        if (!structure) continue;
        const sel = query(new QueryContext(structure));
        const loci = StructureSelection.toLociWithSourceUnits(sel);
        // The loci are already whole residues, so skip granularity expansion.
        lociSelects.select({ loci }, false);
      }
    } catch (e) {
      console.warn("Mol* external selection failed:", e);
    } finally {
      setTimeout(() => {
        this._applyingExternalSelection = false;
      }, 120);
    }
  }

  private readCurrentSelection(selMgr: StructureSelectionManager): string[] {
    const residueAtomIndex = new Map<string, number>();
    try {
      for (const entry of selMgr.entries.values()) {
        const structure = entry.structure;
        if (structure) this.visitStructureUnits(structure, residueAtomIndex);
      }
    } catch {
      /* swallow */
    }

    return Array.from(residueAtomIndex.keys()).sort((a, b) => {
      const pa = this.parseResidueLabel(a) ?? { chain: a, seq: 0 };
      const pb = this.parseResidueLabel(b) ?? { chain: b, seq: 0 };
      const cmp = pa.chain.localeCompare(pb.chain);
      return cmp !== 0 ? cmp : pa.seq - pb.seq;
    });
  }

  /**
   * Walk a sub-Structure's units collecting chain+seqId residue labels.
   * unit.elements is a SortedArray of GLOBAL atom indices into the model hierarchy.
   */
  private visitStructureUnits(
    structure: Structure,
    out: Map<string, number>
  ): void {
    for (const unit of structure.units) {
      if (!Unit.isAtomic(unit)) continue;
      try {
        const { atomicHierarchy } = unit.model;
        const residueIdx = atomicHierarchy.residueAtomSegments.index;
        const chainIdx = atomicHierarchy.chainAtomSegments.index;
        const seqIdVal = atomicHierarchy.residues.auth_seq_id.value;
        const chainIdVal = atomicHierarchy.chains.auth_asym_id.value;

        OrderedSet.forEach(unit.elements, (atomIdx) => {
          const label = `${chainIdVal(chainIdx[atomIdx])}${seqIdVal(
            residueIdx[atomIdx]
          )}`;
          if (!out.has(label)) out.set(label, atomIdx);
        });
      } catch {
        /* skip unit on hierarchy mismatch */
      }
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  /**
   * Force regionState.top to 'full' so the sequence bar gets space —
   * layoutIsExpanded:false leaves all regions 'hidden' by default. With the bar
   * off, `layoutShowSequence: false` has already dropped the top region.
   */
  private applyTopRegion(): void {
    if (!this.plugin || !this.showSequencePanel()) return;
    try {
      const regionState = this.plugin.layout.state.regionState;
      this.plugin.layout.setProps({
        regionState: { ...regionState, top: "full" },
      });
    } catch {
      /* non-critical */
    }
  }

  /**
   * Replace the default representation with cartoon, plus a ball-and-stick
   * overlay unless the caller asked for the plain cartoon view.
   */
  private async applyRepresentation(): Promise<void> {
    if (!this.plugin) return;
    try {
      const { hierarchy, component: componentMgr } =
        this.plugin.managers.structure;
      const reprBuilder = this.plugin.builders.structure.representation;
      const structures = hierarchy.current?.structures ?? [];

      for (const s of structures) {
        await componentMgr.removeRepresentations(s.components);
        const polymer =
          await this.plugin.builders.structure.tryCreateComponentStatic(
            s.cell,
            "polymer",
            { label: "Polymer" }
          );
        if (!polymer) continue;

        // Mol*'s theme reads pLDDT from ma_qa_metric_local (mmCIF) or the
        // B-factor column (PDB); anything without it falls back to the default.
        const usePlddt = this.colorTheme() === "plddt";
        let coloured = false;
        if (usePlddt) {
          try {
            await reprBuilder.addRepresentation(polymer, {
              type: "cartoon",
              color: PLDDT_COLOR_THEME,
            });
            coloured = true;
          } catch {
            coloured = false;
          }
        }
        if (!coloured) {
          await reprBuilder.addRepresentation(polymer, { type: "cartoon" });
        }

        if (this.representation() === "cartoon-and-sticks") {
          await reprBuilder.addRepresentation(polymer, {
            type: "ball-and-stick",
            typeParams: { sizeFactor: 0.18, sizeAspectRatio: 0.7 },
          });
        }
      }
    } catch {
      /* non-critical — default visual still shows */
    }
  }

  /** One walk of the structure, emitting the chain→residue map, count and index. */
  private emitStructureInfo(): void {
    try {
      const structures =
        this.plugin?.managers.structure.hierarchy.current?.structures ?? [];
      const residueMap = new Map<string, Set<number>>();
      const polymerMap = new Map<string, Set<number>>();

      for (const s of structures) {
        const structure = s.cell.obj?.data as Structure | undefined;
        if (!structure) continue;
        for (const unit of structure.units) {
          if (!Unit.isAtomic(unit)) continue;
          try {
            const { atomicHierarchy } = unit.model;
            const residueIdx = atomicHierarchy.residueAtomSegments.index;
            const chainIdx = atomicHierarchy.chainAtomSegments.index;
            const seqIdVal = atomicHierarchy.residues.auth_seq_id.value;
            const chainIdVal = atomicHierarchy.chains.auth_asym_id.value;
            const moleculeType = atomicHierarchy.derived.residue.moleculeType;
            OrderedSet.forEach(unit.elements, (atomIdx) => {
              const chain = chainIdVal(chainIdx[atomIdx]);
              const resIdx = residueIdx[atomIdx];
              const resNum = seqIdVal(resIdx);
              if (!residueMap.has(chain)) residueMap.set(chain, new Set());
              residueMap.get(chain)!.add(resNum);

              if (isPolymer(moleculeType[resIdx])) {
                if (!polymerMap.has(chain)) polymerMap.set(chain, new Set());
                polymerMap.get(chain)!.add(resNum);
              }
            });
          } catch {
            /* skip unit */
          }
        }
      }

      if (residueMap.size > 0) {
        const total = [...residueMap.values()].reduce((n, s) => n + s.size, 0);
        const residueIndex = MolstarViewerComponent.toOrderedResidues(
          polymerMap.size > 0 ? polymerMap : residueMap
        );
        this.zone.run(() => {
          this.structureResiduesDetected.emit(residueMap);
          this.sequenceLengthDetected.emit(total);
          this.residueIndexDetected.emit(residueIndex);
        });
      }
    } catch {
      /* non-critical */
    }
  }

  /** Sequence order: chains alphabetically, as prediction tools assign them,
   *  then residues ascending. */
  private static toOrderedResidues(
    residues: Map<string, Set<number>>
  ): ResidueRef[] {
    return [...residues.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([chain, seqs]) =>
        [...seqs].sort((a, b) => a - b).map((seq) => ({ chain, seq }))
      );
  }

  /** Prevent any <button> inside the viewer from submitting the parent form.
   *  The listener is tied to an AbortController so it's removed on destroy. */
  private preventButtonFormSubmit(): void {
    // Only register once per component instance.
    if (this.formSubmitAbortCtrl) return;
    const container = document.getElementById(this.containerId);
    if (!container) return;
    this.formSubmitAbortCtrl = new AbortController();
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
      { capture: true, signal: this.formSubmitAbortCtrl.signal }
    );
  }

  private cleanupSubscription(): void {
    this.selectionSub?.unsubscribe();
    this.selectionSub = null;
  }

  /** Parse a residue token ("A56" or same-chain range "A12-A14") into
   *  { chain, resStart, resEnd }, or null for an unrecognised format. */
  static parseResidueToken(
    token: string
  ): { chain: string; resStart: number; resEnd: number } | null {
    const range = token.match(/^([A-Za-z]+)(\d+)-([A-Za-z]+)(\d+)$/);
    if (range) {
      if (range[1] !== range[3]) return null;
      return {
        chain: range[1],
        resStart: parseInt(range[2], 10),
        resEnd: parseInt(range[4], 10),
      };
    }
    const single = token.match(/^([A-Za-z]+)(-?\d+)$/);
    if (single) {
      const n = parseInt(single[2], 10);
      return { chain: single[1], resStart: n, resEnd: n };
    }
    return null;
  }

  private parseResidueLabel(
    label: string
  ): { chain: string; seq: number } | null {
    const m = label.match(/^([A-Za-z]+)(-?\d+)$/);
    return m ? { chain: m[1], seq: parseInt(m[2], 10) } : null;
  }

  private get plugin(): PluginUIContext | undefined {
    return this.viewer?.plugin;
  }

  private get selectionManager(): StructureSelectionManager {
    return this.plugin!.managers.structure.selection;
  }
}
