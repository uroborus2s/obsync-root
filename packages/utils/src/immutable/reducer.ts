/**
 * 不可变状态更新函数
 */

import { deepFreeze } from './object.js';

/**
 * 基于Immer库的思想，提供一种简单方式创建不可变数据的更新
 * @param baseState 原始状态对象
 * @param recipe 修改草稿状态的函数
 * @returns 新的不可变状态
 */
export function produce<T>(baseState: T, recipe: (draft: T) => void): T {
  // 如果baseState是undefined或null，则直接返回
  if (baseState === undefined || baseState === null) {
    return baseState;
  }

  // 创建状态的代理对象，用于记录修改操作
  const changes: Set<string | symbol> = new Set();
  const drafts: Map<string | symbol, any> = new Map();
  let currentState: any;

  // 创建代理处理器
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      // 如果属性是对象，则返回其代理
      if (
        target[prop] !== null &&
        typeof target[prop] === 'object' &&
        !Object.isFrozen(target[prop])
      ) {
        if (!drafts.has(prop)) {
          drafts.set(prop, new Proxy(target[prop], handler));
        }
        return drafts.get(prop);
      }
      return target[prop];
    },
    set(target, prop, value) {
      // 记录修改的属性
      changes.add(prop);
      target[prop] = value;
      return true;
    },
    deleteProperty(target, prop) {
      // 记录删除的属性
      changes.add(prop);
      delete target[prop];
      return true;
    }
  };

  // 创建一个浅拷贝作为草稿对象
  if (Array.isArray(baseState)) {
    currentState = [...baseState];
  } else if (typeof baseState === 'object') {
    currentState = { ...baseState };
  } else {
    return baseState;
  }

  // 创建代理对象
  const draft = new Proxy(currentState, handler);

  // 执行配方函数
  recipe(draft);

  // 如果没有修改，则返回原始状态
  if (changes.size === 0) {
    return baseState;
  }

  // 返回修改后的状态
  return currentState;
}

/**
 * 创建reducer函数的工厂函数
 * @param initialState 初始状态
 * @param handlers 处理器映射表
 * @returns reducer函数
 */
export function createReducer<State, Action extends { type: string }>(
  initialState: State,
  handlers: Record<string, (state: State, action: Action) => State>
): (state: State | undefined, action: Action) => State {
  // 冻结初始状态
  const frozenInitialState = deepFreeze({ ...initialState } as any) as State;

  // 返回reducer函数
  return (state = frozenInitialState, action) => {
    const handler = handlers[action.type];
    if (handler) {
      return handler(state, action);
    }
    return state;
  };
}
