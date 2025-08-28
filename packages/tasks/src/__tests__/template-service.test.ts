import { describe, it, expect, beforeEach } from 'vitest';
import { TemplateService } from '../services/TemplateService.js';

// Mock logger
const mockLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {}
} as any;

describe('TemplateService', () => {
  let templateService: TemplateService;

  beforeEach(() => {
    templateService = new TemplateService(mockLogger);
  });

  describe('getValueFromPath', () => {
    it('should get simple property value', () => {
      const variables = { name: 'test', age: 25 };
      expect(templateService.getValueFromPath('name', variables)).toBe('test');
      expect(templateService.getValueFromPath('age', variables)).toBe(25);
    });

    it('should get nested property value', () => {
      const variables = {
        user: {
          profile: {
            name: 'John Doe',
            settings: {
              theme: 'dark'
            }
          }
        }
      };
      
      expect(templateService.getValueFromPath('user.profile.name', variables)).toBe('John Doe');
      expect(templateService.getValueFromPath('user.profile.settings.theme', variables)).toBe('dark');
    });

    it('should return undefined for non-existent paths', () => {
      const variables = { name: 'test' };
      expect(templateService.getValueFromPath('nonexistent', variables)).toBeUndefined();
      expect(templateService.getValueFromPath('user.profile.name', variables)).toBeUndefined();
    });

    it('should handle null and undefined values in path', () => {
      const variables = { user: null, data: undefined };
      expect(templateService.getValueFromPath('user.name', variables)).toBeUndefined();
      expect(templateService.getValueFromPath('data.value', variables)).toBeUndefined();
    });
  });

  describe('evaluateExpression', () => {
    it('should replace simple variables', () => {
      const variables = { xnxq: '2024-01', forceSync: true, batchSize: 100 };
      
      const result1 = templateService.evaluateExpression('${xnxq}', variables);
      expect(result1.value).toBe('2024-01');
      expect(result1.hasVariables).toBe(true);

      const result2 = templateService.evaluateExpression('${forceSync}', variables);
      expect(result2.value).toBe(true);
      expect(result2.hasVariables).toBe(true);

      const result3 = templateService.evaluateExpression('${batchSize}', variables);
      expect(result3.value).toBe(100);
      expect(result3.hasVariables).toBe(true);
    });

    it('should handle nested object paths', () => {
      const variables = {
        user: { profile: { name: 'John' } },
        config: { database: { host: 'localhost' } }
      };

      const result1 = templateService.evaluateExpression('${user.profile.name}', variables);
      expect(result1.value).toBe('John');

      const result2 = templateService.evaluateExpression('${config.database.host}', variables);
      expect(result2.value).toBe('localhost');
    });

    it('should handle mixed content', () => {
      const variables = { name: 'John', age: 25 };
      
      const result = templateService.evaluateExpression('Hello ${name}, you are ${age} years old', variables);
      expect(result.value).toBe('Hello John, you are 25 years old');
      expect(result.hasVariables).toBe(true);
    });

    it('should return original value for non-template strings', () => {
      const variables = { name: 'John' };
      
      const result = templateService.evaluateExpression('static string', variables);
      expect(result.value).toBe('static string');
      expect(result.hasVariables).toBe(false);
    });

    it('should handle undefined variables', () => {
      const variables = { name: 'John' };
      
      const result = templateService.evaluateExpression('${nonexistent}', variables);
      expect(result.value).toBeUndefined();
      expect(result.hasVariables).toBe(true);
      expect(result.missingVariables).toContain('nonexistent');
    });

    it('should convert string representations to original types', () => {
      const variables = { 
        boolTrue: 'true', 
        boolFalse: 'false',
        number: '123',
        float: '123.45',
        nullValue: 'null',
        undefinedValue: 'undefined'
      };

      expect(templateService.evaluateExpression('${boolTrue}', variables).value).toBe(true);
      expect(templateService.evaluateExpression('${boolFalse}', variables).value).toBe(false);
      expect(templateService.evaluateExpression('${number}', variables).value).toBe(123);
      expect(templateService.evaluateExpression('${float}', variables).value).toBe(123.45);
      expect(templateService.evaluateExpression('${nullValue}', variables).value).toBe(null);
      expect(templateService.evaluateExpression('${undefinedValue}', variables).value).toBe(undefined);
    });
  });

  describe('resolveConfigVariables', () => {
    it('should resolve variables in your example configuration', () => {
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

    it('should handle nested objects', () => {
      const variables = { host: 'localhost', port: 3306, user: 'admin' };
      
      const config = {
        database: {
          host: '${host}',
          port: '${port}',
          credentials: {
            username: '${user}',
            password: 'static-password'
          }
        },
        timeout: 5000
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        database: {
          host: 'localhost',
          port: 3306,
          credentials: {
            username: 'admin',
            password: 'static-password'
          }
        },
        timeout: 5000
      });
    });

    it('should handle arrays', () => {
      const variables = { item1: 'first', item2: 'second' };
      
      const config = {
        items: ['${item1}', 'static', '${item2}'],
        nested: {
          array: ['prefix-${item1}', '${item2}-suffix']
        }
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        items: ['first', 'static', 'second'],
        nested: {
          array: ['prefix-first', 'second-suffix']
        }
      });
    });

    it('should handle null and undefined values', () => {
      const variables = { value: 'test' };
      
      const config = {
        nullValue: null,
        undefinedValue: undefined,
        validValue: '${value}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        nullValue: null,
        undefinedValue: undefined,
        validValue: 'test'
      });
    });

    it('should preserve non-string types', () => {
      const variables = { stringVar: 'test' };
      
      const config = {
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        object: { key: 'value' },
        template: '${stringVar}'
      };

      const resolved = templateService.resolveConfigVariables(config, variables);

      expect(resolved).toEqual({
        number: 123,
        boolean: true,
        array: [1, 2, 3],
        object: { key: 'value' },
        template: 'test'
      });
    });
  });

  describe('validateTemplateExpression', () => {
    it('should validate correct template expressions', () => {
      expect(templateService.validateTemplateExpression('${variable}')).toBe(true);
      expect(templateService.validateTemplateExpression('Hello ${name}')).toBe(true);
      expect(templateService.validateTemplateExpression('static string')).toBe(true);
      expect(templateService.validateTemplateExpression('')).toBe(true);
    });

    it('should handle non-string inputs', () => {
      expect(templateService.validateTemplateExpression(123 as any)).toBe(true);
      expect(templateService.validateTemplateExpression(null as any)).toBe(true);
      expect(templateService.validateTemplateExpression(undefined as any)).toBe(true);
    });
  });

  describe('extractVariableNames', () => {
    it('should extract variable names from template expressions', () => {
      expect(templateService.extractVariableNames('${variable}')).toEqual(['variable']);
      expect(templateService.extractVariableNames('${var1} and ${var2}')).toEqual(['var1', 'var2']);
      expect(templateService.extractVariableNames('${user.profile.name}')).toEqual(['user.profile.name']);
      expect(templateService.extractVariableNames('static string')).toEqual([]);
    });

    it('should handle complex expressions', () => {
      const expression = 'Config: ${config.host}:${config.port} for ${user.name}';
      const variables = templateService.extractVariableNames(expression);
      expect(variables).toEqual(['config.host', 'config.port', 'user.name']);
    });
  });

  describe('resolveMultipleConfigs', () => {
    it('should resolve multiple configurations', () => {
      const variables = { env: 'production', version: '1.0.0' };
      
      const configs = [
        { environment: '${env}', version: '${version}' },
        { name: 'app', environment: '${env}' },
        { static: 'value', dynamic: '${version}' }
      ];

      const resolved = templateService.resolveMultipleConfigs(configs, variables);

      expect(resolved).toEqual([
        { environment: 'production', version: '1.0.0' },
        { name: 'app', environment: 'production' },
        { static: 'value', dynamic: '1.0.0' }
      ]);
    });
  });
});
