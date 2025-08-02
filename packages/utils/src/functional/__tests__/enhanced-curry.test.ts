/**
 * 增强柯里化功能测试
 */

import { describe, it, expect } from 'vitest';
import { 
  partialAt,
  partialIf,
  partialLazy,
  partialMemo,
  debugCurry,
  perfCurry,
  safeCurry,
  CurryStats
} from '../curry.js';

describe('Enhanced Partial Application', () => {
  describe('partialAt', () => {
    it('应该在指定位置应用参数', () => {
      const fn = (a: number, b: string, c: boolean) => `${a}-${b}-${c}`;
      const partialFn = partialAt(fn, [0, 2], 1, true);
      
      const result = partialFn('hello');
      expect(result).toBe('1-hello-true');
    });
  });

  describe('partialIf', () => {
    it('应该根据条件决定是否应用固定参数', () => {
      const add = (a: number, b: number) => a + b;
      const conditionalAdd = partialIf(
        args => args.length === 2 && args[0] > 0,
        add,
        10
      );
      
      expect(conditionalAdd(5)).toBe(15); // 条件满足：10 + 5 = 15
      expect(conditionalAdd(-1, 3)).toBe(2); // 条件不满足，使用: -1 + 3 = 2
    });
  });

  describe('partialLazy', () => {
    it('应该延迟执行直到满足条件', () => {
      const multiply = (a: number, b: number, c: number) => a * b * c;
      const lazyMultiply = partialLazy(multiply);
      
      const step1 = lazyMultiply.apply(2);
      expect(typeof step1).toBe('function');
      
      const step2 = step1(3);
      expect(typeof step2).toBe('function');
      
      const result = step2(4);
      expect(result).toBe(24); // 2 * 3 * 4
    });
  });

  describe('partialMemo', () => {
    it('应该缓存结果', () => {
      let callCount = 0;
      const expensiveFn = (a: number, b: number) => {
        callCount++;
        return a + b;
      };
      
      const memoizedPartial = partialMemo(expensiveFn, 5);
      
      expect(memoizedPartial(3)).toBe(8);
      expect(callCount).toBe(1);
      
      expect(memoizedPartial(3)).toBe(8);
      expect(callCount).toBe(1); // 应该使用缓存，不再调用
      
      expect(memoizedPartial(7)).toBe(12);
      expect(callCount).toBe(2); // 新参数，需要调用
    });
  });
});

describe('Debug and Monitoring Tools', () => {
  describe('debugCurry', () => {
    it('应该记录函数调用信息', () => {
      const logs: string[] = [];
      const mockLogger = { info: (msg: string) => logs.push(msg) };
      
      const add = (a: number, b: number) => a + b;
      const debugAdd = debugCurry(add, { logger: mockLogger });
      
      const result = debugAdd(2)(3);
      
      expect(result).toBe(5);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(log => log.includes('Called with args'))).toBe(true);
    });
  });

  describe('safeCurry', () => {
    it('应该处理错误', () => {
      const throwingFn = (a: number) => {
        if (a < 0) throw new Error('Negative number');
        return a * 2;
      };
      
      const safeFn = safeCurry(throwingFn, { 
        onError: () => -1,
        logger: { error: () => {} }
      });
      
      expect(safeFn(5)).toBe(10);
      expect(safeFn(-1)).toBe(-1); // 错误处理返回
    });
  });

  describe('CurryStats', () => {
    it('应该收集函数调用统计信息', () => {
      const add = (a: number, b: number) => a + b;
      const statsAdd = CurryStats.curry(add, 'testAdd');
      
      statsAdd(2)(3);
      statsAdd(4)(5);
      
      const stats = CurryStats.getStats('testAdd');
      expect(stats?.calls).toBe(2);
      expect(stats?.errors).toBe(0);
      
      CurryStats.clearStats('testAdd');
    });
  });
});