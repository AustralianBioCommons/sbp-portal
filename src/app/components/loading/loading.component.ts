import { ChangeDetectionStrategy, Component, input } from "@angular/core";

@Component({
  selector: "app-loading",
  templateUrl: "./loading.component.html",
  styleUrl: "./loading.component.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoadingComponent {
  message = input<string>("Loading...");
  inline = input<boolean>(false);
}
