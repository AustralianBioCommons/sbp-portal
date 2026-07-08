import { Component, computed, input, output } from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroXMark } from "@ng-icons/heroicons/outline";

import { ButtonComponent } from "../../../../components/button/button.component";
import { ModalComponent } from "../../../../components/modal/modal.component";
import {
  ConfigurationSummaryComponent,
  SummaryItem,
} from "../configuration-summary/configuration-summary.component";

@Component({
  selector: "app-workflow-preview-modal",
  imports: [
    ModalComponent,
    ButtonComponent,
    NgIconComponent,
    ConfigurationSummaryComponent,
  ],
  providers: [provideIcons({ heroXMark })],
  templateUrl: "./workflow-preview-modal.component.html",
  styleUrl: "./workflow-preview-modal.component.scss",
})
export class WorkflowPreviewModalComponent {
  readonly isOpen = input(false);
  readonly title = input("Review & Submit");
  readonly credits = input<number | null>(null);
  readonly isSubmitting = input(false);

  readonly workflowName = input("");
  readonly selectedTool = input("");
  readonly hasParameters = input(false);
  readonly inputItems = input<SummaryItem[]>([]);
  readonly toolSettingItems = input<SummaryItem[]>([]);

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  readonly confirmLabel = computed(() => {
    const credits = this.credits();
    if (credits == null) {
      return "Submit";
    }
    const unit = credits === 1 ? "credit" : "credits";
    return `Use ${credits} ${unit} and submit`;
  });

  onConfirm(): void {
    this.confirmed.emit();
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
