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
  StructureElement,
  QueryContext,
  Structure,
  Unit,
} from "molstar/lib/mol-model/structure";
import {
  clearStructureOverpaint,
  setStructureOverpaint,
} from "molstar/lib/mol-plugin-state/helpers/structure-overpaint";
import { PluginCommands } from "molstar/lib/mol-plugin/commands";
import { Color } from "molstar/lib/mol-util/color";
import { MolScriptBuilder as MS } from "molstar/lib/mol-script/language/builder";
import { compile } from "molstar/lib/mol-script/runtime/query/compiler";
import { isPolymer } from "molstar/lib/mol-model/structure/model/types";
import { OrderedSet } from "molstar/lib/mol-data/int";
import {
  ResidueRef,
  StructureFormat,
} from "../../../jobs/shared/prediction-results.utils";

/** An extension theme, so it falls outside the colour union `addRepresentation`
 *  is typed with — hence the cast. */
const PLDDT_COLOR_THEME = "plddt-confidence" as "uniform";

/** gray-500, for everything outside an isolated selection. */
const MUTED_STRUCTURE_COLOR = Color(0x6a7282);

/**
 * One component per part, because Mol*'s `polymer` is protein, RNA and DNA only
 * and the rest must be named. Sticks for them: a cartoon has no chain to trace.
 */
const STRUCTURE_PARTS = [
  { key: "polymer", label: "Polymer", type: "cartoon" },
  { key: "ligand", label: "Ligand", type: "ball-and-stick" },
  { key: "ion", label: "Ion", type: "ball-and-stick" },
  { key: "branched", label: "Carbohydrate", type: "ball-and-stick" },
  { key: "lipid", label: "Lipid", type: "ball-and-stick" },
] as const;

/** Mol*'s defaults (8 and 4) frame a few residues far too close. */
const ISOLATE_FOCUS = { minRadius: 18, extraRadius: 8, durationMs: 250 };

export interface StructureSource {
  content: string;
  format: StructureFormat;
  /** Label shown in the Mol* state tree. */
  label: string;
}

/** One residue while the index is being built; `atoms` is empty for a polymer. */
interface ResidueToken {
  polymer: boolean;
  atoms: string[];
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
  /** Show the idle upload placeholder. */
  enableUpload = input(true);
  /** Residues to select, in the tokens the viewer emits ("A56,B12"); "" clears. */
  externalSelection = input("");
  /** As `externalSelection`, but a new object re-applies the same tokens. Wins
   *  when set. */
  selectionRequest = input<{ tokens: string } | null>(null);
  /** Round the canvas's own bottom-right corner. An ancestor's clip cannot round
   *  WebGL. */
  roundBottomRight = input(false);
  /** Overlay hint shown once a structure is on screen. Empty hides it. */
  hint = input("Click residues in the viewer to add them as hotspots");
  /** The default adds the stick overlay residues are picked from; "cartoon" is
   *  the plain fold view. */
  representation = input<"cartoon" | "cartoon-and-sticks">(
    "cartoon-and-sticks"
  );
  /** "plddt" is the AlphaFold confidence palette, for predicted structures only. */
  colorTheme = input<"default" | "plddt">("default");
  /** Off leaves a click to Mol*'s own focus, which zooms rather than selects. */
  enablePicking = input(true);
  /** Show a selection by muting the rest and zooming to it, not by marking it. */
  isolateSelection = input(false);
  showSequencePanel = input(true);

  /** The selection as "A42,A43,B11", on every change. */
  residuesSelected = output<string>();
  /** The file picked from the idle placeholder. */
  filePicked = output<File>();
  /** Residue count of the loaded structure. */
  sequenceLengthDetected = output<number>();
  /** chain→residue numbers, so a parent can validate without re-parsing the file. */
  structureResiduesDetected = output<Map<string, Set<number>>>();
  /** Polymer residues in sequence order; positions line up with PAE rows and columns. */
  residueIndexDetected = output<ResidueRef[]>();
  /** A malformed or unsupported file, which the caller cannot see from the fetch. */
  loadError = output<string>();

  readonly status = signal<"idle" | "loading" | "loaded" | "error">("idle");
  readonly errorMessage = signal("");
  readonly selectedResidues = signal<string[]>([]);

  private viewer: Viewer | null = null;
  private selectionSub: { unsubscribe(): void } | null = null;
  private formSubmitAbortCtrl: AbortController | null = null;
  private readonly zone = inject(NgZone);
  /** Suppresses residuesSelected while a programmatic selection is applied, so
   *  it cannot echo back to the parent. */
  private _applyingExternalSelection = false;
  private _viewInitialized = false;

  private static instanceCount = 0;
  readonly containerId = `molstar-viewer-${++MolstarViewerComponent.instanceCount}`;

