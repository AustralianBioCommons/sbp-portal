import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Observable, of } from "rxjs";
import { AuthService } from "../../../../core/services/auth.service";
import { WorkflowSubmissionService } from "../../services/workflow-submission.service";
import { WorkflowLayoutComponent } from "./workflow-layout.component";

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
