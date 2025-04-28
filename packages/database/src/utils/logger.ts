/**
 * @stratix/database 日志模块
 */

/**
 * 日志器接口
 */
export interface Logger {
  /**
   * 记录信息级别日志
   * @param message 日志信息
   * @param args 附加参数
   */
  info(message: string, ...args: any[]): void;

  /**
   * 记录警告级别日志
   * @param message 日志信息
   * @param args 附加参数
   */
  warn(message: string, ...args: any[]): void;

  /**
   * 记录错误级别日志
   * @param message 日志信息
   * @param args 附加参数
   */
  error(message: string, ...args: any[]): void;

  /**
   * 记录调试级别日志
   * @param message 日志信息
   * @param args 附加参数
   */
  debug(message: string, ...args: any[]): void;
}

/**
 * 默认日志器实现（使用控制台）
 */
export class ConsoleLogger implements Logger {
  /**
   * 是否启用调试输出
   */
  private enableDebug: boolean;

  /**
   * 创建控制台日志器
   * @param enableDebug 是否启用调试输出
   */
  constructor(enableDebug: boolean = false) {
    this.enableDebug = enableDebug;
  }

  /**
   * 记录信息级别日志
   * @param message 日志信息
   * @param args 附加参数
   */
  info(message: string, ...args: any[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }

  /**
   * 记录警告级别日志
   * @param message 日志信息
   * @param args 附加参数
   */
  warn(message: string, ...args: any[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  /**
   * 记录错误级别日志
   * @param message 日志信息
   * @param args 附加参数
   */
  error(message: string, ...args: any[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }

  /**
   * 记录调试级别日志
   * @param message 日志信息
   * @param args 附加参数
   */
  debug(message: string, ...args: any[]): void {
    if (this.enableDebug) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }
}
