/**
 * 提供上下文管理功能的模块
 *
 * 此模块通过上下文API提供了一种共享数据和状态的方法，
 * 特别适用于跨组件传递数据、服务注入和依赖管理。
 *
 * @remarks
 * 版本: 1.0.0
 * 分类: 上下文管理
 *
 * @packageDocumentation
 */

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
   *
   * @param key - 键名
   * @returns 键对应的值
   */
  get<K extends keyof T>(key: K): T[K];

  /**
   * 设置指定键的值
   *
   * @param key - 键名
   * @param value - 值
   * @returns 上下文实例，支持链式调用
   */
  set<K extends keyof T>(key: K, value: T[K]): Context<T>;

  /**
   * 检查是否存在指定键
   *
   * @param key - 键名
   * @returns 如果键存在则返回true，否则返回false
   */
  has<K extends keyof T>(key: K): boolean;

  /**
   * 移除指定键
   *
   * @param key - 键名
   * @returns 上下文实例，支持链式调用
   */
  remove<K extends keyof T>(key: K): Context<T>;

  /**
   * 获取所有的键值对
   *
   * @returns 包含所有键值对的对象
   */
  getAll(): T;

  /**
   * 注册事件处理程序，当上下文发生变化时被调用
   *
   * @param handler - 处理函数
   * @returns 用于取消注册的函数
   */
  onChange(handler: (context: T) => void): () => void;

  /**
   * 获取上下文的名称
   *
   * @returns 上下文名称
   */
  getName(): string;

  /**
   * 设置上下文的默认值
   *
   * @param defaultValues - 默认值
   * @returns 上下文实例，支持链式调用
   */
  setDefaults(defaultValues: Partial<T>): Context<T>;

  /**
   * 将处理函数与上下文一起执行
   *
   * @param handler - 处理函数
   * @returns 处理函数的返回值
   */
  withHandler<R>(handler: (context: T) => R): R;

  /**
   * 清空上下文中的所有数据，恢复为默认值
   *
   * @returns 上下文实例，支持链式调用
   */
  clear(): Context<T>;

  /**
   * 监听特定键的变化
   *
   * @param key - 要监听的键
   * @param handler - 当值发生变化时调用的处理函数
   * @returns 用于取消监听的函数
   */
  subscribe<K extends keyof T>(
    key: K,
    handler: (value: T[K], oldValue: T[K]) => void
  ): () => void;
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
 * @param defaultValues - 默认值
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

    set<K extends keyof T>(key: K, value: T[K]): Context<T> {
      const oldValue = state[key];
      if (value !== oldValue) {
        state[key] = value;
        emitter.emit(`change:${String(key)}`, value, oldValue);
        emitter.emit('change', { [key as string]: value });
      }
      return this;
    },

    has(key: keyof T): boolean {
      return key in state && state[key] !== undefined;
    },

    remove(key: keyof T): Context<T> {
      if (key in defaultValues) {
        this.set(key, defaultValues[key] as T[keyof T]);
      } else {
        const oldValue = state[key];
        delete state[key];
        emitter.emit(`change:${String(key)}`, undefined, oldValue);
        emitter.emit('change', { [key as string]: undefined });
      }
      return this;
    },

    getAll(): T {
      return { ...state };
    },

    onChange(handler: (context: T) => void): () => void {
      const eventName = 'change';
      emitter.on(eventName, handler);

      return () => {
        emitter.off(eventName, handler);
      };
    },

    getName(): string {
      return Object.keys(state).join('-');
    },

    setDefaults(defaultValues: Partial<T>): Context<T> {
      Object.assign(state, defaultValues);
      return this;
    },

    withHandler<R>(handler: (context: T) => R): R {
      return handler(state);
    },

    clear(): Context<T> {
      // 保存旧状态以便触发事件
      const oldState = { ...state };

      // 清空状态
      for (const key in state) {
        if (Object.prototype.hasOwnProperty.call(state, key)) {
          delete state[key];
        }
      }

      // 应用默认值
      Object.assign(state, defaultValues);

      // 触发变更事件
      emitter.emit('change', state);

      return this;
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
    }
  };

  return context;
}

/**
 * 创建一个命名空间上下文
 * @param name - 命名空间名称
 * @param defaultValues - 默认值
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
