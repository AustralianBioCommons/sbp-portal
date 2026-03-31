import { HttpClientTestingModule, HttpTestingController } from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { CcdLookupService } from "./ccd-lookup.service";

describe("CcdLookupService", () => {
  let service: CcdLookupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
    });
    service = TestBed.inject(CcdLookupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it("should return valid=true and the compound name on a 200 response", () => {
    let result: { valid: boolean; name?: string } | undefined;

    service.lookup("ATP").subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      "https://data.rcsb.org/rest/v1/core/chemcomp/ATP"
    );
    expect(req.request.method).toBe("GET");
    req.flush({ chem_comp: { name: "ADENOSINE-5'-TRIPHOSPHATE" } });

    expect(result).toEqual({ valid: true, name: "ADENOSINE-5'-TRIPHOSPHATE" });
  });

  it("should normalise the code to uppercase before requesting", () => {
    service.lookup("atp").subscribe();

    const req = httpMock.expectOne(
      "https://data.rcsb.org/rest/v1/core/chemcomp/ATP"
    );
    req.flush({ chem_comp: { name: "ADENOSINE-5'-TRIPHOSPHATE" } });
  });

  it("should return valid=false on a 404 response", () => {
    let result: { valid: boolean; errorMessage?: string } | undefined;

    service.lookup("XYZ").subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      "https://data.rcsb.org/rest/v1/core/chemcomp/XYZ"
    );
    req.flush("Not Found", { status: 404, statusText: "Not Found" });

    expect(result).toEqual({
      valid: false,
      errorMessage: "CCD code not found in the RCSB Chemical Component Dictionary.",
    });
  });

  it("should return valid=true on unexpected network errors (fail-open)", () => {
    let result: { valid: boolean } | undefined;

    service.lookup("HEM").subscribe((r) => (result = r));

    const req = httpMock.expectOne(
      "https://data.rcsb.org/rest/v1/core/chemcomp/HEM"
    );
    req.flush("Server Error", { status: 500, statusText: "Internal Server Error" });

    expect(result).toEqual({ valid: true });
  });

  it("should reject invalid format without making an HTTP request", () => {
    let result: { valid: boolean; errorMessage?: string } | undefined;

    service.lookup("AT!").subscribe((r) => (result = r));

    httpMock.expectNone("https://data.rcsb.org/rest/v1/core/chemcomp/AT!");
    expect(result).toEqual({
      valid: false,
      errorMessage: "Ligand CCD code must be 1\u20135 alphanumeric characters (e.g. ATP, HEM).",
    });
  });

  it("should reject too-long codes without making an HTTP request", () => {
    let result: { valid: boolean } | undefined;

    service.lookup("TOOLONG").subscribe((r) => (result = r));

    httpMock.expectNone("https://data.rcsb.org/rest/v1/core/chemcomp/TOOLONG");
    expect(result?.valid).toBe(false);
  });
});
