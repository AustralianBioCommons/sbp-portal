import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from "@angular/core";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroCheckCircleSolid,
  heroExclamationTriangleSolid,
  heroXCircleSolid,
  heroXMarkSolid,
} from "@ng-icons/heroicons/solid";

export type AlertType = "success" | "error" | "warning";
export type AlertPosition = "fixed" | "static";

@Component({
  selector: "app-alert",
  templateUrl: "./alert.component.html",
  styleUrl: "./alert.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [NgIconComponent],
  viewProviders: [
    provideIcons({
      heroCheckCircleSolid,
      heroExclamationTriangleSolid,
      heroXCircleSolid,
      heroXMarkSolid,
    }),
  ],
})
export class AlertComponent {
  type = input<AlertType>("error");
  message = input<string>("");
  dismissible = input<boolean>(false);
  position = input<AlertPosition>("fixed");

  dismissed = output<void>();

  rootClasses = computed(() => {
    const posClasses =
      this.position() === "fixed" ? "fixed right-4 top-4 z-50" : "static";
    const colorClasses =
      this.type() === "success"
        ? "bg-green-50 border-success"
        : this.type() === "warning"
        ? "bg-yellow-50 border-yellow-300"
        : "bg-red-50 border-error";
    return `${posClasses} flex max-w-md items-center gap-2 rounded-md p-4 shadow ${colorClasses}`;
  });

  onDismiss(): void {
    this.dismissed.emit();
  }
}
