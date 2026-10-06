import { Component, signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Router, provideRouter } from "@angular/router";
import { Observable, of } from "rxjs";
import { AuthService } from "../../../../core/services/auth.service";
import { WorkflowSubmissionService } from "../../services/workflow-submission.service";
import { WorkflowLayoutComponent } from "./workflow-layout.component";

@Component({
  imports: [WorkflowLayoutComponent],
  template: `
    <app-workflow-layout heading="Test Workflow">
      <p output>Workflow example output</p>
    </app-workflow-layout>
  `,
})
class OutputHostComponent {}

describe("WorkflowLayoutComponent", () => {
  let component: WorkflowLayoutComponent;
  let fixture: ComponentFixture<WorkflowLayoutComponent>;
  let workflowSubmissionService: {
    isSubmitting: ReturnType<typeof signal<boolean>>;
    showSuccessDialog: ReturnType<typeof signal<boolean>>;
    successDialogData: ReturnType<
      typeof signal<{ runId: string; status: string } | null>
    >;
    goToJobs: jasmine.Spy;
  };
  let authService: {
    isAuthenticated$: Observable<boolean>;
    canExecuteWorkflows$: Observable<boolean>;
    login: jasmine.Spy;
  };

  beforeEach(async () => {
    workflowSubmissionService = {
      isSubmitting: signal(false),
      showSuccessDialog: signal(false),
      successDialogData: signal(null),
      goToJobs: jasmine.createSpy("goToJobs"),
    };
    authService = {
      isAuthenticated$: of(true),
      canExecuteWorkflows$: of(true),
      login: jasmine.createSpy("login"),
    };

    await TestBed.configureTestingModule({
      imports: [WorkflowLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authService },
        {
          provide: WorkflowSubmissionService,
          useValue: workflowSubmissionService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WorkflowLayoutComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput("heading", "Test Workflow");
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should default to the execute tab", () => {
    expect(component.isActiveTab("execute")).toBe(true);
    expect(component.isActiveTab("about")).toBe(false);
  });

  it("should switch the active tab", () => {
    component.switchTab("papers");
    expect(component.isActiveTab("papers")).toBe(true);
    expect(component.isActiveTab("execute")).toBe(false);
  });

  it("should open the tab named in the URL, falling back to Execute", async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl("/?tab=papers");
    expect(component.isActiveTab("papers")).toBe(true);

    await router.navigateByUrl("/?tab=unknown");
    expect(component.isActiveTab("execute")).toBe(true);
  });

  it("should keep the open tab in the URL, leaving Execute out", async () => {
    const router = TestBed.inject(Router);

    component.switchTab("output");
    await fixture.whenStable();
    expect(router.url).toBe("/?tab=output");

    component.switchTab("execute");
    await fixture.whenStable();
    expect(router.url).toBe("/");
  });

  it("should move selection with arrow keys and wrap around", () => {
    const press = (key: string) => {
      const selected: HTMLElement = fixture.nativeElement.querySelector(
        '[role="tab"][aria-selected="true"]'
      );
      selected.dispatchEvent(new KeyboardEvent("keydown", { key }));
      fixture.detectChanges();
    };

    press("ArrowRight");
    expect(component.isActiveTab("about")).toBe(true);

    press("ArrowLeft");
    expect(component.isActiveTab("execute")).toBe(true);

    press("ArrowLeft");
    expect(component.isActiveTab("papers")).toBe(true);

    press("Home");
    expect(component.isActiveTab("execute")).toBe(true);

    press("End");
    expect(component.isActiveTab("papers")).toBe(true);
  });

  it("should expose the selected tab to assistive technology", () => {
    const selected: HTMLElement = fixture.nativeElement.querySelector(
      '[role="tab"][aria-selected="true"]'
    );
    const panel: HTMLElement =
      fixture.nativeElement.querySelector('[role="tabpanel"]');

    expect(selected.textContent?.trim()).toBe("Execute");
    expect(selected.getAttribute("tabindex")).toBe("0");
    expect(selected.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(selected.id);
  });

  it("should show the page's example output in the output tab", () => {
    const hostFixture = TestBed.createComponent(OutputHostComponent);
    hostFixture.detectChanges();
    hostFixture.debugElement
      .query(By.directive(WorkflowLayoutComponent))
      .componentInstance.switchTab("output");
    hostFixture.detectChanges();

    const panel: HTMLElement =
      hostFixture.nativeElement.querySelector('[role="tabpanel"]');
    expect(panel.textContent).toContain("Workflow example output");
    expect(panel.textContent).not.toContain("will appear here");
  });

  it("should fall back to placeholder text without an example output", () => {
    component.switchTab("output");
    fixture.detectChanges();

    const panel: HTMLElement =
      fixture.nativeElement.querySelector('[role="tabpanel"]');
    expect(panel.textContent).toContain("will appear here after submission");
  });

  it("should delegate goToJobs to the workflow submission service", () => {
    component.goToJobs();
    expect(workflowSubmissionService.goToJobs).toHaveBeenCalled();
  });

  it("should call auth.login with the current url on loginWithReturnUrl", () => {
    component.loginWithReturnUrl();
    expect(authService.login).toHaveBeenCalledWith(
      window.location.pathname + window.location.search
    );
  });
});
