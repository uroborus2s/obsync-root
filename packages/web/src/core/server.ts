/**
 * Server类 - 管理Fastify实例和服务器生命周期
 */

import fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import { ServerOptions } from '../types/options.js';

/**
 * 默认服务器配置
 */
const DEFAULT_SERVER_OPTIONS: ServerOptions = {
  port: 3000,
  host: 'localhost',
  logger: true
};

/**
 * Server类 - 管理Fastify实例和HTTP服务器
 */
export class Server {
  private fastify: FastifyInstance;
  private options: ServerOptions;
  private isStarted: boolean = false;

  /**
   * 构造函数
   * @param fastifyInstance 可选的Fastify实例
   * @param options 服务器配置
   */
  constructor(fastifyInstance?: FastifyInstance, options: ServerOptions = {}) {
    this.options = { ...DEFAULT_SERVER_OPTIONS, ...options };

    // 如果未提供Fastify实例，则创建一个
    if (!fastifyInstance) {
      const fastifyOptions: FastifyServerOptions = {
        logger: this.options.logger,
        ignoreTrailingSlash: this.options.ignoreTrailingSlash,
        caseSensitive: this.options.caseSensitive
      };

      this.fastify = fastify(fastifyOptions);
    } else {
      this.fastify = fastifyInstance;
      // 对于已存在的实例，我们无法直接设置这些属性
      // 因为Fastify不支持实例创建后修改这些配置
    }
  }

  /**
   * 获取Fastify实例
   */
  public getInstance(): FastifyInstance {
    return this.fastify;
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    if (this.isStarted) {
      return;
    }

    try {
      await this.fastify.listen({
        port: this.options.port,
        host: this.options.host
      });
      this.isStarted = true;
    } catch (err) {
      this.fastify.log.error(`服务器启动失败: ${err}`);
      throw err;
    }
  }

  /**
   * 停止服务器
   */
  public async stop(): Promise<void> {
    if (!this.isStarted) {
      return;
    }

    try {
      await this.fastify.close();
      this.isStarted = false;
    } catch (err) {
      this.fastify.log.error(`服务器关闭失败: ${err}`);
      throw err;
    }
  }

  /**
   * 重启服务器
   */
  public async restart(): Promise<void> {
    await this.stop();
    await this.start();
  }

  /**
   * 注册启动回调
   */
  public onStart(callback: () => Promise<void> | void): void {
    this.fastify.addHook('onReady', callback);
  }

  /**
   * 注册停止回调
   */
  public onStop(callback: () => Promise<void> | void): void {
    this.fastify.addHook('onClose', callback);
  }

  /**
   * 获取服务器地址信息
   */
  public address() {
    return this.fastify.server.address();
  }

  /**
   * 扩展Fastify实例
   */
  public extend(callback: (fastify: FastifyInstance) => void): void {
    callback(this.fastify);
  }

  /**
   * 注册Fastify插件
   */
  public register(plugin: any, options?: any): void {
    this.fastify.register(plugin, options);
  }
}
