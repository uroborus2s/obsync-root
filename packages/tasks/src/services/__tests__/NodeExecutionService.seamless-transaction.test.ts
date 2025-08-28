/**
 * NodeExecutionService 无感事务支持测试
 * 验证重构后的事务使用方式
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { DatabaseAPI } from '@stratix/database';
import NodeExecutionService from '../NodeExecutionService.js';
import type { UnifiedNodeInstance } from '../../types/unified-node.js';

describe('NodeExecutionService - 无感事务支持', () => {
  let service: NodeExecutionService;
  let mockRepository: any;
  let mockLogger: any;
  let mockDatabaseApi: DatabaseAPI;

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
      transaction: vi.fn(),
      executeQuery: vi.fn(),
      executeBatch: vi.fn(),
      executeParallel: vi.fn(),
      getConnection: vi.fn(),
      getReadConnection: vi.fn(),
      getWriteConnection: vi.fn(),
      healthCheck: vi.fn()
    };

    service = new NodeExecutionService(mockRepository, mockLogger, mockDatabaseApi);
  });

  describe('executeChildNodeCreationTransaction - 重构后', () => {
    it('应该使用 DatabaseAPI.transaction 而不是 Repository.withTransaction', async () => {
      // 准备测试数据
      const mockNodeInstance: UnifiedNodeInstance = {
        id: 1,
        workflowInstanceId: 100,
        nodeId: 'loop_node_1',
        nodeName: 'Test Loop Node',
        nodeType: 'loop',
        executor: 'dataFetcher',
        status: 'running',
        inputData: { items: [1, 2, 3] },
        outputData: null,
        parentNodeId: null,
        childIndex: null,
        loopProgress: { status: 'creating', totalCount: 0, completedCount: 0, failedCount: 0 },
        loopCompletedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockLoopData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' }
      ];

      const mockChildNodeDefinition = {
        nodeType: 'simple',
        executor: 'testExecutor',
        nodeName: 'Child Node'
      };

      // 模拟 Repository 方法返回成功
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

      // 🎯 关键：模拟 DatabaseAPI.transaction 方法
      mockDatabaseApi.transaction.mockImplementation(async (operation) => {
        // 模拟事务执行
        const result = await operation();
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
      expect(result.data.data.totalCount).toBe(3);

      // 🎯 验证使用了 DatabaseAPI.transaction 而不是 Repository.withTransaction
      expect(mockDatabaseApi.transaction).toHaveBeenCalledTimes(1);
      expect(mockDatabaseApi.transaction).toHaveBeenCalledWith(expect.any(Function));

      // 🎯 验证 Repository 方法被直接调用（无感事务）
      expect(mockRepository.createMany).toHaveBeenCalledTimes(1);
      expect(mockRepository.updateLoopProgress).toHaveBeenCalledTimes(1);

      // 验证调用参数
      expect(mockRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            workflow_instance_id: 100,
            node_id: 'loop_node_1_child_0',
            node_type: 'simple',
            executor: 'testExecutor',
            status: 'pending'
          })
        ])
      );

      expect(mockRepository.updateLoopProgress).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          status: 'executing',
          totalCount: 3,
          completedCount: 0,
          failedCount: 0
        }),
        0
      );
    });

    it('应该在事务失败时正确处理错误', async () => {
      const mockNodeInstance: UnifiedNodeInstance = {
        id: 1,
        workflowInstanceId: 100,
        nodeId: 'loop_node_1',
        nodeName: 'Test Loop Node',
        nodeType: 'loop',
        executor: 'dataFetcher',
        status: 'running',
        inputData: { items: [1, 2, 3] },
        outputData: null,
        parentNodeId: null,
        childIndex: null,
        loopProgress: { status: 'creating', totalCount: 0, completedCount: 0, failedCount: 0 },
        loopCompletedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockLoopData = [{ id: 1, name: 'Item 1' }];
      const mockChildNodeDefinition = { nodeType: 'simple', executor: 'testExecutor' };

      // 模拟 createMany 失败
      mockRepository.createMany.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      // 模拟事务执行
      mockDatabaseApi.transaction.mockImplementation(async (operation) => {
        try {
          const result = await operation();
          return {
            success: true,
            data: result
          };
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

      // 验证错误处理
      expect(result.success).toBe(false);
      expect(result.error).toContain('Database transaction failed');

      // 验证事务被调用
      expect(mockDatabaseApi.transaction).toHaveBeenCalledTimes(1);
    });

    it('应该正确传递子节点数据', async () => {
      const mockNodeInstance: UnifiedNodeInstance = {
        id: 1,
        workflowInstanceId: 100,
        nodeId: 'loop_node_1',
        nodeName: 'Test Loop Node',
        nodeType: 'loop',
        executor: 'dataFetcher',
        status: 'running',
        inputData: { items: [1, 2] },
        outputData: null,
        parentNodeId: null,
        childIndex: null,
        loopProgress: { status: 'creating', totalCount: 0, completedCount: 0, failedCount: 0 },
        loopCompletedCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockLoopData = [
        { itemId: 1, itemName: 'First Item', value: 100 },
        { itemId: 2, itemName: 'Second Item', value: 200 }
      ];

      const mockChildNodeDefinition = {
        nodeType: 'simple',
        executor: 'processItem',
        nodeName: 'Process Item',
        inputData: { baseConfig: 'test' }
      };

      mockRepository.createMany.mockResolvedValue({
        success: true,
        data: [{ id: 1 }, { id: 2 }]
      });

      mockRepository.updateLoopProgress.mockResolvedValue({
        success: true
      });

      mockDatabaseApi.transaction.mockImplementation(async (operation) => {
        const result = await operation();
        return { success: true, data: result };
      });

      // 执行测试
      await (service as any).executeChildNodeCreationTransaction(
        mockNodeInstance,
        mockLoopData,
        2,
        mockChildNodeDefinition
      );

      // 验证子节点数据结构
      const createManyCall = mockRepository.createMany.mock.calls[0][0];
      
      expect(createManyCall).toHaveLength(2);
      
      // 验证第一个子节点
      expect(createManyCall[0]).toMatchObject({
        workflow_instance_id: 100,
        node_id: 'loop_node_1_child_0',
        node_name: 'Process Item',
        node_type: 'simple',
        executor: 'processItem',
        status: 'pending',
        input_data: {
          baseConfig: 'test',
          itemId: 1,
          itemName: 'First Item',
          value: 100,
          iterationIndex: 0,
          iterationData: { itemId: 1, itemName: 'First Item', value: 100 },
          parentNodeId: 'loop_node_1'
        }
      });

      // 验证第二个子节点
      expect(createManyCall[1]).toMatchObject({
        workflow_instance_id: 100,
        node_id: 'loop_node_1_child_1',
        node_name: 'Process Item',
        node_type: 'simple',
        executor: 'processItem',
        status: 'pending',
        input_data: {
          baseConfig: 'test',
          itemId: 2,
          itemName: 'Second Item',
          value: 200,
          iterationIndex: 1,
          iterationData: { itemId: 2, itemName: 'Second Item', value: 200 },
          parentNodeId: 'loop_node_1'
        }
      });
    });
  });
});
