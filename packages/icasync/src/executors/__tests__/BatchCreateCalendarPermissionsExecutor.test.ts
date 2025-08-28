import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutionContext } from '@stratix/tasks';
import BatchCreateCalendarPermissionsExecutor from '../BatchCreateCalendarPermissionsExecutor.js';
import type { 
  BatchCreateCalendarPermissionsConfig, 
  BatchCreateCalendarPermissionsResult 
} from '../BatchCreateCalendarPermissionsExecutor.js';

// Mock 依赖
const mockWasV7ApiCalendar = {
  batchCreateCalendarPermissionsLimit: vi.fn()
};

const mockStudentCourseRepository = {
  findStudentsByKkh: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('BatchCreateCalendarPermissionsExecutor', () => {
  let executor: BatchCreateCalendarPermissionsExecutor;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // 创建执行器实例
    executor = new BatchCreateCalendarPermissionsExecutor(
      mockWasV7ApiCalendar as any,
      mockStudentCourseRepository as any,
      mockLogger as any
    );
  });

  describe('参数验证', () => {
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

    it('应该拒绝缺少开课号', async () => {
      const config: BatchCreateCalendarPermissionsConfig = {
        kkh: '',
        calendar_id: 'cal-123'
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

    it('应该拒绝缺少日历ID', async () => {
      const config: BatchCreateCalendarPermissionsConfig = {
        kkh: 'TEST001',
        calendar_id: ''
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('日历ID(calendar_id)必须是非空字符串');
    });

    it('应该拒绝无效的批次大小', async () => {
      const config: BatchCreateCalendarPermissionsConfig = {
        kkh: 'TEST001',
        calendar_id: 'cal-123',
        batch_size: 150
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('批次大小应在1-100之间');
    });
  });

  describe('权限创建逻辑', () => {
    it('应该处理没有参与者的情况', async () => {
      const config: BatchCreateCalendarPermissionsConfig = {
        kkh: 'TEST001',
        calendar_id: 'cal-123'
      };

      // Mock 查询返回空结果
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: true,
        data: []
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

      const data = result.data as BatchCreateCalendarPermissionsResult;
      expect(data.total_participants).toBe(0);
      expect(data.success_count).toBe(0);
      expect(data.failed_count).toBe(0);
      expect(data.batch_count).toBe(0);

      // 不应该调用权限创建API
      expect(mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit).not.toHaveBeenCalled();
    });

    it('应该成功创建单批次权限', async () => {
      const config: BatchCreateCalendarPermissionsConfig = {
        kkh: 'TEST001',
        calendar_id: 'cal-123',
        role: 'reader',
        batch_size: 100
      };

      // Mock 查询返回50个参与者
      const participants = Array.from({ length: 50 }, (_, i) => `student${i + 1}`);
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: true,
        data: participants
      });

      // Mock 权限创建成功
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit.mockResolvedValue({
        items: participants.map(id => ({ user_id: id, role: 'reader' }))
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

      const data = result.data as BatchCreateCalendarPermissionsResult;
      expect(data.total_participants).toBe(50);
      expect(data.success_count).toBe(50);
      expect(data.failed_count).toBe(0);
      expect(data.batch_count).toBe(1);
      expect(data.batch_details).toHaveLength(1);
      expect(data.batch_details[0].success).toBe(true);

      // 应该调用一次权限创建API
      expect(mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit).toHaveBeenCalledTimes(1);
      expect(mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit).toHaveBeenCalledWith({
        calendar_id: 'cal-123',
        permissions: participants.map(id => ({ user_id: id, role: 'reader' })),
        id_type: 'internal'
      });
    });

    it('应该成功创建多批次权限', async () => {
      const config: BatchCreateCalendarPermissionsConfig = {
        kkh: 'TEST001',
        calendar_id: 'cal-123',
        role: 'reader',
        batch_size: 50
      };

      // Mock 查询返回120个参与者
      const participants = Array.from({ length: 120 }, (_, i) => `student${i + 1}`);
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: true,
        data: participants
      });

      // Mock 权限创建成功
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit.mockResolvedValue({
        items: []
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

      const data = result.data as BatchCreateCalendarPermissionsResult;
      expect(data.total_participants).toBe(120);
      expect(data.success_count).toBe(120);
      expect(data.failed_count).toBe(0);
      expect(data.batch_count).toBe(3); // 120 / 50 = 3批
      expect(data.batch_details).toHaveLength(3);

      // 应该调用3次权限创建API
      expect(mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit).toHaveBeenCalledTimes(3);
    });

    it('应该处理部分批次失败的情况', async () => {
      const config: BatchCreateCalendarPermissionsConfig = {
        kkh: 'TEST001',
        calendar_id: 'cal-123',
        batch_size: 50
      };

      // Mock 查询返回100个参与者
      const participants = Array.from({ length: 100 }, (_, i) => `student${i + 1}`);
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: true,
        data: participants
      });

      // Mock 第一批成功，第二批失败
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit
        .mockResolvedValueOnce({ items: [] })
        .mockRejectedValueOnce(new Error('API调用失败'));

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false); // 有失败的批次
      expect(result.data).toBeDefined();

      const data = result.data as BatchCreateCalendarPermissionsResult;
      expect(data.total_participants).toBe(100);
      expect(data.success_count).toBe(50); // 只有第一批成功
      expect(data.failed_count).toBe(50); // 第二批失败
      expect(data.batch_count).toBe(2);
      expect(data.batch_details).toHaveLength(2);
      expect(data.batch_details[0].success).toBe(true);
      expect(data.batch_details[1].success).toBe(false);
      expect(data.batch_details[1].error).toContain('API调用失败');
    });

    it('应该处理查询参与者失败', async () => {
      const config: BatchCreateCalendarPermissionsConfig = {
        kkh: 'TEST001',
        calendar_id: 'cal-123'
      };

      // Mock 查询失败
      mockStudentCourseRepository.findStudentsByKkh.mockResolvedValue({
        success: false,
        error: '数据库连接失败'
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('查询课程参与者失败: 数据库连接失败');
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const health = await executor.healthCheck();

      expect(health).toBe('healthy');
    });

    it('应该检测依赖服务缺失', async () => {
      const executorWithoutDeps = new BatchCreateCalendarPermissionsExecutor(
        null as any,
        null as any,
        mockLogger as any
      );

      const health = await executorWithoutDeps.healthCheck();

      expect(health).toBe('unhealthy');
    });
  });
});
