/**
 * Maybe类型单元测试
 */
import { describe, expect, it } from 'vitest';
import {
  alt,
  chain,
  filter,
  firstSome,
  flatMap,
  fold,
  fromJSON,
  fromNullable,
  getOrElse,
  isNone,
  isSome,
  map,
  none,
  sequence,
  some,
  toJSON,
  when
} from '../maybe.js';

describe('Maybe', () => {
  describe('构造函数', () => {
    it('应该创建Some值', () => {
      const maybe = some(42);
      expect(isSome(maybe)).toBe(true);
      expect(isNone(maybe)).toBe(false);
      if (isSome(maybe)) {
        expect(maybe.value).toBe(42);
      }
    });

    it('应该创建None值', () => {
      expect(isNone(none)).toBe(true);
      expect(isSome(none)).toBe(false);
    });
  });

  describe('fromNullable', () => {
    it('应该从非空值创建Some', () => {
      const maybe = fromNullable(42);
      expect(isSome(maybe) && maybe.value).toBe(42);
    });

    it('应该从null创建None', () => {
      const maybe = fromNullable(null);
      expect(isNone(maybe)).toBe(true);
    });

    it('应该从undefined创建None', () => {
      const maybe = fromNullable(undefined);
      expect(isNone(maybe)).toBe(true);
    });
  });

  describe('map', () => {
    it('应该映射Some值', () => {
      const maybe = some(42);
      const result = map((x: number) => x * 2)(maybe);
      expect(isSome(result) && result.value).toBe(84);
    });

    it('应该保持None值不变', () => {
      const result = map((x: number) => x * 2)(none);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('chain/flatMap', () => {
    it('应该链接Some值', () => {
      const maybe = some(42);
      const result = chain((x: number) => some(x * 2))(maybe);
      expect(isSome(result) && result.value).toBe(84);
    });

    it('应该在chain中传播None', () => {
      const result = chain((x: number) => some(x * 2))(none);
      expect(isNone(result)).toBe(true);
    });

    it('flatMap应该与chain相同', () => {
      const maybe = some(42);
      const chainResult = chain((x: number) => some(x * 2))(maybe);
      const flatMapResult = flatMap((x: number) => some(x * 2))(maybe);
      expect(chainResult).toEqual(flatMapResult);
    });
  });

  describe('filter', () => {
    it('应该保持满足条件的Some值', () => {
      const maybe = some(42);
      const result = filter((x: number) => x > 40)(maybe);
      expect(isSome(result) && result.value).toBe(42);
    });

    it('应该将不满足条件的Some转为None', () => {
      const maybe = some(30);
      const result = filter((x: number) => x > 40)(maybe);
      expect(isNone(result)).toBe(true);
    });

    it('应该保持None不变', () => {
      const result = filter((x: number) => x > 40)(none);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('fold', () => {
    it('应该在None时调用onNone', () => {
      const result = fold(
        () => 'nothing',
        (val: number) => `value: ${val}`
      )(none);
      expect(result).toBe('nothing');
    });

    it('应该在Some时调用onSome', () => {
      const maybe = some(42);
      const result = fold(
        () => 'nothing',
        (val: number) => `value: ${val}`
      )(maybe);
      expect(result).toBe('value: 42');
    });
  });

  describe('getOrElse', () => {
    it('应该返回Some的值', () => {
      const maybe = some(42);
      const result = getOrElse(0)(maybe);
      expect(result).toBe(42);
    });

    it('应该返回None的默认值', () => {
      const result = getOrElse(0)(none);
      expect(result).toBe(0);
    });
  });

  describe('sequence', () => {
    it('应该序列化所有Some值', () => {
      const maybes = [some(1), some(2), some(3)];
      const result = sequence(maybes);
      expect(isSome(result) && result.value).toEqual([1, 2, 3]);
    });

    it('应该在遇到None时返回None', () => {
      const maybes = [some(1), none, some(3)];
      const result = sequence(maybes);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('alt', () => {
    it('应该保持第一个Some值', () => {
      const maybe1 = some(42);
      const maybe2 = some(24);
      const result = alt(maybe2)(maybe1);
      expect(isSome(result) && result.value).toBe(42);
    });

    it('应该选择备选的Some值', () => {
      const maybe1 = none;
      const maybe2 = some(24);
      const result = alt(maybe2)(maybe1);
      expect(isSome(result) && result.value).toBe(24);
    });
  });

  describe('firstSome', () => {
    it('应该返回第一个Some值', () => {
      const maybes = [none, some(42), some(24)];
      const result = firstSome(maybes);
      expect(isSome(result) && result.value).toBe(42);
    });

    it('应该在所有都是None时返回None', () => {
      const maybes = [none, none, none];
      const result = firstSome(maybes);
      expect(isNone(result)).toBe(true);
    });
  });

  describe('序列化', () => {
    it('应该序列化和反序列化Some值', () => {
      const maybe = some(42);
      const json = toJSON(maybe);
      const restored = fromJSON(json);
      expect(restored).toEqual(maybe);
    });

    it('应该序列化和反序列化None值', () => {
      const json = toJSON(none);
      const restored = fromJSON(json);
      expect(restored).toEqual(none);
    });
  });

  describe('when', () => {
    it('应该在条件为true时创建Some', () => {
      const result = when(true, () => 42);
      expect(isSome(result) && result.value).toBe(42);
    });

    it('应该在条件为false时创建None', () => {
      const result = when(false, () => 42);
      expect(isNone(result)).toBe(true);
    });
  });
});
