/**
 * 回调转Promise相关函数
 */

/**
 * 将回调风格的函数转换为返回Promise的函数
 * @param fn 遵循Node.js回调模式的函数（最后一个参数为(err, result) => {}）
 * @returns 返回Promise的函数
 */
export function promisify<T = any>(
  fn: (...args: any[]) => void
): (...args: any[]) => Promise<T> {
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

type PromisifiedObject<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => void
    ? (
        ...args: Parameters<T[K]> extends [...infer P, Function] ? P : never
      ) => Promise<any>
    : T[K];
} & {
  [K in keyof T as `${string & K}Async`]?: (...args: any[]) => Promise<any>;
};

/**
 * 将多个回调风格的函数转换为Promise风格
 * @param target 目标对象
 * @param methods 要转换的方法名数组
 * @returns 包含Promise版本方法的新对象
 */
export function promisifyAll<T extends Record<string, any>>(
  target: T,
  methods: (keyof T)[] = []
): PromisifiedObject<T> {
  const result = { ...target } as PromisifiedObject<T>;

  // 如果没有指定方法，则尝试转换所有函数
  const methodsToPromisify =
    methods.length > 0
      ? methods
      : (Object.keys(target).filter(
          (key) => typeof target[key] === 'function'
        ) as (keyof T)[]);

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
