import { HttpClient } from "@angular/common/http";
import {
  HttpClientTestingModule,
  HttpTestingController,
} from "@angular/common/http/testing";
import { TestBed } from "@angular/core/testing";
import { throwError } from "rxjs";
import {
  InputSchemaField,
  InputSchemaSection,
  InputSchemaService,
  ParsedInputSchema,
} from "./input-schema.service";

describe("InputSchemaService", () => {
  let service: InputSchemaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [InputSchemaService],
    });
    service = TestBed.inject(InputSchemaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it("should be created", () => {
    expect(service).toBeTruthy();
  });

  describe("fetchInputSchema", () => {
    it("should fetch input schema from URL", (done) => {
      const mockSchema = {
        title: "Test Input Schema",
        sections: [],
      };

      service
        .fetchInputSchema("https://example.com/input-schema.json")
        .subscribe({
          next: (schema) => {
            expect(schema).toEqual(mockSchema);
            done();
          },
        });

      const req = httpMock.expectOne("https://example.com/input-schema.json");
      expect(req.request.method).toBe("GET");
      req.flush(mockSchema);
    });

    it("should handle empty URL", (done) => {
      service.fetchInputSchema("").subscribe({
        error: (error) => {
          expect(error.message).toBe("Input schema URL is required");
          done();
        },
      });
    });

    it("should handle HTTP errors", (done) => {
      spyOn(console, "error");

      service
        .fetchInputSchema("https://example.com/input-schema.json")
        .subscribe({
          error: (error) => {
            expect(error.message).toContain("Failed to fetch input schema");
            done();
          },
        });

      const req = httpMock.expectOne("https://example.com/input-schema.json");
      req.error(new ErrorEvent("Network error"));
    });

    it("should use fallback error message when the error lacks details", (done) => {
      const http = TestBed.inject(HttpClient);
      spyOn(http, "get").and.returnValue(throwError(() => ({ status: 500 })));

      service
        .fetchInputSchema("https://example.com/input-schema.json")
        .subscribe({
          next: () => done.fail("Expected an error when the request fails"),
          error: (error) => {
            expect(error.message).toContain("Unknown error");
            done();
          },
        });
    });
  });

  describe("parseInputSchema", () => {
    it("should parse schema with sections format", (done) => {
      const rawSchema = {
        title: "Test Schema",
        description: "Test Description",
        sections: [
          {
            name: "section1",
            title: "Section 1",
            fields: [
              {
                name: "field1",
                type: "string",
                label: "Field 1",
              },
            ],
          },
        ],
      };

      service.parseInputSchema(rawSchema).subscribe({
        next: (parsed) => {
          expect(parsed.title).toBe("Test Schema");
          expect(parsed.description).toBe("Test Description");
          expect(parsed.sections.length).toBe(1);
          expect(parsed.sections[0].fields.length).toBe(1);
          done();
        },
      });
    });

    it("should parse JSON Schema properties format", (done) => {
      const rawSchema = {
        title: "Test Schema",
        properties: {
          field1: {
            type: "string",
            title: "Field 1",
            description: "First field",
          },
          field2: {
            type: "number",
            title: "Field 2",
            minimum: 0,
            maximum: 100,
          },
        },
        required: ["field1"],
      };

      service.parseInputSchema(rawSchema).subscribe({
        next: (parsed) => {
          expect(parsed.sections.length).toBe(1);
          expect(parsed.sections[0].fields.length).toBe(2);
          expect(parsed.sections[0].fields[0].required).toBe(true);
          expect(parsed.sections[0].fields[1].required).toBe(false);
          done();
        },
      });
    });

    it("should handle invalid schema", (done) => {
      service.parseInputSchema(null).subscribe({
        error: (error) => {
          expect(error.message).toBe("Invalid input schema format");
          done();
        },
      });
    });

    it("should handle non-error exceptions thrown while parsing sections", (done) => {
      const rawSchema = {
        sections: [],
      };

      const serviceWithPrivate = service as unknown as {
        parseSections: (
          sections: Record<string, unknown>[]
        ) => InputSchemaSection[];
      };

      spyOn(serviceWithPrivate, "parseSections").and.callFake(() => {
        throw "string error";
      });

      service.parseInputSchema(rawSchema).subscribe({
        next: () => done.fail("Expected parsing to emit an error"),
        error: (error) => {
          expect(error.message).toContain("Unknown error");
          done();
        },
      });
    });
  });

  describe("generateDefaultValues", () => {
    it("should generate default values for all fields", () => {
      const schema: ParsedInputSchema = {
        sections: [
          {
            name: "section1",
            fields: [
              {
                name: "field1",
                type: "string",
                default: "test_value",
              },
              {
                name: "field2",
                type: "number",
              },
              {
                name: "field3",
                type: "boolean",
              },
            ],
          },
        ],
      };

      const defaults = service.generateDefaultValues(schema);
      expect(defaults.field1).toBe("test_value");
      expect(defaults.field2).toBe(0);
      expect(defaults.field3).toBe(false);
    });
  });

  describe("validateFieldValue", () => {
    it("should validate required fields", () => {
      const field: InputSchemaField = {
        name: "test_field",
        type: "string",
        required: true,
      };

      const result1 = service.validateFieldValue(field, "");
      expect(result1.valid).toBe(false);
      expect(result1.errors.length).toBeGreaterThan(0);

      const result2 = service.validateFieldValue(field, "valid_value");
      expect(result2.valid).toBe(true);
      expect(result2.errors.length).toBe(0);
    });

    it("should validate string length", () => {
      const field: InputSchemaField = {
        name: "test_field",
        type: "string",
        validation: {
          minLength: 5,
          maxLength: 10,
        },
      };

      const result1 = service.validateFieldValue(field, "abc");
      expect(result1.valid).toBe(false);

      const result2 = service.validateFieldValue(field, "abcdefghijk");
      expect(result2.valid).toBe(false);

      const result3 = service.validateFieldValue(field, "abcdef");
      expect(result3.valid).toBe(true);
    });

    it("should validate number ranges", () => {
      const field: InputSchemaField = {
        name: "test_field",
        type: "number",
        validation: {
          min: 10,
          max: 100,
        },
      };

      const result1 = service.validateFieldValue(field, 5);
      expect(result1.valid).toBe(false);

      const result2 = service.validateFieldValue(field, 150);
      expect(result2.valid).toBe(false);

      const result3 = service.validateFieldValue(field, 50);
      expect(result3.valid).toBe(true);
    });

    it("should validate enum options", () => {
      const field: InputSchemaField = {
        name: "test_field",
        type: "string",
        options: ["option1", "option2", "option3"],
      };

      const result1 = service.validateFieldValue(field, "invalid_option");
      expect(result1.valid).toBe(false);

      const result2 = service.validateFieldValue(field, "option2");
      expect(result2.valid).toBe(true);
    });

    it("should validate object options format", () => {
      const field: InputSchemaField = {
        name: "test_field",
        type: "string",
        options: [
          { value: "val1", label: "Value 1" },
          { value: "val2", label: "Value 2" },
        ],
      };

      const result1 = service.validateFieldValue(field, "invalid");
      expect(result1.valid).toBe(false);

      const result2 = service.validateFieldValue(field, "val1");
      expect(result2.valid).toBe(true);
    });

    it("should handle optional fields correctly", () => {
      const field: InputSchemaField = {
        name: "optional_field",
        type: "string",
        required: false,
      };

      const result1 = service.validateFieldValue(field, "");
      expect(result1.valid).toBe(true);

      const result2 = service.validateFieldValue(field, null);
      expect(result2.valid).toBe(true);

      const result3 = service.validateFieldValue(field, undefined);
      expect(result3.valid).toBe(true);
    });

    it("should validate different field types", () => {
      // Boolean field
      const boolField: InputSchemaField = {
        name: "bool_field",
        type: "boolean",
      };
      expect(service.validateFieldValue(boolField, true).valid).toBe(true);
      expect(service.validateFieldValue(boolField, "not_bool").valid).toBe(
        false
      );

      // Array field
      const arrayField: InputSchemaField = {
        name: "array_field",
        type: "array",
      };
      expect(service.validateFieldValue(arrayField, []).valid).toBe(true);
      expect(service.validateFieldValue(arrayField, "not_array").valid).toBe(
        false
      );

      // Object field
      const objectField: InputSchemaField = {
        name: "object_field",
        type: "object",
      };
      expect(service.validateFieldValue(objectField, {}).valid).toBe(true);
      expect(service.validateFieldValue(objectField, []).valid).toBe(false);
    });

    it("should validate pattern matching", () => {
      const field: InputSchemaField = {
        name: "pattern_field",
        type: "string",
        validation: {
          pattern: "^[a-zA-Z]+$",
        },
      };

      const result1 = service.validateFieldValue(field, "ValidString");
      expect(result1.valid).toBe(true);

      const result2 = service.validateFieldValue(field, "Invalid123");
      expect(result2.valid).toBe(false);
    });
  });

  describe("additional parsing formats", () => {
    it("should parse Nextflow input format (array)", (done) => {
      const rawSchema = [
        {
          name: "input_section",
          title: "Input Section",
          description: "Input parameters",
          properties: {
            param1: {
              type: "string",
              title: "Parameter 1",
            },
          },
          required: ["param1"],
        },
      ];

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.parseInputSchema(rawSchema as any).subscribe({
        next: (parsed) => {
          expect(parsed.sections.length).toBe(1);
          expect(parsed.sections[0].name).toBe("input_section");
          expect(parsed.sections[0].fields.length).toBe(1);
          expect(parsed.sections[0].fields[0].required).toBe(true);
          done();
        },
      });
    });

    it("should parse Bindflow format (items.properties)", (done) => {
      const rawSchema = {
        title: "Bindflow Schema",
        items: {
          properties: {
            input_file: {
              type: "string",
              format: "file-path",
              title: "Input File",
            },
            threshold: {
              type: "number",
              minimum: 0,
              maximum: 1,
            },
          },
          required: ["input_file"],
        },
      };

      service.parseInputSchema(rawSchema).subscribe({
        next: (parsed) => {
          expect(parsed.sections.length).toBe(1);
          expect(parsed.sections[0].name).toBe("input_parameters");
          expect(parsed.sections[0].fields.length).toBe(2);
          expect(parsed.sections[0].fields[0].type).toBe("file");
          expect(parsed.sections[0].fields[0].required).toBe(true);
          expect(parsed.sections[0].fields[1].type).toBe("number");
          done();
        },
      });
    });

    it("should handle empty or malformed schemas", (done) => {
      service.parseInputSchema({}).subscribe({
        next: (parsed) => {
          expect(parsed.sections.length).toBe(0);
          expect(parsed.title).toBe("Input Configuration");
          done();
        },
      });
    });
  });

  describe("utility methods", () => {
    it("should generate default values for all field types", () => {
      const schema: ParsedInputSchema = {
        sections: [
          {
            name: "section1",
            fields: [
              { name: "string_field", type: "string" },
              { name: "number_field", type: "number" },
              { name: "boolean_field", type: "boolean" },
              { name: "array_field", type: "array" },
              { name: "object_field", type: "object" },
              { name: "file_field", type: "file" },
              {
                name: "number_with_min",
                type: "number",
                validation: { min: 5 },
              },
            ],
          },
        ],
      };

      const defaults = service.generateDefaultValues(schema);
      expect(defaults.string_field).toBe("");
      expect(defaults.number_field).toBe(0);
      expect(defaults.boolean_field).toBe(false);
      expect(defaults.array_field).toEqual([]);
      expect(defaults.object_field).toEqual({});
      expect(defaults.file_field).toBe(null);
      expect(defaults.number_with_min).toBe(5);
    });

    it("should get required fields", () => {
      const schema: ParsedInputSchema = {
        sections: [
          {
            name: "section1",
            fields: [
              { name: "required_field", type: "string", required: true },
              { name: "optional_field", type: "string", required: false },
              { name: "default_field", type: "string" },
            ],
          },
        ],
      };

      const requiredFields = service.getRequiredFields(schema);
      expect(requiredFields.length).toBe(1);
      expect(requiredFields[0].name).toBe("required_field");
    });

    it("should get optional fields", () => {
      const schema: ParsedInputSchema = {
        sections: [
          {
            name: "section1",
            fields: [
              { name: "required_field", type: "string", required: true },
              { name: "optional_field", type: "string", required: false },
              { name: "default_field", type: "string" },
            ],
          },
        ],
      };

      const optionalFields = service.getOptionalFields(schema);
      expect(optionalFields.length).toBe(2);
      expect(optionalFields.map((f) => f.name)).toContain("optional_field");
      expect(optionalFields.map((f) => f.name)).toContain("default_field");
    });

    it("should fetch and parse schema in one operation", (done) => {
      const mockSchema = {
        title: "Combined Test",
        properties: {
          test_field: {
            type: "string",
          },
        },
      };

      service
        .fetchAndParseInputSchema("https://example.com/schema.json")
        .subscribe({
          next: (parsed) => {
            expect(parsed.title).toBe("Combined Test");
            expect(parsed.sections.length).toBe(1);
            done();
          },
        });

      const req = httpMock.expectOne("https://example.com/schema.json");
      req.flush(mockSchema);
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle parsing errors gracefully", (done) => {
      spyOn(console, "error");

      // Test with non-object schema
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      service.parseInputSchema("invalid_string" as any).subscribe({
        error: (error) => {
          expect(error.message).toBe("Invalid input schema format");
          done();
        },
      });
    });

    it("should handle field validation edge cases", () => {
      const field: InputSchemaField = {
        name: "test_field",
        type: "number",
      };

      // Test with string that's not a number
      const result1 = service.validateFieldValue(field, "not_a_number");
      expect(result1.valid).toBe(false);
      expect(result1.errors[0]).toContain("must be a number");

      // Test with valid number as string
      const result2 = service.validateFieldValue(field, "42");
      expect(result2.valid).toBe(true);
    });

    it("should handle missing field properties gracefully", () => {
      const schema = {
        properties: {
          minimal_field: {
            // Missing type, should default to string
          },
        },
      };

      service.parseInputSchema(schema).subscribe({
        next: (parsed) => {
          expect(parsed.sections[0].fields[0].type).toBe("string");
          expect(parsed.sections[0].fields[0].label).toBe("Minimal Field");
        },
      });
    });
  });

  describe("placeholder generation through schema parsing", () => {
    it("should generate appropriate placeholders for different field types and names", () => {
      const schema = {
        type: "object",
        properties: {
          sequence_length: {
            type: "integer",
          },
          target_residues: {
            type: "string",
          },
          test_residues: {
            type: "string",
          },
          protein_chains: {
            type: "string",
          },
          protein_name: {
            type: "string",
          },
          sequence_id: {
            type: "string",
          },
          config_file: {
            type: "string",
            format: "file-path",
          },
          max_count: {
            type: "number",
            default: 100,
          },
        },
      };

      let parsedSchema: ParsedInputSchema;
      service.parseInputSchema(schema).subscribe((result) => {
        parsedSchema = result;
      });

      const fields = parsedSchema!.sections[0].fields;

      // Find each field and verify its placeholder
      const lengthField = fields.find((f) => f.name === "sequence_length");
      const residuesField = fields.find((f) => f.name === "target_residues");
      const residuesOnlyField = fields.find((f) => f.name === "test_residues");
      const chainsField = fields.find((f) => f.name === "protein_chains");
      const nameField = fields.find((f) => f.name === "protein_name");
      const idField = fields.find((f) => f.name === "sequence_id");
      const configField = fields.find((f) => f.name === "config_file");
      const countField = fields.find((f) => f.name === "max_count");

      // Verify the actual placeholder generation logic
      expect(lengthField?.placeholder).toBe("Enter a number"); // integer type takes precedence
      expect(residuesField?.placeholder).toBe("e.g., 1,2-10 or A1-10,B1-20"); // residues-specific pattern
      expect(residuesOnlyField?.placeholder).toBe(
        "e.g., 1,2-10 or A1-10,B1-20"
      ); // residues-specific pattern
      expect(chainsField?.placeholder).toBe("e.g., A,B or ABC"); // chains-specific pattern
      expect(nameField?.placeholder).toBe("Enter protein name");
      expect(idField?.placeholder).toBe("Enter sequence id");
      expect(configField?.placeholder).toBe("Select config file file");
      expect(countField?.placeholder).toBe("Default: 100");
    });
  });

  describe("default value generation", () => {
    it("should generate correct default values for different field types", () => {
      const schema: ParsedInputSchema = {
        sections: [
          {
            name: "test_section",
            title: "Test Section",
            description: "Test description",
            fields: [
              {
                name: "text_field",
                type: "string",
                label: "Text Field",
              },
              {
                name: "number_field",
                type: "number",
                label: "Number Field",
              },
              {
                name: "boolean_field",
                type: "boolean",
                label: "Boolean Field",
              },
              {
                name: "file_field",
                type: "file",
                label: "File Field",
              },
              {
                name: "array_field",
                type: "array",
                label: "Array Field",
              },
              {
                name: "unknown_type",
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                type: "custom" as any,
                label: "Unknown Type",
              },
            ],
          },
        ],
      };

      const defaults = service.generateDefaultValues(schema);

      expect(defaults.text_field).toBe("");
      expect(defaults.number_field).toBe(0);
      expect(defaults.boolean_field).toBe(false);
      expect(defaults.file_field).toBe(null);
      expect(defaults.array_field).toEqual([]);
      expect(defaults.unknown_type).toBe(""); // default case
    });

    it("should handle fields with existing default values", () => {
      const schema: ParsedInputSchema = {
        sections: [
          {
            name: "test_section",
            title: "Test Section",
            description: "Test description",
            fields: [
              {
                name: "field_with_default",
                type: "string",
                label: "Field With Default",
                default: "existing_value",
              },
            ],
          },
        ],
      };

      const defaults = service.generateDefaultValues(schema);
      expect(defaults.field_with_default).toBe("existing_value");
    });
  });

  describe("comprehensive field validation", () => {
    it("should validate string type strictly", () => {
      const field: InputSchemaField = {
        name: "string_field",
        type: "string",
        label: "String Field",
      };

      // Valid string
      expect(service.validateFieldValue(field, "valid string").valid).toBe(
        true
      );

      // Invalid: number passed as string type
      const result = service.validateFieldValue(field, 123);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("String Field must be a string");
    });

    it("should validate string minimum length", () => {
      const field: InputSchemaField = {
        name: "min_length_field",
        type: "string",
        label: "Min Length Field",
        validation: {
          minLength: 5,
        },
      };

      expect(service.validateFieldValue(field, "short").valid).toBe(true); // exactly 5
      expect(service.validateFieldValue(field, "sh").valid).toBe(false); // less than 5
    });

    it("should validate string maximum length", () => {
      const field: InputSchemaField = {
        name: "max_length_field",
        type: "string",
        label: "Max Length Field",
        validation: {
          maxLength: 10,
        },
      };

      expect(service.validateFieldValue(field, "short").valid).toBe(true);
      expect(
        service.validateFieldValue(field, "this is way too long").valid
      ).toBe(false);
    });

    it("should validate number type strictly", () => {
      const field: InputSchemaField = {
        name: "number_field",
        type: "number",
        label: "Number Field",
      };

      expect(service.validateFieldValue(field, 123).valid).toBe(true);
      expect(service.validateFieldValue(field, "not a number").valid).toBe(
        false
      );
    });

    it("should validate number minimum value", () => {
      const field: InputSchemaField = {
        name: "min_number_field",
        type: "number",
        label: "Min Number Field",
        validation: {
          min: 0,
        },
      };

      expect(service.validateFieldValue(field, 5).valid).toBe(true);
      expect(service.validateFieldValue(field, -1).valid).toBe(false);
    });

    it("should validate number maximum value", () => {
      const field: InputSchemaField = {
        name: "max_number_field",
        type: "number",
        label: "Max Number Field",
        validation: {
          max: 100,
        },
      };

      expect(service.validateFieldValue(field, 50).valid).toBe(true);
      expect(service.validateFieldValue(field, 150).valid).toBe(false);
    });

    it("should validate boolean type strictly", () => {
      const field: InputSchemaField = {
        name: "boolean_field",
        type: "boolean",
        label: "Boolean Field",
      };

      expect(service.validateFieldValue(field, true).valid).toBe(true);
      expect(service.validateFieldValue(field, false).valid).toBe(true);
      expect(service.validateFieldValue(field, "true").valid).toBe(false);
    });

    it("should validate file type (accepts null, File, or string path)", () => {
      const field: InputSchemaField = {
        name: "file_field",
        type: "file",
        label: "File Field",
      };

      expect(service.validateFieldValue(field, null).valid).toBe(true);
      expect(service.validateFieldValue(field, "/path/to/file.txt").valid).toBe(
        true
      );
      expect(service.validateFieldValue(field, 123).valid).toBe(false);
    });
  });

  describe("error handling", () => {
    it("should handle parsing errors gracefully", (done) => {
      // Create an invalid schema that will cause parsing errors
      const invalidSchema = {
        type: "object",
        properties: {
          // This will trigger edge cases in parsing
          malformed: null,
        },
      };

      spyOn(console, "error");

      service.parseInputSchema(invalidSchema).subscribe({
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        next: (_result) => {
          // Should not reach here with this malformed schema
          done.fail("Should have thrown an error");
        },
        error: (error) => {
          // Error handling should provide meaningful error messages
          expect(error.message).toContain("Failed to parse input schema");
          done();
        },
      });
    });

    it("should handle edge cases in placeholder generation", () => {
      const edgeCaseSchema = {
        type: "object",
        properties: {
          some_length_field: {
            type: "string", // Not number/integer, so should hit different conditions
          },
          pure_residues: {
            type: "string",
            // This should trigger the residues condition
          },
        },
      };

      let parsedSchema: ParsedInputSchema;
      service.parseInputSchema(edgeCaseSchema).subscribe((result) => {
        parsedSchema = result;
      });

      const fields = parsedSchema!.sections[0].fields;
      const lengthField = fields.find((f) => f.name === "some_length_field");
      const residuesField = fields.find((f) => f.name === "pure_residues");

      expect(lengthField?.placeholder).toBe("Enter length value"); // Still matches length condition
      expect(residuesField?.placeholder).toBe("e.g., 1,2-10 or A1-10,B1-20"); // residues-specific pattern
    });
  });

  describe("edge cases", () => {
    it("should handle empty or malformed schema sections", () => {
      const emptySchema = {
        type: "object",
        // Missing properties - should return empty array in some conditions
      };

      let parsedSchema: ParsedInputSchema;
      service.parseInputSchema(emptySchema).subscribe((result) => {
        parsedSchema = result;
      });

      expect(parsedSchema!.sections.length).toBeGreaterThanOrEqual(0);
    });

    it("should handle different option value formats", () => {
      const schemaWithOptions = {
        type: "object",
        properties: {
          string_array_field: {
            type: "string",
            enum: ["option1", "option2", "option3"], // Pure string array - line 135
          },
          object_array_field: {
            type: "string",
            enum: [
              { value: "val1", label: "Label 1" }, // Valid object structure - line 137-146
              { value: "val2", label: "Label 2" },
            ],
          },
          mixed_invalid_field: {
            type: "string",
            enum: [
              "string_item",
              { value: "val1" }, // Invalid - missing label
              { label: "Label" }, // Invalid - missing value
              null, // Invalid
            ],
          },
          non_array_field: {
            type: "string",
            enum: "not_an_array", // Should trigger undefined return - line 147
          },
        },
      };

      let parsedSchema: ParsedInputSchema;
      service.parseInputSchema(schemaWithOptions).subscribe((result) => {
        parsedSchema = result;
      });

      const fields = parsedSchema!.sections[0].fields;
      expect(fields.length).toBeGreaterThan(0);

      // Verify that different option types are handled properly
      const stringArrayField = fields.find(
        (f) => f.name === "string_array_field"
      );
      const objectArrayField = fields.find(
        (f) => f.name === "object_array_field"
      );
      const mixedInvalidField = fields.find(
        (f) => f.name === "mixed_invalid_field"
      );
      const nonArrayField = fields.find((f) => f.name === "non_array_field");

      expect(stringArrayField?.options).toBeDefined();
      expect(objectArrayField?.options).toBeDefined();
      expect(mixedInvalidField).toBeDefined(); // Should exist but may have empty/filtered options
      expect(nonArrayField).toBeDefined(); // Should exist but may not have proper options
    });

    it("should handle bindflow schema without items.properties (line 407)", () => {
      // This should trigger the return [] condition on line 407 in parseBindflowSchema
      const bindflowSchemaWithoutProperties = {
        type: "array",
        items: null, // This should fail hasItemsWithProperties due to null check
      };

      let parsedSchema: ParsedInputSchema;
      service
        .parseInputSchema(bindflowSchemaWithoutProperties)
        .subscribe((result) => {
          parsedSchema = result;
        });

      // Should handle gracefully when bindflow schema doesn't match expected structure
      expect(parsedSchema!.sections).toBeDefined();
      expect(Array.isArray(parsedSchema!.sections)).toBe(true);
    });

    it("should handle complex option value structures", () => {
      const complexOptionsSchema = {
        type: "object",
        properties: {
          complex_field: {
            type: "string",
            enum: [
              { value: "val1", label: "Label 1" },
              { value: 42, label: "Label 2" },
              { value: true, label: "Label 3" },
            ],
          },
          mixed_invalid_options: {
            type: "string",
            enum: [
              "simple_string",
              { value: "val1", label: "Label 1" }, // Valid object
              { invalid: "structure" }, // Invalid - missing required keys
              null, // Invalid
            ],
          },
        },
      };

      let parsedSchema: ParsedInputSchema;
      service.parseInputSchema(complexOptionsSchema).subscribe((result) => {
        parsedSchema = result;
      });

      const fields = parsedSchema!.sections[0].fields;
      expect(fields.length).toBeGreaterThan(0);

      // Should handle mixed option types gracefully
      const complexField = fields.find((f) => f.name === "complex_field");
      expect(complexField).toBeDefined();
    });

    it("should generate specific placeholder for residues fields (line 348)", () => {
      const schemaWithResidues = {
        type: "object",
        properties: {
          residues_selection: {
            type: "string",
            description: "Residues selection",
          },
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let fields: any[];
      service.parseInputSchema(schemaWithResidues).subscribe((result) => {
        fields = result.sections[0].fields;
      });

      const residuesField = fields!.find(
        (f) => f.name === "residues_selection"
      );
      expect(residuesField?.placeholder).toBe("e.g., 1,2-10 or A1-10,B1-20");
    });

    it("should return empty array when bindflow schema lacks items.properties (line 407)", () => {
      const invalidBindflowSchema = {
        type: "array",
        // Missing items property entirely
      };

      // Directly call parseBindflowSchema to ensure we hit line 407
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = (service as any).parseBindflowSchema(
        invalidBindflowSchema
      );
      expect(result).toEqual([]);

      // Also test through parseInputSchema for integration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let integrationResult: any;
      service.parseInputSchema(invalidBindflowSchema).subscribe((parsed) => {
        integrationResult = parsed;
      });

      expect(integrationResult?.sections).toEqual([]);
    });
  });

  describe("section and field fallbacks", () => {
    it("should apply sensible fallbacks when section and field metadata is missing", (done) => {
      const rawSchema = {
        sections: [
          {
            description: "Section without explicit identifiers",
            collapsible: false,
            collapsed: true,
            fields: [
              {
                type: "INTEGER",
                default: 7,
                validation: { min: 1 },
                options: ["optA", "optB"],
              },
              {
                name: "explicit_field",
                required: true,
                options: ["only"],
              },
            ],
          },
          {
            name: "secondary",
            fields: "not-an-array",
          },
        ],
      };

      service.parseInputSchema(rawSchema).subscribe({
        next: (parsed) => {
          expect(parsed.sections.length).toBe(2);

          const [firstSection, secondSection] = parsed.sections;
          expect(firstSection.name).toBe("unnamed_section");
          expect(firstSection.title).toBe("Unnamed Section");
          expect(firstSection.collapsible).toBe(false);
          expect(firstSection.collapsed).toBe(true);
          expect(firstSection.fields.length).toBe(2);

          const [fallbackField, explicitField] = firstSection.fields;
          expect(fallbackField.name).toBe("unnamed_field");
          expect(fallbackField.type).toBe("number");
          expect(fallbackField.default).toBe(7);

          expect(explicitField.name).toBe("explicit_field");
          expect(explicitField.required).toBe(true);
          expect(explicitField.type).toBe("string");

          expect(secondSection.fields).toEqual([]);
          done();
        },
      });
    });
  });
});
