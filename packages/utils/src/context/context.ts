/**
 * 上下文对象相关实现
 */
import { EventEmitter } from 'events';

/**
 * 上下文类型定义
 */
export interface Context<T extends Record<string, any>> {
  /**
   * 获取指定键的值
   * @param key 键名
   */
  get<K extends keyof T>(key: K): T[K];

  /**
   * 设置指定键的值
   * @param key 键名
   * @param value 值
   */
  set<K extends keyof T>(key: K, value: T[K]): void;

  /**
   * 检查是否存在指定键的值
   * @param key 键名
   */
  has(key: keyof T): boolean;

  /**
   * 移除指定键的值，恢复为默认值
   * @param key 键名
   */
  remove(key: keyof T): void;

  /**
   * 清空上下文，恢复所有默认值
   */
  clear(): void;

  /**
   * 订阅指定键的变化
   * @param key 键名
   * @param handler 处理函数
   */
  subscribe<K extends keyof T>(
    key: K,
    handler: (value: T[K], oldValue: T[K]) => void
  ): () => void;

  /**
   * 获取所有上下文数据
   */
  getState(): T;
}

/**
 * 命名空间上下文类型定义
 */
export interface NamespaceContext<T extends Record<string, any>>
  extends Context<T> {
  /**
   * 命名空间名称
   */
  readonly name: string;
}

/**
 * 上下文作用域类型定义
 */
export interface ContextScope {
  /**
   * 作用域名称
   */
  readonly name: string;

  /**
   * 在作用域内创建上下文
   * @param name 上下文名称
   * @param defaultValues 默认值
   */
  createContext<T extends Record<string, any>>(
    name: string,
    defaultValues?: Partial<T>
  ): Context<T>;

  /**
   * 获取作用域内的所有上下文状态
   */
  getState(): Record<string, any>;

  /**
   * 订阅作用域内的变化
   * @param handler 处理函数
   */
  subscribe(handler: (changes: Record<string, any>) => void): () => void;
}

/**
 * 使用上下文的返回类型
 */
export interface UseContextReturn<T extends Record<string, any>> {
  get: <K extends keyof T>(key: K) => T[K];
  set: <K extends keyof T>(key: K, value: T[K]) => void;
  has: (key: keyof T) => boolean;
  remove: (key: keyof T) => void;
  clear: () => void;
  subscribe: <K extends keyof T>(
    key: K,
    handler: (value: T[K], oldValue: T[K]) => void
  ) => () => void;
  getState: () => T;
}

/**
 * 合并上下文选项
 */
export interface MergeContextOptions {
  /**
   * 是否保留原始上下文键前缀
   */
  prefix?: boolean;

  /**
   * 键冲突时的覆盖策略
   */
  override?: 'first' | 'last' | 'error';
}

/**
 * 创建一个新的上下文容器
 * @param defaultValues 默认值
 * @returns 上下文对象
 */
export function createContext<T extends Record<string, any>>(
  defaultValues: Partial<T> = {}
): Context<T> {
  const emitter = new EventEmitter();
  const state = { ...defaultValues } as T;

  const context: Context<T> = {
    get<K extends keyof T>(key: K): T[K] {
      return state[key];
    },

    set<K extends keyof T>(key: K, value: T[K]): void {
      const oldValue = state[key];
      if (value !== oldValue) {
        state[key] = value;
        emitter.emit(`change:${String(key)}`, value, oldValue);
        emitter.emit('change', { [key as string]: value });
      }
    },

    has(key: keyof T): boolean {
      return key in state && state[key] !== undefined;
    },

    remove(key: keyof T): void {
      if (key in defaultValues) {
        this.set(key, defaultValues[key] as T[keyof T]);
      } else {
        const oldValue = state[key];
        delete state[key];
        emitter.emit(`change:${String(key)}`, undefined, oldValue);
        emitter.emit('change', { [key as string]: undefined });
      }
    },

    clear(): void {
      const oldState = { ...state };
      Object.keys(state).forEach((key) => {
        delete state[key as keyof T];
      });

      // 恢复默认值
      Object.assign(state, { ...defaultValues });

      // 触发变更事件
      emitter.emit('change', state);

      // 触发每个键的变更事件
      Object.keys(oldState).forEach((key) => {
        emitter.emit(
          `change:${key}`,
          state[key as keyof T],
          oldState[key as keyof T]
        );
      });
    },

    subscribe<K extends keyof T>(
      key: K,
      handler: (value: T[K], oldValue: T[K]) => void
    ): () => void {
      const eventName = `change:${String(key)}`;
      emitter.on(eventName, handler);

      return () => {
        emitter.off(eventName, handler);
      };
    },

    getState(): T {
      return { ...state };
    }
  };

  return context;
}

/**
 * 创建一个命名空间上下文
 * @param name 命名空间名称
 * @param defaultValues 默认值
 * @returns 命名空间上下文对象
 */
export function createNamespace<T extends Record<string, any>>(
  name: string,
  defaultValues: Partial<T> = {}
): NamespaceContext<T> {
  const context = createContext<T>(defaultValues);

  return {
    ...context,
    name
  };
}

/**
 * 创建一个隔离的上下文作用域
 * @param name 作用域名称
 * @returns 上下文作用域对象
 */
export function createContextScope(name: string): ContextScope {
  const emitter = new EventEmitter();
  const contexts: Map<string, Context<any>> = new Map();

  return {
    name,

    createContext<T extends Record<string, any>>(
      contextName: string,
      defaultValues: Partial<T> = {}
    ): Context<T> {
      const context = createContext<T>(defaultValues);
      contexts.set(contextName, context);

      // 代理上下文的变化事件
      const originalSet = context.set;
      context.set = function <K extends keyof T>(key: K, value: T[K]): void {
        originalSet.call(context, key, value);
        emitter.emit('change', {
          namespace: contextName,
          key,
          value
        });
      };

      return context;
    },

    getState(): Record<string, any> {
      const state: Record<string, any> = {};
      for (const [contextName, context] of contexts.entries()) {
        state[contextName] = context.getState();
      }
      return state;
    },

    subscribe(handler: (changes: Record<string, any>) => void): () => void {
      emitter.on('change', handler);
      return () => {
        emitter.off('change', handler);
      };
    }
  };
}

/**
 * 使用上下文
 * @param context 上下文对象
 * @returns 上下文操作对象
 */
export function useContext<T extends Record<string, any>>(
  context: Context<T>
): UseContextReturn<T> {
  return {
    get: context.get.bind(context),
    set: context.set.bind(context),
    has: context.has.bind(context),
    remove: context.remove.bind(context),
    clear: context.clear.bind(context),
    subscribe: context.subscribe.bind(context),
    getState: context.getState.bind(context)
  };
}
