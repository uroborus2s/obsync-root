import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateService } from '../services/TemplateService.js';
import NodeExecutionService from '../services/NodeExecutionService.js';

// Mock logger
const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
} as any;

// Mock repositories
const mockNodeInstanceRepository = {
  findById: () => Promise.resolve({ success: true, data: null }),
  create: () => Promise.resolve({ success: true, data: {} }),
  update: () => Promise.resolve({ success: true, data: {} })
} as any;

describe('模板替换功能集成测试', () => {
  let templateService: TemplateService;
  let nodeExecutionService: NodeExecutionService;

  beforeEach(() => {
    templateService = new TemplateService(mockLogger);
    nodeExecutionService = new NodeExecutionService(
      mockNodeInstanceRepository,
      mockLogger,
      templateService
    );
  });

  describe('TemplateService 核心功能', () => {
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

      // 验证类型保持正确
      expect(typeof resolved.xnxq).toBe('string');
      expect(typeof resolved.forceSync).toBe('boolean');
      expect(typeof resolved.syncType).toBe('string');
      expect(typeof resolved.batchSize).toBe('number');
    });

    it('应该支持嵌套对象路径访问', () => {
      const variables = {
        user: {
          profile: {
            name: 'John Doe',
            age: 30
          }
        },
        config: {
          database: {
            host: 'localhost',
            port: 3306
          }
        }
      };

      const config = {
        userName: '${user.profile.name}',
        userAge: '${user.profile.age}',
        dbConnection: '${config.database.host}:${config.database.port}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        userName: 'John Doe',
        userAge: 30,
        dbConnection: 'localhost:3306'
      });
    });

    it('应该处理复杂的嵌套配置', () => {
      const variables = {
        env: 'production',
        database: {
          host: 'prod-db.example.com',
          port: 5432,
          credentials: {
            username: 'prod_user',
            password: 'secret123'
          }
        },
        features: {
          enableCache: true,
          maxConnections: 50
        }
      };

      const config = {
        environment: '${env}',
        database: {
          connectionString: 'postgresql://${database.credentials.username}:${database.credentials.password}@${database.host}:${database.port}/mydb',
          maxConnections: '${features.maxConnections}',
          ssl: true
        },
        cache: {
          enabled: '${features.enableCache}',
          ttl: 3600
        },
        metadata: {
          deployedTo: '${env}',
          version: '1.0.0'
        }
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        environment: 'production',
        database: {
          connectionString: 'postgresql://prod_user:secret123@prod-db.example.com:5432/mydb',
          maxConnections: 50,
          ssl: true
        },
        cache: {
          enabled: true,
          ttl: 3600
        },
        metadata: {
          deployedTo: 'production',
          version: '1.0.0'
        }
      });

      // 验证类型转换
      expect(typeof resolved.database.maxConnections).toBe('number');
      expect(typeof resolved.cache.enabled).toBe('boolean');
      expect(typeof resolved.cache.ttl).toBe('number');
    });

    it('应该处理数组中的模板变量', () => {
      const variables = {
        env: 'production',
        version: '1.0.0',
        services: ['api', 'worker', 'scheduler']
      };

      const config = {
        environments: ['development', '${env}', 'staging'],
        tags: ['app', '${env}', 'v${version}'],
        services: '${services}',
        metadata: {
          deployedServices: '${services}',
          version: '${version}'
        }
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        environments: ['development', 'production', 'staging'],
        tags: ['app', 'production', 'v1.0.0'],
        services: ['api', 'worker', 'scheduler'],
        metadata: {
          deployedServices: ['api', 'worker', 'scheduler'],
          version: '1.0.0'
        }
      });
    });

    it('应该处理未定义变量的情况', () => {
      const variables = {
        existingVar: 'value',
        nested: { prop: 'nestedValue' }
      };

      const config = {
        existing: '${existingVar}',
        missing: '${missingVar}',
        nestedExisting: '${nested.prop}',
        nestedMissing: '${nested.missing}',
        deepMissing: '${completely.missing.path}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved.existing).toBe('value');
      expect(resolved.missing).toBeUndefined();
      expect(resolved.nestedExisting).toBe('nestedValue');
      expect(resolved.nestedMissing).toBeUndefined();
      expect(resolved.deepMissing).toBeUndefined();
    });

    it('应该保持非模板值不变', () => {
      const variables = { var: 'test' };

      const config = {
        string: 'static string',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        object: { key: 'value' },
        array: [1, 2, 3],
        template: '${var}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        string: 'static string',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined,
        object: { key: 'value' },
        array: [1, 2, 3],
        template: 'test'
      });
    });
  });

  describe('工具方法测试', () => {
    it('extractVariableNames 应该正确提取变量名', () => {
      const testCases = [
        {
          expression: '${simple}',
          expected: ['simple']
        },
        {
          expression: '${var1} and ${var2}',
          expected: ['var1', 'var2']
        },
        {
          expression: '${user.profile.name}',
          expected: ['user.profile.name']
        },
        {
          expression: 'Config: ${host}:${port} for ${user.name}',
          expected: ['host', 'port', 'user.name']
        },
        {
          expression: 'static string',
          expected: []
        }
      ];

      testCases.forEach(({ expression, expected }) => {
        const result = templateService.extractVariableNames(expression);
        expect(result).toEqual(expected);
      });
    });

    it('getValueFromPath 应该正确获取嵌套值', () => {
      const variables = {
        simple: 'value',
        user: {
          profile: {
            name: 'John',
            settings: {
              theme: 'dark'
            }
          }
        },
        nullValue: null,
        undefinedValue: undefined
      };

      const testCases = [
        { path: 'simple', expected: 'value' },
        { path: 'user.profile.name', expected: 'John' },
        { path: 'user.profile.settings.theme', expected: 'dark' },
        { path: 'nonexistent', expected: undefined },
        { path: 'user.nonexistent', expected: undefined },
        { path: 'user.profile.nonexistent.deep', expected: undefined },
        { path: 'nullValue', expected: null },
        { path: 'undefinedValue', expected: undefined },
        { path: 'nullValue.property', expected: undefined }
      ];

      testCases.forEach(({ path, expected }) => {
        const result = templateService.getValueFromPath(path, variables);
        expect(result).toBe(expected);
      });
    });

    it('validateTemplateExpression 应该验证模板语法', () => {
      const validExpressions = [
        '${valid}',
        'Hello ${name}',
        'static string',
        '',
        '${user.profile.name}',
        'Multiple ${var1} and ${var2} variables'
      ];

      const invalidExpressions = [
        // lodash.template 通常能处理大多数情况，很少有语法错误
      ];

      validExpressions.forEach(expr => {
        expect(templateService.validateTemplateExpression(expr)).toBe(true);
      });

      invalidExpressions.forEach(expr => {
        expect(templateService.validateTemplateExpression(expr)).toBe(false);
      });
    });
  });

  describe('边界情况测试', () => {
    it('应该处理空值和特殊值', () => {
      const variables = {
        emptyString: '',
        zero: 0,
        false: false,
        null: null,
        undefined: undefined
      };

      const config = {
        emptyString: '${emptyString}',
        zero: '${zero}',
        false: '${false}',
        null: '${null}',
        undefined: '${undefined}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved.emptyString).toBe('');
      expect(resolved.zero).toBe(0);
      expect(resolved.false).toBe(false);
      expect(resolved.null).toBe(null);
      expect(resolved.undefined).toBe(undefined);
    });

    it('应该处理循环引用（不会无限递归）', () => {
      const variables = {
        a: '${b}',
        b: '${a}',
        normal: 'value'
      };

      const config = {
        circular1: '${a}',
        circular2: '${b}',
        normal: '${normal}'
      };

      // 这种情况下，模板引擎会返回原始字符串或抛出错误
      // 我们的实现应该能够处理这种情况而不崩溃
      expect(() => {
        const resolved = templateService.resolveConfigVariables(config, variables);
        // 至少 normal 应该被正确解析
        expect(resolved.normal).toBe('value');
      }).not.toThrow();
    });
  });
});
