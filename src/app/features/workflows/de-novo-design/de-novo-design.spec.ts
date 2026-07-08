import { signal } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { provideHttpClient } from "@angular/common/http";
import { provideHttpClientTesting } from "@angular/common/http/testing";
import { Observable, of } from "rxjs";
import { AuthService } from "../../../core/services/auth.service";
import { CreditsService } from "../../../core/services/credits.service";
import { DatasetUploadService } from "../services/dataset-upload.service";
import { PdbUploadService } from "../services/pdb-upload.service";
import {
  InputRow,
  SchemaLoaderService,
} from "../services/schema-loader.service";
import { InputSchemaField } from "../services/input-schema.service";
import { WorkflowSubmissionService } from "../services/workflow-submission.service";
import DeNovoDesignComponent from "./de-novo-design";

function requiredField(name: string): InputSchemaField {
  return { name } as unknown as InputSchemaField;
}

function rowWith(values: Record<string, unknown>): InputRow {
  return { id: "row1", values };
}

describe("DeNovoDesignComponent", () => {
  let component: DeNovoDesignComponent;
  let fixture: ComponentFixture<DeNovoDesignComponent>;
  let schemaLoader: {
    inputSchemaData: ReturnType<typeof signal<unknown>>;
    inputSchemaFields: ReturnType<typeof signal<InputSchemaField[]>>;
    requiredInputFields: ReturnType<typeof signal<InputSchemaField[]>>;
    optionalInputFields: ReturnType<typeof signal<InputSchemaField[]>>;
    inputRows: ReturnType<typeof signal<InputRow[]>>;
    loadInputSchema: jasmine.Spy;
    initializeDefaultRow: jasmine.Spy;
    generateDefaultValues: jasmine.Spy;
    getFirstRowValues: jasmine.Spy;
    getRowValue: jasmine.Spy;
    updateRowValue: jasmine.Spy;
    inputSchemaService: { validateFieldValue: jasmine.Spy };
  };

  beforeEach(async () => {
    schemaLoader = {
      inputSchemaData: signal<unknown>(null),
      inputSchemaFields: signal<InputSchemaField[]>([]),
      requiredInputFields: signal<InputSchemaField[]>([]),
      optionalInputFields: signal<InputSchemaField[]>([]),
      inputRows: signal<InputRow[]>([]),
      loadInputSchema: jasmine.createSpy("loadInputSchema"),
      initializeDefaultRow: jasmine.createSpy("initializeDefaultRow"),
      generateDefaultValues: jasmine
        .createSpy("generateDefaultValues")
        .and.returnValue({}),
      getFirstRowValues: jasmine
        .createSpy("getFirstRowValues")
        .and.returnValue({}),
      getRowValue: jasmine.createSpy("getRowValue").and.returnValue(""),
      updateRowValue: jasmine.createSpy("updateRowValue"),
      inputSchemaService: {
        validateFieldValue: jasmine
          .createSpy("validateFieldValue")
          .and.returnValue({ valid: true, errors: [] }),
      },
    };

    const authService: {
      isAuthenticated$: Observable<boolean>;
      isLoading$: Observable<boolean>;
      canExecuteWorkflows$: Observable<boolean>;
      profileUrl: string;
      login: jasmine.Spy;
    } = {
      isAuthenticated$: of(true),
      isLoading$: of(true),
      canExecuteWorkflows$: of(true),
      profileUrl: "https://example.com/profile",
      login: jasmine.createSpy("login"),
    };

    const workflowSubmissionService = {
      isSubmitting: signal(false),
      showSuccessDialog: signal(false),
      successDialogData: signal(null),
      submitWorkflowWithDataset: jasmine.createSpy("submitWorkflowWithDataset"),
      goToJobs: jasmine.createSpy("goToJobs"),
    };

    await TestBed.configureTestingModule({
      imports: [DeNovoDesignComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        {
          provide: CreditsService,
          useValue: jasmine.createSpyObj<CreditsService>("CreditsService", [
            "getWorkflowCredits",
            "getMyCredit",
          ]),
        },
        { provide: SchemaLoaderService, useValue: schemaLoader },
        {
          provide: DatasetUploadService,
          useValue: jasmine.createSpyObj<DatasetUploadService>(
            "DatasetUploadService",
            ["uploadDataset"]
          ),
        },
        {
          provide: PdbUploadService,
          useValue: jasmine.createSpyObj<PdbUploadService>("PdbUploadService", [
            "validatePdbFile",
            "uploadPdbFile",
          ]),
        },
        {
          provide: WorkflowSubmissionService,
          useValue: workflowSubmissionService,
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DeNovoDesignComponent);
    component = fixture.componentInstance;
  });

  it("should create", () => {
    expect(component).toBeTruthy();
  });

  describe("isFormValid (derived)", () => {
    beforeEach(() => {
      schemaLoader.requiredInputFields.set([requiredField("starting_pdb")]);
      schemaLoader.inputRows.set([rowWith({ starting_pdb: "target.pdb" })]);
      component.form.controls.jobName.setValue("valid-job");
      component.formErrors.set({});
    });

    it("is true when job name is valid, the row is complete, and there are no errors", () => {
      expect(component.isFormValid()).toBe(true);
    });

    it("is false when the job name is invalid", () => {
      component.form.controls.jobName.setValue("1bad");
      expect(component.isFormValid()).toBe(false);
    });

    it("is false when a required row field is empty", () => {
      schemaLoader.inputRows.set([rowWith({ starting_pdb: "" })]);
      expect(component.isFormValid()).toBe(false);
    });

    it("is false when a field-level error is present", () => {
      component.formErrors.set({ row1_chains: "Invalid chain" });
      expect(component.isFormValid()).toBe(false);
    });

    it("is false when there are no input rows", () => {
      schemaLoader.inputRows.set([]);
      expect(component.isFormValid()).toBe(false);
    });
  });
});
