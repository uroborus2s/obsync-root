/**
 * 工作流输入参数验证测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Logger } from '@stratix/core';
import InputValidationService from '../services/InputValidationService.js';
import type { WorkflowInput } from '../types/workflow.js';

describe('InputValidationService', () => {
  let inputValidationService: InputValidationService;
  let mockLogger: jest.Mocked<Logger>;

  beforeEach(() => {
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    } as any;

    inputValidationService = new InputValidationService(mockLogger);
  });

  describe('validateAndProcessInputs', () => {
    it('should validate required string parameter', async () => {
      const inputDefinitions: WorkflowInput[] = [
        {
          name: 'xnxq',
          type: 'string',
          required: true,
          description: '学年学期标识',
          validation: {
            pattern: '^[0-9]{4}-[0-9]{4}-[12]$'
          }
        }
      ];

      const rawInputs = {
        xnxq: '2023-2024-1'
      };

      const result = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        rawInputs
      );

      expect(result.valid).toBe(true);
      expect(result.processedInputs.xnxq).toBe('2023-2024-1');
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for invalid pattern', async () => {
      const inputDefinitions: WorkflowInput[] = [
        {
          name: 'xnxq',
          type: 'string',
          required: true,
          validation: {
            pattern: '^[0-9]{4}-[0-9]{4}-[12]$'
          }
        }
      ];

      const rawInputs = {
        xnxq: 'invalid-format'
      };

      const result = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        rawInputs
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('pattern');
      expect(result.errors[0].name).toBe('xnxq');
    });

    it('should apply default values', async () => {
      const inputDefinitions: WorkflowInput[] = [
        {
          name: 'forceSync',
          type: 'boolean',
          required: false,
          defaultValue: false,
          description: '是否强制同步'
        },
        {
          name: 'batchSize',
          type: 'number',
          required: false,
          defaultValue: 1000,
          description: '批处理大小'
        }
      ];

      const rawInputs = {};

      const result = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        rawInputs
      );

      expect(result.valid).toBe(true);
      expect(result.processedInputs.forceSync).toBe(false);
      expect(result.processedInputs.batchSize).toBe(1000);
    });

    it('should perform type coercion', async () => {
      const inputDefinitions: WorkflowInput[] = [
        {
          name: 'batchSize',
          type: 'number',
          required: true
        },
        {
          name: 'enabled',
          type: 'boolean',
          required: true
        }
      ];

      const rawInputs = {
        batchSize: '500', // 字符串转数字
        enabled: 'true'   // 字符串转布尔值
      };

      const result = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        rawInputs
      );

      expect(result.valid).toBe(true);
      expect(result.processedInputs.batchSize).toBe(500);
      expect(result.processedInputs.enabled).toBe(true);
    });

    it('should validate number ranges', async () => {
      const inputDefinitions: WorkflowInput[] = [
        {
          name: 'batchSize',
          type: 'number',
          required: true,
          validation: {
            min: 1,
            max: 10000
          }
        }
      ];

      // 测试超出范围的值
      const invalidInputs = {
        batchSize: 15000
      };

      const invalidResult = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        invalidInputs
      );

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].type).toBe('range');

      // 测试有效范围的值
      const validInputs = {
        batchSize: 500
      };

      const validResult = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        validInputs
      );

      expect(validResult.valid).toBe(true);
      expect(validResult.processedInputs.batchSize).toBe(500);
    });

    it('should validate enum values', async () => {
      const inputDefinitions: WorkflowInput[] = [
        {
          name: 'environment',
          type: 'string',
          required: true,
          validation: {
            enum: ['development', 'staging', 'production']
          }
        }
      ];

      // 测试无效枚举值
      const invalidInputs = {
        environment: 'invalid'
      };

      const invalidResult = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        invalidInputs
      );

      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors[0].type).toBe('enum');

      // 测试有效枚举值
      const validInputs = {
        environment: 'production'
      };

      const validResult = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        validInputs
      );

      expect(validResult.valid).toBe(true);
      expect(validResult.processedInputs.environment).toBe('production');
    });

    it('should handle missing required parameters', async () => {
      const inputDefinitions: WorkflowInput[] = [
        {
          name: 'requiredParam',
          type: 'string',
          required: true
        }
      ];

      const rawInputs = {};

      const result = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        rawInputs
      );

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('required');
      expect(result.errors[0].name).toBe('requiredParam');
    });

    it('should preserve undefined parameters in non-strict mode', async () => {
      const inputDefinitions: WorkflowInput[] = [
        {
          name: 'definedParam',
          type: 'string',
          required: true
        }
      ];

      const rawInputs = {
        definedParam: 'value',
        undefinedParam: 'should be preserved'
      };

      const result = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        rawInputs,
        { strict: false }
      );

      expect(result.valid).toBe(true);
      expect(result.processedInputs.definedParam).toBe('value');
      expect(result.processedInputs.undefinedParam).toBe('should be preserved');
      expect(result.warnings).toContain(
        "Parameter 'undefinedParam' is not defined in workflow inputs but will be preserved"
      );
    });

    it('should handle complex validation scenario', async () => {
      const inputDefinitions: WorkflowInput[] = [
        {
          name: 'xnxq',
          type: 'string',
          required: true,
          description: '学年学期标识',
          validation: {
            pattern: '^[0-9]{4}-[0-9]{4}-[12]$'
          }
        },
        {
          name: 'forceSync',
          type: 'boolean',
          required: false,
          defaultValue: false,
          description: '是否强制同步'
        },
        {
          name: 'batchSize',
          type: 'number',
          required: false,
          defaultValue: 1000,
          description: '批处理大小',
          validation: {
            min: 1,
            max: 10000
          }
        }
      ];

      const rawInputs = {
        xnxq: '2023-2024-1',
        batchSize: '500' // 字符串，需要类型转换
        // forceSync 未提供，应该使用默认值
      };

      const result = await inputValidationService.validateAndProcessInputs(
        inputDefinitions,
        rawInputs
      );

      expect(result.valid).toBe(true);
      expect(result.processedInputs.xnxq).toBe('2023-2024-1');
      expect(result.processedInputs.forceSync).toBe(false);
      expect(result.processedInputs.batchSize).toBe(500);
      expect(result.errors).toHaveLength(0);
    });
  });
});
