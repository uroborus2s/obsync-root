/**
 * 变量解析测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WorkflowEngineService } from '../services/WorkflowEngineService.js';
import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';

// 创建模拟对象
const mockLogger: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn()
} as any;

const mockDatabaseAPI: DatabaseAPI = {} as any;

const mockWorkflowInstanceRepository = {
  create: vi.fn(),
  findById: vi.fn(),
  update: vi.fn()
} as any;

const mockTaskNodeRepository = {
  create: vi.fn(),
  findByWorkflowInstanceId: vi.fn(),
  update: vi.fn()
} as any;

const mockExecutionLogRepository = {
  create: vi.fn()
} as any;

describe('变量解析功能', () => {
  let workflowEngineService: WorkflowEngineService;

  beforeEach(() => {
    workflowEngineService = new WorkflowEngineService(
      mockWorkflowInstanceRepository,
      mockTaskNodeRepository,
      mockExecutionLogRepository,
      mockLogger
    );
  });

  describe('getValueFromPath 方法', () => {
    it('应该正确解析简单变量名', () => {
      const variables = {
        xnxq: '2024-01',
        forceSync: true,
        syncType: 'full'
      };

      // 使用反射访问私有方法
      const getValueFromPath = (workflowEngineService as any).getValueFromPath.bind(workflowEngineService);

      expect(getValueFromPath('xnxq', variables)).toBe('2024-01');
      expect(getValueFromPath('forceSync', variables)).toBe(true);
      expect(getValueFromPath('syncType', variables)).toBe('full');
    });

    it('应该正确解析嵌套路径', () => {
      const variables = {
        user: {
          profile: {
            name: 'John Doe',
            age: 30
          }
        },
        nested: {
          value: 'test-value'
        }
      };

      const getValueFromPath = (workflowEngineService as any).getValueFromPath.bind(workflowEngineService);

      expect(getValueFromPath('user.profile.name', variables)).toBe('John Doe');
      expect(getValueFromPath('user.profile.age', variables)).toBe(30);
      expect(getValueFromPath('nested.value', variables)).toBe('test-value');
    });

    it('应该返回undefined对于不存在的路径', () => {
      const variables = {
        existing: 'value'
      };

      const getValueFromPath = (workflowEngineService as any).getValueFromPath.bind(workflowEngineService);

      expect(getValueFromPath('nonexistent', variables)).toBeUndefined();
      expect(getValueFromPath('existing.nonexistent', variables)).toBeUndefined();
    });
  });

  describe('evaluateExpression 方法', () => {
    it('应该正确解析模板字符串', () => {
      const variables = {
        xnxq: '2024-01',
        forceSync: true,
        syncType: 'full'
      };

      const evaluateExpression = (workflowEngineService as any).evaluateExpression.bind(workflowEngineService);

      expect(evaluateExpression('${xnxq}', variables)).toBe('2024-01');
      expect(evaluateExpression('${forceSync}', variables)).toBe(true);
      expect(evaluateExpression('${syncType}', variables)).toBe('full');
    });

    it('应该正确解析复合模板字符串', () => {
      const variables = {
        year: '2024',
        month: '01'
      };

      const evaluateExpression = (workflowEngineService as any).evaluateExpression.bind(workflowEngineService);

      expect(evaluateExpression('${year}-${month}', variables)).toBe('2024-01');
      expect(evaluateExpression('prefix_${year}_suffix', variables)).toBe('prefix_2024_suffix');
    });
  });

  describe('resolveConfigVariables 方法', () => {
    it('应该正确解析配置对象中的变量', () => {
      const config = {
        xnxq: '${xnxq}',
        syncType: 'full',
        forceSync: '${forceSync}',
        nested: {
          value: '${nested.value}',
          array: ['${item1}', 'static', '${item2}']
        }
      };

      const variables = {
        xnxq: '2024-01',
        forceSync: true,
        nested: { value: 'test-value' },
        item1: 'dynamic1',
        item2: 'dynamic2'
      };

      const resolveConfigVariables = (workflowEngineService as any).resolveConfigVariables.bind(workflowEngineService);
      const resolved = resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        xnxq: '2024-01',
        syncType: 'full',
        forceSync: true,
        nested: {
          value: 'test-value',
          array: ['dynamic1', 'static', 'dynamic2']
        }
      });
    });

    it('应该处理undefined变量', () => {
      const config = {
        existing: '${existing}',
        missing: '${missing}',
        mixed: 'prefix_${missing}_suffix'
      };

      const variables = {
        existing: 'value'
      };

      const resolveConfigVariables = (workflowEngineService as any).resolveConfigVariables.bind(workflowEngineService);
      const resolved = resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        existing: 'value',
        missing: undefined,
        mixed: 'prefix__suffix'  // undefined被转换为空字符串
      });
    });
  });
});
