import { Component } from "@angular/core";
import { RouterLink } from "@angular/router";
import { ButtonComponent } from "../../components/button/button.component";

@Component({
  selector: "app-not-found",
  imports: [RouterLink, ButtonComponent],
  templateUrl: "./not-found.html",
  styleUrl: "./not-found.scss",
})
export default class NotFoundComponent {}
