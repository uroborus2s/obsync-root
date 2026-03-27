// 装饰器元数据管理
// 统一管理所有装饰器相关的元数据定义和操作

import type { RouteShorthandOptions } from 'fastify';
import 'reflect-metadata';

/**
 * 元数据键定义
 */
export const METADATA_KEYS = {
  ROUTE: Symbol('route:metadata'),
  CONTROLLER: Symbol('controller:metadata'),
  VALIDATION: Symbol('validation:metadata'),
  PARAM_VALIDATION: Symbol('param-validation:metadata'),
  EXECUTOR: Symbol('executor:metadata')
} as const;

// 向后兼容的导出
export const ROUTE_METADATA_KEY = METADATA_KEYS.ROUTE;
export const CONTROLLER_METADATA_KEY = METADATA_KEYS.CONTROLLER;
export const EXECUTOR_METADATA_KEY = METADATA_KEYS.EXECUTOR;

/**
 * 路由元数据接口
 */
export interface RouteMetadata {
  method: string;
  path: string;
  options?: RouteShorthandOptions;
  propertyKey: string;
  target: any;
}

/**
 * 控制器元数据接口
 */
export interface ControllerMetadata {
  prefix?: string;
  options?: any;
}

/**
 * 控制器选项接口
 */
export interface ControllerOptions {
  /** 是否启用验证 */
  validation?: boolean;
  /** 路由分类 */
  category?: string;
  /** 标签 */
  tags?: string[];
  /** 描述 */
  description?: string;
  /** 自定义配置 */
  [key: string]: any;
}

/**
 * 验证规则接口
 */
export interface ValidationRule {
  type: string;
  value?: any;
  message?: string;
  validator?: (value: any) => boolean | Promise<boolean>;
}

/**
 * 参数验证元数据接口
 */
export interface ParamValidationMetadata {
  parameterIndex: number;
  propertyKey: string;
  rules: ValidationRule[];
}

/**
 * 属性验证元数据接口
 */
export interface PropertyValidationMetadata {
  propertyKey: string;
  rules: ValidationRule[];
}

/**
 * 执行器元数据接口
 */
export interface ExecutorMetadata {
  /** 执行器名称 */
  name?: string;
  /** 执行器描述 */
  description?: string;
  /** 执行器版本 */
  version?: string;
  /** 执行器标签 */
  tags?: string[];
  /** 执行器分类 */
  category?: string;
  /** 配置参数的JSON Schema */
  configSchema?: any;
  /** 自定义选项 */
  options?: ExecutorOptions;
}

/**
 * 执行器选项接口
 */
export interface ExecutorOptions {
  /** 是否启用健康检查 */
  healthCheck?: boolean;
  /** 是否启用配置验证 */
  validateConfig?: boolean;
  /** 超时时间（毫秒） */
  timeout?: number;
  /** 重试次数 */
  retries?: number;
  /** 自定义配置 */
  [key: string]: any;
}

/**
 * 元数据操作工具类
 */
export class MetadataManager {
  /**
   * 获取路由元数据
   */
  static getRouteMetadata(target: any): RouteMetadata[] {
    return Reflect.getMetadata(METADATA_KEYS.ROUTE, target) || [];
  }

  /**
   * 设置路由元数据
   */
  static setRouteMetadata(target: any, metadata: RouteMetadata[]): void {
    Reflect.defineMetadata(METADATA_KEYS.ROUTE, metadata, target);
  }

  /**
   * 添加路由元数据
   */
  static addRouteMetadata(target: any, metadata: RouteMetadata): void {
    const existingRoutes = this.getRouteMetadata(target);
    existingRoutes.push(metadata);
    this.setRouteMetadata(target, existingRoutes);
  }

  /**
   * 获取控制器元数据
   */
  static getControllerMetadata(target: any): ControllerMetadata | undefined {
    return Reflect.getMetadata(METADATA_KEYS.CONTROLLER, target);
  }

