import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { InputSchemaService, ParsedInputSchema, InputSchemaField } from './input-schema.service';

describe('InputSchemaService', () => {
  let service: InputSchemaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [InputSchemaService]
    });
    service = TestBed.inject(InputSchemaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchInputSchema', () => {
    it('should fetch input schema from URL', (done) => {
      const mockSchema = {
        title: 'Test Input Schema',
        sections: []
      };

      service.fetchInputSchema('https://example.com/input-schema.json').subscribe({
        next: (schema) => {
          expect(schema).toEqual(mockSchema);
          done();
        }
      });

      const req = httpMock.expectOne('https://example.com/input-schema.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockSchema);
    });

    it('should handle empty URL', (done) => {
      service.fetchInputSchema('').subscribe({
        error: (error) => {
          expect(error.message).toBe('Input schema URL is required');
          done();
        }
      });
    });

    it('should handle HTTP errors', (done) => {
      service.fetchInputSchema('https://example.com/input-schema.json').subscribe({
        error: (error) => {
          expect(error.message).toContain('Failed to fetch input schema');
          done();
        }
      });

      const req = httpMock.expectOne('https://example.com/input-schema.json');
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('parseInputSchema', () => {
    it('should parse schema with sections format', (done) => {
      const rawSchema = {
        title: 'Test Schema',
        description: 'Test Description',
        sections: [
          {
            name: 'section1',
            title: 'Section 1',
            fields: [
              {
                name: 'field1',
                type: 'string',
                label: 'Field 1'
              }
            ]
          }
        ]
      };

      service.parseInputSchema(rawSchema).subscribe({
        next: (parsed) => {
          expect(parsed.title).toBe('Test Schema');
          expect(parsed.description).toBe('Test Description');
          expect(parsed.sections.length).toBe(1);
          expect(parsed.sections[0].fields.length).toBe(1);
          done();
        }
      });
    });

    it('should parse JSON Schema properties format', (done) => {
      const rawSchema = {
        title: 'Test Schema',
        properties: {
          field1: {
            type: 'string',
            title: 'Field 1',
            description: 'First field'
          },
          field2: {
            type: 'number',
            title: 'Field 2',
            minimum: 0,
            maximum: 100
          }
        },
        required: ['field1']
      };

      service.parseInputSchema(rawSchema).subscribe({
        next: (parsed) => {
          expect(parsed.sections.length).toBe(1);
          expect(parsed.sections[0].fields.length).toBe(2);
          expect(parsed.sections[0].fields[0].required).toBe(true);
          expect(parsed.sections[0].fields[1].required).toBe(false);
          done();
        }
      });
    });

    it('should handle invalid schema', (done) => {
      service.parseInputSchema(null).subscribe({
        error: (error) => {
          expect(error.message).toBe('Invalid input schema format');
          done();
        }
      });
    });
  });

  describe('generateDefaultValues', () => {
    it('should generate default values for all fields', () => {
      const schema: ParsedInputSchema = {
        sections: [
          {
            name: 'section1',
            fields: [
              {
                name: 'field1',
                type: 'string',
                default: 'test_value'
              },
              {
                name: 'field2',
                type: 'number'
              },
              {
                name: 'field3',
                type: 'boolean'
              }
            ]
          }
        ]
      };

      const defaults = service.generateDefaultValues(schema);
      expect(defaults.field1).toBe('test_value');
      expect(defaults.field2).toBe(0);
      expect(defaults.field3).toBe(false);
    });
  });

  describe('validateFieldValue', () => {
    it('should validate required fields', () => {
      const field: InputSchemaField = {
        name: 'test_field',
        type: 'string',
        required: true
      };

      const result1 = service.validateFieldValue(field, '');
      expect(result1.valid).toBe(false);
      expect(result1.errors.length).toBeGreaterThan(0);

      const result2 = service.validateFieldValue(field, 'valid_value');
      expect(result2.valid).toBe(true);
      expect(result2.errors.length).toBe(0);
    });

    it('should validate string length', () => {
      const field: InputSchemaField = {
        name: 'test_field',
        type: 'string',
        validation: {
          minLength: 5,
          maxLength: 10
        }
      };

      const result1 = service.validateFieldValue(field, 'abc');
      expect(result1.valid).toBe(false);

      const result2 = service.validateFieldValue(field, 'abcdefghijk');
      expect(result2.valid).toBe(false);

      const result3 = service.validateFieldValue(field, 'abcdef');
      expect(result3.valid).toBe(true);
    });

    it('should validate number ranges', () => {
      const field: InputSchemaField = {
        name: 'test_field',
        type: 'number',
        validation: {
          min: 10,
          max: 100
        }
      };

      const result1 = service.validateFieldValue(field, 5);
      expect(result1.valid).toBe(false);

      const result2 = service.validateFieldValue(field, 150);
      expect(result2.valid).toBe(false);

      const result3 = service.validateFieldValue(field, 50);
      expect(result3.valid).toBe(true);
    });

    it('should validate enum options', () => {
      const field: InputSchemaField = {
        name: 'test_field',
        type: 'string',
        options: ['option1', 'option2', 'option3']
      };

      const result1 = service.validateFieldValue(field, 'invalid_option');
      expect(result1.valid).toBe(false);

      const result2 = service.validateFieldValue(field, 'option2');
      expect(result2.valid).toBe(true);
    });
  });
});