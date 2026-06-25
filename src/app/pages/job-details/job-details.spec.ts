import { ComponentFixture, TestBed } from "@angular/core/testing";
import { HttpHeaders, HttpResponse } from "@angular/common/http";
import { DomSanitizer } from "@angular/platform-browser";
import { ActivatedRoute, provideRouter, Router } from "@angular/router";
import { of, throwError } from "rxjs";

import JobDetailsComponent from "./job-details";
import {
  ResultLogsResponse,
  ResultsService,
} from "../../cores/services/results.service";
import { JobListItem, JobsService } from "../../cores/services/jobs.service";
import { environment } from "../../../environments/environment";

type JobDetailsPrivateApi = {
  normalizeLogsResponse: (response: ResultLogsResponse) => string[];
  normalizeLogs: (logs: string | string[] | null | undefined) => string[];
  normalizeSettings: (
    settingParams: Record<string, unknown> | null | undefined
  ) => Array<{ label: string; value: string; details: string[]; url?: string }>;
  formatSettingLabel: (key: string) => string;
  formatSettingValue: (value: unknown) => string;
  formatValidationDetails: (
    validation: Record<string, unknown> | undefined
  ) => string[];
  isFileDownloadKey: (key: string) => boolean;
  extractFilename: (path: string) => string;
};

