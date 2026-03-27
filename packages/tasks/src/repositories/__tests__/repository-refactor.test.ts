/**
 * 仓储层重构验证测试
 * 
 * 验证重构后的仓储类是否正确工作
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { WorkflowDefinitionRepository } from '../workflow/WorkflowDefinitionRepository.js';
import { WorkflowInstanceRepository } from '../workflow/WorkflowInstanceRepository.js';
import { TaskNodeRepository } from '../task/TaskNodeRepository.js';

describe('仓储层重构验证', () => {
  let mockDatabaseApi: DatabaseAPI;
  let mockLogger: Logger;

  beforeEach(() => {
    mockDatabaseApi = {
      // Mock DatabaseAPI methods
    } as any;

    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;
  });

  describe('WorkflowDefinitionRepository', () => {
    it('应该正确创建实例', () => {
      const repository = new WorkflowDefinitionRepository(mockDatabaseApi, mockLogger);
      expect(repository).toBeInstanceOf(WorkflowDefinitionRepository);
      expect(repository.tableName).toBe('workflow_definitions');
    });

    it('应该有正确的构造函数签名', () => {
      expect(() => {
        new WorkflowDefinitionRepository(mockDatabaseApi, mockLogger);
      }).not.toThrow();
    });
  });

  describe('WorkflowInstanceRepository', () => {
    it('应该正确创建实例', () => {
      const repository = new WorkflowInstanceRepository(mockDatabaseApi, mockLogger);
      expect(repository).toBeInstanceOf(WorkflowInstanceRepository);
      expect(repository.tableName).toBe('workflow_instances');
    });

    it('应该有正确的构造函数签名', () => {
      expect(() => {
        new WorkflowInstanceRepository(mockDatabaseApi, mockLogger);
      }).not.toThrow();
    });
  });

  describe('TaskNodeRepository', () => {
    it('应该正确创建实例', () => {
      const repository = new TaskNodeRepository(mockDatabaseApi, mockLogger);
      expect(repository).toBeInstanceOf(TaskNodeRepository);
      expect(repository.tableName).toBe('task_nodes');
    });

    it('应该有正确的构造函数签名', () => {
      expect(() => {
        new TaskNodeRepository(mockDatabaseApi, mockLogger);
      }).not.toThrow();
    });
  });

  describe('类型验证', () => {
    it('应该使用正确的泛型类型参数', () => {
      const workflowDefRepo = new WorkflowDefinitionRepository(mockDatabaseApi, mockLogger);
      const workflowInstRepo = new WorkflowInstanceRepository(mockDatabaseApi, mockLogger);
      const taskNodeRepo = new TaskNodeRepository(mockDatabaseApi, mockLogger);

      // 验证方法存在且返回正确的类型
      expect(typeof workflowDefRepo.findByNameAndVersion).toBe('function');
      expect(typeof workflowInstRepo.findByExternalId).toBe('function');
      expect(typeof taskNodeRepo.findByWorkflowInstanceId).toBe('function');
    });

    it('应该继承自BaseTasksRepository', () => {
      const repository = new WorkflowDefinitionRepository(mockDatabaseApi, mockLogger);
      
      // 验证继承的方法存在
      expect(typeof repository.findByIdNullable).toBe('function');
      expect(typeof repository.updateNullable).toBe('function');
      expect(typeof repository.findOneNullable).toBe('function');
    });
  });

  describe('依赖注入验证', () => {
    it('应该正确注入databaseApi和logger', () => {
      const repository = new WorkflowDefinitionRepository(mockDatabaseApi, mockLogger);
      
      // 验证依赖已注入（通过访问protected属性）
      expect((repository as any).databaseApi).toBe(mockDatabaseApi);
      expect((repository as any).logger).toBe(mockLogger);
    });
  });
});
