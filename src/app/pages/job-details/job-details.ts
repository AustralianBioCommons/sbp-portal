import { Component, effect, inject, OnInit, signal } from "@angular/core";
import { ActivatedRoute, Router, RouterLink } from "@angular/router";
import { SafeResourceUrl } from "@angular/platform-browser";
import { DatePipe } from "@angular/common";
import { EMPTY } from "rxjs";
import { catchError } from "rxjs/operators";
import { NgIconComponent, provideIcons } from "@ng-icons/core";
import {
  heroArrowDownTray,
  heroArrowLeft,
  heroBookOpen,
  heroChartBarSquare,
  heroCommandLine,
  heroCog6Tooth,
  heroExclamationTriangle,
  heroFolder,
  heroTrash,
} from "@ng-icons/heroicons/outline";
import { AlertComponent } from "../../components/alert/alert.component";
import { LoadingComponent } from "../../components/loading/loading.component";
import { DialogComponent } from "../../components/dialog/dialog.component";
import { ButtonComponent } from "../../components/button/button.component";
import { JobListItem, JobsService } from "../../cores/services/jobs.service";
import {
  ResultLogsResponse,
  ResultsService,
} from "../../cores/services/results.service";
import { environment } from "../../../environments/environment";

type JobResultsTab = "results" | "files" | "settings" | "logs" | "citations";
type JobSettingItem = {
  label: string;
  value: string;
  details: string[];
  url?: string;
};

