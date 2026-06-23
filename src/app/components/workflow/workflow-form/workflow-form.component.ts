import {
  AfterViewInit,
  Component,
  computed,
  input,
  output,
  signal,
} from "@angular/core";
import { takeUntilDestroyed } from "@angular/core/rxjs-interop";
import { animationFrameScheduler, fromEvent } from "rxjs";
import { auditTime } from "rxjs/operators";
import { ButtonComponent } from "../../button/button.component";

export interface WorkflowSection {
  id: string;
  label: string;
  mobileLabel?: string;
}

@Component({
  selector: "app-workflow-form",
  imports: [ButtonComponent],
  templateUrl: "./workflow-form.component.html",
  styleUrl: "./workflow-form.component.scss",
  host: { class: "block" },
})
export class WorkflowFormComponent implements AfterViewInit {
  readonly sections = input.required<WorkflowSection[]>();
  readonly isSectionValid = input<(id: string) => boolean>(() => true);
  readonly disabled = input(false);
  readonly submitDisabled = input(false);
  readonly submitLabel = input("Submit");
  readonly isSubmitting = input(false);
  readonly submitted = output<void>();
  readonly activeSection = signal<string>("");
  readonly visitedSections = signal<Set<string>>(new Set());

  private readonly activeIndex = computed(() =>
    this.sections().findIndex((s) => s.id === this.activeSection())
  );

  constructor() {
    fromEvent(window, "scroll", { passive: true })
      .pipe(auditTime(0, animationFrameScheduler), takeUntilDestroyed())
      .subscribe(() => this.updateActiveSection());
  }

  ngAfterViewInit(): void {
    const first = this.sections()[0];
    if (first) {
      this.activeSection.set(first.id);
      this.visitedSections.set(new Set([first.id]));
    }
    this.updateActiveSection();
  }

  /** Recompute the active/visited sections from the current scroll position. */
  private updateActiveSection(): void {
    const sections = this.sections();
    if (sections.length === 0) return;

    const scrollPosition = window.scrollY;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    // A section becomes "active" once its top crosses the upper third.
    const threshold = windowHeight / 3;

    // Near the bottom of the page, force-activate the last section so the final
    // section is reachable even when it is short.
    if (scrollPosition + windowHeight >= documentHeight - 50) {
      this.activeSection.set(sections[sections.length - 1].id);
      this.visitedSections.set(new Set(sections.map((s) => s.id)));
      return;
    }

    for (let i = sections.length - 1; i >= 0; i--) {
      const element = document.getElementById(sections[i].id);
      if (element && element.getBoundingClientRect().top <= threshold) {
        this.activeSection.set(sections[i].id);
        this.visitedSections.update((visited) => {
          const next = new Set(visited);
          for (let j = 0; j <= i; j++) next.add(sections[j].id);
          return next;
        });
        return;
      }
    }
  }

  scrollToSection(event: Event, sectionId: string): void {
    event.preventDefault();
    this.scrollTo(sectionId);
  }

  scrollToFirstInvalidSection(): void {
    const invalid = this.sections().find((s) => !this.isSectionValid()(s.id));
    if (invalid) this.scrollTo(invalid.id);
  }

  private scrollTo(sectionId: string): void {
    document
      .getElementById(sectionId)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  isSectionActive(id: string): boolean {
    return this.activeSection() === id;
  }

  isSectionVisited(id: string): boolean {
    return this.visitedSections().has(id);
  }

  isSectionCompleted(id: string): boolean {
    const index = this.sections().findIndex((s) => s.id === id);
    return this.isSectionVisited(id) && index < this.activeIndex();
  }

  sectionValid(id: string): boolean {
    return this.isSectionValid()(id);
  }

  isLast(id: string): boolean {
    const sections = this.sections();
    return sections.length > 0 && sections[sections.length - 1].id === id;
  }

  circleClasses(id: string): string {
    const active = this.isSectionActive(id);
    const completed = this.isSectionCompleted(id);
    const visited = this.isSectionVisited(id);
    const valid = this.sectionValid(id);
    const last = this.isLast(id);
    const classes: string[] = [];

    if (!visited) classes.push("border-gray-300");
    if (active || ((visited || completed) && valid))
      classes.push("border-biocommons-primary group-hover:border-sky-900");
    if (!active && !valid && (completed || visited))
      classes.push("border-red-600 group-hover:border-red-700");

    if ((completed && valid) || (last && active && valid))
      classes.push("bg-biocommons-primary group-hover:bg-sky-900");
    if (completed && !valid) classes.push("bg-red-600 group-hover:bg-red-700");
    if (!completed && !(last && active && valid))
      classes.push("bg-white hover:bg-gray-100");

    return classes.join(" ");
  }

  labelClasses(id: string): string {
    return this.isSectionActive(id) || this.isSectionCompleted(id)
      ? "text-biocommons-primary"
      : "text-gray-900";
  }

  connectorClasses(id: string): string {
    return this.isSectionCompleted(id)
      ? "bg-biocommons-primary"
      : "bg-gray-300";
  }

  onSubmit(): void {
    this.submitted.emit();
  }
}
