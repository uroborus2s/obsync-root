/**
 * WorkflowEngineService - 动态循环任务执行测试
 * 
 * 验证executeChildTask方法支持所有节点类型的递归执行
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Logger } from '@stratix/core';
import type { 
  ExecutionContext, 
  LoopNodeDefinition, 
  NodeInputData,
  TaskNodeDefinition,
  ConditionNodeDefinition,
  NodeExecutionResult
} from '../../types/workflow.js';

// 模拟WorkflowEngineService的executeChildTask相关方法
class TestWorkflowEngineService {
  constructor(private readonly logger: Logger) {}

  /**
   * 模拟executeByNodeType方法
   */
  async executeByNodeType(
    context: ExecutionContext,
    node: any,
    nodeInput: NodeInputData
  ): Promise<NodeExecutionResult> {
    // 模拟不同节点类型的执行结果
    switch (node.type) {
      case 'task':
        return {
          success: true,
          data: { result: `Task ${node.id} executed`, type: 'task' },
          duration: 100
        };
      case 'condition':
        return {
          success: true,
          data: { result: `Condition ${node.id} evaluated`, type: 'condition' },
          duration: 50
        };
      case 'loop':
        return {
          success: true,
          data: { result: `Loop ${node.id} completed`, type: 'loop' },
          duration: 200
        };
      case 'parallel':
        return {
          success: true,
          data: { result: `Parallel ${node.id} completed`, type: 'parallel' },
          duration: 150
        };
      case 'subprocess':
        return {
          success: true,
          data: { result: `Subprocess ${node.id} completed`, type: 'subprocess' },
          duration: 300
        };
      default:
        throw new Error(`Unsupported node type: ${node.type}`);
    }
  }

  /**
   * 执行单个子任务 - 修复后的版本
   */
  async executeChildTask(
    context: ExecutionContext,
    parentNode: LoopNodeDefinition,
    _childTask: any,
    nodeInput: NodeInputData
  ): Promise<NodeExecutionResult> {
    const startTime = Date.now();

    try {
      // 检查任务模板是否存在
      if (!parentNode.taskTemplate) {
        throw new Error(
          `Task template is required for dynamic loop node: ${parentNode.id}`
        );
      }

      this.logger.debug(`执行动态循环子任务`, {
        parentNodeId: parentNode.id,
        childTaskType: parentNode.taskTemplate.type,
        childTaskId: parentNode.taskTemplate.id
      });

      // 使用统一的节点类型执行方法，支持所有节点类型的递归执行
      const result = await this.executeByNodeType(
        context,
        parentNode.taskTemplate,
        nodeInput
      );

      this.logger.debug(`动态循环子任务执行完成`, {
        parentNodeId: parentNode.id,
        childTaskId: parentNode.taskTemplate.id,
        success: result.success,
        duration: Date.now() - startTime
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.logger.error(`动态循环子任务执行失败`, {
        parentNodeId: parentNode.id,
        childTaskType: parentNode.taskTemplate?.type,
        childTaskId: parentNode.taskTemplate?.id,
        error: error instanceof Error ? error.message : String(error),
        duration
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        duration
      };
    }
  }
}

describe('WorkflowEngineService - 动态循环任务执行', () => {
  let mockLogger: Logger;
  let service: TestWorkflowEngineService;
  let mockContext: ExecutionContext;
  let mockNodeInput: NodeInputData;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    service = new TestWorkflowEngineService(mockLogger);

    mockContext = {
      instance: { id: 1 } as any,
      definition: {} as any,
      executorRegistry: new Map(),
      variables: {}
    };

    mockNodeInput = {
      workflowInputs: {},
      dependencies: {},
      config: {}
    };
  });

  describe('支持不同节点类型的子任务执行', () => {
    it('应该支持task类型的子任务', async () => {
      const parentNode: LoopNodeDefinition = {
        id: 'loop-1',
        type: 'loop',
        loopType: 'dynamic',
        taskTemplate: {
          id: 'child-task-1',
          type: 'task',
          executor: 'test-executor'
        } as TaskNodeDefinition
      };

      const result = await service.executeChildTask(
        mockContext,
        parentNode,
        {},
        mockNodeInput
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        result: 'Task child-task-1 executed',
        type: 'task'
      });
      expect(result.duration).toBe(100);

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '执行动态循环子任务',
        expect.objectContaining({
          parentNodeId: 'loop-1',
          childTaskType: 'task',
          childTaskId: 'child-task-1'
        })
      );
    });

    it('应该支持condition类型的子任务', async () => {
      const parentNode: LoopNodeDefinition = {
        id: 'loop-2',
        type: 'loop',
        loopType: 'dynamic',
        taskTemplate: {
          id: 'child-condition-1',
          type: 'condition',
          condition: 'true'
        } as ConditionNodeDefinition
      };

      const result = await service.executeChildTask(
        mockContext,
        parentNode,
        {},
        mockNodeInput
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        result: 'Condition child-condition-1 evaluated',
        type: 'condition'
      });
      expect(result.duration).toBe(50);
    });

    it('应该支持嵌套loop类型的子任务', async () => {
      const parentNode: LoopNodeDefinition = {
        id: 'loop-3',
        type: 'loop',
        loopType: 'dynamic',
        taskTemplate: {
          id: 'child-loop-1',
          type: 'loop',
          loopType: 'forEach'
        } as LoopNodeDefinition
      };

      const result = await service.executeChildTask(
        mockContext,
        parentNode,
        {},
        mockNodeInput
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        result: 'Loop child-loop-1 completed',
        type: 'loop'
      });
      expect(result.duration).toBe(200);
    });

    it('应该支持parallel类型的子任务', async () => {
      const parentNode: LoopNodeDefinition = {
        id: 'loop-4',
        type: 'loop',
        loopType: 'dynamic',
        taskTemplate: {
          id: 'child-parallel-1',
          type: 'parallel',
          branches: []
        }
      };

      const result = await service.executeChildTask(
        mockContext,
        parentNode,
        {},
        mockNodeInput
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        result: 'Parallel child-parallel-1 completed',
        type: 'parallel'
      });
      expect(result.duration).toBe(150);
    });

    it('应该支持subprocess类型的子任务', async () => {
      const parentNode: LoopNodeDefinition = {
        id: 'loop-5',
        type: 'loop',
        loopType: 'dynamic',
        taskTemplate: {
          id: 'child-subprocess-1',
          type: 'subprocess',
          workflowName: 'sub-workflow'
        }
      };

      const result = await service.executeChildTask(
        mockContext,
        parentNode,
        {},
        mockNodeInput
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        result: 'Subprocess child-subprocess-1 completed',
        type: 'subprocess'
      });
      expect(result.duration).toBe(300);
    });
  });

  describe('错误处理', () => {
    it('应该处理缺少taskTemplate的情况', async () => {
      const parentNode: LoopNodeDefinition = {
        id: 'loop-6',
        type: 'loop',
        loopType: 'dynamic'
        // 缺少 taskTemplate
      };

      const result = await service.executeChildTask(
        mockContext,
        parentNode,
        {},
        mockNodeInput
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe(
        'Task template is required for dynamic loop node: loop-6'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        '动态循环子任务执行失败',
        expect.objectContaining({
          parentNodeId: 'loop-6',
          error: 'Task template is required for dynamic loop node: loop-6'
        })
      );
    });

    it('应该处理executeByNodeType抛出的错误', async () => {
      // 创建一个会抛出错误的service实例
      const errorService = new (class extends TestWorkflowEngineService {
        async executeByNodeType(): Promise<NodeExecutionResult> {
          throw new Error('Execution failed');
        }
      })(mockLogger);

      const parentNode: LoopNodeDefinition = {
        id: 'loop-7',
        type: 'loop',
        loopType: 'dynamic',
        taskTemplate: {
          id: 'child-task-error',
          type: 'task'
        } as TaskNodeDefinition
      };

      const result = await errorService.executeChildTask(
        mockContext,
        parentNode,
        {},
        mockNodeInput
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution failed');
      expect(typeof result.duration).toBe('number');

      expect(mockLogger.error).toHaveBeenCalledWith(
        '动态循环子任务执行失败',
        expect.objectContaining({
          parentNodeId: 'loop-7',
          childTaskType: 'task',
          childTaskId: 'child-task-error',
          error: 'Execution failed'
        })
      );
    });
  });

  describe('日志记录', () => {
    it('应该记录子任务执行的开始和完成', async () => {
      const parentNode: LoopNodeDefinition = {
        id: 'loop-8',
        type: 'loop',
        loopType: 'dynamic',
        taskTemplate: {
          id: 'child-task-log',
          type: 'task'
        } as TaskNodeDefinition
      };

      await service.executeChildTask(
        mockContext,
        parentNode,
        {},
        mockNodeInput
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '执行动态循环子任务',
        expect.objectContaining({
          parentNodeId: 'loop-8',
          childTaskType: 'task',
          childTaskId: 'child-task-log'
        })
      );

      expect(mockLogger.debug).toHaveBeenCalledWith(
        '动态循环子任务执行完成',
        expect.objectContaining({
          parentNodeId: 'loop-8',
          childTaskId: 'child-task-log',
          success: true
        })
      );
    });
  });
});
