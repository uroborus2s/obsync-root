/**
 * 类型转换工具函数，提供各种数据类型的转换函数
 *
 * 这个模块包含了将各种数据类型相互转换的工具函数，
 * 如字符串、数字、布尔值、数组、对象和日期等。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型转换
 *
 * @packageDocumentation
 */

/**
 * 将任意值转换为字符串
 *
 * 安全地将任何值转换为字符串表示形式，包括 `null`、`undefined`、对象和数组。
 * 对于对象和数组，使用 JSON.stringify 进行转换。
 *
 * @param value - 要转换的值
 * @returns 转换后的字符串
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型转换
 *
 * @example
 * ```typescript
 * toString(123);        // '123'
 * toString(null);       // 'null'
 * toString(undefined);  // 'undefined'
 * toString({a: 1});     // '{"a":1}'
 * toString([1, 2, 3]);  // '[1,2,3]'
 * ```
 * @public
 */
export function toString(value: unknown): string {
  if (value === null) {
    return 'null';
  }

  if (value === undefined) {
    return 'undefined';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch (error) {
      return Object.prototype.toString.call(value);
    }
  }

  return String(value);
}

/**
 * 将任意值转换为数字
 *
 * 尝试将给定值转换为数字。如果无法转换，则返回默认值（默认为 0）。
 *
 * @param value - 要转换的值
 * @returns 转换后的数字
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型转换
 *
 * @example
 * ```typescript
 * toNumber('123');      // 123
 * toNumber('123.45');   // 123.45
 * toNumber('abc');      // 0
 * toNumber(null);       // 0
 * toNumber(true);       // 1
 * toNumber(false);      // 0
 * ```
 * @public
 */
export function toNumber(value: unknown): number {
  let result: number;

  if (value === null) {
    result = 0;
  } else if (value === undefined) {
    result = NaN;
  } else if (typeof value === 'boolean') {
    result = value ? 1 : 0;
  } else if (typeof value === 'string') {
    // 去除前后空格
    const trimmed = value.trim();
    if (trimmed === '') {
      result = 0;
    } else {
      result = Number(trimmed);
    }
  } else if (Array.isArray(value)) {
    if (value.length === 0) {
      result = 0;
    } else if (value.length === 1) {
      result = toNumber(value[0]);
    } else {
      result = NaN;
    }
  } else {
    result = Number(value);
  }

  return result;
}

/**
 * 将值转换为整数
 *
 * @example
 * ```typescript
 * toInteger('123.45');   // 123
 * toInteger(123.45);     // 123
 * toInteger('abc');      // 0
 * toInteger(null);       // 0
 * ```
 *
 * @param value - 要转换的值
 * @returns 转换后的整数，小数部分会被截断，如果无法转换则返回 0
 * @public
 */
export function toInteger(value: unknown): number {
  const number = toNumber(value);
  if (isNaN(number)) {
    return 0;
  }

  return Math.trunc(number);
}

/**
 * 将值转换为布尔值
 *
 * @example
 * ```typescript
 * toBoolean(1);          // true
 * toBoolean(0);          // false
 * toBoolean('true');     // true
 * toBoolean('false');    // false
 * toBoolean([]);         // true
 * toBoolean(null);       // false
 * ```
 *
 * @param value - 要转换的值
 * @returns 转换后的布尔值
 * @public
 */
export function toBoolean(value: unknown): boolean {
  if (typeof value === 'string' && value.toLowerCase() === 'false') {
    return false;
  }

  return Boolean(value);
}

/**
 * 将值转换为数组
 *
 * @example
 * ```typescript
 * toArray(null);         // []
 * toArray(undefined);    // []
 * toArray(1);            // [1]
 * toArray([1, 2, 3]);    // [1, 2, 3]
 * toArray(new Set([1, 2, 3])); // [1, 2, 3]
 * ```
 *
 * @param value - 要转换的值
 * @returns 如果输入已经是数组，则直接返回；否则将输入值放入一个新数组并返回
 * @public
 */
export function toArray<T>(value: T | T[] | null | undefined): T[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value;
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    Symbol.iterator in value &&
    typeof value !== 'string'
  ) {
    return Array.from(value as unknown as Iterable<T>);
  }

  return [value] as T[];
}

/**
 * 将值转换为对象
 *
 * @example
 * ```typescript
 * toObject(null);         // {}
 * toObject({a: 1});       // {a: 1}
 * toObject([['a', 1], ['b', 2]]); // {a: 1, b: 2}
 * toObject(new Map([['a', 1], ['b', 2]])); // {a: 1, b: 2}
 * ```
 *
 * @param value - 要转换的值
 * @returns 转换后的对象
 * @public
 */
export function toObject(value: unknown): Record<string, unknown> {
  if (value === null || value === undefined) {
    return {};
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  ) {
    return value as Record<string, unknown>;
  }

  if (value instanceof Map) {
    const result: Record<string, unknown> = {};
    value.forEach((val, key) => {
      result[String(key)] = val;
    });
    return result;
  }

  if (Array.isArray(value)) {
    if (value.every((item) => Array.isArray(item) && item.length === 2)) {
      const result: Record<string, unknown> = {};
      for (const [key, val] of value) {
        result[String(key)] = val;
      }
      return result;
    }

    return { ...value };
  }

  if (typeof value === 'string') {
    const result: Record<string, unknown> = {};
    for (let i = 0; i < value.length; i++) {
      result[i.toString()] = value[i];
    }
    return result;
  }

  if (typeof value === 'object') {
    return { ...(value as Record<string, unknown>) };
  }

  return { value };
}

/**
 * 将值转换为日期对象
 *
 * @example
 * ```typescript
 * toDate('2023-01-15');        // Date(2023-01-15)
 * toDate(1673740800000);       // Date(2023-01-15)
 * toDate([2023, 0, 15]);       // Date(2023-01-15)
 * ```
 *
 * @param value - 要转换的值
 * @returns 转换后的日期对象，如果无法转换则返回无效日期（new Date(NaN)）
 * @public
 */
export function toDate(value: unknown): Date {
  let result: Date;

  if (value instanceof Date) {
    result = new Date(value.getTime());
  } else if (typeof value === 'number') {
    result = new Date(value);
  } else if (Array.isArray(value) && value.length >= 3) {
    // 假设数组格式为 [year, month, day, hours, minutes, seconds, ms]
    const [year, month, day, hours = 0, minutes = 0, seconds = 0, ms = 0] =
      value;
    result = new Date(
      year as number,
      month as number,
      day as number,
      hours as number,
      minutes as number,
      seconds as number,
      ms as number
    );
  } else if (typeof value === 'string') {
    result = new Date(value);
  } else {
    result = new Date(NaN);
  }

  return result;
}
