/**
 * @stratix/tasks 集成测试
 * 
 * 测试各个组件之间的集成和完整的工作流程
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  ExecutorRegistryService, 
  ExecutorFactoryService,
  WorkflowEngineService,
  WorkflowDefinitionServiceImpl,
  TaskSchedulerService
} from '../services/index.js';
import type { WorkflowDefinition, TaskExecutor } from '../types/index.js';

// 模拟执行器
class TestExecutor implements TaskExecutor {
  readonly name = 'test-executor';
  readonly description = 'Test executor for integration testing';
  readonly version = '1.0.0';

  constructor(private delay = 100, private shouldFail = false) {}

  async execute(context: any) {
    await new Promise(resolve => setTimeout(resolve, this.delay));

    if (this.shouldFail) {
      return {
        success: false,
        error: 'Test executor intentionally failed'
      };
    }

    return {
      success: true,
      data: {
        executorName: this.name,
        input: context.config,
        timestamp: new Date().toISOString()
      }
    };
  }

  validateConfig(config: any) {
    return {
      valid: true,
      errors: []
    };
  }
}

describe('@stratix/tasks 集成测试', () => {
  let executorRegistry: ExecutorRegistryService;
  let executorFactory: ExecutorFactoryService;
  let workflowDefinitionService: WorkflowDefinitionServiceImpl;
  let workflowEngine: WorkflowEngineService;
  let taskScheduler: TaskSchedulerService;

  beforeEach(async () => {
    // 创建服务实例
    executorRegistry = new ExecutorRegistryService();
    executorFactory = new ExecutorFactoryService();
    workflowDefinitionService = new WorkflowDefinitionServiceImpl();
    workflowEngine = new WorkflowEngineService(executorRegistry);
    taskScheduler = new TaskSchedulerService(executorRegistry, 5);

    // 注册内置执行器
    const builtInTypes = executorFactory.getSupportedTypes();
    for (const type of builtInTypes) {
      const executor = executorFactory.createExecutor(type);
      executorRegistry.registerExecutor(type, executor);
    }

    // 注册测试执行器
    executorRegistry.registerExecutor('test', new TestExecutor());
    executorRegistry.registerExecutor('slow-test', new TestExecutor(500));
    executorRegistry.registerExecutor('failing-test', new TestExecutor(100, true));

    // 启动任务调度器
    await taskScheduler.start();
  });

  afterEach(async () => {
    // 停止任务调度器
    await taskScheduler.stop();
    
    // 清理执行器
    await executorRegistry.cleanup();
  });

  describe('完整工作流执行', () => {
    it('应该成功执行简单的工作流', async () => {
      // 创建工作流定义
      const definition: WorkflowDefinition = {
        name: 'simple-integration-test',
        version: '1.0.0',
        description: 'Simple workflow for integration testing',
        inputs: [
          {
            name: 'message',
            type: 'string',
            required: true,
            description: 'Test message'
          }
        ],
        outputs: [
          {
            name: 'result',
            type: 'object',
            source: 'nodes.task1.output',
            description: 'Task execution result'
          }
        ],
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'Test Task',
            executor: 'test',
            config: {
              message: '{{ inputs.message }}'
            }
          }
        ]
      };

      // 保存工作流定义
      const savedDefinition = await workflowDefinitionService.createDefinition(definition);
      expect(savedDefinition.name).toBe(definition.name);

      // 执行工作流
      const inputs = { message: 'Hello Integration Test' };
      const instance = await workflowEngine.startWorkflow(savedDefinition, inputs);

      expect(instance.name).toBe(definition.name);
      expect(instance.inputData).toEqual(inputs);
      expect(instance.status).toBe('pending');

      // 等待执行完成
      await new Promise(resolve => setTimeout(resolve, 300));

      const finalStatus = await workflowEngine.getWorkflowStatus(instance.id.toString());
      expect(finalStatus).toBe('completed');
    });

    it('应该处理多步骤工作流', async () => {
      const definition: WorkflowDefinition = {
        name: 'multi-step-workflow',
        version: '1.0.0',
        description: 'Multi-step workflow for testing',
        nodes: [
          {
            type: 'task',
            id: 'step1',
            name: 'First Step',
            executor: 'test',
            config: { step: 1 }
          },
          {
            type: 'task',
            id: 'step2',
            name: 'Second Step',
            executor: 'test',
            config: { step: 2 }
          },
          {
            type: 'task',
            id: 'step3',
            name: 'Third Step',
            executor: 'test',
            config: { step: 3 }
          }
        ]
      };

      const savedDefinition = await workflowDefinitionService.createDefinition(definition);
      const instance = await workflowEngine.startWorkflow(savedDefinition, {});

      // 等待执行完成
      await new Promise(resolve => setTimeout(resolve, 500));

      const finalStatus = await workflowEngine.getWorkflowStatus(instance.id.toString());
      expect(finalStatus).toBe('completed');
    });

    it('应该处理工作流执行失败', async () => {
      const definition: WorkflowDefinition = {
        name: 'failing-workflow',
        version: '1.0.0',
        description: 'Workflow that should fail',
        nodes: [
          {
            type: 'task',
            id: 'failing-task',
            name: 'Failing Task',
            executor: 'failing-test',
            config: {}
          }
        ]
      };

      const savedDefinition = await workflowDefinitionService.createDefinition(definition);
      const instance = await workflowEngine.startWorkflow(savedDefinition, {});

      // 等待执行完成
      await new Promise(resolve => setTimeout(resolve, 300));

      const finalStatus = await workflowEngine.getWorkflowStatus(instance.id.toString());
      expect(finalStatus).toBe('failed');
    });
  });

  describe('任务调度器集成', () => {
    it('应该调度和执行单个任务', async () => {
      const taskDefinition = {
        id: 'test',
        name: 'Test Task',
        executor: 'test',
        config: { message: 'Hello Task Scheduler' },
        priority: 'normal' as const
      };

      const task = await taskScheduler.scheduleTask(taskDefinition, { test: true });
      expect(task.status).toBe('pending');

      // 等待任务执行完成
      await new Promise(resolve => setTimeout(resolve, 300));

      const updatedTask = await taskScheduler.getTaskStatus(task.id);
      expect(updatedTask.status).toBe('completed');
      expect(updatedTask.outputData).toBeDefined();
    });

    it('应该按优先级调度任务', async () => {
      const tasks = [];

      // 调度不同优先级的任务
      for (const priority of ['low', 'normal', 'high', 'urgent'] as const) {
        const taskDefinition = {
          id: 'slow-test',
          name: `${priority} Priority Task`,
          executor: 'slow-test',
          config: { priority },
          priority
        };

        const task = await taskScheduler.scheduleTask(taskDefinition, {});
        tasks.push(task);
      }

      // 等待所有任务完成
      await new Promise(resolve => setTimeout(resolve, 3000));

      // 检查任务完成顺序（高优先级应该先完成）
      const completedTasks = await taskScheduler.listTasks({ status: ['completed'] });
      expect(completedTasks.length).toBe(4);

      // 验证优先级顺序
      const priorities = completedTasks.map(t => t.priority);
      expect(priorities[0]).toBe('urgent');
      expect(priorities[1]).toBe('high');
      expect(priorities[2]).toBe('normal');
      expect(priorities[3]).toBe('low');
    });

    it('应该处理任务重试', async () => {
      const taskDefinition = {
        id: 'failing-test',
        name: 'Retrying Task',
        executor: 'failing-test',
        config: {},
        priority: 'normal' as const,
        retryPolicy: {
          maxAttempts: 3,
          backoff: 'exponential' as const,
          delay: 100
        }
      };

      const task = await taskScheduler.scheduleTask(taskDefinition, {});

      // 等待重试完成
      await new Promise(resolve => setTimeout(resolve, 2000));

      const finalTask = await taskScheduler.getTaskStatus(task.id);
      expect(finalTask.status).toBe('failed');
      expect(finalTask.retryCount).toBe(3);
    });
  });

  describe('执行器管理', () => {
    it('应该注册和管理执行器域', async () => {
      const userExecutors = {
        creator: new TestExecutor(50),
        validator: new TestExecutor(30),
        notifier: new TestExecutor(20)
      };

      executorRegistry.registerExecutorDomain('user', userExecutors);

      // 验证域内执行器
      const domainExecutors = await executorRegistry.getExecutorsByDomain('user');
      expect(domainExecutors.length).toBe(3);
      expect(domainExecutors.map(e => e.name)).toContain('user.creator');
      expect(domainExecutors.map(e => e.name)).toContain('user.validator');
      expect(domainExecutors.map(e => e.name)).toContain('user.notifier');

      // 测试域内执行器的使用
      const creator = await executorRegistry.getExecutor('user.creator');
      expect(creator).toBeDefined();

      const result = await creator.execute({ config: { test: true } });
      expect(result.success).toBe(true);
    });

    it('应该执行健康检查', async () => {
      const healthResults = await executorRegistry.healthCheck();
      
      // 检查所有注册的执行器
      expect(Object.keys(healthResults).length).toBeGreaterThan(0);
      
      // 大部分执行器应该是健康的
      const healthyCount = Object.values(healthResults).filter(status => status === 'healthy').length;
      expect(healthyCount).toBeGreaterThan(0);
    });

    it('应该提供统计信息', () => {
      const registryStats = executorRegistry.getStats();
      expect(registryStats.total).toBeGreaterThan(0);
      expect(registryStats.active).toBeGreaterThan(0);

      const schedulerStats = taskScheduler.getStats();
      expect(schedulerStats.isRunning).toBe(true);
      expect(schedulerStats.maxConcurrentTasks).toBe(5);

      const definitionStats = workflowDefinitionService.getStats();
      expect(definitionStats.total).toBeGreaterThan(0);
    });
  });

  describe('工作流定义管理', () => {
    it('应该管理工作流定义版本', async () => {
      const baseDefinition: WorkflowDefinition = {
        name: 'versioned-workflow',
        version: '1.0.0',
        description: 'First version',
        nodes: [
          {
            type: 'task',
            id: 'task1',
            name: 'Task 1',
            executor: 'test',
            config: {}
          }
        ]
      };

      // 创建第一个版本
      const v1 = await workflowDefinitionService.createDefinition(baseDefinition);
      expect(v1.version).toBe('1.0.0');

      // 创建第二个版本
      const v2Definition = { ...baseDefinition, version: '2.0.0', description: 'Second version' };
      const v2 = await workflowDefinitionService.createDefinition(v2Definition);
      expect(v2.version).toBe('2.0.0');

      // 获取特定版本
      const retrievedV1 = await workflowDefinitionService.getDefinition('versioned-workflow', '1.0.0');
      expect(retrievedV1.description).toBe('First version');

      const retrievedV2 = await workflowDefinitionService.getDefinition('versioned-workflow', '2.0.0');
      expect(retrievedV2.description).toBe('Second version');

      // 获取最新版本（不指定版本号）
      const latest = await workflowDefinitionService.getDefinition('versioned-workflow');
      expect(latest.version).toBe('2.0.0');
    });

    it('应该验证工作流定义', async () => {
      const invalidDefinition: WorkflowDefinition = {
        name: '',
        version: '',
        description: 'Invalid workflow',
        nodes: [
          {
            type: 'task',
            id: '',
            name: '',
            executor: '',
            config: {}
          }
        ]
      };

      const validation = await workflowDefinitionService.validateDefinition(invalidDefinition);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
});
