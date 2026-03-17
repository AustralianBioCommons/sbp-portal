import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
  signal,
} from "@angular/core";
import { SafeResourceUrl } from "@angular/platform-browser";
import { JobListItem } from "../../cores/services/jobs.service";
import { ResultsService } from "../../cores/services/results.service";
import { formatDateTimeForJobs } from "../../cores/utils/date.utils";

type JobResultsTab = "results" | "files" | "settings" | "logs" | "citations";
type JobSettingItem = { label: string; value: string; details: string[] };

@Component({
  selector: "app-job-results",
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (isOpen && job; as selectedJob) {
      <div class="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="job-details-title" role="dialog" aria-modal="true">
        <div class="flex min-h-screen items-center justify-center px-4 py-8">
          <div
            class="fixed inset-0 bg-slate-950/45"
            role="button"
            tabindex="0"
            (click)="closeRequested.emit()"
            (keydown.enter)="closeRequested.emit()"
            (keydown.space)="closeRequested.emit()"
          ></div>

          <div class="relative w-full max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div class="px-6 py-5">
              <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p class="text-xs font-semibold text-slate-500">Job name</p>
                  <h2 id="job-details-title" class="mt-1 text-2xl font-semibold text-slate-900">
                    {{ selectedJob.jobName }}
                  </h2>
                </div>
                <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-900">
                  This job
                  <button
                    type="button"
                    (click)="deleteRequested.emit()"
                    class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M6 7h12m-9 0V5.75A1.75 1.75 0 0110.75 4h2.5A1.75 1.75 0 0115 5.75V7m-7 0v11.25A1.75 1.75 0 009.75 20h4.5A1.75 1.75 0 0016 18.25V7" />
                    </svg>
                    Delete
                  </button>
                  <button
                    type="button"
                    (click)="downloadRequested.emit()"
                    class="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-blue-900 hover:bg-slate-100"
                  >
                    <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 3v12m0 0l4-4m-4 4l-4-4m-3 8.25h14" />
                    </svg>
                    Download all files
                  </button>
                  <button
                    type="button"
                    (click)="closeRequested.emit()"
                    class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-300 text-slate-500 hover:bg-slate-100"
                    aria-label="Close job details"
                  >
                    <svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div class="mt-5 grid gap-4 pb-1 sm:grid-cols-2 xl:grid-cols-4">
                @for (item of getSummaryItems(selectedJob); track item.label) {
                  <div class="min-w-0">
                    <p class="text-sm font-medium text-slate-500">{{ item.label }}</p>
                    <p class="mt-2 border-b border-slate-300 pb-2 text-sm font-medium text-slate-900">
                      {{ item.value }}
                    </p>
                  </div>
                }
              </div>
            </div>

            <div class="border-b border-gray-200 bg-white px-6">
              <nav class="-mb-px overflow-x-auto scrollbar-hide scroll-smooth py-1" aria-label="Job result tabs">
                <div class="flex min-w-max justify-center gap-8">
                  @for (tab of tabs; track tab.id) {
                    <button
                      type="button"
                      (click)="setActiveTab(tab.id)"
                      class="whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-all duration-200 hover:scale-110"
                      [class.text-primary]="activeTab() === tab.id"
                      [class.border-gray-800]="activeTab() === tab.id"
                      [class.border-b-3]="activeTab() === tab.id"
                      [class.font-semibold]="activeTab() === tab.id"
                      [class.text-blue-900]="activeTab() !== tab.id"
                      [class.hover:text-blue-800]="activeTab() !== tab.id"
                      [class.hover:border-gray-300]="activeTab() !== tab.id"
                      [class.border-transparent]="activeTab() !== tab.id"
                    >
                      {{ tab.label }}
                    </button>
                  }
                </div>
              </nav>
            </div>

            <div class="max-h-[60vh] overflow-y-auto bg-gray-50 px-6 py-6">
              <div class="mx-auto w-full max-w-4xl">
                @switch (activeTab()) {
                  @case ("results") {
                      <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <h3 class="text-lg font-semibold text-slate-900">Results overview</h3>
                        @if (reportError()) {
                          <p class="mt-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            {{ reportError() }}
                          </p>
                        } @else if (reportUrl(); as reportDocumentUrl) {
                          <div class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                            @if (reportLoading()) {
                              <p class="border-b border-slate-200 px-4 py-3 text-sm text-slate-600">
                                Loading report...
                              </p>
                            }
                            <iframe
                              class="h-[32rem] w-full bg-white"
                              [src]="reportDocumentUrl"
                              [title]="'Job report for ' + selectedJob.jobName"
                              (load)="onReportLoad()"
                              (error)="onReportError()"
                            ></iframe>
                          </div>
                        } @else {
                          <p class="mt-2 text-sm text-slate-600">No report data is available for this run yet.</p>
                        }
                      </div>
                  }
                  @case ("files") {
                    <div class="rounded-2xl border border-slate-200 bg-white">
                      <div class="border-b border-slate-200 px-5 py-4">
                        <h3 class="text-lg font-semibold text-slate-900">Available files</h3>
                        <p class="mt-1 text-sm text-slate-500">
                          Placeholder file manifest generated from the current jobs listing view.
                        </p>
                      </div>
                      <div class="divide-y divide-slate-200">
                        @for (fileName of getFiles(selectedJob); track fileName) {
                          <div class="flex items-center justify-between px-5 py-4">
                            <div>
                              <p class="text-sm font-medium text-slate-900">{{ fileName }}</p>
                              <p class="text-xs text-slate-500">Included in the “Download all files” package.</p>
                            </div>
                          </div>
                        }
                      </div>
                    </div>
                  }
                  @case ("settings") {
                    <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h3 class="text-lg font-semibold text-slate-900">Run settings</h3>
                      @if (settingsError()) {
                        <p class="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                          {{ settingsError() }}
                        </p>
                      } @else if (settingsLoading()) {
                        <p class="mt-4 text-sm text-slate-600">Loading settings...</p>
                      } @else if (settingsItems().length > 0) {
                        <dl class="mt-4 grid gap-4 sm:grid-cols-2">
                          @for (setting of settingsItems(); track setting.label) {
                            <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                              <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ setting.label }}</dt>
                              <dd class="mt-1 break-words text-sm text-slate-900">{{ setting.value }}</dd>
                              @if (setting.details.length > 0) {
                                <div class="mt-2 space-y-1">
                                  @for (detail of setting.details; track detail) {
                                    <p class="text-xs text-slate-500">{{ detail }}</p>
                                  }
                                </div>
                              }
                            </div>
                          }
                        </dl>
                      } @else {
                        <p class="mt-4 text-sm text-slate-600">No settings data is available for this run yet.</p>
                      }
                    </div>
                  }
                  @case ("logs") {
                    <div class="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                      <h3 class="text-lg font-semibold text-slate-900">Logs</h3>
                      <div class="mt-4 space-y-3 font-mono text-sm">
                        @for (line of getLogs(selectedJob); track line) {
                          <p class="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-slate-700">{{ line }}</p>
                        }
                      </div>
                    </div>
                  }
                  @case ("citations") {
                    <div class="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 class="text-lg font-semibold text-slate-900">Citations</h3>
                      <p class="mt-2 text-sm text-slate-500">
                        Cite the workflow and platform used to produce the results from this run.
                      </p>
                      <ul class="mt-4 space-y-3">
                        @for (citation of getCitations(selectedJob); track citation) {
                          <li class="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                            {{ citation }}
                          </li>
                        }
                      </ul>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class JobResultsComponent implements OnChanges {
  private resultsService = inject(ResultsService);

  @Input() isOpen = false;
  @Input() job: JobListItem | null = null;

  @Output() closeRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();
  @Output() downloadRequested = new EventEmitter<void>();

  activeTab = signal<JobResultsTab>("results");
  reportUrl = signal<SafeResourceUrl | null>(null);
  reportLoading = signal(false);
  reportError = signal<string | null>(null);
  settingsItems = signal<JobSettingItem[]>([]);
  settingsLoading = signal(false);
  settingsError = signal<string | null>(null);

  readonly tabs: Array<{ id: JobResultsTab; label: string }> = [
    { id: "results", label: "Results" },
    { id: "files", label: "Files" },
    { id: "settings", label: "Settings" },
    { id: "logs", label: "Logs" },
    { id: "citations", label: "Citations" },
  ];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["job"] || changes["isOpen"]) {
      this.activeTab.set("results");
      this.loadReport();
      this.loadSettings();
    }
  }

  setActiveTab(tab: JobResultsTab): void {
    this.activeTab.set(tab);
  }

  formatDate(dateString: string): string {
    return formatDateTimeForJobs(dateString);
  }

  getSummaryItems(job: JobListItem): Array<{ label: string; value: string }> {
    return [
      { label: "Submitted", value: this.formatDate(job.submittedAt) },
      { label: "Type", value: job.workflowType || "N/A" },
      { label: "Status", value: job.status },
      { label: "Score", value: job.score === null ? "N/A" : job.score.toFixed(3) },
    ];
  }

  getFiles(job: JobListItem): string[] {
    return [
      `${job.jobName.replace(/\s+/g, "_").toLowerCase()}_summary.json`,
      `${job.id}_metadata.txt`,
      `${job.id}_results_archive.zip`,
    ];
  }

  getLogs(job: JobListItem): string[] {
    return [
      `Run ${job.id} submitted successfully.`,
      `Status recorded as ${job.status}.`,
      job.score === null
        ? "Score has not been generated yet."
        : `Top score recorded at ${job.score.toFixed(3)}.`,
    ];
  }

  getCitations(job: JobListItem): string[] {
    return [
      `${job.workflowType || "Workflow"} methods and generated outputs.`,
      "SBP Portal platform and supporting infrastructure.",
    ];
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
    if (!this.isOpen || !this.job) {
      this.reportUrl.set(null);
      this.reportError.set(null);
      this.reportLoading.set(false);
      return;
    }

    this.reportLoading.set(true);
    this.reportError.set(null);
    this.resultsService.getJobReportResourceUrl(this.job.id).subscribe({
      next: (reportResourceUrl) => {
        this.reportUrl.set(reportResourceUrl);
      },
      error: (err) => {
        console.error("Error loading job report:", err);
        this.reportLoading.set(false);
        this.reportUrl.set(null);
        this.reportError.set("Failed to load report.");
      },
    });
  }

  private loadSettings(): void {
    if (!this.isOpen || !this.job) {
      this.settingsItems.set([]);
      this.settingsError.set(null);
      this.settingsLoading.set(false);
      return;
    }

    this.settingsLoading.set(true);
    this.settingsError.set(null);
    this.resultsService.getJobSettingParams(this.job.id).subscribe({
      next: (response) => {
        this.settingsItems.set(this.normalizeSettings(response.settingParams));
        this.settingsLoading.set(false);
      },
      error: (err) => {
        console.error("Error loading job settings:", err);
        this.settingsLoading.set(false);
        this.settingsItems.set([]);
        this.settingsError.set("Failed to load settings.");
      },
    });
  }

  private normalizeSettings(
    settingParams: Record<string, unknown> | null | undefined
  ): JobSettingItem[] {
    if (!settingParams) {
      return [];
    }

    return Object.entries(settingParams)
      .filter(([key]) => !key.startsWith("_") && !this.shouldHideSettingKey(key))
      .map(([key, value]) => ({
        ...this.normalizeSettingItem(key, value),
      }));
  }

  private static readonly HIDDEN_SETTING_KEYS = new Set([
    "settings_filters",
    "settings_advanced",
  ]);

  private shouldHideSettingKey(key: string): boolean {
    return JobResultsComponent.HIDDEN_SETTING_KEYS.has(key.toLowerCase());
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
      return {
        label: value.label || this.formatSettingLabel(key),
        value: this.formatSettingValue(value.value),
        details,
      };
    }

    return {
      label: this.formatSettingLabel(key),
      value: this.formatSettingValue(value),
      details: [],
    };
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

  private formatValidationDetails(validation: Record<string, unknown> | undefined): string[] {
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

  private isSchemaSettingParam(
    value: unknown
  ): value is {
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
