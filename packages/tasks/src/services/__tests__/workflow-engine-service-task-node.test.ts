/**
 * WorkflowEngineService - TaskNode 创建测试
 * 
 * 验证getOrCreateTaskNode方法在MySQL 5.7环境下的正确行为
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Logger } from '@stratix/core';
import type { IWorkflowTaskNodeRepository } from '../../repositories/WorkflowTaskNodeRepository.js';
import type { NodeDefinition } from '../../types/workflow.js';
import type { WorkflowTaskNode } from '../../types/database.js';

// 模拟WorkflowEngineService的getOrCreateTaskNode方法
class TestWorkflowEngineService {
  constructor(
    private readonly workflowTaskNodeRepository: IWorkflowTaskNodeRepository,
    private readonly logger: Logger
  ) {}

  /**
   * 获取或创建任务节点记录 - 测试版本
   */
  async getOrCreateTaskNode(
    workflowInstanceId: number,
    node: NodeDefinition
  ): Promise<WorkflowTaskNode> {
    try {
      // 先尝试查找现有记录
      const existingResult = await this.workflowTaskNodeRepository.findByNodeId(
        workflowInstanceId,
        node.id
      );

      if (existingResult.success && existingResult.data) {
        this.logger.debug(`Found existing task node: ${node.id}`, {
          taskNodeId: existingResult.data.id,
          status: existingResult.data.status,
          workflowInstanceId
        });
        return existingResult.data;
      }

      // 创建新的任务节点记录
      this.logger.debug(`Creating new task node: ${node.id}`, {
        workflowInstanceId,
        nodeType: node.type
      });

      const newTaskNode = {
        workflow_instance_id: workflowInstanceId,
        node_id: node.id,
        node_name: node.name || node.id,
        node_type: node.type === 'wait' ? 'task' : node.type,
        status: 'pending',
        input_data: null,
        output_data: null,
        parent_node_id: null,
        depends_on: node.dependsOn ? JSON.stringify(node.dependsOn) : null,
        parallel_group_id: null,
        parallel_index: null,
        is_dynamic_task: false,
        dynamic_source_data: null,
        started_at: null,
        completed_at: null,
        error_message: null,
        error_details: null,
        retry_count: 0,
        max_retries: 3,
        executor: (node as any).executor || null,
        executor_config: (node as any).config || null,
        assigned_engine_id: null,
        assignment_strategy: 'round_robin',
        duration_ms: null
      };

      const createResult = await this.workflowTaskNodeRepository.create(newTaskNode);
      
      if (!createResult.success) {
        this.logger.error(`Failed to create task node: ${node.id}`, {
          error: createResult.error,
          workflowInstanceId,
          nodeType: node.type
        });
        throw new Error(`Failed to create task node: ${createResult.error}`);
      }

      // MySQL 5.7下create方法不返回完整记录数据，需要获取insertId后查询
      const insertResult = createResult.data as any;
      const insertId = insertResult?.insertId || insertResult?.id;
      
      if (!insertId) {
        this.logger.error(`Create task node succeeded but no insertId returned: ${node.id}`, {
          workflowInstanceId,
          createResult: insertResult
        });
        throw new Error(`Create task node succeeded but no insertId returned for node: ${node.id}`);
      }

      // 使用insertId查询完整的记录数据
      this.logger.debug(`Fetching created task node by ID: ${insertId}`, {
        nodeId: node.id,
        workflowInstanceId
      });

      const fetchResult = await this.workflowTaskNodeRepository.findByIdNullable(insertId);
      
      if (!fetchResult.success || !fetchResult.data) {
        this.logger.error(`Failed to fetch created task node: ${node.id}`, {
          insertId,
          workflowInstanceId,
          fetchError: fetchResult.success ? 'No data returned' : (fetchResult as any).error
        });
        throw new Error(`Failed to fetch created task node: ${node.id}`);
      }

      this.logger.debug(`Successfully created and fetched task node: ${node.id}`, {
        taskNodeId: fetchResult.data.id,
        workflowInstanceId,
        status: fetchResult.data.status
      });

      return fetchResult.data;
    } catch (error) {
      this.logger.error(`Error in getOrCreateTaskNode for node: ${node.id}`, {
        error: error instanceof Error ? error.message : String(error),
        workflowInstanceId,
        nodeType: node.type
      });
      throw error;
    }
  }
}

