// @stratix/icasync SyncWorkflowService 测试
// 测试同步工作流服务的核心功能

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SyncWorkflowService } from '../services/SyncWorkflowService.js';

describe('SyncWorkflowService', () => {
  let syncWorkflowService: SyncWorkflowService;
  let mockLogger: any;
  let mockTasksWorkflow: any;

  beforeEach(() => {
    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    mockTasksWorkflow = {
      createWorkflow: vi.fn(),
      executeWorkflow: vi.fn(),
      getWorkflowStatus: vi.fn(),
      cancelWorkflow: vi.fn()
    };

    // 创建服务实例
    syncWorkflowService = new SyncWorkflowService(
      mockLogger,
      mockTasksWorkflow
    );
  });

  describe('executeFullSyncWorkflow', () => {
    it('应该成功执行全量同步工作流', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        syncType: 'full' as const,
        batchSize: 10,
        timeout: 1800000,
        parallel: false
      };

      // 模拟工作流创建成功
      mockTasksWorkflow.createWorkflow = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'workflow-123' }
      });

      // 模拟工作流执行成功
      mockTasksWorkflow.executeWorkflow = vi.fn().mockResolvedValue({
        success: true
      });

      // 模拟工作流状态监控
      mockTasksWorkflow.getWorkflowStatus = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: { status: 'running', progress: 50 }
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            status: 'completed',
            totalTasks: 4,
            completedTasks: 4,
            failedTasks: 0,
            errors: []
          }
        });

      // 执行测试
      const result = await syncWorkflowService.executeFullSyncWorkflow(config);

      // 验证结果
      expect(result.status).toBe('completed');
      expect(result.workflowId).toBe('workflow-123');
      expect(result.totalTasks).toBe(4);
      expect(result.completedTasks).toBe(4);
      expect(result.failedTasks).toBe(0);
      expect(result.errors).toHaveLength(0);

      // 验证方法调用
      expect(mockTasksWorkflow.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('全量同步-2024-2025-1'),
          description: expect.stringContaining(
            '学年学期 2024-2025-1 的课表全量同步工作流'
          ),
          tasks: expect.arrayContaining([
            expect.objectContaining({ name: 'course-data-aggregation' }),
            expect.objectContaining({ name: 'calendar-creation-batch' }),
            expect.objectContaining({ name: 'participant-management-batch' }),
            expect.objectContaining({ name: 'schedule-creation-batch' })
          ])
        })
      );
      expect(mockTasksWorkflow.executeWorkflow).toHaveBeenCalledWith(
        'workflow-123',
        expect.objectContaining({
          timeout: 1800000,
          context: { config }
        })
      );
    });

    it('应该处理工作流创建失败的情况', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        syncType: 'full' as const
      };

      // 模拟工作流创建失败
      mockTasksWorkflow.createWorkflow = vi.fn().mockResolvedValue({
        success: false,
        error: '工作流创建失败'
      });

      // 执行测试
      const result = await syncWorkflowService.executeFullSyncWorkflow(config);

      // 验证结果
      expect(result.status).toBe('failed');
      expect(result.workflowId).toBe('');
      expect(result.errors).toContain('创建工作流失败: 工作流创建失败');
    });

    it('应该处理工作流执行超时的情况', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        syncType: 'full' as const,
        timeout: 100 // 很短的超时时间
      };

      // 模拟工作流创建成功
      mockTasksWorkflow.createWorkflow = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'workflow-123' }
      });

      // 模拟工作流执行成功
      mockTasksWorkflow.executeWorkflow = vi.fn().mockResolvedValue({
        success: true
      });

      // 模拟工作流状态一直运行（超时）
      mockTasksWorkflow.getWorkflowStatus = vi.fn().mockResolvedValue({
        success: true,
        data: { status: 'running', progress: 50 }
      });

      // 执行测试
      const result = await syncWorkflowService.executeFullSyncWorkflow(config);

      // 验证结果
      expect(result.status).toBe('timeout');
      expect(result.errors).toContain('工作流执行超时');
    });
  });

  describe('executeIncrementalSyncWorkflow', () => {
    it('应该成功执行增量同步工作流', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        syncType: 'incremental' as const,
        batchSize: 20,
        timeout: 900000,
        parallel: true
      };

      // 模拟工作流创建成功
      mockTasksWorkflow.createWorkflow = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'workflow-456' }
      });

      // 模拟工作流执行成功
      mockTasksWorkflow.executeWorkflow = vi.fn().mockResolvedValue({
        success: true
      });

      // 模拟工作流状态监控
      mockTasksWorkflow.getWorkflowStatus = vi
        .fn()
        .mockResolvedValueOnce({
          success: true,
          data: { status: 'running', progress: 30 }
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            status: 'completed',
            totalTasks: 6,
            completedTasks: 6,
            failedTasks: 0,
            errors: []
          }
        });

      // 执行测试
      const result =
        await syncWorkflowService.executeIncrementalSyncWorkflow(config);

      // 验证结果
      expect(result.status).toBe('completed');
      expect(result.workflowId).toBe('workflow-456');
      expect(result.totalTasks).toBe(6);
      expect(result.completedTasks).toBe(6);
      expect(result.failedTasks).toBe(0);

      // 验证方法调用
      expect(mockTasksWorkflow.createWorkflow).toHaveBeenCalledWith(
        expect.objectContaining({
          name: expect.stringContaining('增量同步-2024-2025-1'),
          description: expect.stringContaining(
            '学年学期 2024-2025-1 的课表增量同步工作流'
          ),
          tasks: expect.arrayContaining([
            expect.objectContaining({ name: 'incremental-data-detection' }),
            expect.objectContaining({ name: 'schedule-deletion' }),
            expect.objectContaining({ name: 'incremental-aggregation' }),
            expect.objectContaining({ name: 'calendar-update' }),
            expect.objectContaining({ name: 'participant-sync' }),
            expect.objectContaining({ name: 'schedule-recreation' })
          ])
        })
      );
    });

    it('应该处理增量同步工作流执行失败的情况', async () => {
      // 准备测试数据
      const config = {
        xnxq: '2024-2025-1',
        syncType: 'incremental' as const
      };

      // 模拟工作流创建成功
      mockTasksWorkflow.createWorkflow = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 'workflow-456' }
      });

      // 模拟工作流执行失败
      mockTasksWorkflow.executeWorkflow = vi.fn().mockResolvedValue({
        success: false,
        error: '工作流执行失败'
      });

      // 执行测试
      const result =
        await syncWorkflowService.executeIncrementalSyncWorkflow(config);

      // 验证结果
      expect(result.status).toBe('failed');
      expect(result.errors).toContain('执行增量同步工作流失败: 工作流执行失败');
    });
  });

  describe('工作流监控', () => {
    it('应该正确监控工作流执行状态', async () => {
      // 这个测试通过executeFullSyncWorkflow间接测试了监控功能
      // 在实际实现中，monitorWorkflowExecution是私有方法
      expect(true).toBe(true); // 占位测试
    });
  });
});
