import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SchemaService, ParsedSchema } from './schema.service';

describe('SchemaService', () => {
  let service: SchemaService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SchemaService]
    });
    service = TestBed.inject(SchemaService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('fetchSchema', () => {
    it('should fetch schema from URL', (done) => {
      const mockSchema = {
        workflow_name: 'Test Workflow',
        workflow_description: 'Test Description',
        input: [],
        bindflow_parameters: []
      };

      service.fetchSchema('https://example.com/schema.json').subscribe({
        next: (schema) => {
          expect(schema).toEqual(mockSchema);
          done();
        }
      });

      const req = httpMock.expectOne('https://example.com/schema.json');
      expect(req.request.method).toBe('GET');
      req.flush(mockSchema);
    });

    it('should handle empty URL', (done) => {
      service.fetchSchema('').subscribe({
        error: (error) => {
          expect(error.message).toBe('Schema URL is required');
          done();
        }
      });
    });

    it('should handle HTTP errors', (done) => {
      service.fetchSchema('https://example.com/schema.json').subscribe({
        error: (error) => {
          expect(error.message).toContain('Failed to fetch schema');
          done();
        }
      });

      const req = httpMock.expectOne('https://example.com/schema.json');
      req.error(new ErrorEvent('Network error'));
    });
  });

  describe('parseSchema', () => {
    it('should parse valid schema', (done) => {
      const rawSchema = {
        workflow_name: 'Test Workflow',
        workflow_description: 'Test Description',
        input: [
          {
            name: 'Input Section',
            type: 'object',
            properties: {
              param1: {
                type: 'string',
                description: 'Parameter 1'
              }
            }
          }
        ],
        bindflow_parameters: [
          {
            name: 'param1',
            type: 'string',
            default: 'default_value'
          }
        ]
      };

      service.parseSchema(rawSchema).subscribe({
        next: (parsed) => {
          expect(parsed.workflow_name).toBe('Test Workflow');
          expect(parsed.workflow_description).toBe('Test Description');
          expect(parsed.input?.length).toBe(1);
          expect(parsed.bindflow_parameters?.length).toBe(1);
          done();
        }
      });
    });

    it('should handle invalid schema', (done) => {
      service.parseSchema(null).subscribe({
        error: (error) => {
          expect(error.message).toBe('Invalid schema format');
          done();
        }
      });
    });

    it('should provide defaults for missing properties', (done) => {
      const rawSchema = {};

      service.parseSchema(rawSchema).subscribe({
        next: (parsed) => {
          expect(parsed.workflow_name).toBe('Unnamed Workflow');
          expect(parsed.workflow_description).toBe('');
          expect(parsed.input).toEqual([]);
          expect(parsed.bindflow_parameters).toEqual([]);
          done();
        }
      });
    });
  });

  describe('getInputParameter', () => {
    it('should find parameter in schema', () => {
      const parsedSchema: ParsedSchema = {
        input: [
          {
            name: 'Section 1',
            type: 'object',
            properties: {
              param1: {
                name: 'param1',
                type: 'string',
                description: 'Parameter 1'
              }
            }
          }
        ],
        bindflow_parameters: []
      };

      const param = service.getInputParameter(parsedSchema, 'param1');
      expect(param).toBeTruthy();
      expect(param?.name).toBe('param1');
      expect(param?.type).toBe('string');
    });

    it('should return null for missing parameter', () => {
      const parsedSchema: ParsedSchema = {
        input: [],
        bindflow_parameters: []
      };

      const param = service.getInputParameter(parsedSchema, 'nonexistent');
      expect(param).toBeNull();
    });
  });

  describe('getBindflowParameters', () => {
    it('should return bindflow parameters', () => {
      const parsedSchema: ParsedSchema = {
        input: [],
        bindflow_parameters: [
          {
            name: 'param1',
            type: 'string'
          }
        ]
      };

      const params = service.getBindflowParameters(parsedSchema);
      expect(params.length).toBe(1);
      expect(params[0].name).toBe('param1');
    });

    it('should return empty array when no parameters', () => {
      const parsedSchema: ParsedSchema = {
        input: [],
        bindflow_parameters: []
      };

      const params = service.getBindflowParameters(parsedSchema);
      expect(params).toEqual([]);
    });
  });
});