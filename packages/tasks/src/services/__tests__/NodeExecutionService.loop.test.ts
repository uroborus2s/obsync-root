// @stratix/tasks NodeExecutionService 循环节点测试
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NodeExecutionService from '../NodeExecutionService.js';
import type { ExecutionContext } from '../types/execution.js';

describe('NodeExecutionService - Loop Node Execution', () => {
  let service: NodeExecutionService;
  let mockRepository: any;
  let mockLogger: any;
  let mockDatabaseApi: any;

  beforeEach(() => {
    mockRepository = {
      findPendingChildNodes: vi.fn(),
      createMany: vi.fn(),
      updateLoopProgress: vi.fn(),
      updateNodeStatus: vi.fn()
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

  describe('executeLoopNode - 两阶段执行', () => {
    it('应该在单次调用中完成创建和执行两个阶段', async () => {
      // 准备测试数据
      const mockNodeInstance = {
        id: 1,
        nodeId: 'loop_node_1',
        workflowInstanceId: 'workflow_1',
        nodeName: '循环节点测试',
        executor: 'FetchOldCalendarMappingsProcessor',
        loopProgress: {
          status: 'creating',
          totalCount: 0,
          completedCount: 0,
          failedCount: 0
        }
      };

      const mockNodeDefinition = {
        nodeType: 'loop',
        node: {
          nodeType: 'simple',
          executor: 'DeleteCalendarProcessor',
          nodeName: '删除日历',
          inputData: { action: 'delete' }
        }
      };

      const mockExecutionContext: ExecutionContext = {
        nodeInstance: mockNodeInstance,
        workflowInstance: {} as any,
        nodeDefinition: mockNodeDefinition
      };

      // 模拟数据获取器返回的数据
      const mockLoopData = [
        { calendarId: 'cal_1', name: '日历1' },
        { calendarId: 'cal_2', name: '日历2' },
        { calendarId: 'cal_3', name: '日历3' }
      ];

      // 模拟执行器
      const mockExecutor = {
        execute: vi.fn().mockResolvedValue({
          success: true,
          data: {
            items: mockLoopData
          }
        })
      };

      // 模拟getExecutor函数
      vi.doMock('../utils/executorRegistry.js', () => ({
        getExecutor: vi.fn().mockReturnValue(mockExecutor)
      }));

      // 模拟Repository方法
      mockRepository.createMany.mockResolvedValue({
        success: true,
        data: mockLoopData.map((_, index) => ({ id: index + 1 }))
      });

      mockRepository.updateLoopProgress.mockResolvedValue({
        success: true
      });

      // 简化后的逻辑不需要重新获取节点实例
      // 直接模拟执行阶段的行为

      // 模拟没有待执行的子节点（所有子节点都已完成）
      mockRepository.findPendingChildNodes.mockResolvedValue({
        success: true,
        data: []
      });

      const mockMapToBusinessModel = vi
        .spyOn(service as any, 'mapToBusinessModel')
        .mockImplementation((node) => node);

      const mockUpdateNodeStatus = vi
        .spyOn(service as any, 'updateNodeStatus')
        .mockResolvedValue({ success: true });

      // 执行测试
      const result = await service.executeLoopNode(mockExecutionContext);

      // 验证结果 - 应该完成整个循环（创建 + 执行）
      expect(result.success).toBe(true);
      expect(result.data?.data?.status).toBe('completed'); // 最终状态应该是完成
      expect(result.data?.data?.progress?.totalCount).toBe(3);

      // 验证Repository调用
      expect(mockRepository.createMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            node_id: 'loop_node_1_child_0',
            executor: 'DeleteCalendarProcessor',
            input_data: expect.objectContaining({
              calendarId: 'cal_1',
              iterationIndex: 0
            })
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

    it('应该正确处理子节点执行阶段', async () => {
      // 准备测试数据 - 执行阶段
      const mockNodeInstance = {
        id: 1,
        nodeId: 'loop_node_1',
        workflowInstanceId: 'workflow_1',
        nodeName: '循环节点测试',
        executor: 'FetchOldCalendarMappingsProcessor',
        executorConfig: { parallel: false }, // 串行执行
        loopProgress: {
          status: 'executing',
          totalCount: 3,
          completedCount: 0,
          failedCount: 0
        }
      };

      const mockNodeDefinition = {
        nodeType: 'loop',
        node: {
          nodeType: 'simple',
          executor: 'DeleteCalendarProcessor',
          nodeName: '删除日历'
        }
      };

      const mockExecutionContext: ExecutionContext = {
        nodeInstance: mockNodeInstance,
        workflowInstance: {} as any,
        nodeDefinition: mockNodeDefinition
      };

      // 模拟待执行的子节点
      const mockPendingChildren = [
        {
          id: 1,
          node_id: 'loop_node_1_child_0',
          status: 'pending',
          input_data: { calendarId: 'cal_1' }
        },
        {
          id: 2,
          node_id: 'loop_node_1_child_1',
          status: 'pending',
          input_data: { calendarId: 'cal_2' }
        }
      ];

      // 模拟Repository方法
      mockRepository.findPendingChildNodes.mockResolvedValue({
        success: true,
        data: mockPendingChildren
      });

      mockRepository.updateLoopProgress.mockResolvedValue({
        success: true
      });

      // 模拟子节点执行成功
      const mockExecuteNode = vi
        .spyOn(service as any, 'executeNode')
        .mockResolvedValue({ success: true });

      const mockMapToBusinessModel = vi
        .spyOn(service as any, 'mapToBusinessModel')
        .mockImplementation((child) => child);

      // 执行测试
      const result = await service.executeLoopNode(mockExecutionContext);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data?.data?.status).toBe('executing');
      expect(result.data?.data?.executionMode).toBe('serial');

      // 验证Repository调用
      expect(mockRepository.findPendingChildNodes).toHaveBeenCalledWith(1);
      expect(mockExecuteNode).toHaveBeenCalledTimes(2); // 两个子节点
      expect(mockRepository.updateLoopProgress).toHaveBeenCalled();
    });

    it('应该正确处理已完成状态', async () => {
      // 准备测试数据 - 已完成状态
      const mockNodeInstance = {
        id: 1,
        nodeId: 'loop_node_1',
        workflowInstanceId: 'workflow_1',
        loopProgress: {
          status: 'completed',
          totalCount: 3,
          completedCount: 3,
          failedCount: 0
        }
      };

      const mockExecutionContext: ExecutionContext = {
        nodeInstance: mockNodeInstance,
        workflowInstance: {} as any,
        nodeDefinition: {} as any
      };

      // 执行测试
      const result = await service.executeLoopNode(mockExecutionContext);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data?.data?.status).toBe('completed');

      // 验证日志
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Loop node already completed',
        expect.objectContaining({
          nodeId: 'loop_node_1'
        })
      );
    });

    it('应该正确处理断点续传', async () => {
      // 测试系统重启后从正确步骤继续执行
      const mockNodeInstance = {
        id: 1,
        nodeId: 'loop_node_1',
        workflowInstanceId: 'workflow_1',
        loopProgress: {
          status: 'executing', // 系统重启前已创建子节点，现在继续执行
          totalCount: 5,
          completedCount: 2,
          failedCount: 1
        }
      };

      const mockExecutionContext: ExecutionContext = {
        nodeInstance: mockNodeInstance,
        workflowInstance: {} as any,
        nodeDefinition: {
          node: {
            nodeType: 'simple',
            executor: 'TestExecutor'
          }
        }
      };

      // 模拟还有待执行的子节点
      mockRepository.findPendingChildNodes.mockResolvedValue({
        success: true,
        data: [{ id: 4, node_id: 'loop_node_1_child_3', status: 'pending' }]
      });

      mockRepository.updateLoopProgress.mockResolvedValue({ success: true });

      const mockExecuteNode = vi
        .spyOn(service as any, 'executeNode')
        .mockResolvedValue({ success: true });
      const mockMapToBusinessModel = vi
        .spyOn(service as any, 'mapToBusinessModel')
        .mockImplementation((child) => child);

      // 执行测试
      const result = await service.executeLoopNode(mockExecutionContext);

      // 验证断点续传正确工作
      expect(result.success).toBe(true);
      expect(mockRepository.findPendingChildNodes).toHaveBeenCalledWith(1);
      expect(mockExecuteNode).toHaveBeenCalledTimes(1); // 只执行剩余的子节点

      // 验证日志记录了断点续传信息
      expect(mockLogger.debug).toHaveBeenCalledWith(
        'Loop node progress status',
        expect.objectContaining({
          progressStatus: 'executing',
          totalCount: 5,
          completedCount: 2,
          failedCount: 1
        })
      );
    });
  });
});
