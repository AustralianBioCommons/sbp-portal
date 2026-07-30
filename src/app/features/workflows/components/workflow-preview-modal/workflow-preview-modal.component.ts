import { Component, computed, input, output } from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import { heroXMark } from "@ng-icons/heroicons/outline";

import { ButtonComponent } from "../../../../components/button/button.component";
import { ModalComponent } from "../../../../components/modal/modal.component";
import { CreditSummaryComponent } from "../credit-summary/credit-summary.component";

export interface SummaryItem {
  label: string;
  value: string;
  fieldName: string;
  url?: string;
}

export interface EntitySummaryItem {
  type: string;
  name: string;
  sequence: string;
}

@Component({
  selector: "app-workflow-preview-modal",
  imports: [
    ModalComponent,
    ButtonComponent,
    NgIconComponent,
    CreditSummaryComponent,
  ],
  providers: [provideIcons({ heroXMark })],
  templateUrl: "./workflow-preview-modal.component.html",
  styleUrl: "./workflow-preview-modal.component.scss",
})
export class WorkflowPreviewModalComponent {
  readonly isOpen = input(false);
  readonly heading = input("Review & Submit");
  readonly credits = input<number | null>(null);
  readonly creditsRemaining = input<number | null>(null);
  readonly isSubmitting = input(false);

  readonly workflowName = input("");
  readonly selectedTool = input("");
  readonly hasParameters = input(false);
  readonly inputItems = input<SummaryItem[]>([]);
  readonly inputEntities = input<EntitySummaryItem[]>([]);
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
