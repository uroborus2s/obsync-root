// @stratix/icasync FetchOldCalendarMappingsProcessor 测试
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { CalendarMapping } from '../../types/database.js';
import FetchOldCalendarMappingsProcessor from '../FetchOldCalendarMappings.executor.js';

describe('FetchOldCalendarMappingsProcessor', () => {
  let processor: FetchOldCalendarMappingsProcessor;
  let mockRepository: any;
  let mockLogger: any;

  beforeEach(() => {
    mockRepository = {
      findByXnxqWithOptions: vi.fn(),
      findByXnxq: vi.fn(),
      findByKkh: vi.fn(),
      findByKkhAndXnxq: vi.fn(),
      findByCalendarId: vi.fn(),
      findByXnxqWithStatus: vi.fn(),
      createMappingsBatch: vi.fn(),
      countByXnxq: vi.fn(),
      deleteByXnxq: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      findById: vi.fn(),
      findOne: vi.fn(),
      findMany: vi.fn(),
      findAll: vi.fn(),
      count: vi.fn(),
      exists: vi.fn(),
      paginate: vi.fn()
    } as any;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    } as any;

    processor = new FetchOldCalendarMappingsProcessor(
      mockRepository,
      mockLogger
    );
  });

  describe('数据库排序优化', () => {
    it('应该使用新的findByXnxqWithOptions方法进行数据库排序', async () => {
      // 准备测试数据
      const mockMappings: CalendarMapping[] = [
        {
          id: 1,
          kkh: 'TEST001',
          xnxq: '2023-2024-1',
          calendar_id: 'cal_001',
          calendar_name: '测试课程1',
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01'),
          is_deleted: false,
          deleted_at: null,
          metadata: null
        },
        {
          id: 2,
          kkh: 'TEST002',
          xnxq: '2023-2024-1',
          calendar_id: 'cal_002',
          calendar_name: '测试课程2',
          created_at: new Date('2023-01-02'),
          updated_at: new Date('2023-01-02'),
          is_deleted: false,
          deleted_at: null,
          metadata: null
        }
      ];

      mockRepository.findByXnxqWithOptions.mockResolvedValue({
        success: true,
        data: mockMappings
      });

      // 执行测试
      const context = {
        config: {
          xnxq: '2023-2024-1',
          orderBy: 'created_at DESC'
        },
        workflowInstance: {} as any,
        nodeInstance: {} as any,
        nodeDefinition: {} as any
      };
      const result = await processor.execute(context);

      // 验证结果
      expect(result.success).toBe(true);
      expect(mockRepository.findByXnxqWithOptions).toHaveBeenCalledWith(
        '2023-2024-1',
        {
          orderBy: {
            field: 'created_at',
            direction: 'desc'
          }
        }
      );

      // 验证返回的数据
      expect(result.data?.totalCount).toBe(2);
      expect(result.data?.fetchedCount).toBe(2);
      expect(result.data?.calendarsToDelete).toHaveLength(2);
    });

    it('应该记录性能监控信息', async () => {
      mockRepository.findByXnxqWithOptions.mockResolvedValue({
        success: true,
        data: []
      });

      const context = {
        config: {
          xnxq: '2023-2024-1'
        },
        workflowInstance: {} as any,
        nodeInstance: {} as any,
        nodeDefinition: {} as any
      };
      await processor.execute(context);

      // 验证性能日志 - 检查"旧日历映射数据处理完成"日志
      expect(mockLogger.info).toHaveBeenCalledWith(
        '旧日历映射数据处理完成',
        expect.objectContaining({
          queryDuration: expect.any(Number),
          transformDuration: expect.any(Number),
          usedDatabaseSorting: true
        })
      );
    });
  });

  describe('数量限制移除', () => {
    it('应该返回所有数据而不受limit参数限制', async () => {
      const mockMappings: CalendarMapping[] = Array.from(
        { length: 100 },
        (_, i) => ({
          id: i + 1,
          kkh: `TEST${String(i + 1).padStart(3, '0')}`,
          xnxq: '2023-2024-1',
          calendar_id: `cal_${String(i + 1).padStart(3, '0')}`,
          calendar_name: `测试课程${i + 1}`,
          created_at: new Date('2023-01-01'),
          updated_at: new Date('2023-01-01'),
          is_deleted: false,
          deleted_at: null,
          metadata: null
        })
      );

      mockRepository.findByXnxqWithOptions.mockResolvedValue({
        success: true,
        data: mockMappings
      });

      // 执行测试，设置limit为10但应该返回所有100条数据
      const context = {
        config: {
          xnxq: '2023-2024-1',
          limit: 10 // 这个参数应该被忽略
        },
        workflowInstance: {} as any,
        nodeInstance: {} as any,
        nodeDefinition: {} as any
      };
      const result = await processor.execute(context);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data?.totalCount).toBe(100);
      expect(result.data?.fetchedCount).toBe(100); // 应该返回所有数据
      expect(result.data?.calendarsToDelete).toHaveLength(100);
    });
  });
});
