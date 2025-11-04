import { Component, Signal, computed, signal, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { AuthService } from "../../../cores/auth.service";

interface TabItem {
  id: "overview" | "output" | "papers";
  label: string;
}

interface ToolChip {
  id: "alphafold" | "bindcraft" | "colabfold";
  label: string;
  description?: string;
}

interface StepItem {
  id: number;
  title: string;
  description: string;
}

@Component({
  selector: "app-single-structure-prediction",
  standalone: true,
  imports: [CommonModule, FormsModule],
  host: {
    class: "block w-full"
  },
  templateUrl: "./single-structure-prediction.html",
  styleUrls: ["./single-structure-prediction.scss"]
})
export class SingleStructurePredictionComponent {
  // Auth
  public auth = inject(AuthService);
  // Tabs
  readonly tabs: TabItem[] = [
    { id: "overview", label: "Overview" },
    { id: "output", label: "Output" },
    { id: "papers", label: "Papers" }
  ];
  activeTab = signal<TabItem["id"]>("overview");
  isActiveTab = (id: TabItem["id"]) => this.activeTab() === id;
  switchTab(id: TabItem["id"]) {
    this.activeTab.set(id);
  }

  // Tools
  readonly tools: ToolChip[] = [
    { id: "alphafold", label: "AlphaFold" },
    { id: "bindcraft", label: "BindCraft" },
    { id: "colabfold", label: "ColabFold" }
  ];
  selectedTool = signal<ToolChip["id"]>("bindcraft");
  isToolSelected = (id: ToolChip["id"]) => this.selectedTool() === id;
  selectTool(id: ToolChip["id"]) {
    this.selectedTool.set(id);
  }
  selectedToolLabel: Signal<string> = computed(
    () => this.tools.find(t => t.id === this.selectedTool())?.label ?? ""
  );

  // Job note
  jobNote = signal<string>("");

  // Step data inputs
  // Step 1: Input configuration
  inputSequence = signal<string>("");
  inputFileName = signal<string>("");

  // Step 2: Tool settings
  maxRecycles = signal<string>("");
  ensemble = signal<string>("");
  relax = signal<string>("");

  // Step 3: Resource allocation
  gpuType = signal<string>("");
  gpus = signal<string>("");
  priority = signal<string>("");

  // Steps marked complete only when user presses Next on that step
  completedSteps = signal<number[]>([]);
  isStepComplete = (id: number) => this.completedSteps().includes(id);

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input?.files?.[0];
    this.inputFileName.set(file ? file.name : "");
  }

  // Stepper
  readonly steps: StepItem[] = [
    { id: 1, title: "Input Configuration", description: "Provide sequence or structure inputs" },
    { id: 2, title: "Tool Settings", description: "Configure parameters specific to the selected tool" },
    { id: 3, title: "Resource Allocation", description: "Choose compute resources and priority" },
    { id: 4, title: "Review & Submit", description: "Review all settings and run the job" }
  ];
  currentStep = signal<number>(1);
  canGoPrev: Signal<boolean> = computed(() => this.currentStep() > 1);
  canGoNext: Signal<boolean> = computed(() => this.currentStep() < this.steps.length);

  previousStep() {
    if (this.currentStep() > 1) this.currentStep.update(v => v - 1);
  }
  nextStep() {
    if (this.currentStep() < this.steps.length) {
      const current = this.currentStep();
      this.completedSteps.update(arr => (arr.includes(current) ? arr : [...arr, current]));
      this.currentStep.update(v => v + 1);
    }
  }
  goToStep(step: number) {
    if (step >= 1 && step <= this.steps.length) this.currentStep.set(step);
  }

  submitWorkflow() {
    // Placeholder: hook up to actual submission later
    console.log("Submitting Single Structure Prediction:", {
      tool: this.selectedTool(),
      jobNote: this.jobNote(),
      step: this.currentStep()
    });
  }
}
