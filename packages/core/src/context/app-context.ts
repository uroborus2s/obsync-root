import {
  Context,
  createContext,
  createNamespace,
  NamespaceContext
} from '@stratix/utils/context';
import { FastifyReply, FastifyRequest } from 'fastify';

/**
 * 应用级上下文数据类型
 */
export interface AppContextData {
  /**
   * 请求ID
   */
  requestId?: string;

  /**
   * 用户信息
   */
  user?: {
    id: string;
    name: string;
    roles: string[];
    [key: string]: any;
  };

  /**
   * 租户信息
   */
  tenant?: {
    id: string;
    name: string;
    [key: string]: any;
  };

  /**
   * 请求元数据
   */
  request?: {
    ip: string;
    userAgent: string;
    method: string;
    url: string;
    headers: Record<string, string>;
    startTime: number;
    [key: string]: any;
  };

  /**
   * 业务上下文
   */
  business?: {
    traceId?: string;
    spanId?: string;
    correlationId?: string;
    [key: string]: any;
  };

  /**
   * 自定义数据
   */
  custom?: Record<string, any>;
}

/**
 * 请求级上下文数据类型
 */
export interface RequestContextData extends AppContextData {
  /**
   * Fastify请求对象
   */
  fastifyRequest: FastifyRequest;

  /**
   * Fastify响应对象
   */
  fastifyReply: FastifyReply;

  /**
   * 请求开始时间
   */
  startTime: number;

  /**
   * 请求处理状态
   */
  status: 'pending' | 'processing' | 'completed' | 'error';
}

/**
 * 应用上下文管理器
 */
export class AppContextManager {
  private appContext: Context<AppContextData>;
  private namespaces: Map<string, NamespaceContext<any>>;

  constructor() {
    // 创建应用级上下文
    this.appContext = createContext<AppContextData>({
      custom: {}
    });

    // 命名空间管理
    this.namespaces = new Map();
  }

  /**
   * 获取应用级上下文
   */
  getAppContext(): Context<AppContextData> {
    return this.appContext;
  }

  /**
   * 创建命名空间上下文
   */
  createNamespace<T extends Record<string, any>>(
    name: string,
    defaultValues: Partial<T> = {}
  ): NamespaceContext<T> {
    if (this.namespaces.has(name)) {
      throw new Error(`Namespace "${name}" already exists`);
    }

    const namespace = createNamespace<T>(name, defaultValues);
    this.namespaces.set(name, namespace);
    return namespace;
  }

  /**
   * 获取命名空间上下文
   */
  getNamespace<T extends Record<string, any>>(
    name: string
  ): NamespaceContext<T> | null {
    return this.namespaces.get(name) || null;
  }

  /**
   * 删除命名空间
   */
  removeNamespace(name: string): boolean {
    return this.namespaces.delete(name);
  }

  /**
   * 获取所有命名空间名称
   */
  getNamespaceNames(): string[] {
    return Array.from(this.namespaces.keys());
  }

  /**
   * 设置应用级上下文数据
   */
  setAppData<K extends keyof AppContextData>(
    key: K,
    value: AppContextData[K]
  ): void {
    this.appContext.set(key, value);
  }

  /**
   * 获取应用级上下文数据
   */
  getAppData<K extends keyof AppContextData>(key: K): AppContextData[K] {
    return this.appContext.get(key);
  }

  /**
   * 清理过期的请求上下文（如果需要）
   */
  cleanup(): void {
    // 清理命名空间
    for (const [name, namespace] of this.namespaces.entries()) {
      namespace.clear();
    }
  }
}
