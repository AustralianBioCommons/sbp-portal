import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { Observable, of } from "rxjs";
import { AuthService } from "../../cores/auth.service";
import { WorkflowSubmissionService } from "../../cores/services/workflow-submission.service";
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
    fixture.componentRef.setInput("title", "Test Workflow");
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should default to the overview tab", () => {
    expect(component.isActiveTab("overview")).toBe(true);
    expect(component.isActiveTab("output")).toBe(false);
  });

  it("should switch the active tab", () => {
    component.switchTab("papers");
    expect(component.isActiveTab("papers")).toBe(true);
    expect(component.isActiveTab("overview")).toBe(false);
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
