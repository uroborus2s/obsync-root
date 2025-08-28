/**
 * FullSyncAdapter 增强功能测试
 * 
 * 测试修复后的workflowAdapter集成和手动启动同步功能
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import FullSyncAdapter from '../full-sync.adapter.js';
import { SyncStatus } from '../../types/sync.js';

// Mock数据
const mockLogger: Logger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn(() => mockLogger)
} as any;

const mockWorkflowInstance = {
  id: 1,
  name: 'test-sync-instance',
  status: 'running',
  started_at: new Date(),
  workflow_definition_id: 1
};

describe('FullSyncAdapter - 增强功能测试', () => {
  let adapter: FullSyncAdapter;
  let mockWorkflowAdapter: any;
  let mockICAsyncMutexManager: any;
  let mockContainer: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 创建Mock WorkflowAdapter
    mockWorkflowAdapter = {
      listWorkflowInstances: vi.fn(),
      getWorkflowInstance: vi.fn(),
      resumeWorkflow: vi.fn(),
      startWorkflowByName: vi.fn()
    };

    // 创建Mock ICAsyncMutexManager
    mockICAsyncMutexManager = {
      createMutexFullSync: vi.fn()
    };

    // 创建Mock Container
    mockContainer = {
      resolve: vi.fn((name: string) => {
        switch (name) {
          case 'tasksWorkflow':
            return mockWorkflowAdapter;
          case 'icAsyncMutexManager':
            return mockICAsyncMutexManager;
          case 'logger':
            return mockLogger;
          default:
            throw new Error(`Unknown dependency: ${name}`);
        }
      })
    };

    adapter = new FullSyncAdapter(mockContainer);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('startManualSync - 手动启动同步', () => {
    it('应该成功启动手动同步', async () => {
      const syncOptions = {
        xnxq: '2024-2025-1',
        forceSync: true,
        batchSize: 500,
        businessKey: 'test-business-key'
      };

      // Mock没有运行中的任务
      mockWorkflowAdapter.listWorkflowInstances.mockResolvedValue({
        success: true,
        data: { items: [] }
      });

      // Mock成功启动工作流
      mockWorkflowAdapter.startWorkflowByName.mockResolvedValue({
        success: true,
        data: mockWorkflowInstance
      });

      const result = await adapter.startManualSync(syncOptions);

      expect(result.status).toBe(SyncStatus.IN_PROGRESS);
      expect(result.details?.instanceId).toBe('1');
      expect(result.details?.workflowName).toBe('full-sync-multi-loop-workflow');
      expect(result.details?.workflowVersion).toBe('3.0.0');

      // 验证调用参数
      expect(mockWorkflowAdapter.startWorkflowByName).toHaveBeenCalledWith(
        'full-sync-multi-loop-workflow',
        expect.objectContaining({
          workflowName: 'full-sync-multi-loop-workflow',
          workflowVersion: '3.0.0',
          businessKey: 'test-business-key',
          inputData: expect.objectContaining({
            xnxq: '2024-2025-1',
            forceSync: true,
            batchSize: 500,
            syncType: 'full',
            triggeredBy: 'manual'
          })
        })
      );
    });

    it('应该验证学年学期格式', async () => {
      const invalidOptions = {
        xnxq: 'invalid-format'
      };

      const result = await adapter.startManualSync(invalidOptions);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toContain('学年学期格式错误，应为：YYYY-YYYY-S（如：2024-2025-1）');
    });

    it('应该检查运行中的任务冲突', async () => {
      const syncOptions = {
        xnxq: '2024-2025-1'
      };

      // Mock有运行中的任务
      mockWorkflowAdapter.listWorkflowInstances.mockResolvedValue({
        success: true,
        data: {
          items: [{ id: 'existing-instance', status: 'running' }]
        }
      });

      const result = await adapter.startManualSync(syncOptions);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toContain('已有同步任务正在运行中');
    });

    it('应该处理工作流启动失败', async () => {
      const syncOptions = {
        xnxq: '2024-2025-1'
      };

      // Mock没有运行中的任务
      mockWorkflowAdapter.listWorkflowInstances.mockResolvedValue({
        success: true,
        data: { items: [] }
      });

      // Mock工作流启动失败
      mockWorkflowAdapter.startWorkflowByName.mockResolvedValue({
        success: false,
        error: 'Workflow start failed'
      });

      const result = await adapter.startManualSync(syncOptions);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toContain('启动同步工作流失败');
      expect(result.details?.error).toBe('Workflow start failed');
    });

    it('应该处理异常情况', async () => {
      const syncOptions = {
        xnxq: '2024-2025-1'
      };

      // Mock抛出异常
      mockWorkflowAdapter.listWorkflowInstances.mockRejectedValue(
        new Error('Database connection failed')
      );

      const result = await adapter.startManualSync(syncOptions);

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.errors).toContain('Database connection failed');
    });
  });

  describe('getSyncStatus - 获取同步状态', () => {
    it('应该返回运行中状态', async () => {
      mockWorkflowAdapter.listWorkflowInstances.mockResolvedValue({
        success: true,
        data: {
          items: [mockWorkflowInstance]
        }
      });

      const result = await adapter.getSyncStatus();

      expect(result.status).toBe(SyncStatus.IN_PROGRESS);
      expect(result.details?.instanceId).toBe(1);
      expect(result.details?.message).toBe('同步正在进行中');
    });

    it('应该返回最近完成的状态', async () => {
      // Mock没有运行中的任务
      mockWorkflowAdapter.listWorkflowInstances
        .mockResolvedValueOnce({
          success: true,
          data: { items: [] }
        })
        // Mock最近完成的任务
        .mockResolvedValueOnce({
          success: true,
          data: {
            items: [{
              id: 'completed-instance',
              status: 'completed',
              started_at: new Date('2024-01-01T02:00:00Z'),
              completed_at: new Date('2024-01-01T04:00:00Z')
            }]
          }
        });

      const result = await adapter.getSyncStatus();

      expect(result.status).toBe(SyncStatus.COMPLETED);
      expect(result.details?.message).toBe('上次同步已完成');
    });

    it('应该返回待执行状态', async () => {
      // Mock没有任何任务
      mockWorkflowAdapter.listWorkflowInstances.mockResolvedValue({
        success: true,
        data: { items: [] }
      });

      const result = await adapter.getSyncStatus();

      expect(result.status).toBe(SyncStatus.PENDING);
      expect(result.details?.message).toBe('暂无同步记录');
    });

    it('应该处理查询失败', async () => {
      mockWorkflowAdapter.listWorkflowInstances.mockResolvedValue({
        success: false,
        error: 'Query failed'
      });

      const result = await adapter.getSyncStatus();

      expect(result.status).toBe(SyncStatus.FAILED);
      expect(result.details?.error).toBe('Query failed');
    });
  });

  describe('validateXnxq - 学年学期验证', () => {
    it('应该验证有效的学年学期格式', () => {
      const validFormats = [
        '2024-2025-1',
        '2024-2025-2',
        '2023-2024-1',
        '2025-2026-2'
      ];

      for (const format of validFormats) {
        // 通过反射访问私有方法进行测试
        const isValid = (adapter as any).validateXnxq(format);
        expect(isValid).toBe(true);
      }
    });

    it('应该拒绝无效的学年学期格式', () => {
      const invalidFormats = [
        '2024-2025',      // 缺少学期
        '2024-2025-3',    // 无效学期
        '24-25-1',        // 年份格式错误
        '2024-2025-01',   // 学期格式错误
        'invalid',        // 完全无效
        '2024/2025/1',    // 分隔符错误
        ''                // 空字符串
      ];

      for (const format of invalidFormats) {
        const isValid = (adapter as any).validateXnxq(format);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('工作流选项构建', () => {
    it('应该正确构建工作流选项', async () => {
      const syncOptions = {
        xnxq: '2024-2025-1',
        forceSync: true,
        batchSize: 2000,
        businessKey: 'custom-business-key'
      };

      // Mock成功的状态检查和工作流启动
      mockWorkflowAdapter.listWorkflowInstances.mockResolvedValue({
        success: true,
        data: { items: [] }
      });

      mockWorkflowAdapter.startWorkflowByName.mockResolvedValue({
        success: true,
        data: mockWorkflowInstance
      });

      await adapter.startManualSync(syncOptions);

      const callArgs = mockWorkflowAdapter.startWorkflowByName.mock.calls[0];
      const workflowOptions = callArgs[1];

      // 验证工作流选项结构
      expect(workflowOptions).toMatchObject({
        workflowName: 'full-sync-multi-loop-workflow',
        workflowVersion: '3.0.0',
        businessKey: 'custom-business-key',
        inputData: {
          xnxq: '2024-2025-1',
          forceSync: true,
          batchSize: 2000,
          syncType: 'full',
          triggeredBy: 'manual'
        },
        contextData: {
          instanceType: 'full-sync-multi-loop-workflow',
          createdBy: 'manual-trigger',
          syncMode: 'manual',
          priority: 'high'
        }
      });

      // 验证输入数据包含时间戳
      expect(workflowOptions.inputData.triggeredAt).toBeDefined();
      expect(new Date(workflowOptions.inputData.triggeredAt)).toBeInstanceOf(Date);
    });

    it('应该生成默认业务键', async () => {
      const syncOptions = {
        xnxq: '2024-2025-1'
      };

      mockWorkflowAdapter.listWorkflowInstances.mockResolvedValue({
        success: true,
        data: { items: [] }
      });

      mockWorkflowAdapter.startWorkflowByName.mockResolvedValue({
        success: true,
        data: mockWorkflowInstance
      });

      await adapter.startManualSync(syncOptions);

      const callArgs = mockWorkflowAdapter.startWorkflowByName.mock.calls[0];
      const workflowOptions = callArgs[1];

      // 验证默认业务键格式
      expect(workflowOptions.businessKey).toMatch(/^full-sync-2024-2025-1-\d+$/);
    });
  });
});
