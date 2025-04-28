/**
 * 上下文工具函数
 */
import {
  Context,
  MergeContextOptions,
  createContext,
  useContext
} from './context.js';

/**
 * 在指定上下文中执行函数
 * @param context 上下文对象
 * @param fn 要执行的函数
 * @returns 函数执行结果
 */
export function withContext<T, C extends Record<string, any>>(
  context: Context<C>,
  fn: (ctx: ReturnType<typeof useContext<C>>) => T
): T {
  const ctx = useContext(context);
  return fn(ctx);
}

/**
 * 从上下文中获取指定键的值
 * @param context 上下文对象
 * @param key 要获取的键
 * @returns 上下文中指定键的值
 */
export function getContextValue<
  T extends Record<string, any>,
  K extends keyof T
>(context: Context<T>, key: K): T[K] {
  return context.get(key);
}

/**
 * 在上下文中设置指定键的值
 * @param context 上下文对象
 * @param key 要设置的键
 * @param value 要设置的值
 */
export function setContextValue<
  T extends Record<string, any>,
  K extends keyof T
>(context: Context<T>, key: K, value: T[K]): void {
  context.set(key, value);
}

/**
 * 检查上下文中是否存在指定键
 * @param context 上下文对象
 * @param key 要检查的键
 * @returns 如果键存在且不为undefined则返回true，否则返回false
 */
export function hasContextValue<T extends Record<string, any>>(
  context: Context<T>,
  key: keyof T
): boolean {
  return context.has(key);
}

/**
 * 从上下文中移除指定键的值
 * @param context 上下文对象
 * @param key 要移除的键
 */
export function removeContextValue<T extends Record<string, any>>(
  context: Context<T>,
  key: keyof T
): void {
  context.remove(key);
}

/**
 * 清空上下文中的所有数据，恢复为默认值
 * @param context 要清空的上下文对象
 */
export function clearContext<T extends Record<string, any>>(
  context: Context<T>
): void {
  context.clear();
}

/**
 * 合并多个上下文到一个单一上下文
 * @param contexts 要合并的上下文数组
 * @param options 合并选项
 * @returns 合并后的上下文对象
 */
export function mergeContexts<T extends Record<string, any>>(
  contexts: Context<any>[],
  options: MergeContextOptions = {}
): Context<T> {
  const { prefix = false, override = 'last' } = options;

  // 合并默认值
  const mergedDefaults: Record<string, any> = {};

  for (let i = 0; i < contexts.length; i++) {
    const context = contexts[i];
    const state = context.getState();

    for (const key in state) {
      const mergeKey = prefix ? `${i}-${key}` : key;

      if (mergeKey in mergedDefaults && override === 'first') {
        // 保留第一个值，忽略后续值
        continue;
      }

      if (mergeKey in mergedDefaults && override === 'error') {
        throw new Error(`键冲突: ${mergeKey}`);
      }

      // 默认使用last策略，或prefix为true时不会有冲突
      mergedDefaults[mergeKey] = state[key];
    }
  }

  // 创建合并后的上下文
  const mergedContext = createContext<T>(mergedDefaults as Partial<T>);

  // 代理原始上下文的变更
  for (let i = 0; i < contexts.length; i++) {
    const context = contexts[i];
    const state = context.getState();

    for (const key in state) {
      const mergeKey = prefix ? `${i}-${key}` : key;

      // 监听原始上下文的变化
      context.subscribe(key as keyof typeof state, (newValue) => {
        // 更新合并上下文
        if (!prefix || override !== 'first' || !(mergeKey in mergedDefaults)) {
          mergedContext.set(mergeKey as keyof T, newValue as any);
        }
      });

      // 监听合并上下文的变化，反向同步
      mergedContext.subscribe(mergeKey as keyof T, (newValue) => {
        // 更新原始上下文
        context.set(key as any, newValue as any);
      });
    }
  }

  return mergedContext;
}

/**
 * 创建上下文的隔离副本，对副本的修改不会影响原始上下文
 * @param context 要隔离的上下文
 * @param initialOverrides 初始覆盖值
 * @returns 隔离的上下文副本
 */
export function isolateContext<T extends Record<string, any>>(
  context: Context<T>,
  initialOverrides: Partial<T> = {}
): Context<T> {
  // 获取原始上下文的状态
  const originalState = context.getState();

  // 创建一个新上下文，合并原始状态和覆盖值
  const isolatedContext = createContext<T>({
    ...originalState,
    ...initialOverrides
  });

  return isolatedContext;
}
