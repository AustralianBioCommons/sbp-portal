import { ComponentFixture, TestBed } from "@angular/core/testing";
import { DomSanitizer } from "@angular/platform-browser";
import { By } from "@angular/platform-browser";
import { of, throwError } from "rxjs";
import { JobResultsComponent } from "./job-results.component";
import { JobListItem } from "../../cores/services/jobs.service";
import {
  ResultLogsResponse,
  ResultsService,
} from "../../cores/services/results.service";
import { environment } from "../../../environments/environment";

type JobResultsPrivateApi = {
  normalizeLogsResponse: (response: ResultLogsResponse) => string[];
  normalizeLogs: (logs: string | string[] | null | undefined) => string[];
  normalizeSettings: (
    settingParams: Record<string, unknown> | null | undefined,
  ) => Array<{ label: string; value: string; details: string[]; url?: string }>;
  formatSettingLabel: (key: string) => string;
  formatSettingValue: (value: unknown) => string;
  formatValidationDetails: (
    validation: Record<string, unknown> | undefined,
  ) => string[];
  isPdbSettingKey: (key: string) => boolean;
  extractFilename: (path: string) => string;
};

describe("JobResultsComponent", () => {
  let component: JobResultsComponent;
  let fixture: ComponentFixture<JobResultsComponent>;
  let resultsService: jasmine.SpyObj<ResultsService>;
  let sanitizer: DomSanitizer;

  const mockJob: JobListItem = {
    id: "job-1",
    jobName: "Example job",
    tool: "Binder design",
    workflow: "",
    status: "In progress",
    submittedAt: "2026-03-12T10:00:00Z",
    score: 0.95,
    finalDesignCount: 3,
  };

  const fallbackJob: JobListItem = {
    id: "job-2",
    jobName: "Queued job",
    tool: "",
    workflow: "",
    status: "In queue",
    submittedAt: "2026-03-12T11:00:00Z",
    score: null,
    finalDesignCount: null,
  };

  beforeEach(async () => {
    resultsService = jasmine.createSpyObj<ResultsService>("ResultsService", [
      "getJobReport",
      "getJobDownloads",
      "getJobSettingParams",
      "getJobLogs",
    ]);

    await TestBed.configureTestingModule({
      imports: [JobResultsComponent],
      providers: [{ provide: ResultsService, useValue: resultsService }],
    }).compileComponents();

    sanitizer = TestBed.inject(DomSanitizer);
    resultsService.getJobReport.and.returnValue(
      of(
        sanitizer.bypassSecurityTrustResourceUrl(
          "https://example.test/report.html",
        ),
      ),
    );
    resultsService.getJobDownloads.and.returnValue(
      of({ runId: mockJob.id, downloads: [] }),
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
      }),
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
      }),
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
    expect(resultsService.getJobReport).toHaveBeenCalledWith(mockJob.id);
    const iframe = fixture.nativeElement.querySelector(
      "iframe",
    ) as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.title).toContain(mockJob.jobName);
  });

  it("should emit close and delete requests", () => {
    spyOn(component.closeRequested, "emit");
    spyOn(component.deleteRequested, "emit");

    const buttons = fixture.debugElement.queryAll(By.css("button"));
    buttons[0].nativeElement.click(); // Delete
    buttons[2].nativeElement.click(); // Close (buttons[1] is the disabled Download button)

    expect(component.deleteRequested.emit).toHaveBeenCalled();
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
    expect(resultsService.getJobReport.calls.mostRecent().args).toEqual([
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
      sanitizer.bypassSecurityTrustResourceUrl(
        "https://example.test/ready.html",
      ),
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

    expect(fixture.nativeElement.textContent).toContain(
      "Loading nextflow/25.10.3",
    );
    expect(fixture.nativeElement.textContent).toContain(
      "Loading requirement: java/jdk-17.0.2",
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      "raw line that should not render first",
    );
  });

  it("should handle logs fetch errors", () => {
    resultsService.getJobLogs.and.returnValue(
      throwError(() => new Error("logs failed")),
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
    const iframe = fixture.nativeElement.querySelector(
      "iframe",
    ) as HTMLIFrameElement;

    iframe.dispatchEvent(new Event("load"));
    fixture.detectChanges();

    expect(component.reportLoading()).toBeFalse();
    expect(component.reportError()).toBeNull();
  });

  it("should handle report iframe loading errors", () => {
    const iframe = fixture.nativeElement.querySelector(
      "iframe",
    ) as HTMLIFrameElement;

    iframe.dispatchEvent(new Event("error"));
    fixture.detectChanges();

    expect(component.reportError()).toBe("Failed to load report.");
    expect(fixture.nativeElement.textContent).toContain(
      "Failed to load report.",
    );
  });

  it("should handle report fetch errors", () => {
    resultsService.getJobReport.and.returnValue(
      throwError(() => new Error("report failed")),
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
    expect(fixture.nativeElement.textContent).not.toContain(
      "Settings Advanced",
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      "default_filters.json",
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      "default_advanced.json",
    );
    expect(fixture.nativeElement.textContent).not.toContain("fallback_local");
    expect(fixture.nativeElement.textContent).not.toContain("Source");
  });

  it("should handle settings fetch errors", () => {
    resultsService.getJobSettingParams.and.returnValue(
      throwError(() => new Error("settings failed")),
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
    const privateApi = component as unknown as JobResultsPrivateApi;
    const lines = privateApi.normalizeLogsResponse({
      runId: mockJob.id,
      entries: ["  first  ", "", " second"],
      formattedEntries: [],
      logs: null,
    });

    expect(lines).toEqual(["first", "second"]);
  });

  it("should normalize logs from string fallback when entries are missing", () => {
    const privateApi = component as unknown as JobResultsPrivateApi;
    const lines = privateApi.normalizeLogsResponse({
      runId: mockJob.id,
      logs: "line 1\n\n line 2 ",
    });

    expect(lines).toEqual(["line 1", "line 2"]);
  });

  it("should normalize logs from array fallback", () => {
    const privateApi = component as unknown as JobResultsPrivateApi;
    const lines = privateApi.normalizeLogs([" a ", "", "b "]);
    expect(lines).toEqual(["a", "b"]);
  });

  it("should return empty normalized logs for nullish input", () => {
    const privateApi = component as unknown as JobResultsPrivateApi;
    const lines = privateApi.normalizeLogs(null);
    expect(lines).toEqual([]);
  });

  it("should normalize settings labels and schema details", () => {
    const privateApi = component as unknown as JobResultsPrivateApi;
    const items = privateApi.normalizeSettings({
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
    const privateApi = component as unknown as JobResultsPrivateApi;
    const items = privateApi.normalizeSettings(null);
    expect(items).toEqual([]);
  });

  it("should format setting label edge cases", () => {
    const privateApi = component as unknown as JobResultsPrivateApi;
    expect(privateApi.formatSettingLabel("___")).toBe("___");
    expect(privateApi.formatSettingLabel("starting-pdb_file")).toBe(
      "Starting Pdb File",
    );
  });

  it("should format setting value branches including stringify fallback", () => {
    const privateApi = component as unknown as JobResultsPrivateApi;
    expect(privateApi.formatSettingValue(undefined)).toBe("N/A");
    expect(privateApi.formatSettingValue("   ")).toBe("N/A");
    expect(privateApi.formatSettingValue(10)).toBe("10");
    expect(privateApi.formatSettingValue(true)).toBe("true");
    expect(privateApi.formatSettingValue({ a: 1 })).toBe('{"a":1}');

    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    expect(privateApi.formatSettingValue(circular)).toBe("[object Object]");
  });

  it("should return empty validation details when no validation is provided", () => {
    const privateApi = component as unknown as JobResultsPrivateApi;
    expect(privateApi.formatValidationDetails(undefined)).toEqual([]);
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

  it("should set reportError when getJobReport returns null", () => {
    resultsService.getJobReport.and.returnValue(of(null));

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
    expect(component.reportError()).toBe("No report available for this job.");
    expect(component.reportLoading()).toBeFalse();
  });

  it("should populate filesItems from getJobDownloads response", () => {
    resultsService.getJobDownloads.and.returnValue(
      of({
        runId: mockJob.id,
        downloads: [
          {
            label: "Results CSV",
            key: "results_csv",
            url: "https://cdn.test/results.csv",
            category: "stat_csv",
          },
          {
            label: "Structure PDB",
            key: "structure_pdb",
            url: "https://cdn.test/struct.pdb",
            category: "pdb_files",
          },
        ],
      }),
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

    expect(component.filesItems().length).toBe(2);
    expect(component.filesItems()[0].label).toBe("Results CSV");
    expect(component.filesItems()[0].category).toBe("stat_csv");
    expect(component.filesLoading()).toBeFalse();
    expect(component.filesError()).toBeNull();
  });

  it("should prefix relative download URLs with the API base URL", () => {
    resultsService.getJobDownloads.and.returnValue(
      of({
        runId: mockJob.id,
        downloads: [
          {
            label: "Results CSV",
            key: "results_csv",
            url: "/api/results/job-1/downloads/results.csv",
            category: "stat_csv",
          },
        ],
      }),
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

    expect(component.filesItems()[0].url).toBe(
      `${environment.apiBaseUrl}/api/results/job-1/downloads/results.csv`,
    );
  });

  it("should handle downloads fetch errors", () => {
    resultsService.getJobDownloads.and.returnValue(
      throwError(() => new Error("downloads failed")),
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

    expect(component.filesItems()).toEqual([]);
    expect(component.filesError()).toBe("Failed to load files.");
    expect(component.filesLoading()).toBeFalse();
  });

  it("should group files by category with formatted names via getFilesByCategory", () => {
    component.filesItems.set([
      { label: "File A", url: "https://cdn.test/a.csv", category: "stat_csv" },
      { label: "File B", url: "https://cdn.test/b.pdb", category: "pdb_files" },
      { label: "File C", url: "https://cdn.test/c.csv", category: "stat_csv" },
    ]);

    const groups = component.getFilesByCategory();
    expect(groups.length).toBe(2);
    expect(groups[0].category).toBe("Stat CSV");
    expect(groups[0].files.length).toBe(2);
    expect(groups[1].category).toBe("PDB Files");
    expect(groups[1].files.length).toBe(1);
  });

  it("should format category names with uppercase extensions and capitalized words", () => {
    expect(component.formatCategoryName("stat_csv")).toBe("Stat CSV");
    expect(component.formatCategoryName("pdb_files")).toBe("PDB Files");
    expect(component.formatCategoryName("result_json")).toBe("Result JSON");
    expect(component.formatCategoryName("simple")).toBe("Simple");
  });

  it("should show empty state on files tab when downloads list is empty", () => {
    component.filesItems.set([]);
    component.filesLoading.set(false);
    component.setActiveTab("files");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "No files available for this run.",
    );
  });

  it("should show files error on files tab", () => {
    component.filesError.set("Failed to load files.");
    component.filesLoading.set(false);
    component.setActiveTab("files");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Failed to load files.",
    );
  });

  describe("isPdbSettingKey", () => {
    it("should return true for keys containing 'pdb'", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      expect(privateApi.isPdbSettingKey("starting_pdb")).toBeTrue();
      expect(privateApi.isPdbSettingKey("PDB_input")).toBeTrue();
      expect(privateApi.isPdbSettingKey("my_pdb_file")).toBeTrue();
    });

    it("should return false for keys that do not contain 'pdb'", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      expect(privateApi.isPdbSettingKey("binder_name")).toBeFalse();
      expect(privateApi.isPdbSettingKey("min_length")).toBeFalse();
      expect(privateApi.isPdbSettingKey("chains")).toBeFalse();
    });
  });

  describe("extractFilename", () => {
    it("should return the path unchanged when empty or N/A", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      expect(privateApi.extractFilename("")).toBe("");
      expect(privateApi.extractFilename("N/A")).toBe("N/A");
    });

    it("should extract filename from an HTTP URL", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      expect(
        privateApi.extractFilename("https://api.example.com/files/target.pdb"),
      ).toBe("target.pdb");
    });

    it("should extract filename from an S3 URI", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      expect(
        privateApi.extractFilename("s3://my-bucket/uploads/2026/target.pdb"),
      ).toBe("target.pdb");
    });

    it("should extract filename from a plain file path", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      expect(privateApi.extractFilename("/data/inputs/target.pdb")).toBe(
        "target.pdb",
      );
    });

    it("should return the value unchanged when there is no path separator", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      expect(privateApi.extractFilename("target.pdb")).toBe("target.pdb");
    });

    it("should extract filename from a presigned S3 URL with query parameters", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      expect(
        privateApi.extractFilename(
          "https://my-bucket.s3.amazonaws.com/uploads/target.pdb?X-Amz-Signature=abc123&X-Amz-Expires=3600",
        ),
      ).toBe("target.pdb");
    });
  });

  describe("normalizeSettings — PDB field handling", () => {
    it("should show only filename and set url for a PDB key with an HTTP value", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      const items = privateApi.normalizeSettings({
        starting_pdb: "https://api.example.com/uploads/target.pdb",
      });

      expect(items.length).toBe(1);
      expect(items[0].value).toBe("target.pdb");
      expect(items[0].url).toBe("https://api.example.com/uploads/target.pdb");
    });

    it("should show only filename and omit url for a PDB key with an S3 URI", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      const items = privateApi.normalizeSettings({
        starting_pdb: "s3://my-bucket/uploads/target.pdb",
      });

      expect(items.length).toBe(1);
      expect(items[0].value).toBe("target.pdb");
      expect(items[0].url).toBeUndefined();
    });

    it("should show only filename and set url for a schema-wrapped PDB key with an HTTP value", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      const items = privateApi.normalizeSettings({
        starting_pdb: {
          label: "Starting PDB",
          value: "https://api.example.com/uploads/target.pdb",
        },
      });

      expect(items.length).toBe(1);
      expect(items[0].value).toBe("target.pdb");
      expect(items[0].url).toBe("https://api.example.com/uploads/target.pdb");
    });

    it("should show only filename and omit url for a schema-wrapped PDB key with an S3 URI", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      const items = privateApi.normalizeSettings({
        starting_pdb: {
          label: "Starting PDB",
          value: "s3://my-bucket/uploads/target.pdb",
        },
      });

      expect(items.length).toBe(1);
      expect(items[0].value).toBe("target.pdb");
      expect(items[0].url).toBeUndefined();
    });

    it("should not set url on non-PDB settings keys", () => {
      const privateApi = component as unknown as JobResultsPrivateApi;
      const items = privateApi.normalizeSettings({
        binder_name: "PDL1",
      });

      expect(items.length).toBe(1);
      expect(items[0].value).toBe("PDL1");
      expect(items[0].url).toBeUndefined();
    });

    it("should render a download link in the settings tab for an HTTP PDB value", async () => {
      resultsService.getJobSettingParams.and.returnValue(
        of({
          runId: mockJob.id,
          settingParams: {
            starting_pdb: "https://api.example.com/uploads/target.pdb",
          },
        }),
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
      component.setActiveTab("settings");
      fixture.detectChanges();

      const anchor = fixture.nativeElement.querySelector(
        "a[download]",
      ) as HTMLAnchorElement;
      expect(anchor).not.toBeNull();
      expect(anchor.textContent?.trim()).toBe("target.pdb");
      expect(anchor.href).toContain("api.example.com/uploads/target.pdb");
    });
  });
});
