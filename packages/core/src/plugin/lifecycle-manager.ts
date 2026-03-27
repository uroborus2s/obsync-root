// @stratix/core 基于方法名约定的生命周期管理器
// 不依赖装饰器，通过反射检测方法名自动注册Fastify钩子

import { getLogger } from '../logger/index.js';

/**
 * Fastify生命周期钩子方法名映射
 * 基于方法名约定的自动检测机制
 */
export const FASTIFY_LIFECYCLE_METHODS = {
  onReady: 'onReady',
  onListen: 'onListen',
  onClose: 'onClose',
  preClose: 'preClose',
  onRoute: 'onRoute',
  onRegister: 'onRegister'
} as const;

/**
 * 支持的生命周期方法名类型
 */
export type FastifyLifecycleMethod = keyof typeof FASTIFY_LIFECYCLE_METHODS;

/**
 * 生命周期方法执行结果
 */
export interface LifecycleMethodResult {
  success: boolean;
  serviceName: string;
  methodName: string;
  duration: number;
  error?: Error;
}

/**
 * 生命周期阶段执行结果
 */
export interface LifecyclePhaseResult {
  hookName: string;
  totalMethods: number;
  successCount: number;
  failureCount: number;
  totalDuration: number;
  results: LifecycleMethodResult[];
}

/**
 * 基于方法名约定的生命周期管理器
 * 不依赖装饰器，通过反射检测方法名
 */
export class ConventionBasedLifecycleManager {
  private serviceInstances = new Map<string, any>();
  private lifecycleMethods = new Map<
    FastifyLifecycleMethod,
    Map<string, Function>
  >();
  private debugEnabled: boolean;

  constructor(debugEnabled: boolean = false) {
    this.debugEnabled = debugEnabled;
    this.initializeLifecycleMaps();
  }

  /**
   * 初始化生命周期方法映射
   */
  private initializeLifecycleMaps(): void {
    const methods: FastifyLifecycleMethod[] = [
      'onReady',
      'onListen',
      'onClose',
      'preClose',
      'onRoute',
      'onRegister'
    ];

    methods.forEach((method) => {
      this.lifecycleMethods.set(method, new Map());
    });
  }

  /**
   * 扫描服务实例的生命周期方法
   */
  scanAndRegisterService(serviceName: string, serviceInstance: any): void {
    this.serviceInstances.set(serviceName, serviceInstance);

    // 获取实例的所有方法名
    const methodNames = this.getInstanceMethodNames(serviceInstance);

    // 检查每个支持的生命周期方法
    Object.keys(FASTIFY_LIFECYCLE_METHODS).forEach((methodName) => {
      const lifecycleMethod = methodName as FastifyLifecycleMethod;

      if (methodNames.includes(methodName)) {
        const method = serviceInstance[methodName];
        if (typeof method === 'function') {
          const methodMap = this.lifecycleMethods.get(lifecycleMethod)!;
          methodMap.set(serviceName, method.bind(serviceInstance));

          if (this.debugEnabled) {
            const logger = getLogger();
            logger.info(
              `📋 Registered lifecycle method: ${serviceName}.${methodName} -> ${lifecycleMethod}`
            );
          }
        }
      }
    });
  }

  /**
   * 获取实例的所有方法名
   */
  private getInstanceMethodNames(instance: any): string[] {
    const methodNames = new Set<string>();

    // 获取实例自身的方法
    Object.getOwnPropertyNames(instance).forEach((name) => {
      if (typeof instance[name] === 'function') {
        methodNames.add(name);
      }
    });

    // 获取原型链上的方法
    let prototype = Object.getPrototypeOf(instance);
    while (prototype && prototype !== Object.prototype) {
      Object.getOwnPropertyNames(prototype).forEach((name) => {
        if (name !== 'constructor' && typeof prototype[name] === 'function') {
          methodNames.add(name);
        }
      });
      prototype = Object.getPrototypeOf(prototype);
    }

    return Array.from(methodNames);
  }

  /**
   * 创建聚合的生命周期处理函数
   */
  createAggregatedHandler(
    lifecycleMethod: FastifyLifecycleMethod
  ): Function | null {
    const methodMap = this.lifecycleMethods.get(lifecycleMethod);

    if (!methodMap || methodMap.size === 0) {
      return null;
    }

    // 返回聚合处理函数
    return async (...args: any[]) => {
      const startTime = Date.now();
      const results: LifecycleMethodResult[] = [];
      let successCount = 0;
      let failureCount = 0;

      if (this.debugEnabled) {
        const logger = getLogger();
        logger.info(
          `🚀 Executing aggregated ${lifecycleMethod} handlers (${methodMap.size} methods)`
        );
      }

      // 按服务注册顺序执行所有方法
      for (const [serviceName, method] of methodMap.entries()) {
        const methodStartTime = Date.now();

        try {
          // 支持同步和异步方法
          await Promise.resolve(method(...args));

          const duration = Date.now() - methodStartTime;
          results.push({
            success: true,
            serviceName,
            methodName: lifecycleMethod,
            duration
          });
          successCount++;

          if (this.debugEnabled) {
            const logger = getLogger();
            logger.debug(
              `✅ ${serviceName}.${lifecycleMethod} completed in ${duration}ms`
            );
          }
        } catch (error) {
          const duration = Date.now() - methodStartTime;
          const errorObj =
            error instanceof Error ? error : new Error(String(error));

          results.push({
            success: false,
            serviceName,
            methodName: lifecycleMethod,
            duration,
            error: errorObj
          });
          failureCount++;

          if (this.debugEnabled) {
            const logger = getLogger();
            logger.error(
              `❌ ${serviceName}.${lifecycleMethod} failed:`,
              errorObj
            );
          }

          // 继续执行其他方法，不中断整个流程
        }
      }

      const totalDuration = Date.now() - startTime;

      if (this.debugEnabled) {
        const logger = getLogger();
        logger.info(
          `✅ Aggregated ${lifecycleMethod} completed: ${successCount} success, ${failureCount} failures in ${totalDuration}ms`
        );
      }

      // 如果有失败的方法，记录但不抛出错误（让Fastify决定如何处理）
      if (failureCount > 0) {
        const logger = getLogger();
        logger.warn(
          `⚠️ ${failureCount} lifecycle methods failed in ${lifecycleMethod} phase`
        );
      }
    };
  }

  /**
   * 获取生命周期统计信息
   */
  getLifecycleStats(): {
    totalServices: number;
    methodsByHook: Record<string, number>;
  } {
    const methodsByHook = {} as Record<string, number>;

    Object.keys(FASTIFY_LIFECYCLE_METHODS).forEach((methodName) => {
      const lifecycleMethod = methodName as FastifyLifecycleMethod;
      const methodMap = this.lifecycleMethods.get(lifecycleMethod);
      methodsByHook[methodName] = methodMap ? methodMap.size : 0;
    });

    return {
      totalServices: this.serviceInstances.size,
      methodsByHook
    };
  }

  /**
   * 清理资源
   */
  dispose(): void {
    this.serviceInstances.clear();
    this.lifecycleMethods.clear();
  }
}
