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
      "getJobLogs",
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
    resultsService.getJobLogs.and.returnValue(
      of({
        runId: mockJob.id,
        entries: ["raw line that should not render first"],
        formattedEntries: [
          {
            index: 0,
            raw: "Loading nextflow/25.10.3",
            message: "Loading nextflow/25.10.3",
            level: "INFO",
          },
          {
            index: 1,
            raw: " Loading requirement: java/jdk-17.0.2",
            message: "Loading requirement: java/jdk-17.0.2",
            level: "INFO",
          },
        ],
        logs: "fallback line",
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
    expect(resultsService.getJobLogs).toHaveBeenCalledWith(mockJob.id);
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
    expect(component.logsItems()).toEqual([]);
    expect(component.logsError()).toBeNull();
    expect(component.logsLoading()).toBeFalse();
  });

  it("should render logs tab content", () => {
    component.setActiveTab("logs");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Loading nextflow/25.10.3");
    expect(fixture.nativeElement.textContent).toContain(
      "Loading requirement: java/jdk-17.0.2"
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      "raw line that should not render first"
    );
  });

  it("should handle logs fetch errors", () => {
    resultsService.getJobLogs.and.returnValue(
      throwError(() => new Error("logs failed"))
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

    component.setActiveTab("logs");
    fixture.detectChanges();

    expect(component.logsItems()).toEqual([]);
    expect(component.logsError()).toBe("Failed to load logs.");
    expect(component.logsLoading()).toBeFalse();
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
    const citations = component.getCitations(fallbackJob);

    expect(summaryItems[1].value).toBe("N/A");
    expect(summaryItems[3].value).toBe("N/A");
    expect(files[0]).toBe("queued_job_summary.json");
    expect(citations[0]).toBe("Workflow methods and generated outputs.");
  });

  it("should normalize logs from entries when formatted entries are not available", () => {
    const lines = (component as any).normalizeLogsResponse({
      runId: mockJob.id,
      entries: ["  first  ", "", " second"],
      formattedEntries: [],
      logs: null,
    });

    expect(lines).toEqual(["first", "second"]);
  });

  it("should normalize logs from string fallback when entries are missing", () => {
    const lines = (component as any).normalizeLogsResponse({
      runId: mockJob.id,
      logs: "line 1\n\n line 2 ",
    });

    expect(lines).toEqual(["line 1", "line 2"]);
  });

  it("should normalize logs from array fallback", () => {
    const lines = (component as any).normalizeLogs([" a ", "", "b "]);
    expect(lines).toEqual(["a", "b"]);
  });

  it("should return empty normalized logs for nullish input", () => {
    const lines = (component as any).normalizeLogs(null);
    expect(lines).toEqual([]);
  });

  it("should normalize settings labels and schema details", () => {
    const items = (component as any).normalizeSettings({
      _internal: "ignore",
      settings_filters: "ignore",
      simple_key: "value",
      schema_key: {
        label: "Schema Label",
        value: 7,
        description: "desc",
        helpText: "help",
        placeholder: "placeholder",
        required: true,
        validation: {
          min: 1,
          max: 10,
          minLength: 2,
          maxLength: 20,
          pattern: "^[A-Z]+$",
          format: "uri",
        },
      },
    });

    expect(items.length).toBe(2);
    expect(items[0].label).toBe("Simple Key");
    expect(items[0].value).toBe("value");
    expect(items[1].label).toBe("Schema Label");
    expect(items[1].value).toBe("7");
    expect(items[1].details).toContain("desc");
    expect(items[1].details).toContain("Help: help");
    expect(items[1].details).toContain("Placeholder: placeholder");
    expect(items[1].details).toContain("Required");
    expect(items[1].details).toContain("Min: 1");
    expect(items[1].details).toContain("Max: 10");
    expect(items[1].details).toContain("Min length: 2");
    expect(items[1].details).toContain("Max length: 20");
    expect(items[1].details).toContain("Pattern: ^[A-Z]+$");
    expect(items[1].details).toContain("Format: uri");
  });

  it("should return empty settings for null setting params", () => {
    const items = (component as any).normalizeSettings(null);
    expect(items).toEqual([]);
  });

  it("should format setting label edge cases", () => {
    expect((component as any).formatSettingLabel("___")).toBe("___");
    expect((component as any).formatSettingLabel("starting-pdb_file")).toBe(
      "Starting Pdb File"
    );
  });

  it("should format setting value branches including stringify fallback", () => {
    expect((component as any).formatSettingValue(undefined)).toBe("N/A");
    expect((component as any).formatSettingValue("   ")).toBe("N/A");
    expect((component as any).formatSettingValue(10)).toBe("10");
    expect((component as any).formatSettingValue(true)).toBe("true");
    expect((component as any).formatSettingValue({ a: 1 })).toBe('{"a":1}');

    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    expect((component as any).formatSettingValue(circular)).toBe(
      "[object Object]"
    );
  });

  it("should return empty validation details when no validation is provided", () => {
    expect((component as any).formatValidationDetails(undefined)).toEqual([]);
  });

  it("should reset logs without loading when opening logs tab without a selected job", () => {
    component.isOpen = true;
    component.job = null;
    component.logsItems.set(["existing"]);
    component.logsError.set("error");

    component.setActiveTab("logs");

    expect(component.logsItems()).toEqual([]);
    expect(component.logsError()).toBeNull();
    expect(component.logsLoading()).toBeFalse();
    expect(resultsService.getJobLogs).not.toHaveBeenCalled();
  });
});
