/**
 * 增强柯里化和Optics功能测试
 */

import { describe, expect, it } from 'vitest';
import {
  curryAsync,
  curryBranch,
  CurryCache,
  curryIf,
  curryN,
  curryTyped,
  getPath,
  pipeCurried,
  setPath
} from '../curry.js';
import {
  immutable,
  lensIndex,
  lensPath,
  lensProp,
  modify,
  set,
  update,
  view
} from '../optics.js';

describe('Enhanced Curry Functions', () => {
  describe('curryTyped', () => {
    it('应该提供类型安全的柯里化', () => {
      const add = (a: number, b: number): number => a + b;
      const curriedAdd = curryTyped(add);

      expect(curriedAdd(2)(3)).toBe(5);
      expect(typeof curriedAdd(2)).toBe('function');
    });

    it('应该支持三参数函数', () => {
      const add3 = (a: number, b: number, c: number): number => a + b + c;
      const curriedAdd3 = curryTyped(add3);

      expect(curriedAdd3(1)(2)(3)).toBe(6);
    });
  });

  describe('curryAsync', () => {
    it('应该柯里化异步函数', async () => {
      const asyncAdd = async (a: number, b: number): Promise<number> => {
        return Promise.resolve(a + b);
      };

      const curriedAsyncAdd = curryAsync(asyncAdd);
      const result = await curriedAsyncAdd(2)(3);

      expect(result).toBe(5);
    });
  });

  describe('curryN', () => {
    it('应该支持自定义参数数量', () => {
      const fn = (...args: number[]): number => args.reduce((a, b) => a + b, 0);
      const curried3 = curryN(3, fn);

      expect(curried3(1)(2)(3)).toBe(6);
      expect(curried3(1, 2)(3)).toBe(6);
      expect(curried3(1, 2, 3)).toBe(6);
    });
  });

  describe('curryBranch', () => {
    it('应该根据条件执行不同分支', () => {
      const isEven = (x: number) => x % 2 === 0;
      const double = (x: number) => x * 2;
      const triple = (x: number) => x * 3;

      const conditionalTransform = curryBranch(isEven)(double)(triple);

      expect(conditionalTransform(4)).toBe(8); // even: 4 * 2
      expect(conditionalTransform(3)).toBe(9); // odd: 3 * 3
    });
  });

  describe('getPath and setPath', () => {
    it('应该正确获取和设置嵌套路径', () => {
      const obj = { a: { b: { c: 42 } } };
      const path = ['a', 'b', 'c'];

      expect(getPath(path)(obj)).toBe(42);

      const updated = setPath(path)(100)(obj);
      expect(updated.a.b.c).toBe(100);
      expect(obj.a.b.c).toBe(42); // 原对象不变
    });
  });

  describe('CurryCache', () => {
    it('应该缓存柯里化函数', () => {
      const fn = (a: number, b: number) => a + b;

      const cached1 = CurryCache.get(fn);
      const cached2 = CurryCache.get(fn);

      expect(cached1).toBe(cached2);
      expect(cached1(2)(3)).toBe(5);
    });
  });

  describe('pipeCurried', () => {
    it('应该管道式执行柯里化函数', () => {
      const add2 = (x: number) => x + 2;
      const multiply3 = (x: number) => x * 3;
      const pipeline = pipeCurried(add2, multiply3);

      expect(pipeline(5)).toBe(21); // (5 + 2) * 3
    });
  });

  describe('curryIf', () => {
    it('应该条件性执行函数', () => {
      const isPositive = (args: [number, number]) => args[0] > 0 && args[1] > 0;
      const add = (a: number, b: number) => a + b;
      const conditionalAdd = curryIf(isPositive, add, 0);

      expect(conditionalAdd(2, 3)).toBe(5);
      expect(conditionalAdd(-1, 3)).toBe(0);
    });
  });
});

describe('Optics (Lens系统)', () => {
  interface User {
    id: number;
    name: string;
    address: {
      street: string;
      city: string;
      country: string;
    };
    tags: string[];
  }

  const testUser: User = {
    id: 1,
    name: 'Alice',
    address: {
      street: '123 Main St',
      city: 'Wonderland',
      country: 'Fantasy'
    },
    tags: ['developer', 'typescript']
  };

  describe('lensProp', () => {
    it('应该聚焦到对象属性', () => {
      const nameLens = lensProp<User, 'name'>('name');

      expect(view(nameLens)(testUser)).toBe('Alice');

      const updatedUser = set(nameLens, 'Bob')(testUser);
      expect(updatedUser.name).toBe('Bob');
      expect(testUser.name).toBe('Alice'); // 原对象不变
    });
  });

  describe('lensPath', () => {
    it('应该聚焦到嵌套路径', () => {
      const cityLens = lensPath<User>(['address', 'city']);

      expect(view(cityLens)(testUser)).toBe('Wonderland');

      const updatedUser = set(cityLens, 'New City')(testUser);
      expect(updatedUser.address.city).toBe('New City');
      expect(testUser.address.city).toBe('Wonderland');
    });
  });

  describe('lensIndex', () => {
    it('应该聚焦到数组索引', () => {
      const firstTagLens = lensIndex<string>(0);

      expect(view(firstTagLens)(testUser.tags)).toBe('developer');

      const updatedTags = set(firstTagLens, 'senior-developer')(testUser.tags);
      expect(updatedTags[0]).toBe('senior-developer');
      expect(testUser.tags[0]).toBe('developer');
    });
  });

  describe('modify', () => {
    it('应该使用函数修改值', () => {
      const nameLens = lensProp<User, 'name'>('name');
      const updatedUser = modify(nameLens, (name) => name.toUpperCase())(
        testUser
      );

      expect(updatedUser.name).toBe('ALICE');
      expect(testUser.name).toBe('Alice');
    });
  });

  describe('update helpers', () => {
    it('应该提供便捷的更新方法', () => {
      const updated = update.prop<User, 'name'>('name', 'Bob')(testUser);
      expect(updated.name).toBe('Bob');

      const modified = update.modifyProp<User, 'name'>('name', (name: string) =>
        name.toUpperCase()
      )(testUser);
      expect(modified.name).toBe('ALICE');
    });

    it('应该处理数组更新', () => {
      const arr = [1, 2, 3];

      expect(update.index(1, 10)(arr)).toEqual([1, 10, 3]);
      expect(update.append(4)(arr)).toEqual([1, 2, 3, 4]);
      expect(update.prepend(0)(arr)).toEqual([0, 1, 2, 3]);
      expect(update.remove(1)(arr)).toEqual([1, 3]);
    });
  });

  describe('immutable helpers', () => {
    it('应该提供不可变的嵌套操作', () => {
      const updated = immutable.setIn(
        ['address', 'city'],
        'New City'
      )(testUser);
      expect((updated as any).address.city).toBe('New City');
      expect(testUser.address.city).toBe('Wonderland');

      const city = immutable.getIn(['address', 'city'])(testUser);
      expect(city).toBe('Wonderland');

      const modified = immutable.updateIn(['address', 'city'], (city: string) =>
        city.toUpperCase()
      )(testUser);
      expect((modified as any).address.city).toBe('WONDERLAND');
    });

    it('应该删除嵌套属性', () => {
      const withoutCity = immutable.deleteIn(['address', 'city'])(testUser);
      expect((withoutCity as any).address.city).toBeUndefined();
      expect('city' in (withoutCity as any).address).toBe(false);
      expect(testUser.address.city).toBe('Wonderland');
    });
  });
});
