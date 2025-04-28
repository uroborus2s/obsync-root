/**
 * 钩子系统 - 管理请求生命周期钩子
 */

import { FastifyInstance } from 'fastify';

/**
 * 钩子处理函数类型
 */
export type Hook = (request: any, reply: any) => Promise<void> | void;

/**
 * 钩子类型枚举
 */
export enum HookType {
  ON_REQUEST = 'onRequest',
  PRE_PARSING = 'preParsing',
  PRE_VALIDATION = 'preValidation',
  PRE_HANDLER = 'preHandler',
  PRE_SERIALIZATION = 'preSerialization',
  ON_ERROR = 'onError',
  ON_SEND = 'onSend',
  ON_RESPONSE = 'onResponse',
  ON_TIMEOUT = 'onTimeout',
  ON_READY = 'onReady',
  ON_CLOSE = 'onClose'
}

/**
 * 钩子管理器
 */
export class HooksManager {
  private fastify: FastifyInstance;
  private hooks: Map<HookType, Hook[]> = new Map();

  /**
   * 构造函数
   * @param fastify Fastify实例
   */
  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;

    // 初始化钩子集合
    Object.values(HookType).forEach((hookType) => {
      this.hooks.set(hookType as HookType, []);
    });
  }

  /**
   * 注册钩子
   * @param type 钩子类型
   * @param hook 钩子处理函数
   */
  public register(type: HookType, hook: Hook): void {
    // 获取该类型的钩子数组
    const hooks = this.hooks.get(type) || [];

    // 添加钩子
    hooks.push(hook);

    // 更新钩子数组
    this.hooks.set(type, hooks);

    // 注册到Fastify
    this.fastify.addHook(type, hook);
  }

  /**
   * 请求开始钩子
   * @param hook 钩子处理函数
   */
  public onRequest(hook: Hook): void {
    this.register(HookType.ON_REQUEST, hook);
  }

  /**
   * 请求解析前钩子
   * @param hook 钩子处理函数
   */
  public preParsing(hook: Hook): void {
    this.register(HookType.PRE_PARSING, hook);
  }

  /**
   * 请求验证前钩子
   * @param hook 钩子处理函数
   */
  public preValidation(hook: Hook): void {
    this.register(HookType.PRE_VALIDATION, hook);
  }

  /**
   * 处理前钩子
   * @param hook 钩子处理函数
   */
  public preHandler(hook: Hook): void {
    this.register(HookType.PRE_HANDLER, hook);
  }

  /**
   * 序列化前钩子
   * @param hook 钩子处理函数
   */
  public preSerialization(hook: Hook): void {
    this.register(HookType.PRE_SERIALIZATION, hook);
  }

  /**
   * 错误处理钩子
   * @param hook 钩子处理函数
   */
  public onError(hook: Hook): void {
    this.register(HookType.ON_ERROR, hook);
  }

  /**
   * 发送前钩子
   * @param hook 钩子处理函数
   */
  public onSend(hook: Hook): void {
    this.register(HookType.ON_SEND, hook);
  }

  /**
   * 响应完成钩子
   * @param hook 钩子处理函数
   */
  public onResponse(hook: Hook): void {
    this.register(HookType.ON_RESPONSE, hook);
  }

  /**
   * 超时钩子
   * @param hook 钩子处理函数
   */
  public onTimeout(hook: Hook): void {
    this.register(HookType.ON_TIMEOUT, hook);
  }

  /**
   * 获取指定类型的所有钩子
   * @param type 钩子类型
   */
  public getHooks(type: HookType): Hook[] {
    return [...(this.hooks.get(type) || [])];
  }

  /**
   * 获取所有钩子
   */
  public getAllHooks(): Map<HookType, Hook[]> {
    return new Map(this.hooks);
  }
}
