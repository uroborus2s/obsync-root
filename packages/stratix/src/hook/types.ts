/**
 * Stratix钩子系统类型定义
 */
import { HookHandler } from '../types/hook.js';

/**
 * 钩子管理器接口
 */
export interface HookManager {
  /**
   * 注册钩子处理函数
   * @param name 钩子名称
   * @param handler 处理函数
   */
  register(name: string, handler: HookHandler): void;

  /**
   * 触发钩子
   * @param name 钩子名称
   * @returns Promise
   */
  trigger(name: string): Promise<void>;

  /**
   * 检查钩子是否有处理函数
   * @param name 钩子名称
   * @returns 是否有处理函数
   */
  hasHandlers(name: string): boolean;
}