describe('WorkflowEngineService - getOrCreateTaskNode', () => {
  let mockRepository: IWorkflowTaskNodeRepository;
  let mockLogger: Logger;
  let service: TestWorkflowEngineService;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    mockRepository = {
      findByNodeId: vi.fn(),
      findByIdNullable: vi.fn(),
      create: vi.fn()
    } as any;

    service = new TestWorkflowEngineService(mockRepository, mockLogger);
  });

  describe('当节点已存在时', () => {
    it('应该返回现有的节点记录', async () => {
      const existingNode: WorkflowTaskNode = {
        id: 123,
        workflow_instance_id: 1,
        node_id: 'test-node',
        node_name: 'Test Node',
        node_type: 'task',
        status: 'completed',
        input_data: null,
        output_data: { result: 'success' },
        parent_node_id: null,
        depends_on: null,
        parallel_group_id: null,
        parallel_index: null,
        is_dynamic_task: false,
        dynamic_source_data: null,
        started_at: new Date('2024-01-01T10:00:00Z'),
        completed_at: new Date('2024-01-01T10:05:00Z'),
        error_message: null,
        error_details: null,
        retry_count: 0,
        max_retries: 3,
        executor: 'test-executor',
        executor_config: null,
        assigned_engine_id: 'engine-1',
        assignment_strategy: 'round_robin',
        duration_ms: 300000,
        created_at: new Date('2024-01-01T09:00:00Z'),
        updated_at: new Date('2024-01-01T10:05:00Z')
      };

      vi.mocked(mockRepository.findByNodeId).mockResolvedValue({
        success: true,
        data: existingNode
      });

      const nodeDefinition: NodeDefinition = {
        id: 'test-node',
        name: 'Test Node',
        type: 'task'
      };

      const result = await service.getOrCreateTaskNode(1, nodeDefinition);

      expect(result).toEqual(existingNode);
      expect(mockRepository.findByNodeId).toHaveBeenCalledWith(1, 'test-node');
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Found existing task node: test-node',
        expect.objectContaining({
          taskNodeId: 123,
          status: 'completed',
          workflowInstanceId: 1
        })
      );
    });
  });

  describe('当需要创建新节点时', () => {
    it('应该创建新节点并返回完整记录数据', async () => {
      // 模拟节点不存在
      vi.mocked(mockRepository.findByNodeId).mockResolvedValue({
        success: true,
        data: null
      });

      // 模拟MySQL 5.7的create返回值（只有insertId）
      vi.mocked(mockRepository.create).mockResolvedValue({
        success: true,
        data: { insertId: 456, affectedRows: 1 } as any
      });

      // 模拟查询新创建的记录
      const newNode: WorkflowTaskNode = {
        id: 456,
        workflow_instance_id: 1,
        node_id: 'new-node',
        node_name: 'New Node',
        node_type: 'task',
        status: 'pending',
        input_data: null,
        output_data: null,
        parent_node_id: null,
        depends_on: null,
        parallel_group_id: null,
        parallel_index: null,
        is_dynamic_task: false,
        dynamic_source_data: null,
        started_at: null,
        completed_at: null,
        error_message: null,
        error_details: null,
        retry_count: 0,
        max_retries: 3,
        executor: null,
        executor_config: null,
        assigned_engine_id: null,
        assignment_strategy: 'round_robin',
        duration_ms: null,
        created_at: new Date('2024-01-01T10:00:00Z'),
        updated_at: new Date('2024-01-01T10:00:00Z')
      };

      vi.mocked(mockRepository.findByIdNullable).mockResolvedValue({
        success: true,
        data: newNode
      });

      const nodeDefinition: NodeDefinition = {
        id: 'new-node',
        name: 'New Node',
        type: 'task'
      };

      const result = await service.getOrCreateTaskNode(1, nodeDefinition);

      expect(result).toEqual(newNode);
      expect(mockRepository.findByNodeId).toHaveBeenCalledWith(1, 'new-node');
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          workflow_instance_id: 1,
          node_id: 'new-node',
          node_name: 'New Node',
          node_type: 'task',
          status: 'pending'
        })
      );
      expect(mockRepository.findByIdNullable).toHaveBeenCalledWith(456);
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Creating new task node: new-node',
        expect.objectContaining({
          workflowInstanceId: 1,
          nodeType: 'task'
        })
      );
      
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Successfully created and fetched task node: new-node',
        expect.objectContaining({
          taskNodeId: 456,
          workflowInstanceId: 1,
          status: 'pending'
        })
      );
    });

    it('应该处理create操作失败的情况', async () => {
      vi.mocked(mockRepository.findByNodeId).mockResolvedValue({
        success: true,
        data: null
      });

      vi.mocked(mockRepository.create).mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      } as any);

      const nodeDefinition: NodeDefinition = {
        id: 'fail-node',
        type: 'task'
      };

      await expect(service.getOrCreateTaskNode(1, nodeDefinition)).rejects.toThrow(
        'Failed to create task node: Database connection failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create task node: fail-node',
        expect.objectContaining({
          error: 'Database connection failed',
          workflowInstanceId: 1,
          nodeType: 'task'
        })
      );
    });

    it('应该处理没有insertId的情况', async () => {
      vi.mocked(mockRepository.findByNodeId).mockResolvedValue({
        success: true,
        data: null
      });

      // 模拟create成功但没有返回insertId
      vi.mocked(mockRepository.create).mockResolvedValue({
        success: true,
        data: { affectedRows: 1 } as any // 缺少insertId
      });

      const nodeDefinition: NodeDefinition = {
        id: 'no-id-node',
        type: 'task'
      };

      await expect(service.getOrCreateTaskNode(1, nodeDefinition)).rejects.toThrow(
        'Create task node succeeded but no insertId returned for node: no-id-node'
      );
    });

    it('应该处理查询新创建记录失败的情况', async () => {
      vi.mocked(mockRepository.findByNodeId).mockResolvedValue({
        success: true,
        data: null
      });

      vi.mocked(mockRepository.create).mockResolvedValue({
        success: true,
        data: { insertId: 789, affectedRows: 1 } as any
      });

      // 模拟查询失败
      vi.mocked(mockRepository.findByIdNullable).mockResolvedValue({
        success: false,
        error: 'Record not found'
      } as any);

      const nodeDefinition: NodeDefinition = {
        id: 'fetch-fail-node',
        type: 'task'
      };

      await expect(service.getOrCreateTaskNode(1, nodeDefinition)).rejects.toThrow(
        'Failed to fetch created task node: fetch-fail-node'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to fetch created task node: fetch-fail-node',
        expect.objectContaining({
          insertId: 789,
          workflowInstanceId: 1,
          fetchError: 'Record not found'
        })
      );
    });
  });
});
