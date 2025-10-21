// Stratix 主类 - 核心框架入口
// 提供统一的应用启动和管理API

import type { Logger } from 'pino';

import 'reflect-metadata';
import { ApplicationBootstrap } from './bootstrap/application-bootstrap.js';
import { LoggerFactory } from './logger/index.js';
import type { StratixApplication, StratixRunOptions } from './types/index.js';

/**
 * Stratix 版本信息
 */
export const STRATIX_VERSION = '1.0.0';

/**
 * Stratix 主类
 * 提供统一的应用创建和管理接口，采用函数式编程风格
 * 每个 Stratix 实例只管理一个 StratixApplication 对象
 */
export class Stratix {
  private application: StratixApplication | null = null;
  private logger: Logger;

  /**
   * 构造函数
   */
  constructor(options?: StratixRunOptions) {
    this.logger = Stratix.resolveLogger(options);
  }

  /**
   * 创建 Stratix 应用实例
   */
  static async run(options?: StratixRunOptions): Promise<StratixApplication> {
    const stratix = new Stratix(options);
    return await stratix.start(options);
  }

  /**
   * 启动应用
   */
  async start(options?: StratixRunOptions): Promise<StratixApplication> {
    if (this.application) {
      throw new Error('Application is already running. Call stop() first.');
    }

    try {
      this.logger.info('🚀 Creating Stratix application...');

      // 创建应用启动器
      const bootstrap = new ApplicationBootstrap(this.logger);

      // 启动应用
      this.application = await bootstrap.bootstrap(options);

      this.logger.info('✅ Stratix application created successfully');
      return this.application;
    } catch (error) {
      this.logger.error('❌ Failed to create Stratix application:', error);
      this.application = null;
      throw error;
    }
  }

  /**
   * 获取当前应用实例
   */
  getApplication(): StratixApplication | null {
    return this.application;
  }

  /**
   * 停止当前应用实例
   */
  async stop(): Promise<void> {
    if (!this.application) {
      this.logger.warn('No application to stop');
      return;
    }

    try {
      this.logger.info('🛑 Stopping Stratix application...');
      await this.application.stop();
      this.application = null;
      this.logger.info('✅ Stratix application stopped successfully');
    } catch (error) {
      this.logger.error('❌ Failed to stop Stratix application:', error);
      throw error;
    }
  }

  /**
   * 重启当前应用实例
   */
  async restart(options?: StratixRunOptions): Promise<StratixApplication> {
    if (!this.application) {
      throw new Error('No application to restart. Call start() first.');
    }

    // 停止当前实例
    await this.stop();

    // 重新启动实例
    return await this.start(options);
  }

  /**
   * 检查应用是否正在运行
   */
  isRunning(): boolean {
    return this.application !== null;
  }

  /**
   * 获取版本信息
   */
  static getVersion(): string {
    return STRATIX_VERSION;
  }

  /**
   * 获取详细版本信息
   */
  static getVersionInfo(): {
    version: string;
    nodeVersion: string;
    platform: string;
    arch: string;
  } {
    return {
      version: STRATIX_VERSION,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  }

  /**
   * 解析日志器实例
   * 使用统一的日志器创建逻辑
   */
  static resolveLogger(options?: StratixRunOptions): Logger {
    return LoggerFactory.createUnifiedLogger(options);
  }

  /**
   * 获取当前应用状态
   */
  getStatus(): any {
    if (!this.application) {
      return { status: 'stopped' };
    }

    return {
      type: this.application.type,
      status: this.application.status,
      config: this.application.config
        ? {
            server: {
              host: this.application.config.server?.host,
              port: this.application.config.server?.port
            },
            pluginCount: this.application.config.plugins?.length || 0
          }
        : undefined
    };
  }

  /**
   * 清理当前应用资源
   */
  async cleanup(): Promise<void> {
    await this.stop();
  }
}

// 导出便捷函数
export const runApp = Stratix.run.bind(Stratix);
// 默认导出
export default Stratix;
