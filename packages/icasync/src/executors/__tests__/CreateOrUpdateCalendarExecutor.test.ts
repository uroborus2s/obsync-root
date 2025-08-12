// @stratix/icasync CreateOrUpdateCalendarExecutor 测试
// 测试创建或更新日历执行器的功能

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutionContext } from '@stratix/tasks';
import CreateOrUpdateCalendarExecutor from '../CreateOrUpdateCalendarExecutor.js';
import type { 
  CreateOrUpdateCalendarConfig, 
  CreateOrUpdateCalendarResult 
} from '../CreateOrUpdateCalendarExecutor.js';

// Mock 依赖
const mockCalendarSyncService = {
  createCourseCalendar: vi.fn(),
  deleteCourseCalendar: vi.fn(),
  addCalendarParticipants: vi.fn(),
  createCourseSchedules: vi.fn()
};

const mockCalendarMappingRepository = {
  findByKkhAndXnxq: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

describe('CreateOrUpdateCalendarExecutor', () => {
  let executor: CreateOrUpdateCalendarExecutor;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();
    
    executor = new CreateOrUpdateCalendarExecutor(
      mockCalendarSyncService as any,
      mockCalendarMappingRepository as any,
      mockLogger as any
    );
  });

  describe('配置验证', () => {
    it('应该拒绝空配置', async () => {
      const context: ExecutionContext = {
        config: null,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('配置参数不能为空');
    });

    it('应该拒绝无效的开课号', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kkh: '',
        xnxq: '2024-2025-1'
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('开课号(kkh)必须是非空字符串');
    });

    it('应该拒绝无效的学年学期格式', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kkh: 'TEST001',
        xnxq: 'invalid-format'
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('学年学期格式无效');
    });

    it('应该接受有效的配置', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kkh: 'TEST001',
        xnxq: '2024-2025-1'
      };

      // Mock 不存在现有日历
      mockCalendarMappingRepository.findByKkhAndXnxq.mockResolvedValue({
        success: true,
        data: null
      });

      // Mock 成功创建日历
      mockCalendarSyncService.createCourseCalendar.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        createdCalendars: [{
          calendarId: 'cal-123',
          calendarName: '测试课程 (TEST001)',
          kkh: 'TEST001'
        }],
        errors: []
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as CreateOrUpdateCalendarResult;
      expect(data.operation).toBe('created');
      expect(data.calendarId).toBe('cal-123');
    });
  });

  describe('日历创建逻辑', () => {
    it('应该跳过已存在的日历（非强制更新）', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kkh: 'TEST001',
        xnxq: '2024-2025-1',
        forceUpdate: false
      };

      // Mock 存在现有日历
      mockCalendarMappingRepository.findByKkhAndXnxq.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          xnxq: '2024-2025-1',
          calendar_id: 'existing-cal-123',
          calendar_name: '现有测试课程',
          is_deleted: false,
          metadata: '{"created_by": "test"}'
        }
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as CreateOrUpdateCalendarResult;
      expect(data.operation).toBe('skipped');
      expect(data.calendarId).toBe('existing-cal-123');
      expect(data.isNewCalendar).toBe(false);

      // 不应该调用创建服务
      expect(mockCalendarSyncService.createCourseCalendar).not.toHaveBeenCalled();
    });

    it('应该强制更新已存在的日历', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kkh: 'TEST001',
        xnxq: '2024-2025-1',
        forceUpdate: true
      };

      // Mock 存在现有日历
      mockCalendarMappingRepository.findByKkhAndXnxq.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          xnxq: '2024-2025-1',
          calendar_id: 'existing-cal-123',
          calendar_name: '现有测试课程',
          is_deleted: false
        }
      });

      // Mock 成功重新创建日历
      mockCalendarSyncService.createCourseCalendar.mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        createdCalendars: [{
          calendarId: 'new-cal-456',
          calendarName: '更新的测试课程 (TEST001)',
          kkh: 'TEST001'
        }],
        errors: []
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      
      const data = result.data as CreateOrUpdateCalendarResult;
      expect(data.operation).toBe('updated');
      expect(data.calendarId).toBe('new-cal-456');
      expect(data.isNewCalendar).toBe(false);

      // 应该调用创建服务，并传递强制重建参数
      expect(mockCalendarSyncService.createCourseCalendar).toHaveBeenCalledWith(
        'TEST001',
        '2024-2025-1',
        expect.objectContaining({
          forceRecreate: true
        })
      );
    });

    it('应该处理创建失败的情况', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kkh: 'TEST001',
        xnxq: '2024-2025-1'
      };

      // Mock 不存在现有日历
      mockCalendarMappingRepository.findByKkhAndXnxq.mockResolvedValue({
        success: true,
        data: null
      });

      // Mock 创建失败
      mockCalendarSyncService.createCourseCalendar.mockResolvedValue({
        successCount: 0,
        failedCount: 1,
        createdCalendars: [],
        errors: ['WPS API 调用失败']
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.data).toBeDefined();
      
      const data = result.data as CreateOrUpdateCalendarResult;
      expect(data.operation).toBe('created');
      expect(data.error).toContain('WPS API 调用失败');
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const health = await executor.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.message).toBe('执行器运行正常');
    });

    it('应该检测依赖服务缺失', async () => {
      const executorWithoutDeps = new CreateOrUpdateCalendarExecutor(
        null as any,
        null as any,
        mockLogger as any
      );

      const health = await executorWithoutDeps.healthCheck();
      
      expect(health.status).toBe('unhealthy');
      expect(health.message).toContain('依赖服务未正确注入');
    });
  });

  describe('错误处理', () => {
    it('应该处理执行器异常', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kkh: 'TEST001',
        xnxq: '2024-2025-1'
      };

      // Mock 抛出异常
      mockCalendarMappingRepository.findByKkhAndXnxq.mockRejectedValue(
        new Error('数据库连接失败')
      );

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('数据库连接失败');
      expect(result.data).toBeDefined();
      
      const data = result.data as CreateOrUpdateCalendarResult;
      expect(data.error).toContain('执行器异常');
    });
  });
});
