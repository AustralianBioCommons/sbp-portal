import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { DomSanitizer, SafeResourceUrl } from "@angular/platform-browser";
import { map, Observable } from "rxjs";
import { environment } from "../../../environments/environment";

interface ResultReportPreviewResponse {
  runId: string;
  url: string;
}

export interface ResultDownloadItem {
  label: string;
  key: string;
  url: string;
  category: string;
}

export interface ResultReportResponse {
  runId: string;
  report: ResultDownloadItem | null;
}

export interface ResultSettingParamsResponse {
  runId: string;
  settingParams: Record<string, unknown> | null;
}

export interface ResultDownloadsResponse {
  runId: string;
  downloads: ResultDownloadItem[];
}

export interface ResultLogsResponse {
  runId: string;
  logs?: string | string[] | null;
  entries?: string[] | null;
  formattedEntries?: Array<{
    index: number;
    raw: string;
    message: string;
    level?: string;
    timestamp?: string;
  }> | null;
  lastUpdated?: string;
}

@Injectable({
  providedIn: "root",
})
export class ResultsService {
  private readonly resultsUrl = `${environment.apiBaseUrl}/api/results`;
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);

  getJobReportUrl(runId: string): string {
    return `${this.resultsUrl}/${encodeURIComponent(runId)}/report`;
  }

  getJobSettingParams(runId: string): Observable<ResultSettingParamsResponse> {
    return this.http.get<ResultSettingParamsResponse>(
      `${this.resultsUrl}/${encodeURIComponent(runId)}/settingParams`
    );
  }

  getJobLogs(runId: string): Observable<ResultLogsResponse> {
    return this.http.get<ResultLogsResponse>(
      `${this.resultsUrl}/${encodeURIComponent(runId)}/logs`
    );
  }

  getJobDownloads(runId: string): Observable<ResultDownloadsResponse> {
    return this.http.get<ResultDownloadsResponse>(
      `${this.resultsUrl}/${encodeURIComponent(runId)}/downloads`
    );
  }

  getSafeReportResourceUrl(reportUrl: string): SafeResourceUrl {
    return this.sanitizer.bypassSecurityTrustResourceUrl(reportUrl);
  }

  getJobReport(runId: string): Observable<SafeResourceUrl | null> {
    return this.http
      .get<ResultReportResponse>(this.getJobReportUrl(runId))
      .pipe(
        map((response) => {
          if (!response.report || !response.report.url) {
            return null;
          }
          const reportUrl = response.report.url.startsWith("http")
            ? response.report.url
            : `${environment.apiBaseUrl}${response.report.url}`;
          return this.getSafeReportResourceUrl(reportUrl);
        })
      );
  }

  getJobReportResourceUrl(runId: string): Observable<SafeResourceUrl> {
    return this.http
      .post<ResultReportPreviewResponse>(
        `${this.getJobReportUrl(runId)}/preview`,
        {}
      )
      .pipe(
        map((response) => {
          const reportUrl = response.url.startsWith("http")
            ? response.url
            : `${environment.apiBaseUrl}${response.url}`;
          return this.getSafeReportResourceUrl(reportUrl);
        })
      );
  }
}
