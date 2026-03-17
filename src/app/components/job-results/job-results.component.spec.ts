import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DomSanitizer } from "@angular/platform-browser";
import { By } from "@angular/platform-browser";
import { of, throwError } from "rxjs";
import { JobResultsComponent } from "./job-results.component";
import { JobListItem } from "../../cores/services/jobs.service";
import { ResultsService } from "../../cores/services/results.service";

describe("JobResultsComponent", () => {
  let component: JobResultsComponent;
  let fixture: ComponentFixture<JobResultsComponent>;
  let resultsService: jasmine.SpyObj<ResultsService>;
  let sanitizer: DomSanitizer;

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
    resultsService = jasmine.createSpyObj<ResultsService>("ResultsService", [
      "getJobReportResourceUrl",
      "getJobSettingParams",
    ]);

    await TestBed.configureTestingModule({
      imports: [JobResultsComponent],
      providers: [{ provide: ResultsService, useValue: resultsService }],
    }).compileComponents();

    sanitizer = TestBed.inject(DomSanitizer);
    resultsService.getJobReportResourceUrl.and.returnValue(
      of(sanitizer.bypassSecurityTrustResourceUrl("https://example.test/report.html"))
    );
    resultsService.getJobSettingParams.and.returnValue(
      of({
        runId: mockJob.id,
        settingParams: {
          binder_name: {
            label: "Binder Name",
            value: "PDL1",
            required: true,
            description: "Target binder name",
          },
          settings_filters: "https://example.test/default_filters.json",
          settings_advanced: "https://example.test/default_advanced.json",
          _source: "fallback_local",
          min_length: {
            label: "Min Length",
            value: 60,
            validation: { min: 1 },
          },
          max_length: {
            label: "Max Length",
            value: 120,
            validation: { max: 500 },
          },
        },
      })
    );

    fixture = TestBed.createComponent(JobResultsComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    component.job = mockJob;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: true,
        isFirstChange: () => true,
      },
      job: {
        currentValue: mockJob,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    fixture.detectChanges();
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should build and render the job report iframe", () => {
    expect(resultsService.getJobReportResourceUrl).toHaveBeenCalledWith(mockJob.id);
    expect(fixture.nativeElement.textContent).toContain("Job name");
    const iframe = fixture.nativeElement.querySelector("iframe") as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.title).toContain(mockJob.jobName);
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
    component.job = fallbackJob;

    component.ngOnChanges({
      job: {
        currentValue: fallbackJob,
        previousValue: mockJob,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.activeTab()).toBe("results");
    expect(resultsService.getJobReportResourceUrl.calls.mostRecent().args).toEqual([
      fallbackJob.id,
    ]);
    expect(resultsService.getJobSettingParams.calls.mostRecent().args).toEqual([
      fallbackJob.id,
    ]);
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

  it("should clear report state when closed", () => {
    component.reportUrl.set(
      sanitizer.bypassSecurityTrustResourceUrl("https://example.test/ready.html")
    );
    component.reportError.set("error");

    component.isOpen = false;
    component.ngOnChanges({
      isOpen: {
        currentValue: false,
        previousValue: true,
        firstChange: false,
        isFirstChange: () => false,
      },
    });

    expect(component.reportUrl()).toBeNull();
    expect(component.reportError()).toBeNull();
    expect(component.reportLoading()).toBeFalse();
    expect(component.settingsItems()).toEqual([]);
    expect(component.settingsError()).toBeNull();
    expect(component.settingsLoading()).toBeFalse();
  });

  it("should render logs tab content", () => {
    component.setActiveTab("logs");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      `Run ${mockJob.id} submitted successfully.`
    );
  });

  it("should stop loading when the report iframe loads", () => {
    const iframe = fixture.nativeElement.querySelector("iframe") as HTMLIFrameElement;

    iframe.dispatchEvent(new Event("load"));
    fixture.detectChanges();

    expect(component.reportLoading()).toBeFalse();
    expect(component.reportError()).toBeNull();
  });

  it("should handle report iframe loading errors", () => {
    const iframe = fixture.nativeElement.querySelector("iframe") as HTMLIFrameElement;

    iframe.dispatchEvent(new Event("error"));
    fixture.detectChanges();

    expect(component.reportError()).toBe("Failed to load report.");
    expect(fixture.nativeElement.textContent).toContain("Failed to load report.");
  });

  it("should handle report fetch errors", () => {
    resultsService.getJobReportResourceUrl.and.returnValue(
      throwError(() => new Error("report failed"))
    );

    fixture = TestBed.createComponent(JobResultsComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    component.job = mockJob;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: true,
        isFirstChange: () => true,
      },
      job: {
        currentValue: mockJob,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    fixture.detectChanges();

    expect(component.reportUrl()).toBeNull();
    expect(component.reportError()).toBe("Failed to load report.");
    expect(component.reportLoading()).toBeFalse();
  });

  it("should render API-backed settings values", () => {
    component.setActiveTab("settings");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Binder Name");
    expect(fixture.nativeElement.textContent).toContain("PDL1");
    expect(fixture.nativeElement.textContent).toContain("Min Length");
    expect(fixture.nativeElement.textContent).toContain("60");
    expect(fixture.nativeElement.textContent).toContain("Max: 500");
    expect(fixture.nativeElement.textContent).not.toContain("Settings Filters");
    expect(fixture.nativeElement.textContent).not.toContain("Settings Advanced");
    expect(fixture.nativeElement.textContent).not.toContain("default_filters.json");
    expect(fixture.nativeElement.textContent).not.toContain("default_advanced.json");
    expect(fixture.nativeElement.textContent).not.toContain("fallback_local");
    expect(fixture.nativeElement.textContent).not.toContain("Source");
  });

  it("should handle settings fetch errors", () => {
    resultsService.getJobSettingParams.and.returnValue(
      throwError(() => new Error("settings failed"))
    );

    fixture = TestBed.createComponent(JobResultsComponent);
    component = fixture.componentInstance;
    component.isOpen = true;
    component.job = mockJob;
    component.ngOnChanges({
      isOpen: {
        currentValue: true,
        previousValue: false,
        firstChange: true,
        isFirstChange: () => true,
      },
      job: {
        currentValue: mockJob,
        previousValue: null,
        firstChange: true,
        isFirstChange: () => true,
      },
    });
    fixture.detectChanges();

    expect(component.settingsItems()).toEqual([]);
    expect(component.settingsError()).toBe("Failed to load settings.");
    expect(component.settingsLoading()).toBeFalse();
  });

  it("should provide fallback values for helper methods", () => {
    const summaryItems = component.getSummaryItems(fallbackJob);
    const files = component.getFiles(fallbackJob);
    const logs = component.getLogs(fallbackJob);
    const citations = component.getCitations(fallbackJob);

    expect(summaryItems[1].value).toBe("N/A");
    expect(summaryItems[3].value).toBe("N/A");
    expect(files[0]).toBe("queued_job_summary.json");
    expect(logs[2]).toBe("Score has not been generated yet.");
    expect(citations[0]).toBe("Workflow methods and generated outputs.");
  });
});
