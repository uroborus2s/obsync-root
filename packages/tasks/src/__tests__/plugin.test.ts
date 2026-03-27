/**
 * @stratix/tasks 插件测试
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearExecutorRegistry,
  getExecutor,
  isExecutorRegistered,
  registerTaskExecutor
} from '../registerTask.js';

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

  describe('registerTask', () => {
    beforeEach(() => {
      // 清理注册表
      clearExecutorRegistry();
    });

    it('should register and retrieve executors', () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      };

      const mockExecutor = {
        name: 'test-executor',
        description: 'Test executor',
        version: '1.0.0',
        execute: vi.fn().mockResolvedValue({ success: true })
      };

      // 注册执行器
      const register = registerTaskExecutor(mockLogger as any);
      register('test', mockExecutor);

      // 检查是否存在
      expect(isExecutorRegistered('test')).toBe(true);

      // 获取执行器
      const retrieved = getExecutor('test');
      expect(retrieved).toBe(mockExecutor);
    });

    it('should validate executor registration', () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      };

      const register = registerTaskExecutor(mockLogger as any);

      // 测试无效的执行器名称
      expect(() => {
        register('', {} as any);
      }).toThrow('Executor name must be a non-empty string');

      // 测试无效的执行器对象
      expect(() => {
        register('test', {} as any);
      }).toThrow('Executor must have an execute method');

      // 测试缺少必需属性
      expect(() => {
        register('test', { execute: vi.fn() } as any);
      }).toThrow(
        'Executor must have name, description, and version properties'
      );
    });
  });

  describe('registerTask integration', () => {
    it('should clear registry', () => {
      const mockLogger = {
        info: vi.fn(),
        error: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn()
      };

      const register = registerTaskExecutor(mockLogger as any);
      const mockExecutor = {
        name: 'test-executor',
        description: 'Test executor',
        version: '1.0.0',
        execute: vi.fn()
      };

      register('test', mockExecutor);
      expect(isExecutorRegistered('test')).toBe(true);

      clearExecutorRegistry();
      expect(isExecutorRegistered('test')).toBe(false);
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
