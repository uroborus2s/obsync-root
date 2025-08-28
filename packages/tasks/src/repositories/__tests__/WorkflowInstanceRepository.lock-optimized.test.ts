/**
 * WorkflowInstanceRepository 优化后的锁检查功能测试
 * 
 * 测试优化后的实例锁和业务锁检查逻辑
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
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

describe('WorkflowInstanceRepository - 优化后的锁检查功能', () => {
  let repository: WorkflowInstanceRepository;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = new WorkflowInstanceRepository(mockDatabaseApi, mockLogger);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkInstanceLock - 增强版', () => {
    it('应该检查更多状态的实例锁', async () => {
      // Mock findMany方法
      const mockFindMany = vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: [
          { id: 1, status: 'running', instance_type: 'sync-workflow' },
          { id: 2, status: 'interrupted', instance_type: 'sync-workflow' },
          { id: 3, status: 'pending', instance_type: 'sync-workflow' }
        ]
      } as any);

      const result = await repository.checkInstanceLock('sync-workflow');

      expect(result.success).toBe(true);
      expect(mockFindMany).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.debug).toHaveBeenCalledWith('检查实例锁（增强版）', {
        instanceType: 'sync-workflow',
        excludeStatuses: []
      });
    });

    it('应该支持排除特定状态', async () => {
      // Mock findMany方法
      const mockFindMany = vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: [
          { id: 1, status: 'running', instance_type: 'sync-workflow' }
        ]
      } as any);

      const result = await repository.checkInstanceLock('sync-workflow', ['pending']);

      expect(result.success).toBe(true);
      expect(mockFindMany).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.debug).toHaveBeenCalledWith('检查实例锁（增强版）', {
        instanceType: 'sync-workflow',
        excludeStatuses: ['pending']
      });
    });

    it('应该限制查询结果数量', async () => {
      // 验证查询构建器调用
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        whereIn: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis()
      };

      vi.spyOn(repository, 'findMany').mockImplementation(async (callback: any) => {
        callback(mockQueryBuilder);
        return { success: true, data: [] } as any;
      });

      await repository.checkInstanceLock('sync-workflow');

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });
  });

  describe('checkInstanceLockByWorkflowName - 新功能', () => {
    it('应该基于工作流名称检查实例锁', async () => {
      // Mock executeQuery方法
      const mockExecuteQuery = vi.spyOn(mockDatabaseApi, 'executeQuery').mockResolvedValue({
        success: true,
        data: [
          { id: 1, status: 'running', workflow_definition_id: 1 },
          { id: 2, status: 'interrupted', workflow_definition_id: 1 }
        ]
      } as any);

      const result = await repository.checkInstanceLockByWorkflowName('sync-workflow');

      expect(result.success).toBe(true);
      expect(mockExecuteQuery).toHaveBeenCalledWith(expect.any(Function));
      expect(mockLogger.debug).toHaveBeenCalledWith('检查工作流名称实例锁', {
        workflowName: 'sync-workflow'
      });
    });

    it('应该处理查询错误', async () => {
      // Mock executeQuery方法返回错误
      vi.spyOn(mockDatabaseApi, 'executeQuery').mockResolvedValue({
        success: false,
        error: 'Database error'
      } as any);

      const result = await repository.checkInstanceLockByWorkflowName('sync-workflow');

      expect(result.success).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('工作流名称实例锁检查失败', {
        workflowName: 'sync-workflow',
        error: 'Database error'
      });
    });

    it('应该处理异常情况', async () => {
      const error = new Error('Unexpected error');
      
      // Mock executeQuery方法抛出异常
      vi.spyOn(mockDatabaseApi, 'executeQuery').mockRejectedValue(error);

      const result = await repository.checkInstanceLockByWorkflowName('sync-workflow');

      expect(result.success).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('工作流名称实例锁检查异常', {
        workflowName: 'sync-workflow',
        error
      });
    });
  });

  describe('checkBusinessInstanceLock - 优化版', () => {
    it('应该限制业务锁检查的结果数量', async () => {
      // 验证查询构建器调用
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        whereIn: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis()
      };

      vi.spyOn(repository, 'findMany').mockImplementation(async (callback: any) => {
        callback(mockQueryBuilder);
        return { success: true, data: [] } as any;
      });

      await repository.checkBusinessInstanceLock('business-key-123');

      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('business_key', '=', 'business-key-123');
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('status', ['running', 'completed', 'interrupted']);
    });
  });

  describe('findInterruptedInstances - 优化版', () => {
    it('应该默认包含interrupted状态', async () => {
      // 验证查询构建器调用
      const mockQueryBuilder = {
        whereIn: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis()
      };

      vi.spyOn(repository, 'findMany').mockImplementation(async (callback: any) => {
        callback(mockQueryBuilder);
        return { success: true, data: [] } as any;
      });

      await repository.findInterruptedInstances();

      // 验证默认状态包含interrupted
      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('status', ['interrupted', 'failed', 'cancelled']);
    });

    it('应该支持自定义状态查询', async () => {
      const mockQueryBuilder = {
        whereIn: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis()
      };

      vi.spyOn(repository, 'findMany').mockImplementation(async (callback: any) => {
        callback(mockQueryBuilder);
        return { success: true, data: [] } as any;
      });

      await repository.findInterruptedInstances({
        statuses: ['running', 'paused'],
        limit: 50
      });

      expect(mockQueryBuilder.whereIn).toHaveBeenCalledWith('status', ['running', 'paused']);
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(50);
    });
  });

  describe('性能优化验证', () => {
    it('应该在所有锁检查方法中使用LIMIT', async () => {
      const mockQueryBuilder = {
        where: vi.fn().mockReturnThis(),
        whereIn: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis()
      };

      vi.spyOn(repository, 'findMany').mockImplementation(async (callback: any) => {
        callback(mockQueryBuilder);
        return { success: true, data: [] } as any;
      });

      // 测试实例锁检查
      await repository.checkInstanceLock('test-type');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);

      // 重置mock
      mockQueryBuilder.limit.mockClear();

      // 测试业务锁检查
      await repository.checkBusinessInstanceLock('test-key');
      expect(mockQueryBuilder.limit).toHaveBeenCalledWith(100);
    });

    it('应该记录详细的调试信息', async () => {
      vi.spyOn(repository, 'findMany').mockResolvedValue({
        success: true,
        data: [
          { id: 1, status: 'running', created_at: new Date() },
          { id: 2, status: 'interrupted', created_at: new Date() }
        ]
      } as any);

      await repository.checkInstanceLock('test-type');

      // 验证详细的日志记录
      expect(mockLogger.debug).toHaveBeenCalledWith('检查实例锁（增强版）', {
        instanceType: 'test-type',
        excludeStatuses: []
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('实例锁检查完成（增强版）', {
        instanceType: 'test-type',
        conflictCount: 2,
        conflicts: expect.arrayContaining([
          expect.objectContaining({ id: 1, status: 'running' }),
          expect.objectContaining({ id: 2, status: 'interrupted' })
        ])
      });
    });
  });
});
