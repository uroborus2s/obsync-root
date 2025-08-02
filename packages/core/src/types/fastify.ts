// Fastify 相关类型定义
// 使用 Fastify 官方推荐的 declare module 方式扩展类型

import type { AwilixContainer } from 'awilix';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { StratixApplication } from './config.js';

// 使用 declare module 扩展 Fastify 类型
declare module 'fastify' {
  interface FastifyInstance {
    /** Stratix 应用实例 */
    stratixApp: StratixApplication;

    /** DI 容器实例 */
    diContainer: AwilixContainer;
  }

  interface FastifyRequest {
    /** 请求上下文 */
    context: Record<string, any>;

    /** 请求ID */
    requestId: string;

    /** 请求开始时间 */
    startTime: number;

    /**
     * DI 容器
     * @returns Awilix 容器实例
     */
    diContainer: AwilixContainer;
  }

  interface FastifyReply {
    /**
     * DI 容器
     * @returns Awilix 容器实例
     */
    diContainer: AwilixContainer;

    /**
     * 获取响应时间
     * @returns 响应时间（毫秒）
     */
    getResponseTime(): number;

    /**
     * 设置请求上下文
     * @param key 上下文键
     * @param value 上下文值
     * @returns FastifyReply 实例（支持链式调用）
     */
    setContext(key: string, value: any): this;

    /**
     * 获取请求上下文
     * @param key 上下文键，如果不提供则返回整个上下文对象
     * @returns 上下文值或整个上下文对象
     */
    getContext(key?: string): any;
  }
}

/**
 * Stratix 装饰器配置
 */
export interface StratixDecoratorConfig {
  /** 是否启用应用实例装饰器 */
  enableAppDecorators?: boolean;

  /** 是否启用容器装饰器 */
  enableContainerDecorators?: boolean;

  /** 是否启用请求上下文装饰器 */
  enableContextDecorators?: boolean;

  /** 是否启用多应用实例支持 */
  enableMultiAppSupport?: boolean;

  /** 自定义装饰器 */
  customDecorators?: {
    instance?: Record<string, any>;
    request?: Record<string, any>;
    reply?: Record<string, any>;
  };
}

/**
 * Fastify 插件上下文类型
 * 为插件提供的增强上下文
 */
export interface StratixPluginContext {
  /** 当前 Fastify 实例 */
  fastify: FastifyInstance;

  /** 当前 Stratix 应用实例 */
  app: StratixApplication;

  /** DI 容器 */
  container: AwilixContainer;

  /** 插件配置 */
  options: any;

  /** 日志器 */
  logger: any;
}

/**
 * 类型守卫：检查是否为 StratixFastifyInstance
 */
export function isStratixFastifyInstance(
  fastify: FastifyInstance
): fastify is FastifyInstance {
  return 'stratixApp' in fastify && 'diContainer' in fastify;
}

/**
 * 类型守卫：检查是否为 StratixFastifyRequest
 */
export function isStratixFastifyRequest(
  request: FastifyRequest
): request is FastifyRequest {
  return 'context' in request && 'getDIContainer' in request;
}

/**
 * 类型守卫：检查是否为 StratixFastifyReply
 */
export function isStratixFastifyReply(
  reply: FastifyReply
): reply is FastifyReply {
  return 'getDIContainer' in reply && 'getContext' in reply;
}
