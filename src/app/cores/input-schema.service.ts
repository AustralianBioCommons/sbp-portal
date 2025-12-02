import { HttpClient } from "@angular/common/http";
import { Injectable, inject } from "@angular/core";
import { Observable, of, throwError } from "rxjs";
import { catchError, switchMap } from "rxjs/operators";

export interface InputSchemaField {
  name: string;
  type: "string" | "number" | "boolean" | "array" | "object" | "file";
  label?: string;
  description?: string;
  required?: boolean;
  default?: string | number | boolean;
  options?: string[] | { value: string | number | boolean; label: string }[];
  validation?: {
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: string;
  };
  placeholder?: string;
  help_text?: string;
  fa_icon?: string;
}

export interface InputSchemaSection {
  name: string;
  title?: string;
  description?: string;
  fields: InputSchemaField[];
  collapsible?: boolean;
  collapsed?: boolean;
}

export interface ParsedInputSchema {
  title?: string;
  description?: string;
  sections: InputSchemaSection[];
}

@Injectable({
  providedIn: "root",
})
export class InputSchemaService {
  private http = inject(HttpClient);

  /**
   * Fetch input schema from a remote URL
   */
  fetchInputSchema(url: string): Observable<Record<string, unknown>> {
    if (!url || !url.trim()) {
      return throwError(() => new Error("Input schema URL is required"));
    }

    return this.http.get<Record<string, unknown>>(url).pipe(
      catchError((error) => {
        console.error("Error fetching input schema:", error);
        return throwError(
          () =>
            new Error(
              `Failed to fetch input schema: ${
                error.message || "Unknown error"
              }`
            )
        );
      })
    );
  }

  /**
   * Helper method to safely get string value from unknown type
   */
  private getStringValue(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }

  /**
   * Helper method to safely get string array value from unknown type
   */
  private getStringArrayValue(value: unknown): string[] | undefined {
    return Array.isArray(value) &&
      value.every((item) => typeof item === "string")
      ? (value as string[])
      : undefined;
  }

  /**
   * Helper method to check if schema has items with properties
   */
  private hasItemsWithProperties(schema: Record<string, unknown>): boolean {
    return (
      schema.items !== undefined &&
      typeof schema.items === "object" &&
      schema.items !== null &&
      "properties" in (schema.items as Record<string, unknown>)
    );
  }

  /**
   * Helper method to check if schema has properties
   */
  private hasProperties(schema: Record<string, unknown>): boolean {
    return (
      schema.properties !== undefined && typeof schema.properties === "object"
    );
  }

