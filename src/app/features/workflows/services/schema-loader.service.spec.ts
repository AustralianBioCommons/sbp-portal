import { TestBed } from "@angular/core/testing";
import { of, throwError } from "rxjs";
import { SchemaLoaderService } from "./schema-loader.service";
import {
  InputSchemaField,
  InputSchemaService,
  ParsedInputSchema,
} from "./input-schema.service";

function field(partial: Partial<InputSchemaField>): InputSchemaField {
  return { name: "unnamed", type: "string", ...partial } as InputSchemaField;
}

function schemaWithFields(fields: InputSchemaField[]): ParsedInputSchema {
  return { sections: [{ name: "main", fields }] };
}

describe("SchemaLoaderService", () => {
  let service: SchemaLoaderService;
  let inputSchemaService: jasmine.SpyObj<InputSchemaService>;

  beforeEach(() => {
    inputSchemaService = jasmine.createSpyObj<InputSchemaService>(
      "InputSchemaService",
      [
        "fetchInputSchema",
        "parseInputSchema",
        "getRequiredFields",
        "generateDefaultValues",
      ]
    );

    TestBed.configureTestingModule({
      providers: [
        SchemaLoaderService,
        { provide: InputSchemaService, useValue: inputSchemaService },
      ],
    });
    service = TestBed.inject(SchemaLoaderService);
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("loadInputSchema", () => {
    const rawSchema = { items: { properties: { a: {} } } };

    it("populates signals and invokes onSuccess when the schema is valid", () => {
      const required = field({ name: "id", required: true });
      const optional = field({ name: "note", required: false });
      const parsed = schemaWithFields([required, optional]);

      inputSchemaService.fetchInputSchema.and.returnValue(of(rawSchema));
      inputSchemaService.parseInputSchema.and.returnValue(of(parsed));
      inputSchemaService.getRequiredFields.and.returnValue([required]);

      const onSuccess = jasmine.createSpy("onSuccess");
      const onError = jasmine.createSpy("onError");
      service.loadInputSchema("http://schema", onSuccess, onError);

      expect(service.inputSchemaData()).toBe(parsed);
      expect(service.inputSchemaFields()).toEqual([required, optional]);
      expect(service.requiredInputFields()).toEqual([required]);
      expect(service.optionalInputFields()).toEqual([optional]);
      expect(onSuccess).toHaveBeenCalledWith(parsed);
      expect(onError).not.toHaveBeenCalled();
    });

    it("invokes onError when the schema lacks items/properties", () => {
      inputSchemaService.fetchInputSchema.and.returnValue(of({ items: {} }));
      const onError = jasmine.createSpy("onError");

      service.loadInputSchema("http://schema", undefined, onError);

      expect(onError).toHaveBeenCalled();
      expect(inputSchemaService.parseInputSchema).not.toHaveBeenCalled();
      expect(service.inputSchemaData()).toBeNull();
    });

    it("invokes onError when parsing fails", () => {
      inputSchemaService.fetchInputSchema.and.returnValue(of(rawSchema));
      inputSchemaService.parseInputSchema.and.returnValue(
        throwError(() => new Error("parse failed"))
      );
      const onError = jasmine.createSpy("onError");

      service.loadInputSchema("http://schema", undefined, onError);

      expect(onError).toHaveBeenCalled();
    });

    it("invokes onError when fetching fails", () => {
      inputSchemaService.fetchInputSchema.and.returnValue(
        throwError(() => new Error("network"))
      );
      const onError = jasmine.createSpy("onError");

      service.loadInputSchema("http://schema", undefined, onError);

      expect(onError).toHaveBeenCalled();
    });
  });

  describe("initializeDefaultRow", () => {
    it("creates one row with type-based defaults", () => {
      service.inputSchemaData.set(
        schemaWithFields([
          field({ name: "s", type: "string" }),
          field({ name: "n", type: "number", validation: { min: 5 } }),
          field({ name: "n0", type: "number" }),
          field({ name: "b", type: "boolean" }),
          field({ name: "arr", type: "array" }),
          field({ name: "obj", type: "object" }),
          field({ name: "f", type: "file" }),
          field({ name: "d", type: "string", default: "preset" }),
        ])
      );

      const onComplete = jasmine.createSpy("onComplete");
      service.initializeDefaultRow(onComplete);

      const rows = service.inputRows();
      expect(rows.length).toBe(1);
      expect(rows[0].values).toEqual({
        s: "",
        n: 5,
        n0: 0,
        b: false,
        arr: [],
        obj: {},
        f: "",
        d: "preset",
      });
      expect(service.nextRowId()).toBe(2);
      expect(onComplete).toHaveBeenCalled();
    });

    it("does nothing when a row already exists", () => {
      service.inputSchemaData.set(schemaWithFields([field({ name: "s" })]));
      service.initializeDefaultRow();
      service.initializeDefaultRow();
      expect(service.inputRows().length).toBe(1);
    });

    it("warns and adds no row when the schema is not loaded", () => {
      const warn = spyOn(console, "warn");
      service.initializeDefaultRow();
      expect(service.inputRows().length).toBe(0);
      expect(warn).toHaveBeenCalled();
    });
  });

  describe("generateDefaultValues", () => {
    it("returns an empty object when no schema is loaded", () => {
      expect(service.generateDefaultValues()).toEqual({});
      expect(inputSchemaService.generateDefaultValues).not.toHaveBeenCalled();
    });

    it("delegates to the input schema service when a schema is loaded", () => {
      const parsed = schemaWithFields([field({ name: "s" })]);
      service.inputSchemaData.set(parsed);
      inputSchemaService.generateDefaultValues.and.returnValue({ s: "x" });

      expect(service.generateDefaultValues()).toEqual({ s: "x" });
      expect(inputSchemaService.generateDefaultValues).toHaveBeenCalledWith(
        parsed
      );
    });
  });

  describe("row value accessors", () => {
    beforeEach(() => {
      service.inputRows.set([{ id: "row1", values: { field1: "value1" } }]);
    });

    it("updates a row value", () => {
      service.updateRowValue("row1", "field1", "updated");
      expect(service.getRowValue("row1", "field1")).toBe("updated");
    });

    it("leaves other rows untouched when updating", () => {
      service.inputRows.set([
        { id: "row1", values: { a: "1" } },
        { id: "row2", values: { a: "2" } },
      ]);
      service.updateRowValue("row1", "a", "changed");
      expect(service.getRowValue("row2", "a")).toBe("2");
    });

    it("returns an empty string for an unknown row or field", () => {
      expect(service.getRowValue("missing", "field1")).toBe("");
      expect(service.getRowValue("row1", "missing")).toBe("");
    });
  });

  describe("getFirstRowValues", () => {
    it("returns an empty object when there are no rows", () => {
      expect(service.getFirstRowValues()).toEqual({});
    });

    it("adds defaults for optional fields not already present", () => {
      service.inputRows.set([{ id: "row1", values: { present: "kept" } }]);
      service.optionalInputFields.set([
        field({ name: "present", type: "string" }),
        field({ name: "extra", type: "number", validation: { min: 3 } }),
      ]);

      const values = service.getFirstRowValues();
      expect(values["present"]).toBe("kept");
      expect(values["extra"]).toBe(3);
    });
  });

  it("reset clears all state", () => {
    service.inputSchemaData.set(schemaWithFields([field({ name: "s" })]));
    service.inputSchemaFields.set([field({ name: "s" })]);
    service.requiredInputFields.set([field({ name: "s" })]);
    service.optionalInputFields.set([field({ name: "s" })]);
    service.inputRows.set([{ id: "row1", values: {} }]);
    service.nextRowId.set(9);

    service.reset();

    expect(service.inputSchemaData()).toBeNull();
    expect(service.inputSchemaFields()).toEqual([]);
    expect(service.requiredInputFields()).toEqual([]);
    expect(service.optionalInputFields()).toEqual([]);
    expect(service.inputRows()).toEqual([]);
    expect(service.nextRowId()).toBe(1);
  });
});
