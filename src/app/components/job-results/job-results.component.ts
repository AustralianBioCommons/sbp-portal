import { CommonModule } from "@angular/common";
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  signal,
} from "@angular/core";
import { JobListItem } from "../../cores/services/jobs.service";
import { formatDateTimeForJobs } from "../../cores/utils/date.utils";

type JobResultsTab = "results" | "files" | "settings" | "logs" | "citations";

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
                  <p class="text-xs font-semibold text-slate-500">
                    Job name
                  </p>
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
                    <p class="text-sm font-medium text-slate-500">
                      {{ item.label }}
                    </p>
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
                  <div class="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
                    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                      <h3 class="text-lg font-semibold text-slate-900">Results overview</h3>
                      <p class="mt-2 text-sm text-slate-600">
                        This run is currently marked as <span class="font-medium text-slate-900">{{ selectedJob.status }}</span>.
                        @if (selectedJob.score !== null) {
                          The best score recorded for this job is <span class="font-medium text-slate-900">{{ selectedJob.score.toFixed(3) }}</span>.
                        } @else {
                          A score has not been generated for this job yet.
                        }
                      </p>
                      <div class="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4">
                        <p class="text-sm font-medium text-slate-900">Generated designs</p>
                        <p class="mt-1 text-3xl font-semibold text-slate-900">
                          {{ selectedJob.finalDesignCount ?? 0 }}
                        </p>
                        <p class="mt-2 text-sm text-slate-500">
                          Use the Files tab to download the packaged artifacts currently exposed from this jobs view.
                        </p>
                      </div>
                    </div>
                    <div class="rounded-2xl border border-slate-200 bg-white p-5">
                      <h3 class="text-lg font-semibold text-slate-900">Quick status</h3>
                      <div class="mt-4 space-y-3 text-sm text-slate-600">
                        <p><span class="font-medium text-slate-900">Run ID:</span> {{ selectedJob.id }}</p>
                        <p><span class="font-medium text-slate-900">Workflow:</span> {{ selectedJob.workflowType || "N/A" }}</p>
                        <p><span class="font-medium text-slate-900">Submitted:</span> {{ formatDate(selectedJob.submittedAt) }}</p>
                      </div>
                    </div>
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
                    <dl class="mt-4 grid gap-4 sm:grid-cols-2">
                      @for (setting of getSettings(selectedJob); track setting.label) {
                        <div class="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                          <dt class="text-xs font-semibold uppercase tracking-wide text-slate-500">{{ setting.label }}</dt>
                          <dd class="mt-1 text-sm text-slate-900">{{ setting.value }}</dd>
                        </div>
                      }
                    </dl>
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
  @Input() isOpen = false;
  @Input() job: JobListItem | null = null;

  @Output() closeRequested = new EventEmitter<void>();
  @Output() deleteRequested = new EventEmitter<void>();
  @Output() downloadRequested = new EventEmitter<void>();

  activeTab = signal<JobResultsTab>("results");

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

  getSettings(job: JobListItem): Array<{ label: string; value: string }> {
    return [
      { label: "Workflow", value: job.workflowType || "N/A" },
      { label: "Run ID", value: job.id },
      {
        label: "Final designs",
        value:
          job.finalDesignCount === null || job.finalDesignCount === undefined
            ? "N/A"
            : String(job.finalDesignCount),
      },
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
}
