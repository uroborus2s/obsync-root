// @stratix/core 应用级自动依赖注入测试
// 测试应用级模块的自动发现和注册功能

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createContainer, type AwilixContainer } from 'awilix';
import { performApplicationAutoDI, type ApplicationAutoDIConfig } from '../application-auto-di.js';
import { join } from 'node:path';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';

describe('Application Auto DI', () => {
  let container: AwilixContainer;
  let testDir: string;

  beforeEach(() => {
    // 创建测试容器
    container = createContainer();
    
    // 创建临时测试目录
    testDir = join(process.cwd(), 'test-app-auto-di');
    mkdirSync(testDir, { recursive: true });
    mkdirSync(join(testDir, 'services'), { recursive: true });
    mkdirSync(join(testDir, 'repositories'), { recursive: true });
    mkdirSync(join(testDir, 'controllers'), { recursive: true });
  });

  afterEach(() => {
    // 清理测试目录
    try {
      rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // 忽略清理错误
    }
  });

  describe('performApplicationAutoDI', () => {
    it('should register modules from application directories', async () => {
      // 创建测试模块文件
      writeFileSync(
        join(testDir, 'services', 'TestService.ts'),
        `
export default class TestService {
  getName() {
    return 'TestService';
  }
}
        `
      );

      writeFileSync(
        join(testDir, 'repositories', 'TestRepository.ts'),
        `
export default class TestRepository {
  getName() {
    return 'TestRepository';
  }
}
        `
      );

      writeFileSync(
        join(testDir, 'controllers', 'TestController.ts'),
        `
export default class TestController {
  getName() {
    return 'TestController';
  }
}
        `
      );

      const config: Partial<ApplicationAutoDIConfig> = {
        enabled: true,
        patterns: [
          'services/**/*.{ts,js}',
          'repositories/**/*.{ts,js}',
          'controllers/**/*.{ts,js}'
        ],
        debug: true
      };

      // 执行自动依赖注入
      const result = await performApplicationAutoDI(container, config, testDir);

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.moduleCount).toBe(3);
      expect(result.registeredModules).toHaveLength(3);
      expect(result.registeredModules).toContain('testService');
      expect(result.registeredModules).toContain('testRepository');
      expect(result.registeredModules).toContain('testController');

      // 验证模块已注册到容器
      expect(container.hasRegistration('testService')).toBe(true);
      expect(container.hasRegistration('testRepository')).toBe(true);
      expect(container.hasRegistration('testController')).toBe(true);

      // 验证可以解析模块
      const testService = container.resolve('testService');
      expect(testService.getName()).toBe('TestService');
    });

    it('should handle disabled auto DI', async () => {
      const config: Partial<ApplicationAutoDIConfig> = {
        enabled: false
      };

      const result = await performApplicationAutoDI(container, config, testDir);

      expect(result.success).toBe(true);
      expect(result.moduleCount).toBe(0);
      expect(result.registeredModules).toHaveLength(0);
    });

    it('should handle empty directories gracefully', async () => {
      const config: Partial<ApplicationAutoDIConfig> = {
        enabled: true,
        patterns: [
          'services/**/*.{ts,js}',
          'repositories/**/*.{ts,js}',
          'controllers/**/*.{ts,js}'
        ]
      };

      const result = await performApplicationAutoDI(container, config, testDir);

      expect(result.success).toBe(true);
      expect(result.moduleCount).toBe(0);
      expect(result.registeredModules).toHaveLength(0);
    });

    it('should handle invalid directory path', async () => {
      const config: Partial<ApplicationAutoDIConfig> = {
        enabled: true,
        patterns: [
          'services/**/*.{ts,js}',
          'repositories/**/*.{ts,js}',
          'controllers/**/*.{ts,js}'
        ]
      };

      const invalidPath = join(testDir, 'non-existent');
      const result = await performApplicationAutoDI(container, config, invalidPath);

      // 应该成功但没有注册任何模块
      expect(result.success).toBe(true);
      expect(result.moduleCount).toBe(0);
    });

    it('should use default configuration when no config provided', async () => {
      const result = await performApplicationAutoDI(container, {}, testDir);

      expect(result.success).toBe(true);
      expect(result.moduleCount).toBe(0);
      expect(result.registeredModules).toHaveLength(0);
    });

    it('should handle custom patterns', async () => {
      // 创建自定义目录结构
      mkdirSync(join(testDir, 'custom'), { recursive: true });
      writeFileSync(
        join(testDir, 'custom', 'CustomModule.ts'),
        `
export default class CustomModule {
  getName() {
    return 'CustomModule';
  }
}
        `
      );

      const config: Partial<ApplicationAutoDIConfig> = {
        enabled: true,
        patterns: ['custom/**/*.{ts,js}'],
        debug: true
      };

      const result = await performApplicationAutoDI(container, config, testDir);

      expect(result.success).toBe(true);
      expect(result.moduleCount).toBe(1);
      expect(result.registeredModules).toContain('customModule');
      expect(container.hasRegistration('customModule')).toBe(true);
    });
  });

  describe('Configuration merging', () => {
    it('should merge partial config with defaults', async () => {
      const partialConfig: Partial<ApplicationAutoDIConfig> = {
        debug: true
      };

      const result = await performApplicationAutoDI(container, partialConfig, testDir);

      expect(result.success).toBe(true);
      // 应该使用默认的 patterns
    });

    it('should override default patterns when provided', async () => {
      const customConfig: Partial<ApplicationAutoDIConfig> = {
        patterns: ['custom-pattern/**/*.{ts,js}']
      };

      const result = await performApplicationAutoDI(container, customConfig, testDir);

      expect(result.success).toBe(true);
      // 应该使用自定义的 patterns 而不是默认的
    });
  });
});
