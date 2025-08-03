/**
 * @stratix/tasks 插件测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { FastifyInstance } from '@stratix/core';
import { ExecutorRegistryService, ExecutorFactoryService } from '../services/index.js';

// 模拟 Fastify 实例
const createMockFastify = () => ({
  log: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  },
  decorate: vi.fn(),
  diContainer: {
    register: vi.fn()
  }
});

describe('@stratix/tasks Plugin', () => {
  let mockFastify: any;

  beforeEach(() => {
    mockFastify = createMockFastify();
  });

  describe('ExecutorRegistryService', () => {
    it('should create an instance', () => {
      const registry = new ExecutorRegistryService();
      expect(registry).toBeInstanceOf(ExecutorRegistryService);
    });

    it('should register and retrieve executors', async () => {
      const registry = new ExecutorRegistryService();
      
      const mockExecutor = {
        name: 'test-executor',
        description: 'Test executor',
        execute: vi.fn().mockResolvedValue({ success: true })
      };

      // 注册执行器
      registry.registerExecutor('test', mockExecutor);

      // 检查是否存在
      expect(registry.hasExecutor('test')).toBe(true);

      // 获取执行器
      const retrieved = await registry.getExecutor('test');
      expect(retrieved).toBe(mockExecutor);
    });

    it('should list all executors', async () => {
      const registry = new ExecutorRegistryService();
      
      const executor1 = {
        name: 'executor1',
        execute: vi.fn()
      };
      
      const executor2 = {
        name: 'executor2',
        execute: vi.fn()
      };

      registry.registerExecutor('exec1', executor1);
      registry.registerExecutor('exec2', executor2);

      const list = await registry.listExecutors();
      expect(list).toHaveLength(2);
      expect(list.map(info => info.name)).toContain('exec1');
      expect(list.map(info => info.name)).toContain('exec2');
    });

    it('should unregister executors', () => {
      const registry = new ExecutorRegistryService();
      
      const mockExecutor = {
        name: 'test-executor',
        execute: vi.fn()
      };

      registry.registerExecutor('test', mockExecutor);
      expect(registry.hasExecutor('test')).toBe(true);

      registry.unregisterExecutor('test');
      expect(registry.hasExecutor('test')).toBe(false);
    });

    it('should register executor domains', () => {
      const registry = new ExecutorRegistryService();
      
      const executors = {
        creator: {
          name: 'user-creator',
          execute: vi.fn()
        },
        validator: {
          name: 'user-validator',
          execute: vi.fn()
        }
      };

      registry.registerExecutorDomain('user', executors);

      expect(registry.hasExecutor('user.creator')).toBe(true);
      expect(registry.hasExecutor('user.validator')).toBe(true);
    });

    it('should perform health checks', async () => {
      const registry = new ExecutorRegistryService();
      
      const healthyExecutor = {
        name: 'healthy-executor',
        execute: vi.fn(),
        healthCheck: vi.fn().mockResolvedValue('healthy')
      };

      const unhealthyExecutor = {
        name: 'unhealthy-executor',
        execute: vi.fn(),
        healthCheck: vi.fn().mockRejectedValue(new Error('Health check failed'))
      };

      registry.registerExecutor('healthy', healthyExecutor);
      registry.registerExecutor('unhealthy', unhealthyExecutor);

      const results = await registry.healthCheck();
      expect(results.healthy).toBe('healthy');
      expect(results.unhealthy).toBe('unhealthy');
    });
  });

  describe('ExecutorFactoryService', () => {
    it('should create an instance', () => {
      const factory = new ExecutorFactoryService();
      expect(factory).toBeInstanceOf(ExecutorFactoryService);
    });

    it('should list supported executor types', () => {
      const factory = new ExecutorFactoryService();
      const types = factory.getSupportedTypes();
      
      expect(types).toContain('http');
      expect(types).toContain('script');
      expect(types).toContain('email');
      expect(types).toContain('delay');
      expect(types).toContain('log');
    });

    it('should create HTTP executor', () => {
      const factory = new ExecutorFactoryService();
      const executor = factory.createExecutor('http');
      
      expect(executor.name).toBe('http');
      expect(typeof executor.execute).toBe('function');
    });

    it('should create script executor', () => {
      const factory = new ExecutorFactoryService();
      const executor = factory.createExecutor('script');
      
      expect(executor.name).toBe('script');
      expect(typeof executor.execute).toBe('function');
    });

    it('should create email executor', () => {
      const factory = new ExecutorFactoryService();
      const executor = factory.createExecutor('email');
      
      expect(executor.name).toBe('email');
      expect(typeof executor.execute).toBe('function');
    });

    it('should create delay executor', () => {
      const factory = new ExecutorFactoryService();
      const executor = factory.createExecutor('delay');
      
      expect(executor.name).toBe('delay');
      expect(typeof executor.execute).toBe('function');
    });

    it('should create log executor', () => {
      const factory = new ExecutorFactoryService();
      const executor = factory.createExecutor('log');
      
      expect(executor.name).toBe('log');
      expect(typeof executor.execute).toBe('function');
    });

    it('should throw error for unknown executor type', () => {
      const factory = new ExecutorFactoryService();
      
      expect(() => {
        factory.createExecutor('unknown');
      }).toThrow('Unknown built-in executor type: unknown');
    });

    it('should create multiple executors', () => {
      const factory = new ExecutorFactoryService();
      
      const configs = {
        httpExec: { type: 'http' as const },
        scriptExec: { type: 'script' as const },
        emailExec: { type: 'email' as const }
      };

      const executors = factory.createExecutors(configs);
      
      expect(Object.keys(executors)).toHaveLength(3);
      expect(executors.httpExec.name).toBe('http');
      expect(executors.scriptExec.name).toBe('script');
      expect(executors.emailExec.name).toBe('email');
    });
  });

  describe('Plugin Integration', () => {
    it('should provide registerTaskExecutor decorator', async () => {
      // 这里测试插件是否正确注册了装饰器方法
      expect(mockFastify.decorate).toHaveBeenCalledWith(
        'registerTaskExecutor',
        expect.any(Function)
      );
    });

    it('should provide registerExecutorDomain decorator', async () => {
      expect(mockFastify.decorate).toHaveBeenCalledWith(
        'registerExecutorDomain',
        expect.any(Function)
      );
    });

    it('should provide getTaskExecutor decorator', async () => {
      expect(mockFastify.decorate).toHaveBeenCalledWith(
        'getTaskExecutor',
        expect.any(Function)
      );
    });

    it('should register executorRegistry to DI container', async () => {
      expect(mockFastify.diContainer.register).toHaveBeenCalledWith(
        'executorRegistry',
        expect.any(Object)
      );
    });
  });
});