describe("JobDetailsComponent", () => {
  let component: JobDetailsComponent;
  let fixture: ComponentFixture<JobDetailsComponent>;
  let mockJobsService: jasmine.SpyObj<JobsService>;
  let resultsService: jasmine.SpyObj<ResultsService>;
  let sanitizer: DomSanitizer;
  let routeId: string | null;

  const mockJob: JobListItem = {
    id: "job-1",
    jobName: "Example job",
    tool: "Binder design",
    workflow: "De novo design",
    status: "Completed",
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

  const privateApi = () => component as unknown as JobDetailsPrivateApi;

  beforeEach(async () => {
    routeId = mockJob.id;

    mockJobsService = jasmine.createSpyObj("JobsService", [
      "getJob",
      "deleteJob",
      "normalizeJob",
      "listJobs",
    ]);
    mockJobsService.normalizeJob.and.callFake((job) => job);
    mockJobsService.getJob.and.returnValue(
      of({ job: mockJob, seqeraUnavailable: false })
    );
    mockJobsService.deleteJob.and.returnValue(
      of({
        runId: mockJob.id,
        deleted: true,
        cancelledBeforeDelete: false,
        message: "Deleted",
      })
    );

    resultsService = jasmine.createSpyObj<ResultsService>("ResultsService", [
      "getJobReport",
      "getJobDownloads",
      "downloadAll",
      "getJobSettingParams",
      "getJobLogs",
    ]);

    await TestBed.configureTestingModule({
      imports: [JobDetailsComponent],
      providers: [
        provideRouter([]),
        { provide: JobsService, useValue: mockJobsService },
        { provide: ResultsService, useValue: resultsService },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { paramMap: { get: () => routeId } },
          },
        },
      ],
    }).compileComponents();

    sanitizer = TestBed.inject(DomSanitizer);
    resultsService.getJobReport.and.returnValue(
      of(
        sanitizer.bypassSecurityTrustResourceUrl(
          "https://example.test/report.html"
        )
      )
    );
    resultsService.getJobDownloads.and.returnValue(
      of({ runId: mockJob.id, downloads: [] })
    );
    resultsService.downloadAll.and.returnValue(
      of(
        new HttpResponse({
          body: new Blob(["zip"], { type: "application/zip" }),
          headers: new HttpHeaders({
            "content-disposition": 'attachment; filename="results.zip"',
          }),
        })
      )
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

    fixture = TestBed.createComponent(JobDetailsComponent);
    component = fixture.componentInstance;
  });

  /** Flush ngOnInit, the job-loading subscription, and the results effect. */
  const render = () => {
    fixture.detectChanges();
    fixture.detectChanges();
  };

  // --- Page behaviour -------------------------------------------------------

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  it("should fetch the job by route id when no navigation state is present", () => {
    render();

    expect(mockJobsService.getJob).toHaveBeenCalledWith(mockJob.id);
    expect(component.job()).toEqual(mockJob);
  });

  it("should show an error when the job cannot be found", () => {
    mockJobsService.getJob.and.returnValue(
      of({ job: null, seqeraUnavailable: false })
    );
    render();

    expect(component.error()).toBe("Job not found.");
  });

  it("should surface an error when fetching the job fails", () => {
    spyOn(console, "error");
    mockJobsService.getJob.and.returnValue(throwError(() => new Error("boom")));
    render();

    expect(component.error()).toBe("Failed to load job. Please try again.");
    expect(component.loading()).toBeFalse();
  });

  it("should delete the job and navigate back to the jobs list", () => {
    render();
    const router = TestBed.inject(Router);
    const navigateSpy = spyOn(router, "navigate");

    component.openDeleteDialog();
    expect(component.showDeleteDialog()).toBeTrue();

    component.confirmDelete();

    expect(mockJobsService.deleteJob).toHaveBeenCalledWith(mockJob.id);
    expect(navigateSpy).toHaveBeenCalledWith(["/jobs"]);
    expect(component.showDeleteDialog()).toBeFalse();
  });

  it("should render an enabled download all files button for the selected job", () => {
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
        ],
      })
    );
    render();

    const downloadLink = fixture.nativeElement.querySelector(
      'a[title="Download all files"]'
    ) as HTMLAnchorElement;
    const downloadButton = fixture.nativeElement.querySelector(
      'app-button[title="Download all files"] button'
    ) as HTMLButtonElement;

    expect(downloadLink).toBeNull();
    expect(downloadButton.disabled).toBeFalse();
  });

  it("should download all files through the results service", () => {
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
        ],
      })
    );
    const createObjectUrlSpy = spyOn(URL, "createObjectURL").and.returnValue(
      "blob:results"
    );
    const revokeObjectUrlSpy = spyOn(URL, "revokeObjectURL");
    const clickSpy = spyOn(HTMLAnchorElement.prototype, "click");
    render();

    component.downloadAllFiles();

    expect(resultsService.downloadAll).toHaveBeenCalledWith(mockJob.id);
    expect(createObjectUrlSpy).toHaveBeenCalledWith(jasmine.any(Blob));
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectUrlSpy).toHaveBeenCalledWith("blob:results");
    expect(component.downloadingAllFiles()).toBeFalse();
  });

  it("should render a disabled download all files button when no files are available", () => {
    render();

    const downloadLink = fixture.nativeElement.querySelector(
      'a[title="Download all files"]'
    ) as HTMLAnchorElement | null;
    const downloadButton = fixture.nativeElement.querySelector(
      'app-button[title="Download all files"] button'
    ) as HTMLButtonElement;

    expect(downloadLink).toBeNull();
    expect(downloadButton.disabled).toBeTrue();
  });

  // --- Results panel --------------------------------------------------------

  it("should build and render the job report iframe", () => {
    render();

    expect(resultsService.getJobReport).toHaveBeenCalledWith(mockJob.id);
    const iframe = fixture.nativeElement.querySelector(
      "iframe"
    ) as HTMLIFrameElement;
    expect(iframe).not.toBeNull();
    expect(iframe.title).toContain(mockJob.jobName);
  });

  it("should switch tabs and reset when the job changes", () => {
    render();

    component.setActiveTab("logs");
    expect(component.activeTab()).toBe("logs");
    expect(resultsService.getJobLogs).toHaveBeenCalledWith(mockJob.id);

    component.job.set(fallbackJob);
    fixture.detectChanges();

    expect(component.activeTab()).toBe("results");
    expect(resultsService.getJobReport.calls.mostRecent().args).toEqual([
      fallbackJob.id,
    ]);
    expect(resultsService.getJobSettingParams.calls.mostRecent().args).toEqual([
      fallbackJob.id,
    ]);
  });

  it("should reset the active tab when the selected job is cleared", () => {
    render();
    component.setActiveTab("citations");

    component.job.set(null);
    fixture.detectChanges();

    expect(component.activeTab()).toBe("results");
  });

  it("should clear report state when the selected job is cleared", () => {
    render();
    component.reportUrl.set(
      sanitizer.bypassSecurityTrustResourceUrl(
        "https://example.test/ready.html"
      )
    );
    component.reportError.set("error");

    component.job.set(null);
    fixture.detectChanges();

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
    render();
    component.setActiveTab("logs");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Loading nextflow/25.10.3"
    );
    expect(fixture.nativeElement.textContent).toContain(
      "Loading requirement: java/jdk-17.0.2"
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      "raw line that should not render first"
    );
  });

  it("should handle logs fetch errors", () => {
    spyOn(console, "error");
    render();
    resultsService.getJobLogs.and.returnValue(
      throwError(() => new Error("logs failed"))
    );

    component.setActiveTab("logs");
    fixture.detectChanges();

    expect(component.logsItems()).toEqual([]);
    expect(component.logsError()).toBe("Failed to load logs.");
    expect(component.logsLoading()).toBeFalse();
  });

  it("should stop loading when the report iframe loads", () => {
    render();
    const iframe = fixture.nativeElement.querySelector(
      "iframe"
    ) as HTMLIFrameElement;

    iframe.dispatchEvent(new Event("load"));
    fixture.detectChanges();

    expect(component.reportLoading()).toBeFalse();
    expect(component.reportError()).toBeNull();
  });

  it("should handle report iframe loading errors", () => {
    render();
    const iframe = fixture.nativeElement.querySelector(
      "iframe"
    ) as HTMLIFrameElement;

    iframe.dispatchEvent(new Event("error"));
    fixture.detectChanges();

    expect(component.reportError()).toBe("Failed to load report.");
    expect(fixture.nativeElement.textContent).toContain(
      "Failed to load report."
    );
  });

  it("should handle report fetch errors", () => {
    spyOn(console, "error");
    resultsService.getJobReport.and.returnValue(
      throwError(() => new Error("report failed"))
    );
    render();

    expect(component.reportUrl()).toBeNull();
    expect(component.reportError()).toBe("Failed to load report.");
    expect(component.reportLoading()).toBeFalse();
  });

  it("should set reportError when getJobReport returns null", () => {
    resultsService.getJobReport.and.returnValue(of(null));
    render();

    expect(component.reportUrl()).toBeNull();
    expect(component.reportError()).toBe("No report available for this job.");
    expect(component.reportLoading()).toBeFalse();
  });

  it("should render API-backed settings values", () => {
    render();
    component.setActiveTab("settings");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain("Binder Name");
    expect(fixture.nativeElement.textContent).toContain("PDL1");
    expect(fixture.nativeElement.textContent).toContain("Min Length");
    expect(fixture.nativeElement.textContent).toContain("60");
    expect(fixture.nativeElement.textContent).toContain("Max: 500");
    expect(fixture.nativeElement.textContent).not.toContain("Settings Filters");
    expect(fixture.nativeElement.textContent).not.toContain(
      "Settings Advanced"
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      "default_filters.json"
    );
    expect(fixture.nativeElement.textContent).not.toContain(
      "default_advanced.json"
    );
    expect(fixture.nativeElement.textContent).not.toContain("fallback_local");
    expect(fixture.nativeElement.textContent).not.toContain("Source");
  });

  it("should handle settings fetch errors", () => {
    spyOn(console, "error");
    resultsService.getJobSettingParams.and.returnValue(
      throwError(() => new Error("settings failed"))
    );
    render();

    expect(component.settingsItems()).toEqual([]);
    expect(component.settingsError()).toBe("Failed to load settings.");
    expect(component.settingsLoading()).toBeFalse();
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
      })
    );
    render();

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
      })
    );
    render();

    expect(component.filesItems()[0].url).toBe(
      `${environment.apiBaseUrl}/api/results/job-1/downloads/results.csv`
    );
  });

  it("should handle downloads fetch errors", () => {
    spyOn(console, "error");
    resultsService.getJobDownloads.and.returnValue(
      throwError(() => new Error("downloads failed"))
    );
    render();

    expect(component.filesItems()).toEqual([]);
    expect(component.filesError()).toBe("Failed to load files.");
    expect(component.filesLoading()).toBeFalse();
  });

  it("should show empty state on files tab when downloads list is empty", () => {
    render();
    component.filesItems.set([]);
    component.filesLoading.set(false);
    component.setActiveTab("files");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "No files available for this run."
    );
  });

  it("should show files error on files tab", () => {
    render();
    component.filesError.set("Failed to load files.");
    component.filesLoading.set(false);
    component.setActiveTab("files");
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      "Failed to load files."
    );
  });

  it("should render a download link in the settings tab for an HTTP PDB value", () => {
    resultsService.getJobSettingParams.and.returnValue(
      of({
        runId: mockJob.id,
        settingParams: {
          starting_pdb: "https://api.example.com/uploads/target.pdb",
        },
      })
    );
    render();
    component.setActiveTab("settings");
    fixture.detectChanges();

    const anchors = Array.from(
      fixture.nativeElement.querySelectorAll("a[download]")
    ) as HTMLAnchorElement[];
    const anchor = anchors.find((link) =>
      link.href.includes("api.example.com/uploads/target.pdb")
    );
    expect(anchor).not.toBeNull();
    expect(anchor?.textContent?.trim()).toBe("target.pdb");
    expect(anchor?.href).toContain("api.example.com/uploads/target.pdb");
  });

  it("should reset logs without loading when there is no selected job", () => {
    render();
    component.job.set(null);
    fixture.detectChanges();
    component.logsItems.set(["existing"]);
    component.logsError.set("error");
    resultsService.getJobLogs.calls.reset();

    component.setActiveTab("logs");

    expect(component.logsItems()).toEqual([]);
    expect(component.logsError()).toBeNull();
    expect(component.logsLoading()).toBeFalse();
    expect(resultsService.getJobLogs).not.toHaveBeenCalled();
  });

  // --- Helpers --------------------------------------------------------------

  it("should provide fallback values for helper methods", () => {
    const summaryItems = component.getSummaryItems(fallbackJob);
    const files = component.getFiles(fallbackJob);
    const citations = component.getCitations(fallbackJob);

    expect(summaryItems[1].value).toBe("N/A");
    expect(summaryItems[3].value).toBe("N/A");
    expect(files[0]).toBe("queued_job_summary.json");
    expect(citations[0]).toBe("Workflow methods and generated outputs.");
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

  it("should normalize logs from entries when formatted entries are not available", () => {
    const lines = privateApi().normalizeLogsResponse({
      runId: mockJob.id,
      entries: ["  first  ", "", " second"],
      formattedEntries: [],
      logs: null,
    });

    expect(lines).toEqual(["first", "second"]);
  });

  it("should normalize logs from string fallback when entries are missing", () => {
    const lines = privateApi().normalizeLogsResponse({
      runId: mockJob.id,
      logs: "line 1\n\n line 2 ",
    });

    expect(lines).toEqual(["line 1", "line 2"]);
  });

  it("should normalize logs from array fallback", () => {
    expect(privateApi().normalizeLogs([" a ", "", "b "])).toEqual(["a", "b"]);
  });

  it("should return empty normalized logs for nullish input", () => {
    expect(privateApi().normalizeLogs(null)).toEqual([]);
  });

  it("should normalize settings labels and schema details", () => {
    const items = privateApi().normalizeSettings({
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
    expect(privateApi().normalizeSettings(null)).toEqual([]);
  });

  it("should format setting label edge cases", () => {
    expect(privateApi().formatSettingLabel("___")).toBe("___");
    expect(privateApi().formatSettingLabel("starting-pdb_file")).toBe(
      "Starting Pdb File"
    );
  });

  it("should format setting value branches including stringify fallback", () => {
    const api = privateApi();
    expect(api.formatSettingValue(undefined)).toBe("N/A");
    expect(api.formatSettingValue("   ")).toBe("N/A");
    expect(api.formatSettingValue(10)).toBe("10");
    expect(api.formatSettingValue(true)).toBe("true");
    expect(api.formatSettingValue({ a: 1 })).toBe('{"a":1}');

    const circular: Record<string, unknown> = {};
    circular["self"] = circular;
    expect(api.formatSettingValue(circular)).toBe("[object Object]");
  });

  it("should return empty validation details when no validation is provided", () => {
    expect(privateApi().formatValidationDetails(undefined)).toEqual([]);
  });

  describe("isFileDownloadKey", () => {
    it("should return true for keys containing 'pdb'", () => {
      const api = privateApi();
      expect(api.isFileDownloadKey("starting_pdb")).toBeTrue();
      expect(api.isFileDownloadKey("PDB_input")).toBeTrue();
      expect(api.isFileDownloadKey("my_pdb_file")).toBeTrue();
    });

    it("should return true for keys containing 'fasta'", () => {
      const api = privateApi();
      expect(api.isFileDownloadKey("fastaS3Uri")).toBeTrue();
      expect(api.isFileDownloadKey("fastaFileUrl")).toBeTrue();
      expect(api.isFileDownloadKey("FASTA_input")).toBeTrue();
    });

    it("should return false for keys that do not contain 'pdb' or 'fasta'", () => {
      const api = privateApi();
      expect(api.isFileDownloadKey("binder_name")).toBeFalse();
      expect(api.isFileDownloadKey("min_length")).toBeFalse();
      expect(api.isFileDownloadKey("chains")).toBeFalse();
    });
  });

  describe("extractFilename", () => {
    it("should return the path unchanged when empty or N/A", () => {
      const api = privateApi();
      expect(api.extractFilename("")).toBe("");
      expect(api.extractFilename("N/A")).toBe("N/A");
    });

    it("should extract filename from an HTTP URL", () => {
      expect(
        privateApi().extractFilename("https://api.example.com/files/target.pdb")
      ).toBe("target.pdb");
    });

    it("should extract filename from an S3 URI", () => {
      expect(
        privateApi().extractFilename("s3://my-bucket/uploads/2026/target.pdb")
      ).toBe("target.pdb");
    });

    it("should extract filename from a plain file path", () => {
      expect(privateApi().extractFilename("/data/inputs/target.pdb")).toBe(
        "target.pdb"
      );
    });

    it("should return the value unchanged when there is no path separator", () => {
      expect(privateApi().extractFilename("target.pdb")).toBe("target.pdb");
    });

    it("should extract filename from a presigned S3 URL with query parameters", () => {
      expect(
        privateApi().extractFilename(
          "https://my-bucket.s3.amazonaws.com/uploads/target.pdb?X-Amz-Signature=abc123&X-Amz-Expires=3600"
        )
      ).toBe("target.pdb");
    });
  });

  describe("normalizeSettings — PDB field handling", () => {
    it("should show only filename and set url for a PDB key with an HTTP value", () => {
      const items = privateApi().normalizeSettings({
        starting_pdb: "https://api.example.com/uploads/target.pdb",
      });

      expect(items.length).toBe(1);
      expect(items[0].value).toBe("target.pdb");
      expect(items[0].url).toBe("https://api.example.com/uploads/target.pdb");
    });

    it("should show only filename and omit url for a PDB key with an S3 URI", () => {
      const items = privateApi().normalizeSettings({
        starting_pdb: "s3://my-bucket/uploads/target.pdb",
      });

      expect(items.length).toBe(1);
      expect(items[0].value).toBe("target.pdb");
      expect(items[0].url).toBeUndefined();
    });

    it("should show only filename and set url for a schema-wrapped PDB key with an HTTP value", () => {
      const items = privateApi().normalizeSettings({
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
      const items = privateApi().normalizeSettings({
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
      const items = privateApi().normalizeSettings({
        binder_name: "PDL1",
      });

      expect(items.length).toBe(1);
      expect(items[0].value).toBe("PDL1");
      expect(items[0].url).toBeUndefined();
    });
  });
});
