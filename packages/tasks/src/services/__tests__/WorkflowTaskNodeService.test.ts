/**
 * WorkflowTaskNodeService 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import WorkflowTaskNodeService from '../WorkflowTaskNodeService.js';
import type { IWorkflowTaskNodeRepository } from '../../repositories/WorkflowTaskNodeRepository.js';
import type { NewWorkflowTaskNode, WorkflowTaskNode } from '../../types/database.js';
import type { TaskNodeStatus } from '../WorkflowTaskNodeService.js';

// Mock Logger
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
} as any;

// Mock Repository
const mockRepository: IWorkflowTaskNodeRepository = {
  create: vi.fn(),
  findByIdNullable: vi.fn(),
  findByNodeId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn(),
  findExecutableNodes: vi.fn(),
  findDependencies: vi.fn(),
  batchUpdateStatus: vi.fn(),
  getExecutionStats: vi.fn()
} as any;

describe('WorkflowTaskNodeService', () => {
  let service: WorkflowTaskNodeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkflowTaskNodeService(mockRepository, mockLogger);
  });

  describe('createTaskNode', () => {
    const mockNodeData: NewWorkflowTaskNode = {
      workflow_instance_id: 1,
      node_id: 'task-1',
      node_name: 'Test Task',
      node_type: 'task',
      status: 'pending',
      input_data: { key: 'value' },
      output_data: null,
      error_message: null,
      error_details: null,
      started_at: null,
      completed_at: null,
      duration_ms: null,
      retry_count: 0,
      max_retries: 3,
      executor: 'test-executor',
      executor_config: {},
      dependencies: [],
      parallel_group_id: null,
      parent_node_id: null,
      assigned_engine_id: null,
      lock_owner: null,
      lock_acquired_at: null,
      last_heartbeat: null
    };

    it('应该成功创建任务节点', async () => {
      const mockCreatedNode: WorkflowTaskNode = {
        id: 1,
        ...mockNodeData,
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      vi.mocked(mockRepository.findByNodeId).mockResolvedValue({
        success: true,
        data: null
      });

      vi.mocked(mockRepository.create).mockResolvedValue({
        success: true,
        data: mockCreatedNode
      });

      const result = await service.createTaskNode(mockNodeData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedNode);
      expect(mockRepository.create).toHaveBeenCalledWith(mockNodeData);
    });

    it('应该验证必需字段', async () => {
      const invalidData = { ...mockNodeData, workflow_instance_id: undefined } as any;

      const result = await service.createTaskNode(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('工作流实例ID是必需的');
      expect(result.errorCode).toBe('MISSING_WORKFLOW_INSTANCE_ID');
    });

    it('应该检查节点ID唯一性', async () => {
      const existingNode: WorkflowTaskNode = {
        id: 2,
        ...mockNodeData,
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      vi.mocked(mockRepository.findByNodeId).mockResolvedValue({
        success: true,
        data: existingNode
      });

      const result = await service.createTaskNode(mockNodeData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('节点已存在');
      expect(result.errorCode).toBe('DUPLICATE_NODE_ID');
    });
  });

  describe('getTaskNodeById', () => {
    it('应该成功获取任务节点', async () => {
      const mockNode: WorkflowTaskNode = {
        id: 1,
        workflow_instance_id: 1,
        node_id: 'task-1',
        node_name: 'Test Task',
        status: 'running',
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      vi.mocked(mockRepository.findByIdNullable).mockResolvedValue({
        success: true,
        data: mockNode
      });

      const result = await service.getTaskNodeById(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNode);
    });

    it('应该处理节点不存在', async () => {
      vi.mocked(mockRepository.findByIdNullable).mockResolvedValue({
        success: true,
        data: null
      });

      const result = await service.getTaskNodeById(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('任务节点不存在');
      expect(result.errorCode).toBe('NODE_NOT_FOUND');
    });
  });

  describe('updateTaskNodeStatus', () => {
    it('应该成功更新节点状态', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue({
        success: true,
        data: {} as any
      });

      const result = await service.updateTaskNodeStatus(1, 'completed');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'completed',
        completed_at: expect.any(Date),
        updated_at: expect.any(Date)
      }));
    });

    it('应该为running状态设置started_at', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue({
        success: true,
        data: {} as any
      });

      await service.updateTaskNodeStatus(1, 'running');

      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'running',
        started_at: expect.any(Date)
      }));
    });

    it('应该计算执行时长', async () => {
      const startTime = new Date('2023-01-01T10:00:00Z');
      
      vi.mocked(mockRepository.update).mockResolvedValue({
        success: true,
        data: {} as any
      });

      await service.updateTaskNodeStatus(1, 'completed', { started_at: startTime });

      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'completed',
        completed_at: expect.any(Date),
        duration_ms: expect.any(Number)
      }));
    });
  });

  describe('queryTaskNodes', () => {
    it('应该成功查询任务节点列表', async () => {
      const mockNodes: WorkflowTaskNode[] = [
        {
          id: 1,
          workflow_instance_id: 1,
          node_id: 'task-1',
          node_name: 'Task 1',
          status: 'running',
          created_at: new Date(),
          updated_at: new Date()
        } as any,
        {
          id: 2,
          workflow_instance_id: 1,
          node_id: 'task-2',
          node_name: 'Task 2',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        } as any
      ];

      vi.mocked(mockRepository.findMany).mockResolvedValue({
        success: true,
        data: mockNodes
      });

      const result = await service.queryTaskNodes({
        workflowInstanceId: 1,
        status: 'running',
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNodes);
      expect(mockRepository.findMany).toHaveBeenCalledWith(expect.objectContaining({
        workflowInstanceId: 1,
        status: 'running',
        limit: 10,
        offset: 0
      }));
    });
  });

  describe('getExecutableNodes', () => {
    it('应该成功获取可执行节点', async () => {
      const mockNodes: WorkflowTaskNode[] = [
        {
          id: 1,
          workflow_instance_id: 1,
          node_id: 'task-1',
          status: 'pending',
          created_at: new Date(),
          updated_at: new Date()
        } as any
      ];

      vi.mocked(mockRepository.findExecutableNodes).mockResolvedValue({
        success: true,
        data: mockNodes
      });

      const result = await service.getExecutableNodes(10);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockNodes);
      expect(mockRepository.findExecutableNodes).toHaveBeenCalledWith(10);
    });
  });

  describe('canExecuteNode', () => {
    it('应该检查节点是否可以执行', async () => {
      const dependencies: WorkflowTaskNode[] = [
        {
          id: 1,
          workflow_instance_id: 1,
          node_id: 'dep-1',
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date()
        } as any,
        {
          id: 2,
          workflow_instance_id: 1,
          node_id: 'dep-2',
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date()
        } as any
      ];

      vi.mocked(mockRepository.findDependencies).mockResolvedValue({
        success: true,
        data: dependencies
      });

      const result = await service.canExecuteNode(1, 'task-1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('应该返回false如果依赖未完成', async () => {
      const dependencies: WorkflowTaskNode[] = [
        {
          id: 1,
          workflow_instance_id: 1,
          node_id: 'dep-1',
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date()
        } as any,
        {
          id: 2,
          workflow_instance_id: 1,
          node_id: 'dep-2',
          status: 'running',
          created_at: new Date(),
          updated_at: new Date()
        } as any
      ];

      vi.mocked(mockRepository.findDependencies).mockResolvedValue({
        success: true,
        data: dependencies
      });

      const result = await service.canExecuteNode(1, 'task-1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('batchUpdateStatus', () => {
    it('应该成功批量更新状态', async () => {
      vi.mocked(mockRepository.batchUpdateStatus).mockResolvedValue({
        success: true,
        data: 3
      });

      const result = await service.batchUpdateStatus([1, 2, 3], 'cancelled');

      expect(result.success).toBe(true);
      expect(result.data).toBe(3);
      expect(mockRepository.batchUpdateStatus).toHaveBeenCalledWith([1, 2, 3], 'cancelled');
    });
  });

  describe('getExecutionStats', () => {
    it('应该成功获取执行统计', async () => {
      const mockStats = {
        totalNodes: 10,
        completedNodes: 7,
        failedNodes: 1,
        runningNodes: 1,
        pendingNodes: 1,
        averageDuration: 5000
      };

      vi.mocked(mockRepository.getExecutionStats).mockResolvedValue({
        success: true,
        data: mockStats
      });

      const result = await service.getExecutionStats(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStats);
    });
  });

  describe('错误处理', () => {
    it('应该处理异常情况', async () => {
      vi.mocked(mockRepository.findByIdNullable).mockRejectedValue(new Error('Database error'));

      const result = await service.getTaskNodeById(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database error');
      expect(result.errorCode).toBe('UNEXPECTED_ERROR');
    });

    it('应该记录错误日志', async () => {
      vi.mocked(mockRepository.create).mockRejectedValue(new Error('Test error'));

      const mockNodeData: NewWorkflowTaskNode = {
        workflow_instance_id: 1,
        node_id: 'task-1',
        node_name: 'Test',
        node_type: 'task'
      } as any;

      await service.createTaskNode(mockNodeData);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '创建任务节点异常',
        expect.objectContaining({
          error: expect.any(Error),
          data: mockNodeData
        })
      );
    });
  });
});
