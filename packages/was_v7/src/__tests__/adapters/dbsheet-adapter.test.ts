import type { AwilixContainer } from '@stratix/core';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWpsDBSheetAdapter } from '../../adapters/dbsheet.adapter.js';
import type { HttpClientService } from '../../services/httpClientService.js';
import type {
  DBSheetData,
  DBSheetSchemaData,
  WpsDBSheetApiResponse
} from '../../types/dbsheet.js';

describe('DBSheet Adapter', () => {
  let mockHttpClient: Partial<HttpClientService>;
  let mockContainer: Partial<AwilixContainer>;

  beforeEach(() => {
    mockHttpClient = {
      ensureAccessToken: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };

    mockContainer = {
      resolve: vi.fn((name: string) => {
        if (name === 'httpClientService') {
          return mockHttpClient;
        }
        return undefined;
      })
    };
  });

  describe('getSchemas', () => {
    it('should fetch DBSheet schemas successfully', async () => {
      const mockSchemas: WpsDBSheetApiResponse<DBSheetSchemaData> = {
        code: 0,
        msg: '',
        data: {
          sheets: [
            {
              id: 1,
              name: '数据表',
              primary_field_id: 'B',
              fields: [
                {
                  id: 'B',
                  name: '文本',
                  type: 'MultiLineText',
                  data: { unique_value: false }
                }
              ],
              views: [{ id: 'B', name: '表格视图', type: 'grid' }]
            }
          ]
        }
      };

      (mockHttpClient.get as any).mockResolvedValue({
        data: mockSchemas
      });

      const adapter = createWpsDBSheetAdapter(mockContainer as AwilixContainer);
      const result = await adapter.getSchemas('file_id_123');

      expect(result.sheets).toHaveLength(1);
      expect(result.sheets[0].name).toBe('数据表');
      expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
      expect(mockHttpClient.get).toHaveBeenCalledWith(
        '/v7/coop/dbsheet/file_id_123/schema'
      );
    });
  });

  describe('createSheet', () => {
    it('should create a new sheet successfully', async () => {
      const mockResponse: WpsDBSheetApiResponse<DBSheetData> = {
        code: 0,
        msg: '',
        data: {
          sheet: {
            id: 2,
            name: 'FfzR7hGgWq',
            primary_field_id: 'H',
            fields: [
              {
                id: 'H',
                name: '货币',
                type: 'Currency',
                data: { number_format: '$#,##0.000_ ' }
              }
            ],
            views: [{ id: 'C', name: 'p3KY1', type: 'grid' }]
          }
        }
      };

      (mockHttpClient.post as any).mockResolvedValue({
        data: mockResponse
      });

      const adapter = createWpsDBSheetAdapter(mockContainer as AwilixContainer);
      const result = await adapter.createSheet('file_id_123', {
        name: 'FfzR7hGgWq'
      });

      expect(result.id).toBe(2);
      expect(result.name).toBe('FfzR7hGgWq');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/coop/dbsheet/file_id_123/sheets/create',
        { name: 'FfzR7hGgWq' }
      );
    });
  });

  describe('updateSheet', () => {
    it('should update sheet successfully', async () => {
      const mockResponse: WpsDBSheetApiResponse<DBSheetData> = {
        code: 0,
        msg: '',
        data: {
          sheet: {
            id: 2,
            name: 'BrandNewName',
            primary_field_id: 'H',
            fields: [
              {
                id: 'H',
                name: '货币',
                type: 'Currency',
                data: { number_format: '$#,##0.000_ ' }
              },
              {
                id: 'I',
                name: '多行文本',
                type: 'MultiLineText',
                data: { unique_value: false }
              }
            ],
            views: [{ id: 'C', name: 'p3KY1', type: 'grid' }]
          }
        }
      };

      (mockHttpClient.post as any).mockResolvedValue({
        data: mockResponse
      });

      const adapter = createWpsDBSheetAdapter(mockContainer as AwilixContainer);
      const result = await adapter.updateSheet('file_id_123', 2, {
        name: 'BrandNewName'
      });

      expect(result.id).toBe(2);
      expect(result.name).toBe('BrandNewName');
      expect(result.fields).toHaveLength(2);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/coop/dbsheet/file_id_123/sheets/2/update',
        { name: 'BrandNewName' }
      );
    });
  });

  describe('updateSheetName', () => {
    it('should update sheet name successfully', async () => {
      (mockHttpClient.put as any).mockResolvedValue({ data: {} });

      const adapter = createWpsDBSheetAdapter(mockContainer as AwilixContainer);
      await adapter.updateSheetName('file_id_123', {
        sheetId: 1,
        name: 'Updated Sheet'
      });

      expect(mockHttpClient.put).toHaveBeenCalledWith(
        '/v7/coop/dbsheet/file_id_123/sheets/1',
        { name: 'Updated Sheet' }
      );
    });
  });

  describe('deleteSheet', () => {
    it('should delete sheet successfully', async () => {
      (mockHttpClient.delete as any).mockResolvedValue({ data: {} });

      const adapter = createWpsDBSheetAdapter(mockContainer as AwilixContainer);
      await adapter.deleteSheet('file_id_123', 1);

      expect(mockHttpClient.delete).toHaveBeenCalledWith(
        '/v7/coop/dbsheet/file_id_123/sheets/1'
      );
    });
  });

  describe('createFields', () => {
    it('should create fields successfully', async () => {
      const mockResponse: WpsDBSheetApiResponse<any> = {
        code: 0,
        msg: '',
        data: {
          fields: [{ id: 'B', name: 'Field1', type: 'SingleLineText' }]
        }
      };

      (mockHttpClient.post as any).mockResolvedValue({
        data: mockResponse
      });

      const adapter = createWpsDBSheetAdapter(mockContainer as AwilixContainer);
      const result = await adapter.createFields('file_id_123', 1, {
        fields: [{ name: 'Field1', type: 'SingleLineText' }]
      });

      expect(result.fields).toHaveLength(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/coop/dbsheet/file_id_123/sheets/1/fields/create',
        { fields: [{ name: 'Field1', type: 'SingleLineText' }] }
      );
    });
  });

  describe('createRecords', () => {
    it('should create records successfully', async () => {
      const mockResponse: WpsDBSheetApiResponse<any> = {
        code: 0,
        msg: '',
        data: {
          records: [{ id: 'U', fields: { Name: 'Record1' } }]
        }
      };

      (mockHttpClient.post as any).mockResolvedValue({
        data: mockResponse
      });

      const adapter = createWpsDBSheetAdapter(mockContainer as AwilixContainer);
      const result = await adapter.createRecords('file_id_123', 1, {
        records: [{ fields: { Name: 'Record1' } }]
      });

      expect(result.records).toHaveLength(1);
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/coop/dbsheet/file_id_123/sheets/1/records/create',
        { records: [{ fields: { Name: 'Record1' } }] }
      );
    });
  });

  describe('queryRecords', () => {
    it('should query records successfully with fields_schema', async () => {
      const mockResponse: WpsDBSheetApiResponse<any> = {
        code: 0,
        msg: '',
        data: {
          fields_schema: [
            {
              id: 'B',
              name: '文本',
              type: 'MultiLineText',
              data: { unique_value: false }
            },
            {
              id: 'C',
              name: '数字',
              type: 'Number',
              data: { number_format: '0.00_ ' }
            }
          ],
          records: [
            {
              id: 'B',
              fields: { 文本: '第一行文本', 数字: '123.00 ' },
              created_time: '2024/12/20 11:30:32',
              creator: '280026893',
              last_modified_by: '280026893',
              last_modified_time: '2024/12/20 15:47:01'
            },
            {
              id: 'C',
              fields: { 文本: '第二行文本', 数字: '321.00 ' },
              created_time: '2024/12/20 11:30:32',
              creator: '280026893',
              last_modified_by: '280026893',
              last_modified_time: '2024/12/20 15:46:52'
            }
          ],
          page_token: ''
        }
      };

      (mockHttpClient.post as any).mockResolvedValue({
        data: mockResponse
      });

      const adapter = createWpsDBSheetAdapter(mockContainer as AwilixContainer);
      const result = await adapter.queryRecords('file_id_123', 1, {
        page_size: 20,
        show_fields_info: true,
        show_record_extra_info: true
      });

      expect(result.records).toHaveLength(2);
      expect(result.fields_schema).toHaveLength(2);
      expect(result.records[0].created_time).toBe('2024/12/20 11:30:32');
      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/coop/dbsheet/file_id_123/sheets/1/records',
        {
          page_size: 20,
          show_fields_info: true,
          show_record_extra_info: true
        }
      );
    });
  });
});
