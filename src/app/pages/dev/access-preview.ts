import { Component } from "@angular/core";
import { environment } from "../../../environments/environment";

@Component({
  selector: "app-access-preview",
  standalone: true,
  template: `
    <div class="min-h-screen bg-gray-100 p-12 space-y-12">
      <h1 class="text-2xl font-bold text-gray-900">
        Access Restricted — overlay preview
      </h1>

      <!-- State 1: not authenticated -->
      <div>
        <p
          class="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide"
        >
          State 1 · Not authenticated
        </p>
        <div
          class="relative h-64 bg-white rounded-[10px] border border-gray-200 shadow-sm"
        >
          <div
            class="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] rounded-[10px] border border-gray-200 flex items-center justify-center"
          >
            <div class="text-center p-4">
              <p class="text-base font-semibold text-gray-900 mb-2">
                Access Restricted
              </p>
              <p class="text-sm text-gray-600">
                To use this tool, please log in or register for a BioCommons
                Access account and add the SBP Workflow Execution bundle to your
                profile.
              </p>
              <div class="mt-3 flex justify-center">
                <button
                  class="inline-flex items-center justify-center w-[218px] h-[47px] text-white bg-[#205A86] hover:bg-[#1a4a6e] rounded-[10px] text-sm font-medium transition-colors"
                >
                  Log in or Register
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- State 2: authenticated but missing role -->
      <div>
        <p
          class="mb-3 text-sm font-medium text-gray-500 uppercase tracking-wide"
        >
          State 2 · Logged in, missing SBP Workflow Execution role
        </p>
        <div
          class="relative h-64 bg-white rounded-[10px] border border-gray-200 shadow-sm"
        >
          <div
            class="absolute inset-0 z-10 bg-white/60 backdrop-blur-[1px] rounded-[10px] border border-gray-200 flex items-center justify-center"
          >
            <div class="text-center p-4">
              <p class="text-base font-semibold text-gray-900 mb-2">
                Access Restricted
              </p>
              <p class="text-sm text-gray-600">
                You currently do not have access to this tool; please go to your
                profile page to add the
                <strong>SBP Workflow Execution</strong> bundle.
              </p>
              <div class="mt-3 flex justify-center">
                <a
                  [href]="profileUrl"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center justify-center w-[218px] h-[47px] text-white bg-[#205A86] hover:bg-[#1a4a6e] rounded-[10px] text-sm font-medium transition-colors"
                >
                  Add bundle
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class AccessPreviewComponent {
  readonly profileUrl = environment.profileUrl;
}
