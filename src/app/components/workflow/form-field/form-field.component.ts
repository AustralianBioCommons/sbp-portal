import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
} from "@angular/core";
import { InputSchemaField } from "../../../cores/input-schema.service";
import { PdbUploadService } from "../../../cores/services/pdb-upload.service";
import { AlertComponent } from "../../alert/alert.component";

@Component({
  selector: "app-form-field",
  standalone: true,
  imports: [AlertComponent],
  templateUrl: "./form-field.component.html",
})
export class FormFieldComponent {
  private pdbUploadService = inject(PdbUploadService);

  // Alert state
  showAlert = signal(false);
  alertMessage = signal("");
  alertType = signal<"error" | "success" | "warning" | "info">("error");

  @Input({ required: true }) field!: InputSchemaField;
  @Input() value: unknown = "";
  @Input() hasError = false;
  @Input() errorMessage: string | null = null;

  @Output() valueChange = new EventEmitter<unknown>();
  @Output() fieldBlur = new EventEmitter<void>();
  /** Emits the raw File immediately when the user picks a file, before any upload. */
  @Output() fileSelected = new EventEmitter<File | null>();

  get fieldId(): string {
    return `field-${this.field.name}`;
  }

  getDisplayFieldLabel(): string {
    const label = this.field.label || this.field.name;
    return label.replace(/\bPdb\b/g, "PDB");
  }

  closeAlert(): void {
    this.showAlert.set(false);
    this.alertMessage.set("");
  }

  private showError(message: string): void {
    this.alertMessage.set(message);
    this.alertType.set("error");
    this.showAlert.set(true);
  }

  onValueChange(newValue: unknown): void {
    this.valueChange.emit(newValue);
  }

  onBlur(): void {
    this.fieldBlur.emit();
  }

  onFileChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];

    if (!file) {
      this.valueChange.emit(null);
      this.fileSelected.emit(null);
      return;
    }

    try {
      // Validate the file using the service
      const validation = this.pdbUploadService.validatePdbFile(file);

      if (!validation.valid) {
        // If validation fails, emit null and show error
        console.error("File validation failed:", validation.error);
        this.showError(`${validation.error}`);
        this.valueChange.emit(null);
        this.fileSelected.emit(null);
        return;
      }

      // Emit the file for local preview; upload is deferred to Next click
      this.fileSelected.emit(file);
      // Use filename as placeholder so required validation passes before upload
      this.valueChange.emit(file.name);
    } catch (error) {
      console.error("Unexpected error during file processing:", error);
      this.showError("An unexpected error occurred while processing the file.");
      this.valueChange.emit(null);
    }
  }

  getInputClasses(): string {
    return (
      "block h-10 w-full px-4 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-100 " +
      (this.hasError
        ? "border-red-500 text-red-900 placeholder-red-400"
        : "bg-white text-gray-900 placeholder-gray-400")
    );
  }

  getSelectClasses(): string {
    return (
      "block h-10 w-full px-4 border rounded-md text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-sky-100 " +
      (this.hasError ? "border-red-500 text-red-900" : "bg-white text-gray-900")
    );
  }

  getFileClasses(): string {
    return (
      "w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-50 file:text-sky-700 hover:file:bg-sky-100 " +
      (this.hasError ? "file:bg-red-100 file:text-red-700" : "")
    );
  }
}
