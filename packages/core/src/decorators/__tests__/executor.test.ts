// 执行器装饰器测试
// 测试执行器装饰器的功能

import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import {
  Executor,
  getExecutorMetadata,
  getExecutorName,
  isExecutor
} from '../executor.js';
import { MetadataManager } from '../metadata.js';

describe('Executor decorators', () => {
  beforeEach(() => {
    // 清理元数据
    if (typeof TestExecutor !== 'undefined') {
      MetadataManager.clearAllMetadata(TestExecutor);
    }
  });

  describe('@Executor decorator', () => {
    it('should register executor with name only', () => {
      @Executor('testExecutor')
      class TestExecutor {
        name = 'testExecutor';
        async execute() {
          return { success: true };
        }
      }

      const metadata = getExecutorMetadata(TestExecutor);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('testExecutor');
      expect(isExecutor(TestExecutor)).toBe(true);
    });

    it('should register executor with options object', () => {
      @Executor({
        name: 'userCreator',
        description: '用户创建执行器',
        version: '1.0.0',
        tags: ['user', 'creation'],
        category: 'business'
      })
      class UserCreatorExecutor {
        name = 'userCreator';
        async execute() {
          return { success: true };
        }
      }

      const metadata = getExecutorMetadata(UserCreatorExecutor);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('userCreator');
      expect(metadata?.description).toBe('用户创建执行器');
      expect(metadata?.version).toBe('1.0.0');
      expect(metadata?.tags).toEqual(['user', 'creation']);
      expect(metadata?.category).toBe('business');
      expect(isExecutor(UserCreatorExecutor)).toBe(true);
    });

    it('should auto-generate name from class name', () => {
      @Executor()
      class EmailSenderExecutor {
        name = 'emailSender';
        async execute() {
          return { success: true };
        }
      }

      const metadata = getExecutorMetadata(EmailSenderExecutor);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('emailsender'); // 自动生成的名称
      expect(isExecutor(EmailSenderExecutor)).toBe(true);
    });

    it('should handle executor with config schema', () => {
      const configSchema = {
        type: 'object',
        properties: {
          apiKey: { type: 'string' },
          timeout: { type: 'number' }
        },
        required: ['apiKey']
      };

      @Executor({
        name: 'apiExecutor',
        configSchema,
        validateConfig: true,
        timeout: 5000
      })
      class ApiExecutor {
        name = 'apiExecutor';
        async execute() {
          return { success: true };
        }
      }

      const metadata = getExecutorMetadata(ApiExecutor);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('apiExecutor');
      expect(metadata?.configSchema).toEqual(configSchema);
      expect(metadata?.options?.validateConfig).toBe(true);
      expect(metadata?.options?.timeout).toBe(5000);
    });

    it('should work with name and options parameters', () => {
      @Executor('customName', {
        description: '自定义名称执行器',
        healthCheck: true
      })
      class CustomExecutor {
        name = 'customName';
        async execute() {
          return { success: true };
        }
      }

      const metadata = getExecutorMetadata(CustomExecutor);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('customName');
      expect(metadata?.description).toBe('自定义名称执行器');
      expect(metadata?.options?.healthCheck).toBe(true);
    });
  });

  describe('getExecutorName function', () => {
    it('should return executor name', () => {
      @Executor('namedExecutor')
      class NamedExecutor {
        name = 'namedExecutor';
        async execute() {
          return { success: true };
        }
      }

      expect(getExecutorName(NamedExecutor)).toBe('namedExecutor');
    });

    it('should return undefined for non-executor class', () => {
      class RegularClass {}

      expect(getExecutorName(RegularClass)).toBeUndefined();
    });
  });

  describe('isExecutor function', () => {
    it('should return true for executor class', () => {
      @Executor('testExecutor')
      class TestExecutor {
        name = 'testExecutor';
        async execute() {
          return { success: true };
        }
      }

      expect(isExecutor(TestExecutor)).toBe(true);
    });

    it('should return false for non-executor class', () => {
      class RegularClass {}

      expect(isExecutor(RegularClass)).toBe(false);
    });
  });

  describe('MetadataManager integration', () => {
    it('should integrate with MetadataManager', () => {
      @Executor({
        name: 'integrationTest',
        description: '集成测试执行器'
      })
      class IntegrationTestExecutor {
        name = 'integrationTest';
        async execute() {
          return { success: true };
        }
      }

      // 使用 MetadataManager 直接访问
      expect(MetadataManager.isExecutor(IntegrationTestExecutor)).toBe(true);
      expect(MetadataManager.getExecutorName(IntegrationTestExecutor)).toBe('integrationTest');

      const metadata = MetadataManager.getExecutorMetadata(IntegrationTestExecutor);
      expect(metadata?.description).toBe('集成测试执行器');
    });

    it('should clear metadata correctly', () => {
      @Executor('clearTest')
      class ClearTestExecutor {
        name = 'clearTest';
        async execute() {
          return { success: true };
        }
      }

      expect(isExecutor(ClearTestExecutor)).toBe(true);

      MetadataManager.clearAllMetadata(ClearTestExecutor);
      expect(isExecutor(ClearTestExecutor)).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty options', () => {
      @Executor({})
      class EmptyOptionsExecutor {
        name = 'emptyOptions';
        async execute() {
          return { success: true };
        }
      }

      const metadata = getExecutorMetadata(EmptyOptionsExecutor);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('emptyoptions'); // 自动生成
    });

    it('should handle complex options', () => {
      @Executor({
        name: 'complexExecutor',
        description: '复杂执行器',
        version: '2.1.0',
        tags: ['complex', 'test', 'advanced'],
        category: 'system',
        retries: 3,
        timeout: 10000,
        customProperty: 'customValue'
      })
      class ComplexExecutor {
        name = 'complexExecutor';
        async execute() {
          return { success: true };
        }
      }

      const metadata = getExecutorMetadata(ComplexExecutor);
      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('complexExecutor');
      expect(metadata?.description).toBe('复杂执行器');
      expect(metadata?.version).toBe('2.1.0');
      expect(metadata?.tags).toEqual(['complex', 'test', 'advanced']);
      expect(metadata?.category).toBe('system');
      expect(metadata?.options?.retries).toBe(3);
      expect(metadata?.options?.timeout).toBe(10000);
      expect(metadata?.options?.customProperty).toBe('customValue');
    });
  });
});
