import { HookHandler, Hooks } from '../types/hooks.js';

export class HooksManager {
  private hooks: Hooks = {
    beforeRegister: [],
    afterRegister: [],
    beforeStart: [],
    afterStart: [],
    beforeClose: [],
    afterClose: []
  };

  /**
   * 添加钩子处理函数
   */
  addHook(name: string, handler: HookHandler): void {
    if (!this.hooks[name]) {
      this.hooks[name] = [];
    }
    this.hooks[name].push(handler);
  }

  /**
   * 执行钩子
   */
  async runHook(name: string, payload?: any): Promise<void> {
    if (!this.hooks[name]) {
      return;
    }

    for (const handler of this.hooks[name]) {
      await handler(payload);
    }
  }

  /**
   * 获取所有钩子
   */
  getHooks(): Hooks {
    return this.hooks;
  }
}
