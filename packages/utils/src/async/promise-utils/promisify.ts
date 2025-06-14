/**
 * 提供回调式函数到Promise的转换功能
 *
 * 这些工具函数用于将Node.js风格的回调函数（error-first callback）
 * 转换为返回Promise的现代异步函数。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数转换
 *
 * @packageDocumentation
 */

/**
 * 将Node.js风格的回调函数转换为返回Promise的函数
 *
 * 此函数将遵循Node.js回调模式的函数（最后一个参数为(err, result) =\> \{\}）
 * 转换为返回Promise的函数，使其可以与async/await一起使用。
 *
 * @typeParam T - Promise解析结果的类型
 * @param fn - 遵循Node.js回调模式的函数
 * @returns 返回Promise的新函数
 * @throws `TypeError` 如果fn不是函数
 * @throws 如果原始回调接收到错误（err参数不为null）
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数转换
 *
 * @example
 * ```typescript
 * // 将Node.js的fs.readFile转换为Promise版本
 * import * as fs from 'fs';
 *
 * const readFileAsync = promisify(fs.readFile);
 *
 * // 使用async/await调用
 * async function readConfig() {
 *   try {
 *     const data = await readFileAsync('config.json', 'utf8');
 *     return JSON.parse(data);
 *   } catch (err) {
 *     console.error('读取配置文件失败:', err);
 *     return {};
 *   }
 * }
 *
 * // 处理多个返回值
 * // 某些Node.js API会在回调中提供多个参数
 * function multiResult(callback) {
 *   callback(null, 'value1', 'value2', 'value3');
 * }
 *
 * const multiResultAsync = promisify(multiResult);
 *
 * // 结果将是一个数组 ['value1', 'value2', 'value3']
 * const results = await multiResultAsync();
 * ```
 * @public
 */
export function promisify<T = any>(
  fn: (...args: any[]) => void
): (...args: any[]) => Promise<T> {
  if (typeof fn !== 'function') {
    throw new TypeError('Expected fn to be a function');
  }

  return function (...args: any[]): Promise<T> {
    return new Promise((resolve, reject) => {
      fn(...args, (err: any, result: T, ...rest: any[]) => {
        if (err) {
          reject(err);
        } else if (rest.length > 0) {
          // 如果回调有多个结果参数，则将它们合并为数组返回
          resolve([result, ...rest] as unknown as T);
        } else {
          resolve(result);
        }
      });
    });
  };
}

/**
 * 表示经过Promise化处理的对象类型
 *
 * 将对象中的回调式方法转换为返回Promise的方法，并添加Async后缀
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 类型定义
 *
 * @public
 */
export type PromisifiedObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => void
    ? (
        ...args: Parameters<T[K]> extends [...infer P, Function] ? P : never
      ) => Promise<any>
    : T[K];
} & {
  [K in keyof T as `${string & K}Async`]?: (...args: any[]) => Promise<any>;
};

/**
 * 将对象的多个回调风格函数转换为Promise风格
 *
 * 此函数遍历对象的指定方法（或全部方法），将每个回调风格的方法转换为
 * 返回Promise的方法，并添加Async后缀。原始方法保持不变。
 *
 * @typeParam T - 对象类型
 * @param target - 包含回调风格方法的对象
 * @param methods - 要转换的方法名的字符串数组（如果不提供，则尝试转换所有函数）
 * @returns 包含Promise版本方法的新对象
 * @throws `TypeError` 如果target不是对象
 * @remarks
 * 版本: 1.0.0
 * 分类: 函数转换
 *
 * @example
 * ```typescript
 * // 基本使用 - 转换特定方法
 * import * as fs from 'fs';
 *
 * const fsAsync = promisifyAll(fs, ['readFile', 'writeFile']);
 *
 * // 现在可以使用Promise版本的方法
 * async function copyFile(source, target) {
 *   const data = await fsAsync.readFileAsync(source);
 *   await fsAsync.writeFileAsync(target, data);
 *   console.log('文件复制完成');
 * }
 *
 * // 转换所有方法
 * const redisClient = createRedisClient();
 * const asyncRedis = promisifyAll(redisClient);
 *
 * // 使用Promise版本
 * async function cacheData() {
 *   await asyncRedis.setAsync('key', 'value');
 *   const value = await asyncRedis.getAsync('key');
 *   console.log(value); // 'value'
 * }
 * ```
 * @public
 */
export function promisifyAll<T extends Record<string, any>>(
  target: T,
  methods?: (keyof T)[]
): PromisifiedObject<T> {
  if (typeof target !== 'object' || target === null) {
    throw new TypeError('Expected target to be an object');
  }

  const result = { ...target } as PromisifiedObject<T>;

  // 确定要转换的方法列表
  const methodsToPromisify =
    methods && methods.length > 0
      ? methods
      : (Object.keys(target).filter(
          (key) => typeof target[key] === 'function'
        ) as (keyof T)[]);

  // 转换每个方法
  for (const method of methodsToPromisify) {
    const fn = target[method];
    if (typeof fn === 'function') {
      const asyncMethodName =
        `${String(method)}Async` as keyof PromisifiedObject<T>;
      (result as any)[asyncMethodName] = promisify(fn.bind(target));
    }
  }

  return result;
}
