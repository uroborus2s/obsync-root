// 服务适配器自动发现测试

import { createContainer } from 'awilix';
import fastify, { type FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { withRegisterAutoDI, type AutoDIConfig } from '../plugin-utils.js';

describe('Service Adapters Auto-Discovery', () => {
  let app: FastifyInstance;
  let container: any;

  beforeEach(async () => {
    app = fastify({ logger: false });
    container = createContainer();
    app.decorate('diContainer', container);
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('基础自动发现功能', () => {
    it('应该支持自动发现配置', async () => {
      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        },
        services: {
          enabled: true,
          patterns: ['adapters/**/*.{ts,js}']
        },
        debug: false
      };

      const mockPlugin = async (fastify: FastifyInstance) => {
        fastify.get('/test', async () => ({ message: 'auto-discovery test' }));
      };

      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
      
      // 应该不抛出错误
      await expect(app.register(enhancedPlugin, {})).resolves.not.toThrow();
    });

    it('应该在禁用服务时跳过', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config: AutoDIConfig = {
        services: {
          enabled: false,
          patterns: ['adapters/**/*.{ts,js}']
        },
        debug: true
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
      
      await app.register(enhancedPlugin, {});

      // 验证跳过消息
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Service adapters registration skipped')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('错误处理', () => {
    it('应该处理自动发现过程中的错误', async () => {
      const config: AutoDIConfig = {
        services: {
          enabled: true,
          patterns: ['invalid-pattern/**/*.js'],
          baseDir: '/non-existent-path'
        },
        debug: false
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
      
      // 应该不抛出错误，优雅地处理发现失败
      await expect(app.register(enhancedPlugin, {})).resolves.not.toThrow();
    });
  });

  describe('配置验证', () => {
    it('应该处理空的适配器配置', async () => {
      const config: AutoDIConfig = {
        services: {
          enabled: true,
          patterns: []
        },
        debug: false
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
      
      await expect(app.register(enhancedPlugin, {})).resolves.not.toThrow();
    });

    it('应该处理未定义的服务配置', async () => {
      const config: AutoDIConfig = {
        discovery: {
          patterns: [],
          baseDir: process.cwd()
        }
        // 没有 services 配置
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
      
      await expect(app.register(enhancedPlugin, {})).resolves.not.toThrow();
    });
  });

  describe('调试输出', () => {
    it('应该在调试模式下输出详细信息', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const config: AutoDIConfig = {
        services: {
          enabled: true,
          patterns: []
        },
        debug: true
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
      
      await app.register(enhancedPlugin, {});

      // 验证调试输出
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Starting service adapter auto-discovery')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('基础功能', () => {
    it('应该支持默认配置', async () => {
      const config: AutoDIConfig = {
        services: {
          enabled: true
          // 使用默认 patterns
        }
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
      
      await expect(app.register(enhancedPlugin, {})).resolves.not.toThrow();
    });

    it('应该支持自定义基础目录', async () => {
      const config: AutoDIConfig = {
        services: {
          enabled: true,
          patterns: ['adapters/**/*.{ts,js}'],
          baseDir: './src'
        }
      };

      const mockPlugin = async (fastify: FastifyInstance) => {};
      const enhancedPlugin = withRegisterAutoDI(mockPlugin, config);
      
      await expect(app.register(enhancedPlugin, {})).resolves.not.toThrow();
    });
  });
});
