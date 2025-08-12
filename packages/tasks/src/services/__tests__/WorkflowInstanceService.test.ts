/**
 * WorkflowInstanceService 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import WorkflowInstanceService from '../WorkflowInstanceService.js';
import type { IWorkflowInstanceRepository } from '../../repositories/WorkflowInstanceRepository.js';
import type { NewWorkflowInstance, WorkflowInstance } from '../../types/database.js';
import type { WorkflowStatus } from '../../types/workflow.js';

// Mock Logger
const mockLogger: Logger = {
  info: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  debug: vi.fn()
} as any;

// Mock Repository
const mockRepository: IWorkflowInstanceRepository = {
  create: vi.fn(),
  findByIdNullable: vi.fn(),
  findByExternalId: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  findMany: vi.fn()
} as any;

describe('WorkflowInstanceService', () => {
  let service: WorkflowInstanceService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WorkflowInstanceService(mockRepository, mockLogger);
  });

  describe('createInstance', () => {
    const mockInstanceData: NewWorkflowInstance = {
      workflow_definition_id: 1,
      name: 'Test Workflow Instance',
      external_id: 'test-external-id',
      status: 'pending',
      input_data: { key: 'value' },
      output_data: null,
      context_data: {},
      business_key: null,
      mutex_key: null,
      started_at: null,
      completed_at: null,
      paused_at: null,
      error_message: null,
      error_details: null,
      retry_count: 0,
      max_retries: 3,
      priority: 0,
      scheduled_at: null,
      current_node_id: null,
      completed_nodes: null,
      failed_nodes: null,
      lock_owner: null,
      lock_acquired_at: null,
      last_heartbeat: null,
      assigned_engine_id: null,
      assignment_strategy: null,
      created_by: null
    };

    it('应该成功创建工作流实例', async () => {
      const mockCreatedInstance: WorkflowInstance = {
        id: 1,
        ...mockInstanceData,
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      vi.mocked(mockRepository.findByExternalId).mockResolvedValue({
        success: true,
        data: null
      });

      vi.mocked(mockRepository.create).mockResolvedValue({
        success: true,
        data: mockCreatedInstance
      });

      const result = await service.createInstance(mockInstanceData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCreatedInstance);
      expect(mockRepository.create).toHaveBeenCalledWith(mockInstanceData);
    });

    it('应该验证必需字段', async () => {
      const invalidData = { ...mockInstanceData, workflow_definition_id: undefined } as any;

      const result = await service.createInstance(invalidData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('工作流定义ID是必需的');
      expect(result.errorCode).toBe('MISSING_WORKFLOW_DEFINITION_ID');
    });

    it('应该检查外部ID唯一性', async () => {
      const existingInstance: WorkflowInstance = {
        id: 2,
        ...mockInstanceData,
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      vi.mocked(mockRepository.findByExternalId).mockResolvedValue({
        success: true,
        data: existingInstance
      });

      const result = await service.createInstance(mockInstanceData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('外部ID已存在');
      expect(result.errorCode).toBe('DUPLICATE_EXTERNAL_ID');
    });

    it('应该处理创建失败', async () => {
      vi.mocked(mockRepository.findByExternalId).mockResolvedValue({
        success: true,
        data: null
      });

      vi.mocked(mockRepository.create).mockResolvedValue({
        success: false,
        error: 'Database error'
      });

      const result = await service.createInstance(mockInstanceData);

      expect(result.success).toBe(false);
      expect(result.error).toContain('创建工作流实例失败');
      expect(result.errorCode).toBe('CREATE_FAILED');
    });
  });

  describe('getInstanceById', () => {
    it('应该成功获取工作流实例', async () => {
      const mockInstance: WorkflowInstance = {
        id: 1,
        workflow_definition_id: 1,
        name: 'Test Instance',
        status: 'running',
        created_at: new Date(),
        updated_at: new Date()
      } as any;

      vi.mocked(mockRepository.findByIdNullable).mockResolvedValue({
        success: true,
        data: mockInstance
      });

      const result = await service.getInstanceById(1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInstance);
    });

    it('应该处理实例不存在', async () => {
      vi.mocked(mockRepository.findByIdNullable).mockResolvedValue({
        success: true,
        data: null
      });

      const result = await service.getInstanceById(999);

      expect(result.success).toBe(false);
      expect(result.error).toContain('工作流实例不存在');
      expect(result.errorCode).toBe('INSTANCE_NOT_FOUND');
    });
  });

  describe('updateInstanceStatus', () => {
    it('应该成功更新实例状态', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue({
        success: true,
        data: {} as any
      });

      const result = await service.updateInstanceStatus(1, 'completed');

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

      await service.updateInstanceStatus(1, 'running');

      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'running',
        started_at: expect.any(Date)
      }));
    });

    it('应该为paused状态设置paused_at', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue({
        success: true,
        data: {} as any
      });

      await service.updateInstanceStatus(1, 'paused');

      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        status: 'paused',
        paused_at: expect.any(Date)
      }));
    });
  });

  describe('queryInstances', () => {
    it('应该成功查询实例列表', async () => {
      const mockInstances: WorkflowInstance[] = [
        {
          id: 1,
          workflow_definition_id: 1,
          name: 'Instance 1',
          status: 'running',
          created_at: new Date(),
          updated_at: new Date()
        } as any,
        {
          id: 2,
          workflow_definition_id: 1,
          name: 'Instance 2',
          status: 'completed',
          created_at: new Date(),
          updated_at: new Date()
        } as any
      ];

      vi.mocked(mockRepository.findMany).mockResolvedValue({
        success: true,
        data: mockInstances
      });

      const result = await service.queryInstances({
        status: 'running',
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockInstances);
      expect(mockRepository.findMany).toHaveBeenCalledWith(expect.objectContaining({
        status: 'running',
        limit: 10,
        offset: 0
      }));
    });

    it('应该使用默认查询选项', async () => {
      vi.mocked(mockRepository.findMany).mockResolvedValue({
        success: true,
        data: []
      });

      await service.queryInstances({});

      expect(mockRepository.findMany).toHaveBeenCalledWith(expect.objectContaining({
        limit: 100,
        offset: 0
      }));
    });
  });

  describe('deleteInstance', () => {
    it('应该成功删除实例', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({
        success: true,
        data: {} as any
      });

      const result = await service.deleteInstance(1);

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('应该处理删除失败', async () => {
      vi.mocked(mockRepository.delete).mockResolvedValue({
        success: false,
        error: 'Delete failed'
      });

      const result = await service.deleteInstance(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('删除工作流实例失败');
      expect(result.errorCode).toBe('DELETE_FAILED');
    });
  });

  describe('updateHeartbeat', () => {
    it('应该成功更新心跳', async () => {
      vi.mocked(mockRepository.update).mockResolvedValue({
        success: true,
        data: {} as any
      });

      const result = await service.updateHeartbeat(1, 'engine-123');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockRepository.update).toHaveBeenCalledWith(1, expect.objectContaining({
        last_heartbeat: expect.any(Date),
        lock_owner: 'engine-123',
        updated_at: expect.any(Date)
      }));
    });
  });

  describe('错误处理', () => {
    it('应该处理异常情况', async () => {
      vi.mocked(mockRepository.findByIdNullable).mockRejectedValue(new Error('Database connection failed'));

      const result = await service.getInstanceById(1);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database connection failed');
      expect(result.errorCode).toBe('UNEXPECTED_ERROR');
    });

    it('应该记录错误日志', async () => {
      vi.mocked(mockRepository.create).mockRejectedValue(new Error('Test error'));

      const mockInstanceData: NewWorkflowInstance = {
        workflow_definition_id: 1,
        name: 'Test'
      } as any;

      await service.createInstance(mockInstanceData);

      expect(mockLogger.error).toHaveBeenCalledWith(
        '创建工作流实例异常',
        expect.objectContaining({
          error: expect.any(Error),
          data: mockInstanceData
        })
      );
    });
  });
});
