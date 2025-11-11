import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';

export interface SchemaParameter {
  name: string;
  type: string;
  default?: unknown;
  description?: string;
  enum?: string[];
  pattern?: string;
  help_text?: string;
  fa_icon?: string;
}

export interface SchemaSection {
  name: string;
  type: string;
  description?: string;
  properties?: { [key: string]: SchemaParameter };
  help_text?: string;
  fa_icon?: string;
}

export interface ParsedSchema {
  workflow_name?: string;
  workflow_description?: string;
  input?: SchemaSection[];
  bindflow_parameters?: SchemaParameter[];
}

@Injectable({
  providedIn: 'root'
})
export class SchemaService {
  private http = inject(HttpClient);

  /**
   * Fetch schema from a remote URL
   */
  fetchSchema(url: string): Observable<Record<string, unknown>> {
    if (!url || !url.trim()) {
      return throwError(() => new Error('Schema URL is required'));
    }

    return this.http.get<Record<string, unknown>>(url).pipe(
      catchError(error => {
        console.error('Error fetching schema:', error);
        return throwError(() => new Error(`Failed to fetch schema: ${error.message || 'Unknown error'}`));
      })
    );
  }

  /**
   * Parse the fetched schema into a structured format
   */
  parseSchema(schema: Record<string, unknown>): Observable<ParsedSchema> {
    try {
      if (!schema || typeof schema !== 'object') {
        return throwError(() => new Error('Invalid schema format'));
      }

      // Helper function to safely get string values
      const getStringValue = (value: unknown, defaultValue: string = ''): string => {
        return typeof value === 'string' ? value : defaultValue;
      };

      const parsedSchema: ParsedSchema = {
        workflow_name: getStringValue(schema.workflow_name) || getStringValue(schema.title) || 'Unnamed Workflow',
        workflow_description: getStringValue(schema.workflow_description) || getStringValue(schema.description) || '',
        input: [],
        bindflow_parameters: []
      };

      // Parse input parameters
      if (schema.input && Array.isArray(schema.input)) {
        parsedSchema.input = schema.input.map((section: unknown) => {
          const sectionObj = section as Record<string, unknown>;
          return {
            name: getStringValue(sectionObj.name, 'Unnamed Section'),
            type: getStringValue(sectionObj.type, 'object'),
            description: getStringValue(sectionObj.description),
            properties: (typeof sectionObj.properties === 'object' && sectionObj.properties !== null) 
              ? sectionObj.properties as { [key: string]: SchemaParameter } 
              : {},
            help_text: getStringValue(sectionObj.help_text),
            fa_icon: getStringValue(sectionObj.fa_icon)
          };
        });
      }

      // Parse bindflow parameters
      if (schema.bindflow_parameters && Array.isArray(schema.bindflow_parameters)) {
        parsedSchema.bindflow_parameters = schema.bindflow_parameters.map((param: unknown) => {
          const paramObj = param as Record<string, unknown>;
          return {
            name: getStringValue(paramObj.name, 'unnamed_param'),
            type: getStringValue(paramObj.type, 'string'),
            default: paramObj.default,
            description: getStringValue(paramObj.description),
            enum: Array.isArray(paramObj.enum) ? paramObj.enum as string[] : undefined,
            pattern: getStringValue(paramObj.pattern) || undefined,
            help_text: getStringValue(paramObj.help_text),
            fa_icon: getStringValue(paramObj.fa_icon)
          };
        });
      }

      return of(parsedSchema);
    } catch (error) {
      console.error('Error parsing schema:', error);
      return throwError(() => new Error(`Failed to parse schema: ${error instanceof Error ? error.message : 'Unknown error'}`));
    }
  }

  /**
   * Get a specific input parameter by name from parsed schema
   */
  getInputParameter(parsedSchema: ParsedSchema, parameterName: string): SchemaParameter | null {
    if (!parsedSchema.input || !Array.isArray(parsedSchema.input)) {
      return null;
    }

    for (const section of parsedSchema.input) {
      if (section.properties && section.properties[parameterName]) {
        return {
          name: parameterName,
          ...section.properties[parameterName]
        };
      }
    }

    return null;
  }

  /**
   * Get bindflow parameters from parsed schema
   */
  getBindflowParameters(parsedSchema: ParsedSchema): SchemaParameter[] {
    return parsedSchema.bindflow_parameters || [];
  }

  /**
   * Get required parameters from bindflow options
   */
  getRequiredParameters(bindflowOptions: unknown): SchemaParameter[] {
    if (!bindflowOptions || !Array.isArray(bindflowOptions)) {
      return [];
    }
    return bindflowOptions.filter((param: unknown) => {
      const paramObj = param as Record<string, unknown>;
      return paramObj.required === true || paramObj.required === 'true';
    }) as SchemaParameter[];
  }

  /**
   * Get visible (non-hidden) parameters from bindflow options
   */
  getVisibleParameters(bindflowOptions: unknown): SchemaParameter[] {
    if (!bindflowOptions || !Array.isArray(bindflowOptions)) {
      return [];
    }
    return bindflowOptions.filter((param: unknown) => {
      const paramObj = param as Record<string, unknown>;
      return paramObj.hidden !== true && paramObj.hidden !== 'true';
    }) as SchemaParameter[];
  }

  /**
   * Get parameters by section
   */
  getParametersBySection(schema: Record<string, unknown>, sectionName: string): SchemaParameter[] {
    if (!schema || !schema.allSections) {
      return [];
    }
    
    const allSections = schema.allSections as Record<string, unknown>;
    const section = allSections[sectionName];
    
    if (Array.isArray(section)) {
      return section as SchemaParameter[];
    }
    
    return [];
  }

  /**
   * Fetch and parse schema in one operation
   */
  fetchAndParseSchema(url: string): Observable<ParsedSchema> {
    return this.fetchSchema(url).pipe(
      switchMap(schema => this.parseSchema(schema))
    );
  }
}