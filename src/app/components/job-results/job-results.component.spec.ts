import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { JobResultsComponent } from "./job-results.component";
import { JobListItem } from "../../cores/services/jobs.service";

describe("JobResultsComponent", () => {
  let component: JobResultsComponent;
  let fixture: ComponentFixture<JobResultsComponent>;

  const mockJob: JobListItem = {
    id: "job-1",
    jobName: "Example job",
    workflowType: "Binder design",
    status: "In progress",
    submittedAt: "2026-03-12T10:00:00Z",
    score: 0.95,
    finalDesignCount: 3,
  };

  const fallbackJob: JobListItem = {
    id: "job-2",
    jobName: "Queued job",
    workflowType: null,
    status: "In queue",
    submittedAt: "2026-03-12T11:00:00Z",
    score: null,
    finalDesignCount: null,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [JobResultsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(JobResultsComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    component.job = mockJob;
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should render job details content", () => {
    expect(fixture.nativeElement.textContent).toContain("Job name");
    expect(fixture.nativeElement.textContent).toContain(mockJob.jobName);
    expect(fixture.nativeElement.textContent).toContain("Download all files");
    expect(fixture.nativeElement.textContent).toContain("Submitted");
    expect(fixture.nativeElement.textContent).toContain("Score");
  });

  it("should emit close, delete, and download requests", () => {
    spyOn(component.closeRequested, "emit");
    spyOn(component.deleteRequested, "emit");
    spyOn(component.downloadRequested, "emit");

    const buttons = fixture.debugElement.queryAll(By.css("button"));
    buttons[0].nativeElement.click();
    buttons[1].nativeElement.click();
    buttons[2].nativeElement.click();

    expect(component.deleteRequested.emit).toHaveBeenCalled();
    expect(component.downloadRequested.emit).toHaveBeenCalled();
    expect(component.closeRequested.emit).toHaveBeenCalled();
  });

  it("should switch tabs and reset when inputs change", () => {
    component.setActiveTab("logs");
    expect(component.activeTab()).toBe("logs");

    component.ngOnChanges({
      job: {
        currentValue: fallbackJob,
        previousValue: mockJob,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.activeTab()).toBe("results");
  });

  it("should not reset the active tab for unrelated input changes", () => {
    component.setActiveTab("files");

    component.ngOnChanges({
      tabs: {
        currentValue: [],
        previousValue: [],
        firstChange: false,
        isFirstChange: () => false,
      },
    } as never);

    expect(component.activeTab()).toBe("files");
  });

  it("should reset the active tab when the open state changes", () => {
    component.setActiveTab("citations");

    component.ngOnChanges({
      isOpen: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.activeTab()).toBe("results");
  });

  it("should render logs tab content", () => {
    component.setActiveTab("logs");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      `Run ${mockJob.id} submitted successfully.`
    );
  });

  it("should provide fallback values for helper methods", () => {
    const summaryItems = component.getSummaryItems(fallbackJob);
    const files = component.getFiles(fallbackJob);
    const settings = component.getSettings(fallbackJob);
    const logs = component.getLogs(fallbackJob);
    const citations = component.getCitations(fallbackJob);

    expect(summaryItems[1].value).toBe("N/A");
    expect(summaryItems[3].value).toBe("N/A");
    expect(files[0]).toBe("queued_job_summary.json");
    expect(settings[0].value).toBe("N/A");
    expect(settings[2].value).toBe("N/A");
    expect(logs[2]).toBe("Score has not been generated yet.");
    expect(citations[0]).toBe("Workflow methods and generated outputs.");
  });

  it("should provide populated settings values when job metadata exists", () => {
    const settings = component.getSettings(mockJob);

    expect(settings[0].value).toBe(mockJob.workflowType);
    expect(settings[1].value).toBe(mockJob.id);
    expect(settings[2].value).toBe("3");
  });
});
