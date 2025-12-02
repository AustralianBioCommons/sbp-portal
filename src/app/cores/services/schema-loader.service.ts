import { inject, Injectable, signal } from "@angular/core";
import {
  InputSchemaField,
  InputSchemaService,
  ParsedInputSchema,
} from "../input-schema.service";

export interface InputRow {
  id: string;
  values: Record<string, unknown>;
}

@Injectable({
  providedIn: "root",
})
export class SchemaLoaderService {
  private inputSchemaService = inject(InputSchemaService);

  // Input schema data for UI table construction
  inputSchemaData = signal<ParsedInputSchema | null>(null);
  inputSchemaFields = signal<InputSchemaField[]>([]);
  requiredInputFields = signal<InputSchemaField[]>([]);
  optionalInputFields = signal<InputSchemaField[]>([]);

  // Table rows for input configuration
  inputRows = signal<InputRow[]>([]);
  nextRowId = signal<number>(1);

  /**
   * Load and parse input schema from URL
   * @param schemaUrl - The URL to fetch the schema from
   * @param onSuccess - Callback when schema is loaded successfully
   * @param onError - Callback when schema loading fails
   */
  loadInputSchema(
    schemaUrl: string,
    onSuccess?: (parsedSchema: ParsedInputSchema) => void,
    onError?: (error: unknown) => void
  ): void {
    this.inputSchemaService.fetchInputSchema(schemaUrl).subscribe({
      next: (rawSchema) => {
        // Type-safe access to schema properties
        const items = rawSchema.items as Record<string, unknown> | undefined;
        const properties = items?.properties as
          | Record<string, unknown>
          | undefined;

        if (!items || !properties) {
          const error = new Error(
            "Schema does not have the expected bindflow structure"
          );
          console.error(error.message);
          console.error("Expected: schema.items.properties, got:", {
            items: rawSchema.items,
          });
          if (onError) onError(error);
          return;
        }

        // Parse the raw schema
        this.inputSchemaService.parseInputSchema(rawSchema).subscribe({
          next: (parsedSchema) => {
            // Store schema data in signals for UI construction
            this.inputSchemaData.set(parsedSchema);

            // Extract all fields from all sections
            const allFields = parsedSchema.sections.flatMap(
              (section) => section.fields
            );
            this.inputSchemaFields.set(allFields);

            // Get required fields
            const requiredFields =
              this.inputSchemaService.getRequiredFields(parsedSchema);
            this.requiredInputFields.set(requiredFields);

            // Get optional fields (non-required fields)
            const optionalFields = allFields.filter((field) => !field.required);
            this.optionalInputFields.set(optionalFields);

            // Call success callback
            if (onSuccess) onSuccess(parsedSchema);
          },
          error: (parseError) => {
            console.error("Error parsing input schema:", parseError);
            if (onError) onError(parseError);
          },
        });
      },
      error: (error) => {
        console.error("Error loading input schema:", error);
        if (onError) onError(error);
      },
    });
  }

  /**
   * Initialize table with one default row
   * @param onComplete - Optional callback after row initialization
   */
  initializeDefaultRow(onComplete?: () => void): void {
    if (this.inputRows().length === 0) {
      const inputSchema = this.inputSchemaData();
      if (!inputSchema) {
        console.warn("Cannot initialize row: schema not loaded");
        return;
      }

      const rowId = `row-${this.nextRowId()}`;
      const defaultValues: Record<string, unknown> = {};

      // Initialize default values for all fields
      inputSchema.sections.forEach((section) => {
        section.fields.forEach((field) => {
          defaultValues[field.name] = this.getDefaultValueForField(field);
        });
      });

      const newRow: InputRow = {
        id: rowId,
        values: defaultValues,
      };

      this.inputRows.update((rows) => [...rows, newRow]);
      this.nextRowId.update((id) => id + 1);

      // Call completion callback
      if (onComplete) onComplete();
    }
  }

  /**
   * Get default value for a field based on its type
   */
  private getDefaultValueForField(field: InputSchemaField): unknown {
    if (field.default !== undefined) {
      return field.default;
    }

    switch (field.type) {
      case "string":
        return "";
      case "number":
        return field.validation?.min || 0;
      case "boolean":
        return false;
      case "array":
        return [];
      case "object":
        return {};
      default:
        return "";
    }
  }

  /**
   * Get default values from the loaded schema
   */
  generateDefaultValues(): Record<string, unknown> {
    const inputSchema = this.inputSchemaData();
    if (!inputSchema) {
      return {};
    }
    return this.inputSchemaService.generateDefaultValues(inputSchema);
  }

  /**
   * Update row value
   */
  updateRowValue(rowId: string, fieldName: string, value: unknown): void {
    this.inputRows.update((rows) =>
      rows.map((row) =>
        row.id === rowId
          ? { ...row, values: { ...row.values, [fieldName]: value } }
          : row
      )
    );
  }

  /**
   * Get value for a specific row and field
   */
  getRowValue(rowId: string, fieldName: string): unknown {
    const row = this.inputRows().find((r) => r.id === rowId);
    return row?.values[fieldName] || "";
  }

  /**
   * Get the first row's values (since we only use single row)
   * Includes both required and optional fields with their default values
   */
  getFirstRowValues(): Record<string, unknown> {
    const rows = this.inputRows();
    if (rows.length === 0) {
      return {};
    }

    const rowValues = rows[0].values;

    // Add optional fields with their default values if not already present
    const optionalFields = this.optionalInputFields();
    optionalFields.forEach((field) => {
      if (!(field.name in rowValues)) {
        rowValues[field.name] = this.getDefaultValueForField(field);
      }
    });

    return rowValues;
  }

  /**
   * Reset the service state
   */
  reset(): void {
    this.inputSchemaData.set(null);
    this.inputSchemaFields.set([]);
    this.requiredInputFields.set([]);
    this.optionalInputFields.set([]);
    this.inputRows.set([]);
    this.nextRowId.set(1);
  }
}
