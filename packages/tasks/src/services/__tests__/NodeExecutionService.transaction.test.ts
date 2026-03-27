// @stratix/tasks NodeExecutionService 数据库事务测试
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NodeExecutionService from '../NodeExecutionService.js';

describe('NodeExecutionService - Database Transaction', () => {
  let service: NodeExecutionService;
  let mockRepository: any;
  let mockLogger: any;
  let mockDatabaseApi: any;

  beforeEach(() => {
    mockRepository = {
      createMany: vi.fn(),
      updateLoopProgress: vi.fn(),
      findPendingChildNodes: vi.fn()
    };

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    mockDatabaseApi = {
      transaction: vi.fn()
    };

    service = new NodeExecutionService(
      mockRepository,
      mockLogger,
      mockDatabaseApi
    );
  });

  describe('executeChildNodeCreationTransaction - 真正的数据库事务', () => {
    it('应该在单个数据库事务中完成子节点创建和父节点状态更新', async () => {
      // 准备测试数据
      const mockNodeInstance = {
        id: 1,
        nodeId: 'loop_node_1',
        workflowInstanceId: 'workflow_1',
        nodeName: '循环节点测试',
        executor: 'FetchOldCalendarMappingsProcessor'
      };

      const mockLoopData = [
        { calendarId: 'cal_1', name: '日历1' },
        { calendarId: 'cal_2', name: '日历2' },
        { calendarId: 'cal_3', name: '日历3' }
      ];

      const mockChildNodeDefinition = {
        nodeType: 'simple',
        executor: 'DeleteCalendarProcessor',
        nodeName: '删除日历'
      };

      // 模拟事务执行成功
      mockRepository.createMany.mockResolvedValue({
        success: true,
        data: mockLoopData.map((_, index) => ({
          id: index + 1,
          node_id: `loop_node_1_child_${index}`,
          status: 'pending'
        }))
      });

      mockRepository.updateLoopProgress.mockResolvedValue({
        success: true
      });

      mockDatabaseApi.transaction.mockImplementation(async (fn) => {
        const result = await fn();
        return {
          success: true,
          data: result
        };
      });

      // 执行测试
      const result = await (service as any).executeChildNodeCreationTransaction(
        mockNodeInstance,
        mockLoopData,
        3,
        mockChildNodeDefinition
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data?.data?.totalCount).toBe(3);
      expect(result.data?.data?.childNodes).toHaveLength(3);
      expect(result.data?.data?.progress?.status).toBe('executing');

      // 验证事务调用
      expect(mockRepository.withTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionalRepo.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            node_id: 'loop_node_1_child_0',
            executor: 'DeleteCalendarProcessor',
            status: 'pending'
          })
        ])
      );
      expect(mockTransactionalRepo.updateLoopProgress).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'executing',
          totalCount: 3,
          completedCount: 0,
          failedCount: 0
        }),
        0
      );

      // 验证日志记录
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Starting database transaction for child node creation',
        expect.objectContaining({
          nodeId: 'loop_node_1',
          totalCount: 3
        })
      );
    });

    it('应该在子节点创建失败时自动回滚事务', async () => {
      // 准备测试数据
      const mockNodeInstance = {
        id: 1,
        nodeId: 'loop_node_1',
        workflowInstanceId: 'workflow_1'
      };

      const mockLoopData = [{ calendarId: 'cal_1' }];
      const mockChildNodeDefinition = { nodeType: 'simple' };

      // 模拟子节点创建失败
      const mockTransactionalRepo = {
        createMany: vi.fn().mockResolvedValue({
          success: false,
          error: 'Database constraint violation'
        }),
        updateLoopProgress: vi.fn()
      };

      mockRepository.withTransaction.mockImplementation(async (fn) => {
        try {
          await fn(mockTransactionalRepo);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });

      // 执行测试
      const result = await (service as any).executeChildNodeCreationTransaction(
        mockNodeInstance,
        mockLoopData,
        1,
        mockChildNodeDefinition
      );

      // 验证结果
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database transaction failed');

      // 验证事务调用
      expect(mockRepository.withTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionalRepo.createMany).toHaveBeenCalledTimes(1);
      expect(mockTransactionalRepo.updateLoopProgress).not.toHaveBeenCalled(); // 不应该执行第二步
    });

    it('应该在父节点状态更新失败时自动回滚事务', async () => {
      // 准备测试数据
      const mockNodeInstance = {
        id: 1,
        nodeId: 'loop_node_1',
        workflowInstanceId: 'workflow_1'
      };

      const mockLoopData = [{ calendarId: 'cal_1' }];
      const mockChildNodeDefinition = { nodeType: 'simple' };

      // 模拟子节点创建成功但父节点更新失败
      const mockTransactionalRepo = {
        createMany: vi.fn().mockResolvedValue({
          success: true,
          data: [{ id: 1, node_id: 'child_1' }]
        }),
        updateLoopProgress: vi.fn().mockResolvedValue({
          success: false,
          error: 'Failed to update parent node'
        })
      };

      mockRepository.withTransaction.mockImplementation(async (fn) => {
        try {
          await fn(mockTransactionalRepo);
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      });

      // 执行测试
      const result = await (service as any).executeChildNodeCreationTransaction(
        mockNodeInstance,
        mockLoopData,
        1,
        mockChildNodeDefinition
      );

      // 验证结果
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database transaction failed');

      // 验证事务调用
      expect(mockRepository.withTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionalRepo.createMany).toHaveBeenCalledTimes(1);
      expect(mockTransactionalRepo.updateLoopProgress).toHaveBeenCalledTimes(1);
    });

    it('应该正确处理空的循环数据', async () => {
      // 准备测试数据
      const mockNodeInstance = {
        id: 1,
        nodeId: 'loop_node_1',
        workflowInstanceId: 'workflow_1'
      };

      const mockLoopData: any[] = []; // 空数组
      const mockChildNodeDefinition = { nodeType: 'simple' };

      // 模拟事务执行成功
      const mockTransactionalRepo = {
        createMany: vi.fn().mockResolvedValue({
          success: true,
          data: []
        }),
        updateLoopProgress: vi.fn().mockResolvedValue({
          success: true
        })
      };

      mockRepository.withTransaction.mockImplementation(async (fn) => {
        const result = await fn(mockTransactionalRepo);
        return {
          success: true,
          data: result
        };
      });

      // 执行测试
      const result = await (service as any).executeChildNodeCreationTransaction(
        mockNodeInstance,
        mockLoopData,
        0,
        mockChildNodeDefinition
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data?.data?.totalCount).toBe(0);
      expect(result.data?.data?.childNodes).toHaveLength(0);

      // 验证事务仍然被调用（用于更新父节点状态）
      expect(mockRepository.withTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransactionalRepo.createMany).toHaveBeenCalledWith([]);
      expect(mockTransactionalRepo.updateLoopProgress).toHaveBeenCalledTimes(1);
    });
  });

  describe('ACID特性验证', () => {
    it('应该确保原子性：要么全部成功，要么全部失败', async () => {
      // 这个测试验证了真正的数据库事务的原子性特征
      // 在实际的数据库事务中，如果任何一步失败，整个事务都会回滚

      const mockNodeInstance = {
        id: 1,
        nodeId: 'test',
        workflowInstanceId: 'wf1'
      };
      const mockLoopData = [{ id: 1 }, { id: 2 }];
      const mockChildNodeDefinition = { nodeType: 'simple' };

      // 模拟数据库事务的原子性行为
      mockRepository.withTransaction.mockImplementation(async (fn) => {
        const mockRepo = {
          createMany: vi
            .fn()
            .mockResolvedValue({ success: true, data: [{ id: 1 }, { id: 2 }] }),
          updateLoopProgress: vi
            .fn()
            .mockResolvedValue({ success: false, error: 'Update failed' })
        };

        try {
          await fn(mockRepo);
          // 如果到达这里，说明没有抛出异常，事务应该成功
          return { success: true, data: {} };
        } catch (error) {
          // 模拟数据库自动回滚
          return { success: false, error: 'Transaction rolled back' };
        }
      });

      const result = await (service as any).executeChildNodeCreationTransaction(
        mockNodeInstance,
        mockLoopData,
        2,
        mockChildNodeDefinition
      );

      // 验证原子性：整个操作失败
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database transaction failed');
    });
  });
});
