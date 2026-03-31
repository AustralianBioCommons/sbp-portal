import { TestBed } from "@angular/core/testing";
import { CcdLookupService } from "./ccd-lookup.service";

describe("CcdLookupService", () => {
  let service: CcdLookupService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CcdLookupService);
  });

  it("should return valid=true and the compound name for a known code", () => {
    let result: { valid: boolean; name?: string } | undefined;
    service.lookup("ATP").subscribe((r) => (result = r));
    expect(result).toEqual({ valid: true, name: "Adenosine triphosphate" });
  });

  it("should normalise the code to uppercase before looking up", () => {
    let result: { valid: boolean; name?: string } | undefined;
    service.lookup("atp").subscribe((r) => (result = r));
    expect(result).toEqual({ valid: true, name: "Adenosine triphosphate" });
  });

  it("should return valid=false for a code not in the supported list", () => {
    let result: { valid: boolean; errorMessage?: string } | undefined;
    service.lookup("XYZ").subscribe((r) => (result = r));
    expect(result).toEqual({
      valid: false,
      errorMessage: '"XYZ" is not in the supported CCD list.',
    });
  });

  it("should return valid=true for every code in the supported list", () => {
    const codes = [
      "ADP", "ATP", "AMP", "GTP", "GDP", "FAD",
      "NAD", "NAP", "NDP", "HEM", "HEC", "PLM",
      "OLA", "MYR", "CIT", "CLA", "CHL", "BCL", "BCB",
    ];
    codes.forEach((code) => {
      let result: { valid: boolean } | undefined;
      service.lookup(code).subscribe((r) => (result = r));
      expect(result?.valid).withContext(code).toBe(true);
    });
  });

  it("should reject invalid format (special characters)", () => {
    let result: { valid: boolean; errorMessage?: string } | undefined;
    service.lookup("AT!").subscribe((r) => (result = r));
    expect(result).toEqual({
      valid: false,
      errorMessage: "Ligand CCD code must be 1\u20135 alphanumeric characters (e.g. ATP, HEM).",
    });
  });

  it("should reject codes longer than 5 characters", () => {
    let result: { valid: boolean } | undefined;
    service.lookup("TOOLONG").subscribe((r) => (result = r));
    expect(result?.valid).toBe(false);
  });

  it("should trim whitespace before looking up", () => {
    let result: { valid: boolean; name?: string } | undefined;
    service.lookup("  HEM  ").subscribe((r) => (result = r));
    expect(result).toEqual({ valid: true, name: "Heme" });
  });
});
