import { describe, it, expect, beforeEach } from 'vitest';
import { Logger } from '@stratix/core';
import TemplateService from '../TemplateService.js';

describe('TemplateService - Array Type Conversion', () => {
  let templateService: TemplateService;
  let mockLogger: Logger;

  beforeEach(() => {
    mockLogger = {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {}
    } as Logger;
    
    templateService = new TemplateService(mockLogger);
  });

  describe('数组类型转换', () => {
    it('应该正确处理数字数组', () => {
      const variables = { items: [1, 2, 3] };
      const expression = '${items}';
      
      const result = templateService.evaluateExpression(expression, variables);
      
      expect(result.value).toEqual([1, 2, 3]);
      expect(result.hasVariables).toBe(true);
      expect(result.missingVariables).toEqual([]);
    });

    it('应该正确处理字符串数组', () => {
      const variables = { tags: ['red', 'green', 'blue'] };
      const expression = '${tags}';
      
      const result = templateService.evaluateExpression(expression, variables);
      
      expect(result.value).toEqual(['red', 'green', 'blue']);
      expect(result.hasVariables).toBe(true);
    });

    it('应该正确处理空数组', () => {
      const variables = { empty: [] };
      const expression = '${empty}';
      
      const result = templateService.evaluateExpression(expression, variables);
      
      expect(result.value).toEqual([]);
      expect(result.hasVariables).toBe(true);
    });

    it('应该正确处理包含特殊字符的数组', () => {
      const variables = { messages: ['hello, world', 'test with spaces', 'special@chars'] };
      const expression = '${messages}';
      
      const result = templateService.evaluateExpression(expression, variables);
      
      expect(result.value).toEqual(['hello, world', 'test with spaces', 'special@chars']);
      expect(result.hasVariables).toBe(true);
    });

    it('应该正确处理混合类型数组', () => {
      const variables = { mixed: [1, 'hello', true, null, 3.14] };
      const expression = '${mixed}';
      
      const result = templateService.evaluateExpression(expression, variables);
      
      expect(result.value).toEqual([1, 'hello', true, null, 3.14]);
      expect(result.hasVariables).toBe(true);
    });

    it('应该正确处理嵌套数组', () => {
      const variables = { nested: [[1, 2], [3, 4], ['a', 'b']] };
      const expression = '${nested}';
      
      const result = templateService.evaluateExpression(expression, variables);
      
      expect(result.value).toEqual([[1, 2], [3, 4], ['a', 'b']]);
      expect(result.hasVariables).toBe(true);
    });

    it('应该正确处理对象中的数组', () => {
      const variables = { 
        user: { 
          name: 'John',
          hobbies: ['reading', 'coding', 'gaming']
        }
      };
      const expression = '${user.hobbies}';
      
      const result = templateService.evaluateExpression(expression, variables);
      
      expect(result.value).toEqual(['reading', 'coding', 'gaming']);
      expect(result.hasVariables).toBe(true);
    });
  });

  describe('resolveConfigVariables 中的数组处理', () => {
    it('应该在配置对象中正确处理数组', () => {
      const config = {
        items: '${tags}',
        count: '${tags.length}',
        first: '${tags[0]}'
      };
      const variables = { tags: ['a', 'b', 'c'] };
      
      const result = templateService.resolveConfigVariables(config, variables);
      
      expect(result.items).toEqual(['a', 'b', 'c']);
      // Note: tags.length and tags[0] 需要更复杂的模板处理，这里主要测试基本数组转换
    });

    it('应该在数组配置中正确处理数组元素', () => {
      const config = ['${items}', '${other}'];
      const variables = { 
        items: [1, 2, 3],
        other: 'string'
      };
      
      const result = templateService.resolveConfigVariables(config, variables);
      
      expect(result).toEqual([[1, 2, 3], 'string']);
    });
  });

  describe('边界情况处理', () => {
    it('应该处理非数组变量而不影响其他类型转换', () => {
      const variables = { 
        str: 'hello',
        num: 42,
        bool: true,
        nil: null
      };
      
      expect(templateService.evaluateExpression('${str}', variables).value).toBe('hello');
      expect(templateService.evaluateExpression('${num}', variables).value).toBe(42);
      expect(templateService.evaluateExpression('${bool}', variables).value).toBe(true);
      expect(templateService.evaluateExpression('${nil}', variables).value).toBe(null);
    });

    it('应该处理不存在的数组变量', () => {
      const variables = {};
      const expression = '${nonexistent}';
      
      const result = templateService.evaluateExpression(expression, variables);
      
      expect(result.missingVariables).toContain('nonexistent');
    });
  });
});