  constructor() {
    effect(() => {
      this.structureSource();
      this.pdbFile();
      untracked(() => {
        if (!this._viewInitialized) return;
        void this.loadRequestedStructure();
      });
    });

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

  /** Frame the whole structure again. */
  resetCamera(): void {
    this.plugin?.managers.camera.reset();
  }

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
      this.fail(err, "Could not read PDB file.");
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
          // Selection mode makes a plain click pick a residue, and moves camera
          // focus onto right-click — so picking and click-to-zoom are exclusive.
          this.plugin!.selectionMode = this.enablePicking();
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
      await this.relaxCameraClipping();
      this.applyTopRegion();
      this.status.set("loaded");
      this.emitStructureInfo();
      // A selection that arrived before the structure finished loading.
      const pendingSel =
        this.selectionRequest()?.tokens ?? this.externalSelection();
      if (pendingSel) {
        void this.applyExternalSelection(pendingSel);
      }
    } catch (err) {
      this.fail(err, "Could not render the structure.");
    }
  }

  /**
   * Mol* sets the far plane and the fog from the focused radius, so zooming to a
   * selection clips or fades the rest. Measure both from the scene instead.
   */
  private async relaxCameraClipping(): Promise<void> {
    if (!this.plugin || !this.isolateSelection()) return;
    try {
      await PluginCommands.Canvas3D.SetSettings(this.plugin, {
        settings: (old) => ({
          cameraClipping: { ...old.cameraClipping, radius: 0, far: false },
          cameraFog: { name: "off", params: {} },
        }),
      });
    } catch {
      /* non-critical */
    }
  }

  /**
   * Mute everything but `selected` and zoom to it; an empty list restores the
   * lot. Overpaint, not a colour theme, so the selection keeps its own colours.
   */
  private async isolate(selected: StructureElement.Loci[]): Promise<void> {
    if (!this.plugin) return;

    const components =
      this.plugin.managers.structure.hierarchy.current?.structures.flatMap(
        (structure) => structure.components
      ) ?? [];

    // Camera first, so a failed or impossible repaint still leaves it zoomed.
    if (selected.length === 0) {
      this.plugin.managers.camera.reset();
    } else {
      this.plugin.managers.camera.focusLoci(selected, ISOLATE_FOCUS);
    }
    if (components.length === 0) return;

    try {
      await clearStructureOverpaint(this.plugin, components);
      if (selected.length === 0) return;

      const byStructure = new Map<Structure, StructureElement.Loci>();
      for (const loci of selected) {
        const found = byStructure.get(loci.structure);
        byStructure.set(
          loci.structure,
          found ? StructureElement.Loci.union(found, loci) : loci
        );
      }

      await setStructureOverpaint(
        this.plugin,
        components,
        MUTED_STRUCTURE_COLOR,
        async (structure) => {
          const keep = byStructure.get(structure);
          const all = StructureElement.Loci.all(structure);
          // Paint the complement, so what is left keeps its own colours.
          return keep ? StructureElement.Loci.subtract(all, keep) : all;
        }
      );
    } catch (e) {
      console.warn("Mol* isolate failed:", e);
    }
  }

  /** Loading runs outside Angular's zone, so the emit re-enters it. */
  private fail(err: unknown, fallback: string): void {
    const message = err instanceof Error ? err.message : fallback;
    this.errorMessage.set(message);
    this.status.set("error");
    this.zone.run(() => this.loadError.emit(message));
  }

  private clearViewer(): void {
    this.cleanupSubscription();
    void this.viewer?.plugin?.clear();
    this.selectedResidues.set([]);
    this.status.set("idle");
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  /** selection.events.changed fires after SelectLoci has updated its entries,
   *  and outside Angular's zone. */
  private hookSelection(): void {
    if (!this.viewer) return;
    try {
      const selMgr = this.selectionManager;
      this.selectionSub = selMgr.events.changed.subscribe(() => {
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

  /** Select the residues named by "A56,B12", without emitting residuesSelected:
   *  the parent form must not be overwritten. */
  private async applyExternalSelection(residueString: string): Promise<void> {
    if (!this.plugin || this.status() !== "loaded") return;

    this._applyingExternalSelection = true;
    try {
      const lociSelects = this.plugin.managers.interactivity
        .lociSelects as InteractivityManager.LociSelectManager;
      lociSelects.deselectAll();

      if (!residueString.trim()) {
        if (this.isolateSelection()) await this.isolate([]);
        return;
      }

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

      const structures =
        this.plugin.managers.structure.hierarchy.current?.structures ?? [];
      const selected: StructureElement.Loci[] = [];

      for (const s of structures) {
        const structure = s.cell.obj?.data as Structure | undefined;
        if (!structure) continue;
        const sel = query(new QueryContext(structure));
        const loci = StructureSelection.toLociWithSourceUnits(sel);
        if (StructureElement.Loci.isEmpty(loci)) continue;
        selected.push(loci);

        if (!this.isolateSelection()) {
          // Only lociSelects.select marks the representation and sequence
          // panel. False: these loci are whole residues already.
          lociSelects.select({ loci }, false);
        }
      }

      if (this.isolateSelection()) {
        await this.isolate(selected);
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
   * Collect chain+seqId labels from a sub-Structure. `unit.elements` holds
   * global atom indices into the model hierarchy, not unit-local ones.
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
   * `layoutIsExpanded: false` hides every region, so the sequence bar only gets
   * space once the top one is forced back to 'full'.
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

  /** Cartoon in place of Mol*'s default, plus sticks unless plain cartoon. */
  private async applyRepresentation(): Promise<void> {
    if (!this.plugin) return;
    try {
      const { hierarchy, component: componentMgr } =
        this.plugin.managers.structure;
      const reprBuilder = this.plugin.builders.structure.representation;
      const structures = hierarchy.current?.structures ?? [];

      // The theme reads pLDDT from ma_qa_metric_local (mmCIF) or the B-factor
      // column (PDB), and throws for a file carrying neither.
      const usePlddt = this.colorTheme() === "plddt";

      for (const s of structures) {
        await componentMgr.removeRepresentations(s.components);

        for (const part of STRUCTURE_PARTS) {
          const component =
            await this.plugin.builders.structure.tryCreateComponentStatic(
              s.cell,
              part.key,
              { label: part.label }
            );
          if (!component) continue;

          let coloured = false;
          if (usePlddt) {
            try {
              await reprBuilder.addRepresentation(component, {
                type: part.type,
                color: PLDDT_COLOR_THEME,
              });
              coloured = true;
            } catch {
              coloured = false;
            }
          }
          if (!coloured) {
            await reprBuilder.addRepresentation(component, { type: part.type });
          }

          if (
            part.key === "polymer" &&
            this.representation() === "cartoon-and-sticks"
          ) {
            await reprBuilder.addRepresentation(component, {
              type: "ball-and-stick",
              typeParams: { sizeFactor: 0.18, sizeAspectRatio: 0.7 },
            });
          }
        }
      }
    } catch {
      /* non-critical — default visual still shows */
    }
  }

  /** One walk of the structure for all three outputs: map, count and index. */
  private emitStructureInfo(): void {
    try {
      const structures =
        this.plugin?.managers.structure.hierarchy.current?.structures ?? [];
      const residueMap = new Map<string, Set<number>>();
      const tokens = new Map<string, Map<number, ResidueToken>>();

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
            const atomIdVal = atomicHierarchy.atoms.label_atom_id.value;
            const moleculeType = atomicHierarchy.derived.residue.moleculeType;
            OrderedSet.forEach(unit.elements, (atomIdx) => {
              const chain = chainIdVal(chainIdx[atomIdx]);
              const resIdx = residueIdx[atomIdx];
              const resNum = seqIdVal(resIdx);
              if (!residueMap.has(chain)) residueMap.set(chain, new Set());
              residueMap.get(chain)!.add(resNum);

              if (!tokens.has(chain)) tokens.set(chain, new Map());
              const chainTokens = tokens.get(chain)!;
              const polymer = isPolymer(moleculeType[resIdx]);
              const existing = chainTokens.get(resNum);
              if (!existing) {
                chainTokens.set(resNum, {
                  polymer,
                  atoms: polymer ? [] : [atomIdVal(atomIdx)],
                });
              } else if (!existing.polymer) {
                existing.atoms.push(atomIdVal(atomIdx));
              }
            });
          } catch {
            /* skip unit */
          }
        }
      }

      if (residueMap.size > 0) {
        const total = [...residueMap.values()].reduce((n, s) => n + s.size, 0);
        const residueIndex = MolstarViewerComponent.toOrderedTokens(tokens);
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

  /**
   * PAE token order, which is how Boltz scores them: chains alphabetically,
   * residues ascending, a ligand one token per atom in file order.
   */
  private static toOrderedTokens(
    chains: Map<string, Map<number, ResidueToken>>
  ): ResidueRef[] {
    return [...chains.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .flatMap(([chain, residues]) =>
        [...residues.entries()]
          .sort(([a], [b]) => a - b)
          .flatMap(([seq, token]) =>
            token.polymer
              ? [{ chain, seq }]
              : token.atoms.map((atom) => ({ chain, seq, atom }))
          )
      );
  }

  /** Prevent any <button> inside the viewer from submitting the parent form. */
  private preventButtonFormSubmit(): void {
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

  /** "A56" or a same-chain range "A12-A14"; null if it is neither. */
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
