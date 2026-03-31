import { Injectable } from "@angular/core";
import { Observable, of } from "rxjs";

export interface CcdLookupResult {
  valid: boolean;
  name?: string;
  errorMessage?: string;
}

export const CCD_COMPOUNDS: Record<string, string> = {
  ADP: "Adenosine diphosphate",
  ATP: "Adenosine triphosphate",
  AMP: "Adenosine phosphate",
  GTP: "Guanosine-5'-triphosphate",
  GDP: "Guanosine-5'-diphosphate",
  FAD: "Flavin-adenine dinucleotide",
  NAD: "Nicotinamide-adenine-dinucleotide",
  NAP: "Nicotinamide-adenine-dinucleotide-phosphate (NADP)",
  NDP: "Dihydro-nicotinamide-adenine-dinucleotide-phosphate (NADPH)",
  HEM: "Heme",
  HEC: "Heme C",
  PLM: "Palmitic acid",
  OLA: "Oleic acid",
  MYR: "Myristic acid",
  CIT: "Citric acid",
  CLA: "Chlorophyll A",
  CHL: "Chlorophyll B",
  BCL: "Bacteriochlorophyll A",
  BCB: "Bacteriochlorophyll B",
};

@Injectable({ providedIn: "root" })
export class CcdLookupService {
  lookup(code: string): Observable<CcdLookupResult> {
    const normalized = code.trim().toUpperCase();

    if (!/^[A-Z0-9]{1,5}$/.test(normalized)) {
      return of({
        valid: false,
        errorMessage: "Ligand CCD code must be 1–5 alphanumeric characters (e.g. ATP, HEM).",
      });
    }

    const name = CCD_COMPOUNDS[normalized];
    if (name) {
      return of({ valid: true, name });
    }

    return of({
      valid: false,
      errorMessage: `"${normalized}" is not in the supported CCD list.`,
    });
  }
}
