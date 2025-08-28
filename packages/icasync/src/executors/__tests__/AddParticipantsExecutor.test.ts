import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutionContext } from '@stratix/tasks';
import AddParticipantsExecutor from '../AddParticipantsExecutor.js';
import type { 
  AddParticipantsConfig, 
  AddParticipantsResult 
} from '../AddParticipantsExecutor.js';

// Mock 依赖
const mockWasV7ApiCalendar = {
  batchCreateCalendarPermissionsLimit: vi.fn()
};

const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

describe('AddParticipantsExecutor', () => {
  let executor: AddParticipantsExecutor;

  beforeEach(() => {
    // 重置所有 mock
    vi.clearAllMocks();

    // 创建执行器实例
    executor = new AddParticipantsExecutor(
      mockWasV7ApiCalendar as any,
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

    it('应该拒绝缺少日历ID', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: '',
        user_ids: ['user1', 'user2']
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

    it('应该拒绝非数组的用户ID列表', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: 'cal-123',
        user_ids: 'not-an-array' as any
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('用户ID列表(user_ids)必须是数组');
    });

    it('应该拒绝超过100个用户的批次', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: 'cal-123',
        user_ids: Array.from({ length: 101 }, (_, i) => `user${i + 1}`)
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('单批次用户数量不能超过100个');
    });

    it('应该拒绝包含空用户ID的列表', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: 'cal-123',
        user_ids: ['user1', '', 'user3']
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('用户ID必须是非空字符串');
    });
  });

  describe('权限创建逻辑', () => {
    it('应该处理空用户列表', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: 'cal-123',
        user_ids: [],
        batch_index: 1
      };

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as AddParticipantsResult;
      expect(data.user_count).toBe(0);
      expect(data.success_count).toBe(0);
      expect(data.created_permissions).toEqual([]);

      // 不应该调用WPS API
      expect(mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit).not.toHaveBeenCalled();
    });

    it('应该成功创建权限', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: 'cal-123',
        user_ids: ['user1', 'user2', 'user3'],
        role: 'reader',
        id_type: 'internal',
        batch_index: 1
      };

      // Mock WPS API成功响应
      const mockResponse = {
        items: [
          { id: 'perm1', user_id: 'user1', role: 'reader' },
          { id: 'perm2', user_id: 'user2', role: 'reader' },
          { id: 'perm3', user_id: 'user3', role: 'reader' }
        ]
      };
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit.mockResolvedValue(mockResponse);

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as AddParticipantsResult;
      expect(data.success).toBe(true);
      expect(data.calendar_id).toBe('cal-123');
      expect(data.user_count).toBe(3);
      expect(data.success_count).toBe(3);
      expect(data.batch_index).toBe(1);
      expect(data.role).toBe('reader');
      expect(data.id_type).toBe('internal');
      expect(data.created_permissions).toHaveLength(3);
      expect(data.created_permissions![0]).toEqual({
        user_id: 'user1',
        role: 'reader',
        permission_id: 'perm1'
      });

      // 验证WPS API调用
      expect(mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit).toHaveBeenCalledWith({
        calendar_id: 'cal-123',
        permissions: [
          { user_id: 'user1', role: 'reader' },
          { user_id: 'user2', role: 'reader' },
          { user_id: 'user3', role: 'reader' }
        ],
        id_type: 'internal'
      });
    });

    it('应该使用默认参数', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: 'cal-123',
        user_ids: ['user1']
      };

      // Mock WPS API成功响应
      const mockResponse = {
        items: [
          { id: 'perm1', user_id: 'user1', role: 'reader' }
        ]
      };
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit.mockResolvedValue(mockResponse);

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as AddParticipantsResult;
      expect(data.role).toBe('reader'); // 默认值
      expect(data.id_type).toBe('internal'); // 默认值

      // 验证WPS API调用使用默认参数
      expect(mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit).toHaveBeenCalledWith({
        calendar_id: 'cal-123',
        permissions: [
          { user_id: 'user1', role: 'reader' }
        ],
        id_type: 'internal'
      });
    });

    it('应该处理WPS API调用失败', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: 'cal-123',
        user_ids: ['user1', 'user2'],
        batch_index: 2
      };

      // Mock WPS API调用失败
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit.mockRejectedValue(
        new Error('API调用失败')
      );

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.data).toBeDefined();

      const data = result.data as AddParticipantsResult;
      expect(data.success).toBe(false);
      expect(data.user_count).toBe(2);
      expect(data.success_count).toBe(0);
      expect(data.batch_index).toBe(2);
      expect(data.error).toContain('API调用失败');
      expect(result.error).toContain('API调用失败');
    });

    it('应该处理不同的权限级别', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: 'cal-123',
        user_ids: ['user1'],
        role: 'writer',
        id_type: 'external'
      };

      // Mock WPS API成功响应
      const mockResponse = {
        items: [
          { id: 'perm1', user_id: 'user1', role: 'writer' }
        ]
      };
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit.mockResolvedValue(mockResponse);

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();

      const data = result.data as AddParticipantsResult;
      expect(data.role).toBe('writer');
      expect(data.id_type).toBe('external');

      // 验证WPS API调用参数
      expect(mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit).toHaveBeenCalledWith({
        calendar_id: 'cal-123',
        permissions: [
          { user_id: 'user1', role: 'writer' }
        ],
        id_type: 'external'
      });
    });

    it('应该处理执行异常', async () => {
      const config: AddParticipantsConfig = {
        calendar_id: 'cal-123',
        user_ids: ['user1']
      };

      // Mock 执行过程中抛出异常
      mockWasV7ApiCalendar.batchCreateCalendarPermissionsLimit.mockImplementation(() => {
        throw new Error('网络连接超时');
      });

      const context: ExecutionContext = {
        config,
        workflowInstanceId: 'test-workflow',
        nodeId: 'test-node',
        inputData: {}
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toContain('执行失败: 网络连接超时');
    });
  });

  describe('健康检查', () => {
    it('应该返回健康状态', async () => {
      const health = await executor.healthCheck();

      expect(health).toBe('healthy');
    });

    it('应该检测依赖服务缺失', async () => {
      const executorWithoutDeps = new AddParticipantsExecutor(
        null as any,
        mockLogger as any
      );

      const health = await executorWithoutDeps.healthCheck();

      expect(health).toBe('unhealthy');
    });
  });
});