  /**
   * Helper method to safely get default value from unknown type
   */
  private getDefaultValue(
    value: unknown
  ): string | number | boolean | undefined {
    if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }
    return undefined;
  }

  /**
   * Helper method to safely get options value from unknown type
   */
  private getOptionsValue(
    value: unknown
  ):
    | string[]
    | { value: string | number | boolean; label: string }[]
    | undefined {
    if (Array.isArray(value)) {
      if (value.every((item) => typeof item === "string")) {
        return value as string[];
      }
      if (
        value.every(
          (item) =>
            typeof item === "object" &&
            item !== null &&
            "value" in item &&
            "label" in item
        )
      ) {
        return value as { value: string | number | boolean; label: string }[];
      }
    }
    return undefined;
  }

  /**
   * Parse the fetched input schema into a structured format
   */
  parseInputSchema(
    schema: Record<string, unknown>
  ): Observable<ParsedInputSchema> {
    try {
      if (!schema || typeof schema !== "object") {
        return throwError(() => new Error("Invalid input schema format"));
      }

      const parsedSchema: ParsedInputSchema = {
        title: this.getStringValue(schema.title) || "Input Configuration",
        description: this.getStringValue(schema.description) || "",
        sections: [],
      };

      // Determine the schema format and parse accordingly
      if (Array.isArray(schema)) {
        // Nextflow input format (array of objects)
        parsedSchema.sections = this.parseNextflowInput(schema);
      } else if (schema.sections && Array.isArray(schema.sections)) {
        // Direct sections format
        parsedSchema.sections = this.parseSections(
          schema.sections as Record<string, unknown>[]
        );
      } else if (this.hasItemsWithProperties(schema)) {
        // Bindflow format (items.properties structure)
        parsedSchema.sections = this.parseBindflowSchema(schema);
      } else if (this.hasProperties(schema)) {
        // Direct properties format
        parsedSchema.sections = [
          {
            name: "main",
            title: this.getStringValue(schema.title) || "Input Parameters",
            description: this.getStringValue(schema.description) || "",
            fields: this.parseProperties(
              schema.properties as Record<string, unknown>,
              this.getStringArrayValue(schema.required) || []
            ),
            collapsible: false,
            collapsed: false,
          },
        ];
      }

      return of(parsedSchema);
    } catch (error) {
      console.error("Error parsing input schema:", error);
      return throwError(
        () =>
          new Error(
            `Failed to parse input schema: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          )
      );
    }
  }

  /**
   * Parse sections from schema
   */
  private parseSections(
    sections: Record<string, unknown>[]
  ): InputSchemaSection[] {
    return sections.map((section) => ({
      name: this.getStringValue(section.name) || "unnamed_section",
      title:
        this.getStringValue(section.title) ||
        this.getStringValue(section.name) ||
        "Unnamed Section",
      description: this.getStringValue(section.description) || "",
      fields: Array.isArray(section.fields)
        ? this.parseFields(section.fields as Record<string, unknown>[])
        : [],
      collapsible: section.collapsible !== false,
      collapsed:
        typeof section.collapsed === "boolean" ? section.collapsed : false,
    }));
  }

  /**
   * Parse fields from schema
   */
  private parseFields(fields: Record<string, unknown>[]): InputSchemaField[] {
    return fields.map((field) => ({
      name: this.getStringValue(field.name) || "unnamed_field",
      type: this.mapFieldType(
        this.getStringValue(field.type) || "string",
        this.getStringValue(field.format)
      ),
      label:
        this.getStringValue(field.label) ||
        this.getStringValue(field.title) ||
        this.getStringValue(field.name),
      description: this.getStringValue(field.description) || "",
      required: typeof field.required === "boolean" ? field.required : false,
      default: this.getDefaultValue(field.default),
      options: this.getOptionsValue(field.options || field.enum),
      validation:
        typeof field.validation === "object" && field.validation !== null
          ? (field.validation as Record<string, unknown>)
          : {},
      placeholder: this.getStringValue(field.placeholder) || "",
      help_text: this.getStringValue(field.help_text) || "",
      fa_icon: this.getStringValue(field.fa_icon) || "",
    }));
  }

  /**
   * Parse JSON Schema properties
   */
  private parseProperties(
    properties: Record<string, unknown>,
    required: string[] = []
  ): InputSchemaField[] {
    return Object.keys(properties).map((key) => {
      const prop = properties[key] as Record<string, unknown>;

      // Create a human-readable label from the key
      const label =
        this.getStringValue(prop.title) || this.createLabelFromKey(key);

      // Get description from various sources
      const description =
        this.getStringValue(prop.description) ||
        this.getStringValue(prop.errorMessage) ||
        this.getStringValue(prop.help_text) ||
        "";

      return {
        name: key,
        type: this.mapFieldType(
          this.getStringValue(prop.type) || "string",
          this.getStringValue(prop.format)
        ),
        label: label,
        description: description,
        required: required.includes(key),
        default: this.getDefaultValue(prop.default),
        options: this.getOptionsValue(prop.enum),
        validation: {
          min: typeof prop.minimum === "number" ? prop.minimum : undefined,
          max: typeof prop.maximum === "number" ? prop.maximum : undefined,
          minLength:
            typeof prop.minLength === "number" ? prop.minLength : undefined,
          maxLength:
            typeof prop.maxLength === "number" ? prop.maxLength : undefined,
          pattern: this.getStringValue(prop.pattern),
          format: this.getStringValue(prop.format),
        },
        placeholder:
          Array.isArray(prop.examples) && prop.examples.length > 0
            ? this.getStringValue(prop.examples[0])
            : this.createPlaceholderFromKey(key, prop),
        help_text:
          this.getStringValue(prop.help_text) ||
          this.getStringValue(prop.errorMessage) ||
          "",
        fa_icon: this.getStringValue(prop.fa_icon) || "",
      };
    });
  }

  /**
   * Create a human-readable label from a snake_case key
   */
  private createLabelFromKey(key: string): string {
    return key
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  }

  /**
   * Create appropriate placeholder text based on field key and properties
   */
  private createPlaceholderFromKey(
    key: string,
    prop: Record<string, unknown>
  ): string {
    if (prop.format === "file-path") {
      return `Select ${key.replace(/_/g, " ")} file`;
    }
    if (prop.type === "integer" || prop.type === "number") {
      return prop.default ? `Default: ${prop.default}` : "Enter a number";
    }
    if (key.includes("residues")) {
      return "e.g., 1,2-10 or A1-10,B1-20";
    }
    if (key.includes("chains")) {
      return "e.g., A,B or ABC";
    }
    if (key.includes("length")) {
      return "Enter length value";
    }
    if (key.includes("name") || key.includes("id")) {
      return `Enter ${key.replace(/_/g, " ")}`;
    }
    return `Enter ${key.replace(/_/g, " ")}`;
  }

  /**
   * Parse Nextflow input format
   */
  private parseNextflowInput(
    input: Record<string, unknown>[]
  ): InputSchemaSection[] {
    return input.map((section) => ({
      name: this.getStringValue(section.name) || "unnamed_section",
      title:
        this.getStringValue(section.title) ||
        this.getStringValue(section.name) ||
        "Input Section",
      description:
        this.getStringValue(section.description) ||
        this.getStringValue(section.help_text) ||
        "",
      fields:
        section.properties &&
        typeof section.properties === "object" &&
        section.properties !== null
          ? this.parseProperties(
              section.properties as Record<string, unknown>,
              this.getStringArrayValue(section.required) || []
            )
          : [],
      collapsible: true,
      collapsed: false,
    }));
  }

  /**
   * Parse bindflow schema format (items.properties structure)
   */
  private parseBindflowSchema(
    schema: Record<string, unknown>
  ): InputSchemaSection[] {
    if (this.hasItemsWithProperties(schema)) {
      const items = schema.items as Record<string, unknown>;
      const section: InputSchemaSection = {
        name: "input_parameters",
        title: this.getStringValue(schema.title) || "Input Parameters",
        description: this.getStringValue(schema.description) || "",
        fields: this.parseProperties(
          items.properties as Record<string, unknown>,
          this.getStringArrayValue(items.required) || []
        ),
        collapsible: false,
        collapsed: false,
      };
      return [section];
    }
    return [];
  }

  /**
   * Map various type formats to our standard types
   */
  private mapFieldType(
    type: string,
    format?: string
  ): InputSchemaField["type"] {
    // Handle file formats first
    if (format === "file-path") {
      return "file";
    }

    const typeMap: { [key: string]: InputSchemaField["type"] } = {
      string: "string",
      text: "string",
      integer: "number",
      number: "number",
      boolean: "boolean",
      bool: "boolean",
      array: "array",
      object: "object",
      file: "file",
      upload: "file",
    };

    return typeMap[type.toLowerCase()] || "string";
  }

  /**
   * Generate default values for all fields in the schema
   */
  generateDefaultValues(schema: ParsedInputSchema): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};

    schema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.default !== undefined) {
          defaults[field.name] = field.default;
        } else {
          // Generate sensible defaults based on type
          switch (field.type) {
            case "string":
              defaults[field.name] = "";
              break;
            case "number":
              defaults[field.name] = field.validation?.min || 0;
              break;
            case "boolean":
              defaults[field.name] = false;
              break;
            case "array":
              defaults[field.name] = [];
              break;
            case "object":
              defaults[field.name] = {};
              break;
            case "file":
              defaults[field.name] = null;
              break;
            default:
              defaults[field.name] = "";
          }
        }
      });
    });

    return defaults;
  }

  /**
   * Validate a field value against its schema
   */
  validateFieldValue(
    field: InputSchemaField,
    value: unknown
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required validation
    if (
      field.required &&
      (value === null || value === undefined || value === "")
    ) {
      errors.push(`${field.label || field.name} is required`);
    }

    // Skip further validation if empty and not required
    if (
      !field.required &&
      (value === null || value === undefined || value === "")
    ) {
      return { valid: true, errors: [] };
    }

    // Type-specific validation
    switch (field.type) {
      case "string":
        if (typeof value !== "string") {
          errors.push(`${field.label || field.name} must be a string`);
        } else {
          if (
            field.validation?.minLength &&
            value.length < field.validation.minLength
          ) {
            errors.push(
              `${field.label || field.name} must be at least ${
                field.validation.minLength
              } characters`
            );
          }
          if (
            field.validation?.maxLength &&
            value.length > field.validation.maxLength
          ) {
            errors.push(
              `${field.label || field.name} must be no more than ${
                field.validation.maxLength
              } characters`
            );
          }
          if (
            field.validation?.pattern &&
            !new RegExp(field.validation.pattern).test(value)
          ) {
            errors.push(`${field.label || field.name} format is invalid`);
          }
        }
        break;

      case "number": {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          errors.push(`${field.label || field.name} must be a number`);
        } else {
          if (
            field.validation?.min !== undefined &&
            numValue < field.validation.min
          ) {
            errors.push(
              `${field.label || field.name} must be at least ${
                field.validation.min
              }`
            );
          }
          if (
            field.validation?.max !== undefined &&
            numValue > field.validation.max
          ) {
            errors.push(
              `${field.label || field.name} must be no more than ${
                field.validation.max
              }`
            );
          }
        }
        break;
      }

      case "boolean":
        if (typeof value !== "boolean") {
          errors.push(`${field.label || field.name} must be true or false`);
        }
        break;

      case "array":
        if (!Array.isArray(value)) {
          errors.push(`${field.label || field.name} must be an array`);
        }
        break;

      case "object":
        if (typeof value !== "object" || Array.isArray(value)) {
          errors.push(`${field.label || field.name} must be an object`);
        }
        break;

      case "file":
        if (
          value !== null &&
          typeof value !== "string" &&
          !(value instanceof File)
        ) {
          errors.push(
            `${
              field.label || field.name
            } must be a file path (string) or file object`
          );
        }
        break;
    }

    // Options validation (enum)
    if (field.options && field.options.length > 0) {
      const validOptions =
        field.options[0] &&
        typeof field.options[0] === "object" &&
        "value" in field.options[0]
          ? (
              field.options as {
                value: string | number | boolean;
                label: string;
              }[]
            ).map((opt) => opt.value)
          : (field.options as string[]);

      // Type-safe includes check
      const isValidOption = validOptions.some((option) => option === value);
      if (!isValidOption) {
        errors.push(
          `${field.label || field.name} must be one of: ${validOptions.join(
            ", "
          )}`
        );
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get required fields from parsed schema
   */
  getRequiredFields(schema: ParsedInputSchema): InputSchemaField[] {
    const requiredFields: InputSchemaField[] = [];
    schema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required === true) {
          requiredFields.push(field);
        }
      });
    });
    return requiredFields;
  }

  /**
   * Get optional fields from parsed schema
   */
  getOptionalFields(schema: ParsedInputSchema): InputSchemaField[] {
    const optionalFields: InputSchemaField[] = [];
    schema.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (field.required !== true) {
          optionalFields.push(field);
        }
      });
    });
    return optionalFields;
  }

  /**
   * Fetch and parse input schema in one operation
   */
  fetchAndParseInputSchema(url: string): Observable<ParsedInputSchema> {
    return this.fetchInputSchema(url).pipe(
      switchMap((schema) => this.parseInputSchema(schema))
    );
  }
}
