/**
 * Either类型单元测试
 */
import { describe, it, expect } from 'vitest';
import {
  left,
  right,
  isLeft,
  isRight,
  map,
  chain,
  flatMap,
  fold,
  filter,
  bimap,
  ap,
  lift2,
  swap,
  all,
  toJSON,
  fromJSON,
  validate
} from '../either.js';

describe('Either', () => {
  describe('构造函数', () => {
    it('应该创建Left值', () => {
      const either = left('error');
      expect(isLeft(either)).toBe(true);
      expect(isRight(either)).toBe(false);
      if (isLeft(either)) {
        expect(either.left).toBe('error');
      }
    });

    it('应该创建Right值', () => {
      const either = right(42);
      expect(isRight(either)).toBe(true);
      expect(isLeft(either)).toBe(false);
      if (isRight(either)) {
        expect(either.right).toBe(42);
      }
    });
  });

  describe('map', () => {
    it('应该映射Right值', () => {
      const either = right(42);
      const result = map((x: number) => x * 2)(either);
      expect(isRight(result) && result.right).toBe(84);
    });

    it('应该保持Left值不变', () => {
      const either = left('error');
      const result = map((x: number) => x * 2)(either);
      expect(isLeft(result) && result.left).toBe('error');
    });
  });

  describe('chain/flatMap', () => {
    it('应该链接Right值', () => {
      const either = right(42);
      const result = chain((x: number) => right(x * 2))(either);
      expect(isRight(result) && result.right).toBe(84);
    });

    it('应该在chain中传播Left', () => {
      const either = left('error');
      const result = chain((x: number) => right(x * 2))(either);
      expect(isLeft(result) && result.left).toBe('error');
    });

    it('flatMap应该与chain相同', () => {
      const either = right(42);
      const chainResult = chain((x: number) => right(x * 2))(either);
      const flatMapResult = flatMap((x: number) => right(x * 2))(either);
      expect(chainResult).toEqual(flatMapResult);
    });
  });

  describe('fold', () => {
    it('应该在Left时调用onLeft', () => {
      const either = left('error');
      const result = fold(
        (err: string) => `Error: ${err}`,
        (val: number) => `Value: ${val}`
      )(either);
      expect(result).toBe('Error: error');
    });

    it('应该在Right时调用onRight', () => {
      const either = right(42);
      const result = fold(
        (err: string) => `Error: ${err}`,
        (val: number) => `Value: ${val}`
      )(either);
      expect(result).toBe('Value: 42');
    });
  });

  describe('filter', () => {
    it('应该保持满足条件的Right值', () => {
      const either = right(42);
      const result = filter(
        (x: number) => x > 40,
        () => 'too small'
      )(either);
      expect(isRight(result) && result.right).toBe(42);
    });

    it('应该将不满足条件的Right转为Left', () => {
      const either = right(30);
      const result = filter(
        (x: number) => x > 40,
        () => 'too small'
      )(either);
      expect(isLeft(result) && result.left).toBe('too small');
    });
  });

  describe('bimap', () => {
    it('应该映射Left值', () => {
      const either = left('error');
      const result = bimap(
        (err: string) => `Error: ${err}`,
        (val: number) => val * 2
      )(either);
      expect(isLeft(result) && result.left).toBe('Error: error');
    });

    it('应该映射Right值', () => {
      const either = right(42);
      const result = bimap(
        (err: string) => `Error: ${err}`,
        (val: number) => val * 2
      )(either);
      expect(isRight(result) && result.right).toBe(84);
    });
  });

  describe('lift2', () => {
    it('应该组合两个Right值', () => {
      const either1 = right(10);
      const either2 = right(5);
      const add = (a: number, b: number) => a + b;
      const result = lift2(add)(either1, either2);
      expect(isRight(result) && result.right).toBe(15);
    });

    it('应该传播第一个Left', () => {
      const either1 = left('error1');
      const either2 = right(5);
      const add = (a: number, b: number) => a + b;
      const result = lift2(add)(either1, either2);
      expect(isLeft(result) && result.left).toBe('error1');
    });
  });

  describe('swap', () => {
    it('应该交换Left和Right', () => {
      const leftEither = left('error');
      const rightEither = right(42);
      
      const swappedLeft = swap(leftEither);
      const swappedRight = swap(rightEither);
      
      expect(isRight(swappedLeft) && swappedLeft.right).toBe('error');
      expect(isLeft(swappedRight) && swappedRight.left).toBe(42);
    });
  });

  describe('all', () => {
    it('应该收集所有Right值', () => {
      const eithers = [right(1), right(2), right(3)];
      const result = all(eithers);
      expect(isRight(result) && result.right).toEqual([1, 2, 3]);
    });

    it('应该收集所有Left值', () => {
      const eithers = [left('err1'), right(2), left('err2')];
      const result = all(eithers);
      expect(isLeft(result) && result.left).toEqual(['err1', 'err2']);
    });
  });

  describe('序列化', () => {
    it('应该序列化和反序列化Right值', () => {
      const either = right(42);
      const json = toJSON(either);
      const restored = fromJSON(json);
      expect(restored).toEqual(either);
    });

    it('应该序列化和反序列化Left值', () => {
      const either = left('error');
      const json = toJSON(either);
      const restored = fromJSON(json);
      expect(restored).toEqual(either);
    });
  });

  describe('validate', () => {
    it('应该通过所有验证', () => {
      const isPositive = (x: number) => x > 0 ? right(x) : left('not positive');
      const isEven = (x: number) => x % 2 === 0 ? right(x) : left('not even');
      
      const result = validate(4, isPositive, isEven);
      expect(isRight(result) && result.right).toBe(4);
    });

    it('应该在第一个验证失败时停止', () => {
      const isPositive = (x: number) => x > 0 ? right(x) : left('not positive');
      const isEven = (x: number) => x % 2 === 0 ? right(x) : left('not even');
      
      const result = validate(-2, isPositive, isEven);
      expect(isLeft(result) && result.left).toBe('not positive');
    });
  });
});