@Component({
  selector: "app-job-details",
  imports: [
    AlertComponent,
    RouterLink,
    NgIconComponent,
    LoadingComponent,
    DialogComponent,
    ButtonComponent,
  ],
  providers: [
    provideIcons({
      heroArrowDownTray,
      heroArrowLeft,
      heroBookOpen,
      heroChartBarSquare,
      heroCommandLine,
      heroCog6Tooth,
      heroExclamationTriangle,
      heroFolder,
      heroTrash,
    }),
    DatePipe,
  ],
  templateUrl: "./job-details.html",
  styleUrl: "./job-details.scss",
})
export default class JobDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobsService = inject(JobsService);
  private resultsService = inject(ResultsService);
  private datePipe = inject(DatePipe);

  // Page state
  job = signal<JobListItem | null>(null);
  loading = signal<boolean>(false);
  error = signal<string | null>(null);
  seqeraUnavailable = signal<boolean>(false);
  showDeleteDialog = signal<boolean>(false);
  deleting = signal<boolean>(false);

  // Results state
  activeTab = signal<JobResultsTab>("results");
  reportUrl = signal<SafeResourceUrl | null>(null);
  reportLoading = signal(false);
  reportError = signal<string | null>(null);
  filesItems = signal<Array<{ label: string; url: string; category: string }>>(
    []
  );
  filesLoading = signal(false);
  filesError = signal<string | null>(null);
  settingsItems = signal<JobSettingItem[]>([]);
  settingsLoading = signal(false);
  settingsError = signal<string | null>(null);
  logsItems = signal<string[]>([]);
  logsLoading = signal(false);
  logsError = signal<string | null>(null);

  readonly tabs: Array<{ id: JobResultsTab; label: string; icon: string }> = [
    { id: "results", label: "Results", icon: "heroChartBarSquare" },
    { id: "files", label: "Files", icon: "heroFolder" },
    { id: "settings", label: "Settings", icon: "heroCog6Tooth" },
    { id: "logs", label: "Logs", icon: "heroCommandLine" },
    { id: "citations", label: "Citations", icon: "heroBookOpen" },
  ];

  constructor() {
    // A job passed through router navigation state lets us render immediately
    // without an extra round-trip when arriving from the jobs list.
    const navState = this.router.getCurrentNavigation()?.extras.state;
    const navigatedJob = navState?.["job"] as JobListItem | undefined;
    if (navigatedJob) {
      this.job.set(this.jobsService.normalizeJob(navigatedJob));
      this.seqeraUnavailable.set((navState?.["seqeraUnavailable"] as boolean) ?? false);
    }

    // Reset and reload the results whenever the selected job changes.
    effect(() => {
      this.job();
      this.activeTab.set("results");
      this.loadReport();
      this.loadDownloads();
      this.loadSettings();
      this.resetLogsState();
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get("id");
    if (!id) {
      this.error.set("Job not found.");
      return;
    }

    // Already have the job from navigation state and it matches the route.
    if (this.job()?.id === id) {
      return;
    }

    this.loadJob(id);
  }

  private loadJob(id: string): void {
    this.loading.set(true);
    this.error.set(null);
    this.jobsService
      .getJob(id)
      .pipe(
        catchError((err) => {
          console.error("Error loading job:", err);
          this.error.set("Failed to load job. Please try again.");
          this.loading.set(false);
          return EMPTY;
        })
      )
      .subscribe(({ job, seqeraUnavailable }) => {
        if (!job) {
          this.error.set("Job not found.");
        } else {
          this.job.set(job);
        }
        this.seqeraUnavailable.set(seqeraUnavailable);
        this.loading.set(false);
      });
  }

  openDeleteDialog(): void {
    this.showDeleteDialog.set(true);
  }

  closeDeleteDialog(): void {
    this.showDeleteDialog.set(false);
  }

  confirmDelete(): void {
    const job = this.job();
    if (!job) {
      this.closeDeleteDialog();
      return;
    }

    this.deleting.set(true);
    this.jobsService
      .deleteJob(job.id)
      .pipe(
        catchError((err) => {
          console.error("Error deleting job:", err);
          this.error.set("Failed to delete job. Please try again.");
          this.deleting.set(false);
          this.closeDeleteDialog();
          return EMPTY;
        })
      )
      .subscribe(() => {
        this.deleting.set(false);
        this.closeDeleteDialog();
        this.router.navigate(["/jobs"]);
      });
  }

  setActiveTab(tab: JobResultsTab): void {
    this.activeTab.set(tab);
    if (tab === "logs") {
      this.loadLogs();
    }
  }

  getSummaryItems(job: JobListItem): Array<{ label: string; value: string }> {
    return [
      {
        label: "Submitted date",
        value: this.datePipe.transform(job.submittedAt, "dd/MM/yyyy") ?? "",
      },
      { label: "Tool", value: job.tool || "N/A" },
      { label: "Status", value: job.status },
      {
        label: "Score",
        value: job.score === null ? "N/A" : job.score.toFixed(3),
      },
    ];
  }

  getFiles(job: JobListItem): string[] {
    return [
      `${job.jobName.replace(/\s+/g, "_").toLowerCase()}_summary.json`,
      `${job.id}_metadata.txt`,
      `${job.id}_results_archive.zip`,
    ];
  }

  getCitations(job: JobListItem): string[] {
    return [
      `${job.tool || "Workflow"} methods and generated outputs.`,
      "SBP Portal platform and supporting infrastructure.",
    ];
  }

  formatCategoryName(category: string): string {
    // List of known file extensions and abbreviations that should be uppercase
    const uppercaseWords = new Set([
      "pdb",
      "csv",
      "json",
      "xml",
      "html",
      "pdf",
      "zip",
      "txt",
      "tsv",
    ]);

    // Replace underscores with spaces
    const withSpaces = category.replace(/_/g, " ");

    // Split into words and format each
    const words = withSpaces.split(" ");
    const formatted = words.map((word) => {
      const lower = word.toLowerCase();
      if (uppercaseWords.has(lower)) {
        return word.toUpperCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });

    return formatted.join(" ");
  }

  getFilesByCategory(): Array<{
    category: string;
    files: Array<{ label: string; url: string }>;
  }> {
    const grouped = new Map<string, Array<{ label: string; url: string }>>();

    this.filesItems().forEach((file) => {
      if (!grouped.has(file.category)) {
        grouped.set(file.category, []);
      }
      grouped.get(file.category)!.push({ label: file.label, url: file.url });
    });

    return Array.from(grouped.entries()).map(([category, files]) => ({
      category: this.formatCategoryName(category),
      files,
    }));
  }

  onReportLoad(): void {
    this.reportLoading.set(false);
    this.reportError.set(null);
  }

  onReportError(): void {
    this.reportLoading.set(false);
    this.reportUrl.set(null);
    this.reportError.set("Failed to load report.");
  }

  private loadReport(): void {
    const job = this.job();
    if (!job) {
      this.reportUrl.set(null);
      this.reportError.set(null);
      this.reportLoading.set(false);
      return;
    }

    this.reportLoading.set(true);
    this.reportError.set(null);
    this.resultsService
      .getJobReport(job.id)
      .pipe(
        catchError((err) => {
          console.error("Error loading job report:", err);
          this.reportLoading.set(false);
          this.reportUrl.set(null);
          this.reportError.set("Failed to load report.");
          return EMPTY;
        })
      )
      .subscribe((reportResourceUrl) => {
        if (reportResourceUrl) {
          // URL fetched successfully; keep reportLoading true until iframe load event fires.
          this.reportUrl.set(reportResourceUrl);
        } else {
          // No report will be loaded into the iframe; stop showing the loading indicator.
          this.reportUrl.set(null);
          this.reportError.set("No report available for this job.");
          this.reportLoading.set(false);
        }
      });
  }

  private loadSettings(): void {
    const job = this.job();
    if (!job) {
      this.settingsItems.set([]);
      this.settingsError.set(null);
      this.settingsLoading.set(false);
      return;
    }

    this.settingsLoading.set(true);
    this.settingsError.set(null);
    this.resultsService
      .getJobSettingParams(job.id)
      .pipe(
        catchError((err) => {
          console.error("Error loading job settings:", err);
          this.settingsLoading.set(false);
          this.settingsItems.set([]);
          this.settingsError.set("Failed to load settings.");
          return EMPTY;
        })
      )
      .subscribe((response) => {
        this.settingsItems.set(this.normalizeSettings(response.settingParams));
        this.settingsLoading.set(false);
      });
  }

  private loadDownloads(): void {
    const job = this.job();
    if (!job) {
      this.filesItems.set([]);
      this.filesError.set(null);
      this.filesLoading.set(false);
      return;
    }

    this.filesLoading.set(true);
    this.filesError.set(null);
    this.resultsService
      .getJobDownloads(job.id)
      .pipe(
        catchError((err) => {
          console.error("Error loading job downloads:", err);
          this.filesLoading.set(false);
          this.filesItems.set([]);
          this.filesError.set("Failed to load files.");
          return EMPTY;
        })
      )
      .subscribe((response) => {
        this.filesItems.set(
          response.downloads.map((download) => ({
            label: download.label,
            url: this.normalizeDownloadUrl(download.url),
            category: download.category,
          }))
        );
        this.filesLoading.set(false);
      });
  }

  private loadLogs(): void {
    const job = this.job();
    if (!job) {
      this.resetLogsState();
      return;
    }

    this.logsLoading.set(true);
    this.logsError.set(null);
    this.resultsService
      .getJobLogs(job.id)
      .pipe(
        catchError((err) => {
          console.error("Error loading job logs:", err);
          this.logsLoading.set(false);
          this.logsItems.set([]);
          this.logsError.set("Failed to load logs.");
          return EMPTY;
        })
      )
      .subscribe((response) => {
        this.logsItems.set(this.normalizeLogsResponse(response));
        this.logsLoading.set(false);
      });
  }

  private normalizeDownloadUrl(url: string): string {
    return url.startsWith("http") ? url : `${environment.apiBaseUrl}${url}`;
  }

  private resetLogsState(): void {
    this.logsItems.set([]);
    this.logsError.set(null);
    this.logsLoading.set(false);
  }

  private normalizeLogsResponse(response: ResultLogsResponse): string[] {
    const formattedEntries = response.formattedEntries;
    if (Array.isArray(formattedEntries) && formattedEntries.length > 0) {
      return formattedEntries
        .map((entry) => (entry.message || entry.raw || "").trim())
        .filter((line) => line.length > 0);
    }

    if (Array.isArray(response.entries) && response.entries.length > 0) {
      return response.entries
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
    }

    return this.normalizeLogs(response.logs);
  }

  private normalizeLogs(logs: string | string[] | null | undefined): string[] {
    if (!logs) {
      return [];
    }

    if (Array.isArray(logs)) {
      return logs.map((line) => line.trim()).filter((line) => line.length > 0);
    }

    return logs
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  private normalizeSettings(
    settingParams: Record<string, unknown> | null | undefined
  ): JobSettingItem[] {
    if (!settingParams) {
      return [];
    }

    return Object.entries(settingParams)
      .filter(
        ([key]) => !key.startsWith("_") && !this.shouldHideSettingKey(key)
      )
      .map(([key, value]) => ({
        ...this.normalizeSettingItem(key, value),
      }));
  }

  private static readonly HIDDEN_SETTING_KEYS = new Set([
    "settings_filters",
    "settings_advanced",
  ]);

  private shouldHideSettingKey(key: string): boolean {
    return JobDetailsComponent.HIDDEN_SETTING_KEYS.has(key.toLowerCase());
  }

  private normalizeSettingItem(key: string, value: unknown): JobSettingItem {
    if (this.isSchemaSettingParam(value)) {
      const details: string[] = [];
      if (value.description) {
        details.push(value.description);
      }
      if (value.helpText) {
        details.push(`Help: ${value.helpText}`);
      }
      if (value.placeholder) {
        details.push(`Placeholder: ${value.placeholder}`);
      }
      if (value.required) {
        details.push("Required");
      }
      details.push(...this.formatValidationDetails(value.validation));
      const rawValue = this.formatSettingValue(value.value);
      const isFileDownload = this.isFileDownloadKey(key);
      return {
        label: value.label || this.formatSettingLabel(key),
        value: isFileDownload ? this.extractFilename(rawValue) : rawValue,
        details,
        ...(isFileDownload && rawValue.startsWith("http")
          ? { url: rawValue }
          : {}),
      };
    }

    const rawValue = this.formatSettingValue(value);
    const isFileDownload = this.isFileDownloadKey(key);
    return {
      label: this.formatSettingLabel(key),
      value: isFileDownload ? this.extractFilename(rawValue) : rawValue,
      details: [],
      ...(isFileDownload && rawValue.startsWith("http")
        ? { url: rawValue }
        : {}),
    };
  }

  private isFileDownloadKey(key: string): boolean {
    const lower = key.toLowerCase();
    return lower.includes("pdb") || lower.includes("fasta");
  }

  private extractFilename(path: string): string {
    if (!path || path === "N/A") return path;
    const withoutQuery = path.split(/[?#]/)[0];
    const parts = withoutQuery.split(/[/\\]/);
    return parts.filter((p) => p.length > 0).pop() ?? path;
  }

  private formatSettingLabel(key: string): string {
    const compact = key.replace(/^_+/, "");
    if (!compact) {
      return key;
    }
    return compact
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  private formatSettingValue(value: unknown): string {
    if (value === null || value === undefined) {
      return "N/A";
    }
    if (typeof value === "string") {
      return value.trim() || "N/A";
    }
    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private formatValidationDetails(
    validation: Record<string, unknown> | undefined
  ): string[] {
    if (!validation) {
      return [];
    }

    const details: string[] = [];
    if (validation["min"] !== undefined) {
      details.push(`Min: ${validation["min"]}`);
    }
    if (validation["max"] !== undefined) {
      details.push(`Max: ${validation["max"]}`);
    }
    if (validation["minLength"] !== undefined) {
      details.push(`Min length: ${validation["minLength"]}`);
    }
    if (validation["maxLength"] !== undefined) {
      details.push(`Max length: ${validation["maxLength"]}`);
    }
    if (validation["pattern"]) {
      details.push(`Pattern: ${validation["pattern"]}`);
    }
    if (validation["format"]) {
      details.push(`Format: ${validation["format"]}`);
    }
    return details;
  }

  private isSchemaSettingParam(value: unknown): value is {
    label?: string;
    value?: unknown;
    description?: string;
    placeholder?: string;
    helpText?: string;
    required?: boolean;
    validation?: Record<string, unknown>;
  } {
    return typeof value === "object" && value !== null && "value" in value;
  }
}
