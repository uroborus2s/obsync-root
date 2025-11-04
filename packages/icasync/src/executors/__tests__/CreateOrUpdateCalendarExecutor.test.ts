// @stratix/icasync CreateOrUpdateCalendarExecutor 测试
// 测试创建或更新日历执行器的功能

import type { ExecutionContext } from '@stratix/tasks';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  CreateOrUpdateCalendarConfig,
  CreateOrUpdateCalendarResult
} from '../CreateOrUpdateCalendar.executor.js';
import CreateOrUpdateCalendarExecutor from '../CreateOrUpdateCalendar.executor.js';

// Mock 依赖
const mockWasV7ApiCalendar = {
  createCalendar: vi.fn(),
  deleteCalendar: vi.fn(),
  getPrimaryCalendar: vi.fn()
};

const mockCalendarMappingRepository = {
  findByKkh: vi.fn(),
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
      mockWasV7ApiCalendar as any,
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

    it('应该拒绝缺少课程名称', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kcmc: '',
        kkh: 'TEST001'
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('课程名称(kcmc)必须是非空字符串');
    });

    it('应该拒绝无效的开课号', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kcmc: '高等数学',
        kkh: ''
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

    it('应该接受有效的配置', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kcmc: '高等数学',
        kkh: 'TEST001'
      };

      // Mock 不存在现有日历映射
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: null
      });

      // Mock 成功创建日历
      mockWasV7ApiCalendar.createCalendar.mockResolvedValue({
        id: 'cal-123',
        summary: '高等数学 (TEST001)'
      });

      // Mock 成功保存映射
      mockCalendarMappingRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          calendar_id: 'cal-123',
          calendar_name: '高等数学 (TEST001)'
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
      expect(data.operation).toBe('created');
      expect(data.calendarId).toBe('cal-123');
      expect(data.kcmc).toBe('高等数学');
      expect(data.kkh).toBe('TEST001');
    });
  });

  describe('日历创建逻辑', () => {
    it('应该跳过已存在的日历映射', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kcmc: '高等数学',
        kkh: 'TEST001'
      };

      // Mock 存在现有日历映射
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
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
      expect(data.kcmc).toBe('高等数学');
      expect(data.kkh).toBe('TEST001');

      // 不应该调用WPS API创建日历
      expect(mockWasV7ApiCalendar.createCalendar).not.toHaveBeenCalled();
    });

    it('应该处理WPS API调用失败', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kcmc: '高等数学',
        kkh: 'TEST001'
      };

      // Mock 不存在现有日历映射
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: null
      });

      // Mock WPS API调用失败
      mockWasV7ApiCalendar.createCalendar.mockRejectedValue(
        new Error('WPS API调用失败')
      );

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('执行失败: WPS API调用失败');
    });

    it('应该处理数据库保存失败并回滚', async () => {
      const config: CreateOrUpdateCalendarConfig = {
        kcmc: '高等数学',
        kkh: 'TEST001'
      };

      // Mock 不存在现有日历映射
      mockCalendarMappingRepository.findByKkh.mockResolvedValue({
        success: true,
        data: null
      });

      // Mock 成功创建日历
      mockWasV7ApiCalendar.createCalendar.mockResolvedValue({
        id: 'cal-123',
        summary: '高等数学 (TEST001)'
      });

      // Mock 数据库保存失败
      mockCalendarMappingRepository.create.mockResolvedValue({
        success: false,
        error: '数据库连接失败'
      });

      // Mock 删除日历成功（回滚）
      mockWasV7ApiCalendar.deleteCalendar.mockResolvedValue(undefined);

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('保存日历映射失败: 数据库连接失败');

      // 应该调用删除日历进行回滚
      expect(mockWasV7ApiCalendar.deleteCalendar).toHaveBeenCalledWith({
        calendar_id: 'cal-123'
      });
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const health = await executor.healthCheck();

      expect(health).toBe('healthy');
    });

    it('应该检测依赖服务缺失', async () => {
      const executorWithoutDeps = new CreateOrUpdateCalendarExecutor(
        null as any,
        null as any,
        mockLogger as any
      );

      const health = await executorWithoutDeps.healthCheck();

      expect(health).toBe('unhealthy');
    });
  });
});
