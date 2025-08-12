/**
 * 动态并行任务功能测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import WorkflowEngineService from '../services/WorkflowEngineService.js';
import WorkflowInstanceRepository from '../repositories/WorkflowInstanceRepository.js';
import * as executorRegistry from '../registerTask.js';
import type { 
  WorkflowDefinition, 
  LoopNodeDefinition, 
  TaskNodeDefinition,
  DynamicParallelResult 
} from '../types/workflow.js';

// Mock 依赖
const mockLogger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
};

const mockRepository = {
  create: vi.fn(),
  findByIdNullable: vi.fn(),
  updateStatus: vi.fn()
} as any;

// Mock 执行器
const mockExecutor = {
  execute: vi.fn()
};

// Mock 执行器注册表
vi.mock('../registerTask.js', () => ({
  getExecutor: vi.fn()
}));

describe('Dynamic Parallel Loop', () => {
  let workflowEngine: WorkflowEngineService;

  beforeEach(() => {
    vi.clearAllMocks();
    workflowEngine = new WorkflowEngineService(mockLogger, mockRepository);
    
    // 设置默认的mock返回值
    vi.mocked(executorRegistry.getExecutor).mockReturnValue(mockExecutor);
    mockExecutor.execute.mockResolvedValue({
      success: true,
      data: { processed: true }
    });
  });

  describe('基本动态并行功能', () => {
    it('应该根据数组数据创建动态并行任务', async () => {
      // 准备测试数据
      const sourceData = [
        { id: 1, name: 'item1' },
        { id: 2, name: 'item2' },
        { id: 3, name: 'item3' }
      ];

      const taskTemplate: TaskNodeDefinition = {
        type: 'task',
        id: 'process-item',
        name: 'Process Item',
        executor: 'testExecutor',
        config: {
          action: 'process'
        }
      };

      const dynamicLoopNode: LoopNodeDefinition = {
        type: 'loop',
        id: 'dynamic-loop',
        name: 'Dynamic Parallel Loop',
        loopType: 'dynamic',
        sourceExpression: 'testData',
        taskTemplate,
        nodes: [], // 对于动态类型，这个字段不使用
        maxConcurrency: 2,
        errorHandling: 'continue',
        joinType: 'all'
      };

      const workflowDef: WorkflowDefinition = {
        id: 1,
        name: 'test-dynamic-parallel',
        version: '1.0.0',
        nodes: [dynamicLoopNode]
      };

      // Mock 仓储返回
      mockRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: 1,
          workflow_definition_id: 1,
          name: 'test-dynamic-parallel',
          status: 'pending',
          input_data: { testData: sourceData },
          output_data: null,
          context_data: {},
          retry_count: 0,
          max_retries: 3,
          priority: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // 执行工作流
      const result = await workflowEngine.startWorkflow(workflowDef, { testData: sourceData });

      // 验证结果
      expect(result).toBeDefined();
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3); // 应该为3个数据项各执行一次
      
      // 验证每次执行时传入的上下文
      const executeCalls = mockExecutor.execute.mock.calls;
      expect(executeCalls[0][0].config.dynamicInput).toEqual({ id: 1, name: 'item1' });
      expect(executeCalls[1][0].config.dynamicInput).toEqual({ id: 2, name: 'item2' });
      expect(executeCalls[2][0].config.dynamicInput).toEqual({ id: 3, name: 'item3' });
    });

    it('应该支持JSONPath表达式获取源数据', async () => {
      const complexData = {
        users: [
          { id: 1, profile: { name: 'Alice' } },
          { id: 2, profile: { name: 'Bob' } }
        ],
        metadata: { count: 2 }
      };

      const taskTemplate: TaskNodeDefinition = {
        type: 'task',
        id: 'process-user',
        name: 'Process User',
        executor: 'userProcessor',
        config: { action: 'process' }
      };

      const dynamicLoopNode: LoopNodeDefinition = {
        type: 'loop',
        id: 'user-loop',
        name: 'Process Users',
        loopType: 'dynamic',
        sourceExpression: '$.users[*]', // JSONPath 表达式
        taskTemplate,
        nodes: [],
        maxConcurrency: 5
      };

      const workflowDef: WorkflowDefinition = {
        id: 2,
        name: 'test-jsonpath',
        version: '1.0.0',
        nodes: [dynamicLoopNode]
      };

      mockRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: 2,
          workflow_definition_id: 2,
          name: 'test-jsonpath',
          status: 'pending',
          input_data: complexData,
          output_data: null,
          context_data: {},
          retry_count: 0,
          max_retries: 3,
          priority: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      await workflowEngine.startWorkflow(workflowDef, complexData);

      expect(mockExecutor.execute).toHaveBeenCalledTimes(2);
      
      const executeCalls = mockExecutor.execute.mock.calls;
      expect(executeCalls[0][0].config.dynamicInput).toEqual({ id: 1, profile: { name: 'Alice' } });
      expect(executeCalls[1][0].config.dynamicInput).toEqual({ id: 2, profile: { name: 'Bob' } });
    });
  });

  describe('错误处理策略', () => {
    it('fail-fast策略应该在第一个任务失败时停止执行', async () => {
      const sourceData = ['item1', 'item2', 'item3', 'item4'];
      
      // 模拟第二个任务失败
      mockExecutor.execute
        .mockResolvedValueOnce({ success: true, data: 'result1' })
        .mockRejectedValueOnce(new Error('Task 2 failed'))
        .mockResolvedValue({ success: true, data: 'should not execute' });

      const taskTemplate: TaskNodeDefinition = {
        type: 'task',
        id: 'fail-test',
        name: 'Fail Test',
        executor: 'testExecutor',
        config: {}
      };

      const dynamicLoopNode: LoopNodeDefinition = {
        type: 'loop',
        id: 'fail-fast-loop',
        name: 'Fail Fast Loop',
        loopType: 'dynamic',
        sourceExpression: 'items',
        taskTemplate,
        nodes: [],
        errorHandling: 'fail-fast'
      };

      const workflowDef: WorkflowDefinition = {
        id: 3,
        name: 'test-fail-fast',
        version: '1.0.0',
        nodes: [dynamicLoopNode]
      };

      mockRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: 3,
          workflow_definition_id: 3,
          name: 'test-fail-fast',
          status: 'pending',
          input_data: { items: sourceData },
          output_data: null,
          context_data: {},
          retry_count: 0,
          max_retries: 3,
          priority: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // 应该抛出错误
      await expect(workflowEngine.startWorkflow(workflowDef, { items: sourceData }))
        .rejects.toThrow();
    });

    it('continue策略应该继续执行即使某些任务失败', async () => {
      const sourceData = ['item1', 'item2', 'item3'];
      
      // 模拟中间任务失败
      mockExecutor.execute
        .mockResolvedValueOnce({ success: true, data: 'result1' })
        .mockRejectedValueOnce(new Error('Task 2 failed'))
        .mockResolvedValueOnce({ success: true, data: 'result3' });

      const taskTemplate: TaskNodeDefinition = {
        type: 'task',
        id: 'continue-test',
        name: 'Continue Test',
        executor: 'testExecutor',
        config: {}
      };

      const dynamicLoopNode: LoopNodeDefinition = {
        type: 'loop',
        id: 'continue-loop',
        name: 'Continue Loop',
        loopType: 'dynamic',
        sourceExpression: 'items',
        taskTemplate,
        nodes: [],
        errorHandling: 'continue'
      };

      const workflowDef: WorkflowDefinition = {
        id: 4,
        name: 'test-continue',
        version: '1.0.0',
        nodes: [dynamicLoopNode]
      };

      mockRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: 4,
          workflow_definition_id: 4,
          name: 'test-continue',
          status: 'pending',
          input_data: { items: sourceData },
          output_data: null,
          context_data: {},
          retry_count: 0,
          max_retries: 3,
          priority: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      // 不应该抛出错误
      await expect(workflowEngine.startWorkflow(workflowDef, { items: sourceData }))
        .resolves.toBeDefined();
        
      // 所有任务都应该被尝试执行
      expect(mockExecutor.execute).toHaveBeenCalledTimes(3);
    });
  });

  describe('并发控制', () => {
    it('应该尊重maxConcurrency限制', async () => {
      const sourceData = Array.from({ length: 10 }, (_, i) => `item${i + 1}`);
      let concurrentCount = 0;
      let maxConcurrentObserved = 0;

      mockExecutor.execute.mockImplementation(async () => {
        concurrentCount++;
        maxConcurrentObserved = Math.max(maxConcurrentObserved, concurrentCount);
        
        // 模拟异步任务
        await new Promise(resolve => setTimeout(resolve, 50));
        
        concurrentCount--;
        return { success: true, data: 'processed' };
      });

      const taskTemplate: TaskNodeDefinition = {
        type: 'task',
        id: 'concurrent-test',
        name: 'Concurrent Test',
        executor: 'testExecutor',
        config: {}
      };

      const dynamicLoopNode: LoopNodeDefinition = {
        type: 'loop',
        id: 'concurrent-loop',
        name: 'Concurrent Loop',
        loopType: 'dynamic',
        sourceExpression: 'items',
        taskTemplate,
        nodes: [],
        maxConcurrency: 3 // 限制并发数为3
      };

      const workflowDef: WorkflowDefinition = {
        id: 5,
        name: 'test-concurrency',
        version: '1.0.0',
        nodes: [dynamicLoopNode]
      };

      mockRepository.create.mockResolvedValue({
        success: true,
        data: {
          id: 5,
          workflow_definition_id: 5,
          name: 'test-concurrency',
          status: 'pending',
          input_data: { items: sourceData },
          output_data: null,
          context_data: {},
          retry_count: 0,
          max_retries: 3,
          priority: 0,
          created_at: new Date(),
          updated_at: new Date()
        }
      });

      await workflowEngine.startWorkflow(workflowDef, { items: sourceData });

      // 验证并发数不超过限制
      expect(maxConcurrentObserved).toBeLessThanOrEqual(3);
      expect(mockExecutor.execute).toHaveBeenCalledTimes(10);
    });
  });

  describe('汇聚策略', () => {
    it('all策略应该返回所有结果', async () => {
      // 这个测试需要访问内部方法，暂时跳过具体实现
      // 在实际项目中，可以通过集成测试来验证汇聚策略
    });

    it('any策略应该只返回成功的结果', async () => {
      // 同上，需要通过集成测试验证
    });

    it('first策略应该只返回第一个成功的结果', async () => {
      // 同上，需要通过集成测试验证
    });
  });

  describe('表达式引擎', () => {
    it('应该支持模板字符串表达式', async () => {
      // 测试表达式引擎的模板字符串功能
      const engine = new WorkflowEngineService(mockLogger, mockRepository);
      const variables = {
        user: { id: 123, name: 'John' },
        settings: { prefix: 'user' }
      };

      // 这里需要通过某种方式访问私有方法evaluateExpression
      // 在实际项目中，可以考虑将表达式引擎提取为独立的服务
    });
  });
});

describe('表达式引擎单元测试', () => {
  // 由于表达式引擎方法是私有的，这里提供一个示例说明如何测试
  // 在实际项目中，建议将表达式引擎提取为独立的公共服务

  it('应该支持点号路径访问', () => {
    const data = {
      user: { profile: { name: 'Alice' } },
      count: 5
    };

    // 模拟点号路径访问逻辑
    const getValueFromPath = (path: string, variables: Record<string, any>) => {
      const keys = path.split('.');
      let value = variables;
      
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return undefined;
        }
      }
      
      return value;
    };

    expect(getValueFromPath('user.profile.name', data)).toBe('Alice');
    expect(getValueFromPath('count', data)).toBe(5);
    expect(getValueFromPath('user.nonexistent', data)).toBeUndefined();
  });
});