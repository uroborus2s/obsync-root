import { beforeEach, describe, expect, test } from 'vitest';
import {
  generateId,
  generateNumberId,
  generateUUId,
  identity,
  isDevelopment,
  isNil,
  isNilOrEmpty,
  isPresent,
  isProduction,
  isTest,
  noop,
  safeExecute,
  safeExecuteAsync
} from '../src/common/index.js';

describe('通用工具函数模块', () => {
  // ID生成相关函数测试
  describe('ID生成相关函数', () => {
    test('isNil - 检查值是否为null或undefined', () => {
      expect(isNil(null)).toBe(true);
      expect(isNil(undefined)).toBe(true);
      expect(isNil(0)).toBe(false);
      expect(isNil('')).toBe(false);
      expect(isNil([])).toBe(false);
      expect(isNil({})).toBe(false);
    });

    test('generateNumberId - 生成数字格式的唯一ID', () => {
      // 默认参数
      const id = generateNumberId();
      expect(typeof id).toBe('string');
      expect(Number(id)).toBeGreaterThanOrEqual(4);
      expect(Number(id)).toBeLessThanOrEqual(16);

      // 自定义范围
      const customId = generateNumberId(100, 200);
      expect(Number(customId)).toBeGreaterThanOrEqual(100);
      expect(Number(customId)).toBeLessThanOrEqual(200);
    });

    test('generateUUId - 通过UUID生成唯一ID', () => {
      const uuid = generateUUId();
      // UUID格式正则
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(uuid).toMatch(uuidRegex);
    });

    test('generateId - 生成唯一ID', () => {
      const id = generateId();
      // 这是对generateUUId的包装器
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      expect(id).toMatch(uuidRegex);
    });
  });

  // 安全执行函数测试
  describe('安全执行函数', () => {
    test('safeExecute - 安全执行函数，出错时返回默认值', () => {
      // 正常执行
      const result1 = safeExecute(() => 42);
      expect(result1).toBe(42);

      // 执行出错
      const result2 = safeExecute(() => {
        throw new Error('测试错误');
      }, 'default');
      expect(result2).toBe('default');

      // 未提供默认值
      const result3 = safeExecute(() => {
        throw new Error('测试错误');
      });
      expect(result3).toBeUndefined();
    });

    test('safeExecuteAsync - 安全执行异步函数，出错时返回默认值', async () => {
      // 正常执行
      const result1 = await safeExecuteAsync(async () => 42);
      expect(result1).toBe(42);

      // 执行出错
      const result2 = await safeExecuteAsync(async () => {
        throw new Error('测试错误');
      }, 'default');
      expect(result2).toBe('default');

      // 未提供默认值
      const result3 = await safeExecuteAsync(async () => {
        throw new Error('测试错误');
      });
      expect(result3).toBeUndefined();
    });
  });

  // 类型守卫函数测试
  describe('类型守卫函数', () => {
    test('isNilOrEmpty - 检查值是否为null、undefined或空', () => {
      expect(isNilOrEmpty(null)).toBe(true);
      expect(isNilOrEmpty(undefined)).toBe(true);
      expect(isNilOrEmpty('')).toBe(true);
      expect(isNilOrEmpty([])).toBe(true);
      expect(isNilOrEmpty({})).toBe(true);
      expect(isNilOrEmpty(new Map())).toBe(true);
      expect(isNilOrEmpty(new Set())).toBe(true);

      expect(isNilOrEmpty(0)).toBe(false);
      expect(isNilOrEmpty('text')).toBe(false);
      expect(isNilOrEmpty([1, 2])).toBe(false);
      expect(isNilOrEmpty({ a: 1 })).toBe(false);
      expect(isNilOrEmpty(new Map([['a', 1]]))).toBe(false);
      expect(isNilOrEmpty(new Set([1]))).toBe(false);
    });

    test('isPresent - 检查值是否存在且非空', () => {
      expect(isPresent('text')).toBe(true);
      expect(isPresent([1, 2, 3])).toBe(true);
      expect(isPresent({ a: 1 })).toBe(true);

      expect(isPresent(null)).toBe(false);
      expect(isPresent(undefined)).toBe(false);
      expect(isPresent('')).toBe(false);
      expect(isPresent([])).toBe(false);
      expect(isPresent({})).toBe(false);
    });
  });

  // 环境检查函数测试
  describe('环境检查函数', () => {
    beforeEach(() => {
      // 保存原始环境变量
      const originalEnv = process.env.NODE_ENV;

      // 测试后恢复环境变量
      return () => {
        process.env.NODE_ENV = originalEnv;
      };
    });

    test('isProduction - 检查当前是否为生产环境', () => {
      process.env.NODE_ENV = 'production';
      expect(isProduction()).toBe(true);

      process.env.NODE_ENV = 'development';
      expect(isProduction()).toBe(false);
    });

    test('isDevelopment - 检查当前是否为开发环境', () => {
      process.env.NODE_ENV = 'development';
      expect(isDevelopment()).toBe(true);

      process.env.NODE_ENV = 'production';
      expect(isDevelopment()).toBe(false);
    });

    test('isTest - 检查当前是否为测试环境', () => {
      process.env.NODE_ENV = 'test';
      expect(isTest()).toBe(true);

      process.env.NODE_ENV = 'development';
      expect(isTest()).toBe(false);
    });
  });

  // 其他通用函数测试
  describe('其他通用函数', () => {
    test('noop - 空函数，不执行任何操作', () => {
      expect(noop()).toBeUndefined();
    });

    test('identity - 返回输入值的函数', () => {
      expect(identity(42)).toBe(42);
      expect(identity('text')).toBe('text');
      expect(identity(null)).toBe(null);

      const obj = { a: 1 };
      expect(identity(obj)).toBe(obj);

      // 测试在过滤场景中的使用
      const values = [0, '', false, null, undefined, 1, 'text'];
      expect(values.filter(identity)).toEqual([1, 'text']);
    });
  });
});
