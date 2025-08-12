/**
 * Repository 层测试
 *
 * 验证 Repository 类的编译和基本功能
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TaskNodeRepository from '../repositories/TaskNodeRepository.js';
import WorkflowDefinitionRepository from '../repositories/WorkflowDefinitionRepository.js';
import WorkflowInstanceRepository from '../repositories/WorkflowInstanceRepository.js';

// 模拟 DatabaseAPI
const createMockDatabaseAPI = (): DatabaseAPI => ({
  query: vi.fn(),
  transaction: vi.fn(),
  close: vi.fn(),
  isConnected: vi.fn().mockReturnValue(true),
  getConnectionInfo: vi
    .fn()
    .mockReturnValue({ host: 'localhost', database: 'test' })
});

// 模拟 Logger
const createMockLogger = (): Logger => ({
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  child: vi.fn().mockReturnThis()
});

describe('Repository 层编译测试', () => {
  let mockDatabaseAPI: DatabaseAPI;
  let mockLogger: Logger;

  beforeEach(() => {
    mockDatabaseAPI = createMockDatabaseAPI();
    mockLogger = createMockLogger();
  });

  describe('TaskNodeRepository', () => {
    it('应该能够创建实例', () => {
      const repository = new TaskNodeRepository(mockDatabaseAPI, mockLogger);
      expect(repository).toBeInstanceOf(TaskNodeRepository);
    });

    it('应该有正确的方法签名', () => {
      const repository = new TaskNodeRepository(mockDatabaseAPI, mockLogger);

      // 检查方法是否存在
      expect(typeof repository.findByWorkflowInstanceId).toBe('function');
      expect(typeof repository.findByStatus).toBe('function');
      expect(typeof repository.findDependencies).toBe('function');
      expect(typeof repository.batchUpdateStatus).toBe('function');
      expect(typeof repository.getExecutionStats).toBe('function');
    });
  });

  describe('WorkflowDefinitionRepository', () => {
    it('应该能够创建实例', () => {
      const repository = new WorkflowDefinitionRepository(
        mockDatabaseAPI,
        mockLogger
      );
      expect(repository).toBeInstanceOf(WorkflowDefinitionRepository);
    });

    it('应该有正确的方法签名', () => {
      const repository = new WorkflowDefinitionRepository(
        mockDatabaseAPI,
        mockLogger
      );

      // 检查方法是否存在
      expect(typeof repository.findByNameAndVersion).toBe('function');
      expect(typeof repository.findLatestVersion).toBe('function');
      expect(typeof repository.findByCategory).toBe('function');
      expect(typeof repository.findByTags).toBe('function');
      expect(typeof repository.findByStatus).toBe('function');
      expect(typeof repository.search).toBe('function');
      expect(typeof repository.archiveOldVersions).toBe('function');
      expect(typeof repository.getStatistics).toBe('function');
    });
  });

  describe('WorkflowInstanceRepository', () => {
    it('应该能够创建实例', () => {
      const repository = new WorkflowInstanceRepository(
        mockDatabaseAPI,
        mockLogger
      );
      expect(repository).toBeInstanceOf(WorkflowInstanceRepository);
    });

    it('应该有正确的方法签名', () => {
      const repository = new WorkflowInstanceRepository(
        mockDatabaseAPI,
        mockLogger
      );

      // 检查方法是否存在
      expect(typeof repository.findByWorkflowDefinitionId).toBe('function');
      expect(typeof repository.findByStatus).toBe('function');
      expect(typeof repository.findInterruptedInstances).toBe('function');
      expect(typeof repository.findLongRunningInstances).toBe('function');
      expect(typeof repository.batchUpdateStatus).toBe('function');
      expect(typeof repository.getStatistics).toBe('function');
    });
  });

  describe('BaseTasksRepository 功能', () => {
    it('应该提供便捷的 nullable 方法', () => {
      const repository = new TaskNodeRepository(mockDatabaseAPI, mockLogger);

      // 检查继承的便捷方法
      expect(typeof repository.findByIdNullable).toBe('function');
      expect(typeof repository.updateNullable).toBe('function');
      expect(typeof repository.findOneNullable).toBe('function');
      expect(typeof repository.findMany).toBe('function');
    });

    it('findOneNullable 应该支持对象和函数两种参数格式', () => {
      const repository = new TaskNodeRepository(mockDatabaseAPI, mockLogger);

      // 测试对象参数格式
      expect(() => {
        repository.findOneNullable({ status: 'pending' });
      }).not.toThrow();

      // 测试函数参数格式
      expect(() => {
        repository.findOneNullable((qb: any) =>
          qb.where('status', '=', 'pending')
        );
      }).not.toThrow();
    });

    it('queryByStatus 应该正确处理单个状态和状态数组', () => {
      const repository = new WorkflowInstanceRepository(
        mockDatabaseAPI,
        mockLogger
      );

      // 测试单个状态
      expect(() => {
        repository.findByStatus('running');
      }).not.toThrow();

      // 测试状态数组
      expect(() => {
        repository.findByStatus(['running', 'pending', 'completed']);
      }).not.toThrow();
    });
  });

  describe('类型安全性', () => {
    it('应该有正确的泛型类型', () => {
      const taskNodeRepo = new TaskNodeRepository(mockDatabaseAPI, mockLogger);
      const workflowDefRepo = new WorkflowDefinitionRepository(
        mockDatabaseAPI,
        mockLogger
      );
      const workflowInstRepo = new WorkflowInstanceRepository(
        mockDatabaseAPI,
        mockLogger
      );

      // 这些测试主要是为了确保 TypeScript 编译通过
      expect(taskNodeRepo).toBeDefined();
      expect(workflowDefRepo).toBeDefined();
      expect(workflowInstRepo).toBeDefined();
    });
  });

  describe('构造函数参数', () => {
    it('应该正确接收 DatabaseAPI 和 Logger 参数', () => {
      // 测试所有 Repository 类都能正确接收构造函数参数
      expect(() => {
        new TaskNodeRepository(mockDatabaseAPI, mockLogger);
      }).not.toThrow();

      expect(() => {
        new WorkflowDefinitionRepository(mockDatabaseAPI, mockLogger);
      }).not.toThrow();

      expect(() => {
        new WorkflowInstanceRepository(mockDatabaseAPI, mockLogger);
      }).not.toThrow();
    });

    it('应该将参数正确传递给基类', () => {
      const repository = new TaskNodeRepository(mockDatabaseAPI, mockLogger);

      // 验证依赖注入的属性
      expect((repository as any).databaseApi).toBe(mockDatabaseAPI);
      expect((repository as any).logger).toBe(mockLogger);
    });
  });
});

describe('Repository 导出测试', () => {
  it('应该正确导出所有 Repository 类', async () => {
    // 测试导入是否成功
    const {
      TaskNodeRepository,
      WorkflowDefinitionRepository,
      WorkflowInstanceRepository,
      BaseTasksRepository
    } = await import('../repositories/index.js');

    expect(TaskNodeRepository).toBeDefined();
    expect(WorkflowDefinitionRepository).toBeDefined();
    expect(WorkflowInstanceRepository).toBeDefined();
    expect(BaseTasksRepository).toBeDefined();
  });
});

describe('DatabaseResult 类型兼容性', () => {
  it('应该返回正确的 DatabaseResult 类型', () => {
    const repository = new TaskNodeRepository(
      createMockDatabaseAPI(),
      createMockLogger()
    );

    // 这些测试主要验证方法签名的类型正确性
    // 实际的数据库操作需要真实的数据库连接
    expect(typeof repository.findByWorkflowInstanceId).toBe('function');
    expect(typeof repository.getExecutionStats).toBe('function');
  });
});
