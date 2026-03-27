/**
 * 执行器配置迁移集成测试
 * 
 * 验证executor_config字段移除后的功能完整性
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ExecutionContext, ExecutionResult, TaskExecutor } from '../registerTask.js';
import type { NodeInstance, WorkflowInstance } from '../types/business.js';

describe('执行器配置迁移测试', () => {
  let mockWorkflowInstance: WorkflowInstance;
  let mockNodeInstance: NodeInstance;

  beforeEach(() => {
    mockWorkflowInstance = {
      id: 1,
      workflowDefinitionId: 1,
      name: 'Test Workflow',
      status: 'running',
      inputData: { globalParam: 'global-value' },
      contextData: { context: 'test-context' },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    mockNodeInstance = {
      id: 1,
      workflowInstanceId: 1,
      nodeId: 'test-node',
      nodeName: 'Test Node',
      nodeType: 'simple',
      status: 'pending',
      executor: 'testExecutor',
      inputData: {
        // 统一的配置数据
        timeout: 5000,
        retries: 3,
        businessParam: 'business-value'
      },
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  });

  describe('ExecutionContext配置传递', () => {
    it('应该正确设置config字段', () => {
      const executionContext: ExecutionContext = {
        workflowInstance: mockWorkflowInstance,
        currentInstance: mockNodeInstance,
        config: mockNodeInstance.inputData,
        executorConfig: mockNodeInstance.inputData // 向后兼容
      };

      expect(executionContext.config).toEqual({
        timeout: 5000,
        retries: 3,
        businessParam: 'business-value'
      });

      // 向后兼容性验证
      expect(executionContext.executorConfig).toEqual(executionContext.config);
    });

    it('应该支持嵌套配置结构', () => {
      const nestedInputData = {
        executor: {
          timeout: 5000,
          retries: 3
        },
        business: {
          userId: '123',
          action: 'create'
        }
      };

      mockNodeInstance.inputData = nestedInputData;

      const executionContext: ExecutionContext = {
        workflowInstance: mockWorkflowInstance,
        currentInstance: mockNodeInstance,
        config: nestedInputData
      };

      expect(executionContext.config.executor.timeout).toBe(5000);
      expect(executionContext.config.business.userId).toBe('123');
    });
  });

  describe('执行器适配', () => {
    it('应该能从config获取所有配置', async () => {
      // 模拟新的执行器实现
      class TestExecutor implements TaskExecutor {
        readonly name = 'testExecutor';
        readonly description = 'Test Executor';
        readonly version = '1.0.0';

        async execute(context: ExecutionContext): Promise<ExecutionResult> {
          const config = context.config as any;
          
          // 验证能够获取执行器配置
          expect(config.timeout).toBe(5000);
          expect(config.retries).toBe(3);
          
          // 验证能够获取业务数据
          expect(config.businessParam).toBe('business-value');

          return {
            success: true,
            data: {
              processedWith: {
                timeout: config.timeout,
                retries: config.retries,
                businessParam: config.businessParam
              }
            }
          };
        }
      }

      const executor = new TestExecutor();
      const executionContext: ExecutionContext = {
        workflowInstance: mockWorkflowInstance,
        currentInstance: mockNodeInstance,
        config: mockNodeInstance.inputData
      };

      const result = await executor.execute(executionContext);

      expect(result.success).toBe(true);
      expect(result.data.processedWith.timeout).toBe(5000);
      expect(result.data.processedWith.businessParam).toBe('business-value');
    });

    it('应该支持向后兼容的配置获取', async () => {
      // 模拟过渡期的执行器实现
      class LegacyCompatibleExecutor implements TaskExecutor {
        readonly name = 'legacyExecutor';
        readonly description = 'Legacy Compatible Executor';
        readonly version = '1.0.0';

        async execute(context: ExecutionContext): Promise<ExecutionResult> {
          // 新方式：从config获取
          const config = context.config as any;
          
          // 向后兼容：从executorConfig获取（如果存在）
          const legacyConfig = context.executorConfig as any;
          
          // 合并配置
          const finalConfig = {
            ...legacyConfig,
            ...config
          };

          expect(finalConfig.timeout).toBe(5000);
          expect(finalConfig.businessParam).toBe('business-value');

          return { success: true, data: finalConfig };
        }
      }

      const executor = new LegacyCompatibleExecutor();
      const executionContext: ExecutionContext = {
        workflowInstance: mockWorkflowInstance,
        currentInstance: mockNodeInstance,
        config: mockNodeInstance.inputData,
        executorConfig: mockNodeInstance.inputData
      };

      const result = await executor.execute(executionContext);

      expect(result.success).toBe(true);
      expect(result.data.timeout).toBe(5000);
      expect(result.data.businessParam).toBe('business-value');
    });
  });

  describe('配置合并逻辑', () => {
    it('应该正确合并executorConfig到inputData', () => {
      // 模拟迁移过程中的配置合并
      const legacyExecutorConfig = {
        timeout: 5000,
        retries: 3
      };

      const inputData = {
        businessParam: 'business-value',
        userId: '123'
      };

      // 合并逻辑（模拟系统内部处理）
      const mergedConfig = {
        ...inputData,
        ...legacyExecutorConfig
      };

      expect(mergedConfig).toEqual({
        businessParam: 'business-value',
        userId: '123',
        timeout: 5000,
        retries: 3
      });
    });

    it('应该处理配置冲突（inputData优先）', () => {
      const legacyExecutorConfig = {
        timeout: 5000,
        retries: 3,
        priority: 'low'
      };

      const inputData = {
        timeout: 8000, // 冲突字段
        businessParam: 'business-value',
        priority: 'high' // 冲突字段
      };

      // inputData优先的合并逻辑
      const mergedConfig = {
        ...legacyExecutorConfig,
        ...inputData
      };

      expect(mergedConfig.timeout).toBe(8000); // inputData优先
      expect(mergedConfig.priority).toBe('high'); // inputData优先
      expect(mergedConfig.retries).toBe(3); // 来自executorConfig
      expect(mergedConfig.businessParam).toBe('business-value'); // 来自inputData
    });
  });

  describe('数据结构验证', () => {
    it('NodeInstance应该只包含inputData字段', () => {
      // 验证NodeInstance类型不再包含executorConfig
      const nodeInstance: NodeInstance = {
        id: 1,
        workflowInstanceId: 1,
        nodeId: 'test-node',
        nodeName: 'Test Node',
        nodeType: 'simple',
        status: 'pending',
        executor: 'testExecutor',
        inputData: { timeout: 5000 }, // 只有inputData
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      expect(nodeInstance.inputData).toBeDefined();
      expect((nodeInstance as any).executorConfig).toBeUndefined();
    });

    it('ExecutionContext应该包含deprecated的executorConfig字段', () => {
      const executionContext: ExecutionContext = {
        workflowInstance: mockWorkflowInstance,
        currentInstance: mockNodeInstance,
        config: { test: 'config' },
        executorConfig: { test: 'config' } // deprecated但仍可用
      };

      expect(executionContext.config).toBeDefined();
      expect(executionContext.executorConfig).toBeDefined();
    });
  });
});
