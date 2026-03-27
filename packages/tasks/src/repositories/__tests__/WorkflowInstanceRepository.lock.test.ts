/**
 * WorkflowInstanceRepository 锁检查功能单元测试
 *
 * 测试实例锁和业务锁检查逻辑的正确性
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WorkflowInstanceTable } from '../../types/database.js';
import WorkflowInstanceRepository from '../WorkflowInstanceRepository.js';

// Mock数据
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger)
} as any;

const mockDatabaseApi: DatabaseAPI = {
  executeQuery: vi.fn(),
  transaction: vi.fn()
} as any;

// 测试数据
const mockWorkflowInstance: WorkflowInstanceTable = {
  id: 1,
  workflow_definition_id: 1,
  name: 'test-instance',
  external_id: 'ext-123',
  status: 'running',
  instance_type: 'sync-workflow',
  input_data: { key: 'value' },
  output_data: null,
  context_data: {},
  business_key: 'business-key-123',
  mutex_key: 'mutex-key-123',
  started_at: new Date(),
  completed_at: null,
  interrupted_at: null,
  error_message: null,
  error_details: null,
  retry_count: 0,
  max_retries: 3,
  current_node_id: null,
  checkpoint_data: null,
  created_by: 'test-user',
  created_at: new Date(),
  updated_at: new Date()
};

describe('WorkflowInstanceRepository - 锁检查功能', () => {
  let repository: WorkflowInstanceRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new WorkflowInstanceRepository(mockDatabaseApi, mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkInstanceLock', () => {
    it('应该正确检查实例锁 - 存在冲突实例（增强版）', async () => {
      // 模拟数据库返回冲突实例
      const conflictInstances = [
        { ...mockWorkflowInstance, id: 1, status: 'running' },
        { ...mockWorkflowInstance, id: 2, status: 'interrupted' },
        { ...mockWorkflowInstance, id: 3, status: 'pending' }
      ];

      // Mock findMany方法
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: conflictInstances
      } as DatabaseResult<WorkflowInstanceTable[]>);

      const result = await repository.checkInstanceLock('sync-workflow');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(3);
        expect(result.data[0].status).toBe('running');
        expect(result.data[1].status).toBe('interrupted');
        expect(result.data[2].status).toBe('pending');
      }

      // 验证查询条件
      expect(repository.findMany).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.debug).toHaveBeenCalledWith('检查实例锁（增强版）', {
        instanceType: 'sync-workflow',
        excludeStatuses: []
      });
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '实例锁检查完成（增强版）',
        {
          instanceType: 'sync-workflow',
          conflictCount: 3,
          conflicts: expect.arrayContaining([
            expect.objectContaining({ id: 1, status: 'running' }),
            expect.objectContaining({ id: 2, status: 'interrupted' }),
            expect.objectContaining({ id: 3, status: 'pending' })
          ])
        }
      );
    });

    it('应该支持排除特定状态的实例锁检查', async () => {
      // 模拟数据库返回过滤后的实例
      const filteredInstances = [
        { ...mockWorkflowInstance, id: 1, status: 'running' }
      ];

      // Mock findMany方法
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: filteredInstances
      } as DatabaseResult<WorkflowInstanceTable[]>);

      const result = await repository.checkInstanceLock('sync-workflow', [
        'pending'
      ]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(1);
        expect(result.data[0].status).toBe('running');
      }

      expect(mockLogger.debug).toHaveBeenCalledWith('检查实例锁（增强版）', {
        instanceType: 'sync-workflow',
        excludeStatuses: ['pending']
      });
    });

    it('应该正确检查实例锁 - 无冲突实例', async () => {
      // Mock findMany方法返回空数组
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: []
      } as DatabaseResult<WorkflowInstanceTable[]>);

      const result = await repository.checkInstanceLock('sync-workflow');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toHaveLength(0);
      }

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '实例锁检查完成（增强版）',
        {
          instanceType: 'sync-workflow',
          conflictCount: 0,
          conflicts: []
        }
      );
    });

    it('应该处理数据库查询错误', async () => {
      const dbError = 'Database connection failed';

      // Mock findMany方法抛出错误
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: false,
        error: dbError
      } as any);

      const result = await repository.checkInstanceLock('sync-workflow');

      expect(result.success).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('实例锁检查失败', {
        instanceType: 'sync-workflow',
        error: dbError
      });
    });

    it('应该处理异常情况', async () => {
      const error = new Error('Unexpected error');

      // Mock findMany方法抛出异常
      vi.spyOn(repository, 'findMany').mockRejectedValue(error);

      const result = await repository.checkInstanceLock('sync-workflow');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
      expect(mockLogger.error).toHaveBeenCalledWith('实例锁检查异常', {
        instanceType: 'sync-workflow',
        error
      });
    });
  });

  describe('checkBusinessInstanceLock', () => {
    it('应该正确检查业务实例锁 - 存在冲突实例', async () => {
      // 模拟数据库返回冲突实例
      const conflictInstances = [
        { ...mockWorkflowInstance, id: 1, status: 'running' },
        { ...mockWorkflowInstance, id: 2, status: 'completed' },
        { ...mockWorkflowInstance, id: 3, status: 'interrupted' }
      ];

      // Mock findMany方法
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: conflictInstances
      } as DatabaseResult<WorkflowInstanceTable[]>);

      const result =
        await repository.checkBusinessInstanceLock('business-key-123');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data?.map((i) => i.status)).toEqual([
        'running',
        'completed',
        'interrupted'
      ]);

      expect(mockLogger.debug).toHaveBeenCalledWith('检查业务实例锁', {
        businessKey: 'business-key-123'
      });
      expect(mockLogger.debug).toHaveBeenCalledWith('业务实例锁检查完成', {
        businessKey: 'business-key-123',
        conflictCount: 3
      });
    });

    it('应该正确检查业务实例锁 - 无冲突实例', async () => {
      // Mock findMany方法返回空数组
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: []
      } as DatabaseResult<WorkflowInstanceTable[]>);

      const result =
        await repository.checkBusinessInstanceLock('business-key-456');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(0);

      expect(mockLogger.debug).toHaveBeenCalledWith('业务实例锁检查完成', {
        businessKey: 'business-key-456',
        conflictCount: 0
      });
    });

    it('应该处理数据库查询错误', async () => {
      const dbError = new Error('Database query failed');

      // Mock findMany方法返回错误
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: false,
        error: dbError
      } as DatabaseResult<WorkflowInstanceTable[]>);

      const result =
        await repository.checkBusinessInstanceLock('business-key-123');

      expect(result.success).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('业务实例锁检查失败', {
        businessKey: 'business-key-123',
        error: dbError
      });
    });

    it('应该处理异常情况', async () => {
      const error = new Error('Unexpected error');

      // Mock findMany方法抛出异常
      vi.spyOn(repository, 'findMany').mockRejectedValue(error);

      const result =
        await repository.checkBusinessInstanceLock('business-key-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe(error);
      expect(mockLogger.error).toHaveBeenCalledWith('业务实例锁检查异常', {
        businessKey: 'business-key-123',
        error
      });
    });
  });

  describe('findInterruptedInstances', () => {
    it('应该包含interrupted状态在默认查询中', async () => {
      const interruptedInstances = [
        { ...mockWorkflowInstance, id: 1, status: 'interrupted' },
        { ...mockWorkflowInstance, id: 2, status: 'failed' },
        { ...mockWorkflowInstance, id: 3, status: 'cancelled' }
      ];

      // Mock findMany方法
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: interruptedInstances
      } as DatabaseResult<WorkflowInstanceTable[]>);

      const result = await repository.findInterruptedInstances();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);

      // 验证查询条件包含interrupted状态
      expect(repository.findMany).toHaveBeenCalledWith(expect.any(Function));
    });

    it('应该支持自定义状态查询', async () => {
      const customInstances = [
        { ...mockWorkflowInstance, id: 1, status: 'running' }
      ];

      // Mock findMany方法
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: customInstances
      } as DatabaseResult<WorkflowInstanceTable[]>);

      const result = await repository.findInterruptedInstances({
        statuses: ['running'],
        limit: 10
      });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });
  });
});