  /**
   * 设置控制器元数据
   */
  static setControllerMetadata(
    target: any,
    metadata: ControllerMetadata
  ): void {
    Reflect.defineMetadata(METADATA_KEYS.CONTROLLER, metadata, target);
  }

  /**
   * 检查是否为控制器类
   */
  static isController(target: any): boolean {
    return Reflect.hasMetadata(METADATA_KEYS.CONTROLLER, target);
  }

  /**
   * 检查是否有路由方法
   */
  static hasRoutes(target: any): boolean {
    const routes = this.getRouteMetadata(target);
    return routes.length > 0;
  }

  /**
   * 获取控制器前缀
   */
  static getControllerPrefix(target: any): string {
    const metadata = this.getControllerMetadata(target);
    return metadata?.prefix || '';
  }

  /**
   * 获取控制器选项
   */
  static getControllerOptions(target: any): ControllerOptions {
    const metadata = this.getControllerMetadata(target);
    return metadata?.options || {};
  }

  /**
   * 获取完整的路由路径（包含控制器前缀）
   */
  static getFullRoutePath(controllerTarget: any, routePath: string): string {
    const controllerMetadata = this.getControllerMetadata(controllerTarget);
    const prefix = controllerMetadata?.prefix || '';

    // 确保路径以 / 开头
    const normalizedPrefix = prefix.startsWith('/') ? prefix : `/${prefix}`;
    const normalizedPath = routePath.startsWith('/')
      ? routePath
      : `/${routePath}`;

    // 组合路径，避免双斜杠
    if (normalizedPrefix === '/') {
      return normalizedPath;
    }

    return `${normalizedPrefix}${normalizedPath}`.replace(/\/+/g, '/');
  }

  /**
   * 检查路由是否重复
   */
  static checkDuplicateRoute(
    target: any,
    method: string,
    path: string
  ): RouteMetadata | null {
    const existingRoutes = this.getRouteMetadata(target);
    return (
      existingRoutes.find(
        (route) => route.method === method && route.path === path
      ) || null
    );
  }

  /**
   * 获取所有元数据（调试用）
   */
  static getAllMetadata(target: any): {
    routes: RouteMetadata[];
    controller: ControllerMetadata | undefined;
    hasController: boolean;
    hasRoutes: boolean;
  } {
    return {
      routes: this.getRouteMetadata(target),
      controller: this.getControllerMetadata(target),
      hasController: this.isController(target),
      hasRoutes: this.hasRoutes(target)
    };
  }

  /**
   * 获取执行器元数据
   */
  static getExecutorMetadata(target: any): ExecutorMetadata | undefined {
    return Reflect.getMetadata(METADATA_KEYS.EXECUTOR, target);
  }

  /**
   * 设置执行器元数据
   */
  static setExecutorMetadata(target: any, metadata: ExecutorMetadata): void {
    Reflect.defineMetadata(METADATA_KEYS.EXECUTOR, metadata, target);
  }

  /**
   * 检查是否为执行器类
   */
  static isExecutor(target: any): boolean {
    return Reflect.hasMetadata(METADATA_KEYS.EXECUTOR, target);
  }

  /**
   * 获取执行器名称
   */
  static getExecutorName(target: any): string | undefined {
    const metadata = this.getExecutorMetadata(target);
    return metadata?.name;
  }

  /**
   * 获取执行器选项
   */
  static getExecutorOptions(target: any): ExecutorOptions {
    const metadata = this.getExecutorMetadata(target);
    return metadata?.options || {};
  }

  /**
   * 清除所有元数据（测试用）
   */
  static clearAllMetadata(target: any): void {
    Reflect.deleteMetadata(METADATA_KEYS.ROUTE, target);
    Reflect.deleteMetadata(METADATA_KEYS.CONTROLLER, target);
    Reflect.deleteMetadata(METADATA_KEYS.VALIDATION, target);
    Reflect.deleteMetadata(METADATA_KEYS.PARAM_VALIDATION, target);
    Reflect.deleteMetadata(METADATA_KEYS.EXECUTOR, target);
  }
}
