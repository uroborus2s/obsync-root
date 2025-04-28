/**
 * Stratix钩子系统类型定义
 */

/**
 * 钩子处理函数类型
 */
export type HookHandler = () => Promise<void> | void;

/**
 * 应用钩子名称枚举
 */
export enum HookName {
  /**
   * 插件注册时
   */
  OnRegister = 'onRegister',

  /**
   * 插件初始化前
   */
  BeforeInit = 'beforeInit',

  /**
   * 插件初始化后
   */
  AfterInit = 'afterInit',

  /**
   * 应用启动前
   */
  BeforeStart = 'beforeStart',

  /**
   * 应用启动后
   */
  AfterStart = 'afterStart',

  /**
   * 应用关闭前
   */
  BeforeClose = 'beforeClose',

  /**
   * 应用关闭后
   */
  AfterClose = 'afterClose'
}
