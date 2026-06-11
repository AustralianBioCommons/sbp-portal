import { ChangeDetectionStrategy, Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowLeft,
  heroHome,
  heroMagnifyingGlass,
} from "@ng-icons/heroicons/outline";
import { ButtonComponent } from "../../components/button/button.component";

@Component({
  selector: "app-not-found",
  imports: [NgIconComponent, ButtonComponent, RouterLink],
  providers: [provideIcons({ heroHome, heroArrowLeft, heroMagnifyingGlass })],
  templateUrl: "./not-found.html",
  styleUrl: "./not-found.scss",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class NotFoundComponent {
  goBack() {
    window.history.back();
  }
}
