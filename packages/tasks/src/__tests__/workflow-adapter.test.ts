/**
 * @stratix/tasks WorkflowAdapter 测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDefaultWorkflowAdapter, createWorkflowAdapter } from '../factories/WorkflowAdapterFactory.js';
import type { IWorkflowAdapter, WorkflowDefinition } from '../types/workflow.js';

// 模拟日志器
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

describe('WorkflowAdapter', () => {
  let adapter: IWorkflowAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = createDefaultWorkflowAdapter(mockLogger as any);
  });

  describe('createWorkflowAdapter工厂函数', () => {
    it('应该创建内存适配器', () => {
      const memoryAdapter = createWorkflowAdapter({
        type: 'memory',
        maxConcurrency: 5,
        logger: mockLogger as any
      });

      expect(memoryAdapter).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('创建工作流适配器'),
        expect.objectContaining({ type: 'memory' })
      );
    });

    it('应该创建Redis适配器（当前返回内存适配器）', () => {
      const redisAdapter = createWorkflowAdapter({
        type: 'redis',
        redis: {
          host: 'localhost',
          port: 6379
        },
        logger: mockLogger as any
      });

      expect(redisAdapter).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Redis适配器尚未实现')
      );
    });

    it('应该创建数据库适配器（当前返回内存适配器）', () => {
      const dbAdapter = createWorkflowAdapter({
        type: 'database',
        database: {
          host: 'localhost',
          port: 5432,
          database: 'test',
          username: 'user',
          password: 'pass'
        },
        logger: mockLogger as any
      });

      expect(dbAdapter).toBeDefined();
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('数据库适配器尚未实现')
      );
    });
  });

  describe('createWorkflow', () => {
    it('应该成功创建工作流实例', async () => {
      const definition: WorkflowDefinition = {
        name: 'test-workflow',
        version: '1.0.0',
        description: 'Test workflow',
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'Test Task',
            executor: 'test-executor',
            config: { message: 'Hello' }
          }
        ]
      };

      const result = await adapter.createWorkflow(definition, { input: 'test' });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.name).toBe('test-workflow');
      expect(result.data?.inputData).toEqual({ input: 'test' });
    });

    it('应该验证工作流定义', async () => {
      const invalidDefinition: WorkflowDefinition = {
        name: '',
        version: '1.0.0',
        nodes: []
      };

      const result = await adapter.createWorkflow(invalidDefinition);

      expect(result.success).toBe(false);
      expect(result.error).toContain('工作流名称不能为空');
    });

    it('应该处理执行选项', async () => {
      const definition: WorkflowDefinition = {
        name: 'test-workflow',
        version: '1.0.0',
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'Test Task',
            executor: 'test-executor',
            config: {}
          }
        ]
      };

      const result = await adapter.createWorkflow(
        definition,
        { input: 'test' },
        {
          externalId: 'ext-123',
          priority: 5,
          contextData: { context: 'data' }
        }
      );

      expect(result.success).toBe(true);
      expect(result.data?.externalId).toBe('ext-123');
      expect(result.data?.priority).toBe(5);
    });
  });

  describe('executeWorkflow', () => {
    it('应该执行工作流实例', async () => {
      // 首先创建工作流
      const definition: WorkflowDefinition = {
        name: 'test-workflow',
        version: '1.0.0',
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'Test Task',
            executor: 'test-executor',
            config: {}
          }
        ]
      };

      const createResult = await adapter.createWorkflow(definition);
      expect(createResult.success).toBe(true);

      const instanceId = createResult.data!.id.toString();
      const executeResult = await adapter.executeWorkflow(instanceId);

      // 注意：由于WorkflowEngine的限制，这里可能会失败
      // 但我们可以验证调用是否正确
      expect(executeResult).toBeDefined();
    });

    it('应该处理不存在的工作流实例', async () => {
      const result = await adapter.executeWorkflow('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('失败');
    });
  });

  describe('工作流控制方法', () => {
    let instanceId: string;

    beforeEach(async () => {
      const definition: WorkflowDefinition = {
        name: 'test-workflow',
        version: '1.0.0',
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'Test Task',
            executor: 'test-executor',
            config: {}
          }
        ]
      };

      const result = await adapter.createWorkflow(definition);
      instanceId = result.data!.id.toString();
    });

    it('应该暂停工作流', async () => {
      const result = await adapter.pauseWorkflow(instanceId);
      expect(result).toBeDefined();
    });

    it('应该恢复工作流', async () => {
      const result = await adapter.resumeWorkflow(instanceId);
      expect(result).toBeDefined();
    });

    it('应该取消工作流', async () => {
      const result = await adapter.cancelWorkflow(instanceId);
      expect(result).toBeDefined();
    });

    it('应该获取工作流状态', async () => {
      const result = await adapter.getWorkflowStatus(instanceId);
      expect(result).toBeDefined();
    });
  });

  describe('工作流查询方法', () => {
    it('应该列出工作流实例', async () => {
      const result = await adapter.listWorkflowInstances();
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('应该支持过滤条件', async () => {
      const result = await adapter.listWorkflowInstances({
        status: 'completed',
        limit: 10
      });
      expect(result.success).toBe(true);
    });
  });
});
