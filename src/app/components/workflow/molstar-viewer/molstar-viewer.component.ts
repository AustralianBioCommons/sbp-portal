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
  signal,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { Viewer } from "molstar/lib/apps/viewer/app";
import { PluginUIContext } from "molstar/lib/mol-plugin-ui/context";
import { StructureSelectionManager } from "molstar/lib/mol-plugin-state/manager/structure/selection";
import { InteractivityManager } from "molstar/lib/mol-plugin-state/manager/interactivity";
import { Structure, Unit } from "molstar/lib/mol-model/structure";
import { OrderedSet } from "molstar/lib/mol-data/int";

@Component({
  selector: "app-molstar-viewer",
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  templateUrl: "./molstar-viewer.component.html",
  host: { class: "block" },
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

  private viewer: Viewer | null = null;
  private selectionSub: { unsubscribe(): void } | null = null;
  private formSubmitAbortCtrl: AbortController | null = null;
  private readonly zone = inject(NgZone);

  private static instanceCount = 0;
  readonly containerId = `molstar-viewer-${++MolstarViewerComponent.instanceCount}`;

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

  private async loadFile(file: File): Promise<void> {
    this.status.set("loading");
    this.errorMessage.set("");
    this.cleanupSubscription();

    try {
      if (!this.viewer) {
        this.viewer = await Viewer.create(this.containerId, {
          layoutIsExpanded: false,
          layoutShowControls: true,
          layoutShowSequence: true,
          layoutShowRemoteState: false,
          layoutShowLeftPanel: false,
          collapseRightPanel: true,
          layoutShowLog: false,
          viewportShowSelectionMode: true,
          viewportShowControls: false,
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

      const content = await file.text();
      await this.viewer.loadStructureFromData(content, "pdb", {
        dataLabel: file.name,
      });

      await this.applyBallAndStick();
      this.showSequencePanel();
      this.status.set("loaded");
      this.emitSequenceLength();
    } catch (err) {
      this.errorMessage.set(
        err instanceof Error ? err.message : "Could not render PDB file."
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
        const residues = this.readCurrentSelection(selMgr);
        const compressed = this.compressToRanges(residues);
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
   * Force regionState.top to 'full' so the sequence panel gets space.
   * layoutIsExpanded:false leaves all regions 'hidden' by default.
   */
  private showSequencePanel(): void {
    if (!this.plugin) return;
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
   * Replace the default representation with cartoon + ball-and-stick overlay.
   */
  private async applyBallAndStick(): Promise<void> {
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
        await reprBuilder.addRepresentation(polymer, { type: "cartoon" });
        await reprBuilder.addRepresentation(polymer, {
          type: "ball-and-stick",
          typeParams: { sizeFactor: 0.18, sizeAspectRatio: 0.7 },
        });
      }
    } catch {
      /* non-critical — default visual still shows */
    }
  }

  /** Count unique residues and emit for any consumers that want a sequence length. */
  private emitSequenceLength(): void {
    try {
      const structures =
        this.plugin?.managers.structure.hierarchy.current?.structures ?? [];
      const residuesSeen = new Set<string>();

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
            OrderedSet.forEach(unit.elements, (atomIdx) => {
              residuesSeen.add(
                `${chainIdVal(chainIdx[atomIdx])}_${seqIdVal(
                  residueIdx[atomIdx]
                )}`
              );
            });
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

  /**
   * Collapse runs of consecutive same-chain residues into range notation.
   * e.g. ["A12","A13","A14","B5"] → ["A12-A14","B5"]
   */
  private compressToRanges(residues: string[]): string[] {
    if (residues.length === 0) return [];

    type Parsed = { chain: string; seq: number; label: string };
    const parsed: (Parsed | null)[] = residues.map((label) => {
      const p = this.parseResidueLabel(label);
      return p ? { ...p, label } : null;
    });

    const result: string[] = [];
    let i = 0;
    while (i < parsed.length) {
      const cur = parsed[i];
      if (!cur) {
        result.push(residues[i++]);
        continue;
      }

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
