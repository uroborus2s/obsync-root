import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateService } from '../services/TemplateService.js';

// Mock logger
const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
} as any;

describe('TemplateService - 基础功能测试', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService(mockLogger);
  });

  describe('您的输入变量示例测试', () => {
    it('应该正确处理您提供的输入变量配置', () => {
      const variables = {
        xnxq: '2024-01',
        forceSync: true,
        batchSize: 100
      };

      const config = {
        xnxq: '${xnxq}',
        forceSync: '${forceSync}',
        syncType: 'full',
        batchSize: '${batchSize}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        xnxq: '2024-01',
        forceSync: true,
        syncType: 'full',
        batchSize: 100
      });
    });

    it('应该保持正确的数据类型', () => {
      const variables = {
        stringVar: 'test-string',
        numberVar: 42,
        booleanVar: true,
        nullVar: null
      };

      const config = {
        str: '${stringVar}',
        num: '${numberVar}',
        bool: '${booleanVar}',
        nullVal: '${nullVar}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved.str).toBe('test-string');
      expect(resolved.num).toBe(42);
      expect(resolved.bool).toBe(true);
      expect(resolved.nullVal).toBe(null);
      
      // 验证类型
      expect(typeof resolved.str).toBe('string');
      expect(typeof resolved.num).toBe('number');
      expect(typeof resolved.bool).toBe('boolean');
      expect(resolved.nullVal).toBe(null);
    });
  });

  describe('嵌套对象路径访问', () => {
    it('应该支持点号路径访问', () => {
      const variables = {
        user: {
          profile: {
            name: 'John Doe',
            age: 30
          },
          settings: {
            theme: 'dark'
          }
        }
      };

      const config = {
        userName: '${user.profile.name}',
        userAge: '${user.profile.age}',
        theme: '${user.settings.theme}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        userName: 'John Doe',
        userAge: 30,
        theme: 'dark'
      });
    });
  });

  describe('复杂配置处理', () => {
    it('应该处理嵌套配置对象', () => {
      const variables = {
        host: 'localhost',
        port: 3306,
        user: 'admin',
        password: 'secret'
      };

      const config = {
        database: {
          connection: {
            host: '${host}',
            port: '${port}'
          },
          auth: {
            username: '${user}',
            password: '${password}'
          }
        },
        timeout: 5000
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        database: {
          connection: {
            host: 'localhost',
            port: 3306
          },
          auth: {
            username: 'admin',
            password: 'secret'
          }
        },
        timeout: 5000
      });
    });

    it('应该处理数组中的模板变量', () => {
      const variables = {
        env: 'production',
        version: '1.0.0'
      };

      const config = {
        environments: ['development', '${env}', 'staging'],
        metadata: {
          version: '${version}',
          tags: ['app', '${env}', 'v${version}']
        }
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        environments: ['development', 'production', 'staging'],
        metadata: {
          version: '1.0.0',
          tags: ['app', 'production', 'v1.0.0']
        }
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理未定义的变量', () => {
      const variables = { existingVar: 'value' };
      
      const config = {
        existing: '${existingVar}',
        missing: '${missingVar}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved.existing).toBe('value');
      expect(resolved.missing).toBeUndefined();
    });

    it('应该处理 null 和 undefined 配置值', () => {
      const variables = { var: 'test' };
      
      const config = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: '${var}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved.nullValue).toBe(null);
      expect(resolved.undefinedValue).toBe(undefined);
      expect(resolved.validValue).toBe('test');
    });
  });

  describe('工具方法测试', () => {
    it('extractVariableNames 应该正确提取变量名', () => {
      const expression = 'Config: ${host}:${port} for ${user.name}';
      const variables = templateService.extractVariableNames(expression);
      
      expect(variables).toEqual(['host', 'port', 'user.name']);
    });

    it('validateTemplateExpression 应该验证模板语法', () => {
      expect(templateService.validateTemplateExpression('${valid}')).toBe(true);
      expect(templateService.validateTemplateExpression('Hello ${name}')).toBe(true);
      expect(templateService.validateTemplateExpression('static string')).toBe(true);
    });

    it('getValueFromPath 应该正确获取嵌套值', () => {
      const variables = {
        user: { profile: { name: 'John' } },
        simple: 'value'
      };

      expect(templateService.getValueFromPath('simple', variables)).toBe('value');
      expect(templateService.getValueFromPath('user.profile.name', variables)).toBe('John');
      expect(templateService.getValueFromPath('nonexistent', variables)).toBeUndefined();
      expect(templateService.getValueFromPath('user.nonexistent', variables)).toBeUndefined();
    });
  });
});
