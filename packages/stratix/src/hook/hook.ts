/**
 * 钩子管理器实现
 */
import { HookHandler } from '../types/hook.js';
import { HookManager } from './types.js';

/**
 * 钩子管理器实现类
 * 负责管理和触发应用生命周期钩子
 */
export class HookManagerImpl implements HookManager {
  /**
   * 钩子处理函数映射表
   * 键为钩子名称，值为处理函数数组
   */
  private _hooks: Map<string, HookHandler[]> = new Map();

  /**
   * 注册钩子处理函数
   * @param name 钩子名称
   * @param handler 处理函数
   */
  register(name: string, handler: HookHandler): void {
    if (!this._hooks.has(name)) {
      this._hooks.set(name, []);
    }

    this._hooks.get(name)!.push(handler);
  }

  /**
   * 触发钩子，按注册顺序执行所有处理函数
   * @param name 钩子名称
   * @returns Promise
   */
  async trigger(name: string): Promise<void> {
    if (!this._hooks.has(name)) {
      return;
    }

    const handlers = this._hooks.get(name)!;

    for (const handler of handlers) {
      const result = handler();

      if (result instanceof Promise) {
        await result;
      }
    }
  }

  /**
   * 检查钩子是否有处理函数
   * @param name 钩子名称
   * @returns 是否有处理函数
   */
  hasHandlers(name: string): boolean {
    return this._hooks.has(name) && this._hooks.get(name)!.length > 0;
  }
}
