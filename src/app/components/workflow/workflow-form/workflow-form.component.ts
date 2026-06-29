import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from "@angular/core";
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
export class WorkflowFormComponent {
  readonly sections = input.required<WorkflowSection[]>();
  readonly isSectionValid = input<(id: string) => boolean>(() => true);
  readonly disabled = input(false);
  readonly submitDisabled = input(false);
  readonly credits = input<number | null>(null);
  readonly isSubmitting = input(false);
  readonly submitted = output<void>();

  readonly allSectionsValid = computed(() =>
    this.sections().every((s) => this.isSectionValid()(s.id))
  );

  readonly buttonLabel = computed(() => {
    const credits = this.credits();
    if (credits == null) return "Submit";
    const unit = credits === 1 ? "credit" : "credits";
    return `Use ${credits} ${unit} and submit`;
  });
  readonly activeSection = signal<string>("");
  readonly visitedSections = signal<Set<string>>(new Set());

  private readonly activeIndex = computed(() =>
    this.sections().findIndex((s) => s.id === this.activeSection())
  );

  private readonly destroyRef = inject(DestroyRef);
  private readonly bottomSentinel =
    viewChild<ElementRef<HTMLElement>>("bottomSentinel");

  /** Ids of sections currently crossing the activation line. */
  private readonly intersecting = new Set<string>();
  private atBottom = false;

  constructor() {
    afterNextRender(() => {
      const first = this.sections()[0];
      if (first) {
        this.activeSection.set(first.id);
        this.visitedSections.set(new Set([first.id]));
      }
      this.setupObservers();
    });
  }

  private setupObservers(): void {
    const sections = this.sections();
    if (sections.length === 0) return;

    // rootMargin shrinks the root's bottom edge up by 67%, leaving an
    // activation band in the top third of the viewport.
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) this.intersecting.add(entry.target.id);
          else this.intersecting.delete(entry.target.id);
        }
        this.recomputeActiveSection();
      },
      { rootMargin: "0px 0px -67% 0px", threshold: 0 }
    );
    for (const section of sections) {
      const element = document.getElementById(section.id);
      if (element) sectionObserver.observe(element);
    }

    // A short final section can't scroll up to the activation line, so force it
    // once the form's end comes into view.
    let bottomObserver: IntersectionObserver | undefined;
    const sentinel = this.bottomSentinel()?.nativeElement;
    if (sentinel) {
      bottomObserver = new IntersectionObserver(([entry]) => {
        this.atBottom = entry.isIntersecting;
        this.recomputeActiveSection();
      });
      bottomObserver.observe(sentinel);
    }

    this.destroyRef.onDestroy(() => {
      sectionObserver.disconnect();
      bottomObserver?.disconnect();
    });
  }

  private recomputeActiveSection(): void {
    const sections = this.sections();
    if (sections.length === 0) return;

    if (this.atBottom) {
      this.activeSection.set(sections[sections.length - 1].id);
      this.visitedSections.set(new Set(sections.map((s) => s.id)));
      return;
    }

    // The deepest section crossing the activation line is the active one.
    let activeIndex = -1;
    for (let i = sections.length - 1; i >= 0; i--) {
      if (this.intersecting.has(sections[i].id)) {
        activeIndex = i;
        break;
      }
    }
    // Nothing crossing the line yet; keep the current active section.
    if (activeIndex === -1) return;

    this.activeSection.set(sections[activeIndex].id);
    this.visitedSections.update((visited) => {
      const next = new Set(visited);
      for (let j = 0; j <= activeIndex; j++) next.add(sections[j].id);
      return next;
    });
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
