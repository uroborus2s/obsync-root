/**
 * 工作流引擎测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowEngineService } from '../services/workflow/WorkflowEngine.js';
import { ExecutorRegistryService } from '../services/executor/ExecutorRegistryService.js';
import type { WorkflowDefinition, TaskExecutor } from '../types/index.js';

// 模拟执行器
class MockExecutor implements TaskExecutor {
  readonly name = 'mock-executor';
  readonly description = 'Mock executor for testing';
  
  constructor(private shouldSucceed = true, private delay = 0) {}

  async execute(context: any) {
    if (this.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, this.delay));
    }

    if (this.shouldSucceed) {
      return {
        success: true,
        data: {
          result: 'mock-result',
          timestamp: new Date().toISOString()
        }
      };
    } else {
      return {
        success: false,
        error: 'Mock execution failed'
      };
    }
  }
}

describe('WorkflowEngineService', () => {
  let engine: WorkflowEngineService;
  let registry: ExecutorRegistryService;

  beforeEach(() => {
    registry = new ExecutorRegistryService();
    engine = new WorkflowEngineService(registry);
  });

  describe('基本功能', () => {
    it('应该创建工作流引擎实例', () => {
      expect(engine).toBeInstanceOf(WorkflowEngineService);
    });

    it('应该启动简单的工作流', async () => {
      // 注册模拟执行器
      const mockExecutor = new MockExecutor(true);
      registry.registerExecutor('mock', mockExecutor);

      // 创建简单的工作流定义
      const definition: WorkflowDefinition = {
        name: 'simple-workflow',
        version: '1.0.0',
        description: 'Simple test workflow',
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'Test Task',
            executor: 'mock',
            config: {
              message: 'Hello World'
            }
          }
        ]
      };

      const inputs = { testInput: 'test-value' };
      const instance = await engine.startWorkflow(definition, inputs);

      expect(instance).toBeDefined();
      expect(instance.name).toBe('simple-workflow');
      expect(instance.inputData).toEqual(inputs);
      expect(typeof instance.id).toBe('number');
    });

    it('应该处理工作流执行失败', async () => {
      // 注册会失败的模拟执行器
      const failingExecutor = new MockExecutor(false);
      registry.registerExecutor('failing', failingExecutor);

      const definition: WorkflowDefinition = {
        name: 'failing-workflow',
        version: '1.0.0',
        description: 'Workflow that should fail',
        nodes: [
          {
            type: 'task',
            id: 'failing-task',
            name: 'Failing Task',
            executor: 'failing',
            config: {}
          }
        ]
      };

      const instance = await engine.startWorkflow(definition, {});

      // 等待执行完成
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await engine.getWorkflowStatus(instance.id.toString());
      expect(status).toBe('failed');
    });

    it('应该验证工作流定义', async () => {
      const invalidDefinition: WorkflowDefinition = {
        name: '',
        version: '1.0.0',
        description: 'Invalid workflow',
        nodes: []
      };

      await expect(engine.startWorkflow(invalidDefinition, {}))
        .rejects.toThrow('Workflow name is required');
    });

    it('应该验证必需的输入参数', async () => {
      const mockExecutor = new MockExecutor(true);
      registry.registerExecutor('mock', mockExecutor);

      const definition: WorkflowDefinition = {
        name: 'input-validation-workflow',
        version: '1.0.0',
        description: 'Workflow with required inputs',
        inputs: [
          {
            name: 'requiredParam',
            type: 'string',
            required: true,
            description: 'Required parameter'
          }
        ],
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'Test Task',
            executor: 'mock',
            config: {}
          }
        ]
      };

      await expect(engine.startWorkflow(definition, {}))
        .rejects.toThrow('Required input missing: requiredParam');
    });
  });

  describe('工作流状态管理', () => {
    it('应该暂停和恢复工作流', async () => {
      // 注册有延迟的执行器
      const delayedExecutor = new MockExecutor(true, 500);
      registry.registerExecutor('delayed', delayedExecutor);

      const definition: WorkflowDefinition = {
        name: 'pausable-workflow',
        version: '1.0.0',
        description: 'Workflow that can be paused',
        nodes: [
          {
            type: 'task',
            id: 'delayed-task',
            name: 'Delayed Task',
            executor: 'delayed',
            config: {}
          }
        ]
      };

      const instance = await engine.startWorkflow(definition, {});
      const instanceId = instance.id.toString();

      // 立即暂停
      await engine.pauseWorkflow(instanceId);
      let status = await engine.getWorkflowStatus(instanceId);
      expect(status).toBe('paused');

      // 恢复执行
      await engine.resumeWorkflow(instanceId);
      status = await engine.getWorkflowStatus(instanceId);
      expect(status).toBe('running');
    });

    it('应该取消工作流', async () => {
      const mockExecutor = new MockExecutor(true, 500);
      registry.registerExecutor('mock', mockExecutor);

      const definition: WorkflowDefinition = {
        name: 'cancellable-workflow',
        version: '1.0.0',
        description: 'Workflow that can be cancelled',
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'Test Task',
            executor: 'mock',
            config: {}
          }
        ]
      };

      const instance = await engine.startWorkflow(definition, {});
      const instanceId = instance.id.toString();

      // 取消工作流
      await engine.cancelWorkflow(instanceId);
      const status = await engine.getWorkflowStatus(instanceId);
      expect(status).toBe('cancelled');
    });

    it('应该处理不存在的工作流实例', async () => {
      await expect(engine.getWorkflowStatus('non-existent'))
        .rejects.toThrow('Workflow instance not found: non-existent');

      await expect(engine.pauseWorkflow('non-existent'))
        .rejects.toThrow('Workflow instance not found: non-existent');

      await expect(engine.resumeWorkflow('non-existent'))
        .rejects.toThrow('Workflow instance not found: non-existent');

      await expect(engine.cancelWorkflow('non-existent'))
        .rejects.toThrow('Workflow instance not found: non-existent');
    });
  });

  describe('多节点工作流', () => {
    it('应该按顺序执行多个任务节点', async () => {
      const mockExecutor = new MockExecutor(true, 50);
      registry.registerExecutor('mock', mockExecutor);

      const definition: WorkflowDefinition = {
        name: 'multi-task-workflow',
        version: '1.0.0',
        description: 'Workflow with multiple tasks',
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'First Task',
            executor: 'mock',
            config: { step: 1 }
          },
          {
            type: 'task',
            id: 'task2',
            name: 'Second Task',
            executor: 'mock',
            config: { step: 2 }
          },
          {
            type: 'task',
            id: 'task3',
            name: 'Third Task',
            executor: 'mock',
            config: { step: 3 }
          }
        ]
      };

      const instance = await engine.startWorkflow(definition, {});

      // 等待执行完成
      await new Promise(resolve => setTimeout(resolve, 300));

      const status = await engine.getWorkflowStatus(instance.id.toString());
      expect(status).toBe('completed');
    });

    it('应该处理条件节点（跳过）', async () => {
      const mockExecutor = new MockExecutor(true);
      registry.registerExecutor('mock', mockExecutor);

      const definition: WorkflowDefinition = {
        name: 'conditional-workflow',
        version: '1.0.0',
        description: 'Workflow with conditional execution',
        nodes: [
          {
            type: 'task',
            id: 'always-run',
            name: 'Always Run Task',
            executor: 'mock',
            config: {}
          },
          {
            type: 'task',
            id: 'conditional-task',
            name: 'Conditional Task',
            executor: 'mock',
            config: {},
            condition: 'false' // 这个任务应该被跳过
          }
        ]
      };

      const instance = await engine.startWorkflow(definition, {});

      // 等待执行完成
      await new Promise(resolve => setTimeout(resolve, 100));

      const status = await engine.getWorkflowStatus(instance.id.toString());
      expect(status).toBe('completed');
    });
  });

  describe('错误处理和重试', () => {
    it('应该在失败时重试工作流', async () => {
      let attemptCount = 0;
      const retryExecutor: TaskExecutor = {
        name: 'retry-executor',
        description: 'Executor that fails first time',
        async execute() {
          attemptCount++;
          if (attemptCount === 1) {
            return { success: false, error: 'First attempt failed' };
          }
          return { success: true, data: { attempt: attemptCount } };
        }
      };

      registry.registerExecutor('retry', retryExecutor);

      const definition: WorkflowDefinition = {
        name: 'retry-workflow',
        version: '1.0.0',
        description: 'Workflow that retries on failure',
        nodes: [
          {
            type: 'task',
            id: 'retry-task',
            name: 'Retry Task',
            executor: 'retry',
            config: {}
          }
        ],
        config: {
          retryPolicy: {
            maxAttempts: 2,
            backoff: 'exponential'
          }
        }
      };

      const instance = await engine.startWorkflow(definition, {});

      // 等待重试完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(attemptCount).toBeGreaterThan(1);
    });
  });
});
