import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, of } from "rxjs";
import { catchError, map } from "rxjs/operators";

export interface CcdLookupResult {
  valid: boolean;
  name?: string;
  errorMessage?: string;
}

@Injectable({ providedIn: "root" })
export class CcdLookupService {
  private http = inject(HttpClient);
  private readonly baseUrl = "https://data.rcsb.org/rest/v1/core/chemcomp";

  lookup(code: string): Observable<CcdLookupResult> {
    const normalized = code.trim().toUpperCase();

    if (!/^[A-Z0-9]{1,5}$/.test(normalized)) {
      return of({
        valid: false,
        errorMessage: "Ligand CCD code must be 1–5 alphanumeric characters (e.g. ATP, HEM).",
      });
    }

    return this.http
      .get<{ chem_comp: { name: string } }>(`${this.baseUrl}/${normalized}`)
      .pipe(
        map((response) => ({ valid: true, name: response.chem_comp.name })),
        catchError((err) => {
          if (err.status === 404) {
            return of({
              valid: false,
              errorMessage: "CCD code not found in the RCSB Chemical Component Dictionary.",
            });
          }
          // On unexpected network errors fall back to treating as valid
          // so format-checked codes are not blocked by transient failures
          return of({ valid: true });
        })
      );
  }
}
