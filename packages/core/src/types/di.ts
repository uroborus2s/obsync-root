/**
 * 依赖注入相关类型定义
 */
import { AwilixContainer } from 'awilix';
import { Logger } from 'pino';

/**
 * 生命周期类型
 */
export type LifetimeType = 'SINGLETON' | 'SCOPED' | 'TRANSIENT';

/**
 * 注入模式类型
 */
export type InjectionModeType = 'PROXY' | 'CLASSIC';

/**
 * 服务类构造函数类型
 */
export type ServiceClass = new (...args: any[]) => any;

/**
 * 仓储类构造函数类型
 */
export type RepositoryClass = new (...args: any[]) => any;

/**
 * 服务选项
 */
export interface ServiceOptions {
  name?: string;
  lifetime?: LifetimeType;
}

/**
 * 仓储选项
 */
export interface RepositoryOptions {
  name?: string;
  lifetime?: LifetimeType;
}

/**
 * 服务定义类型 - 支持多种格式
 */
export type ServiceDefinition =
  | ServiceClass // 直接传入类
  | [ServiceClass, ServiceOptions?] // [类, 选项]
  | { name: string; implementation: ServiceClass; lifetime?: LifetimeType }; // 完整对象

/**
 * 仓储定义类型 - 支持多种格式
 */
export type RepositoryDefinition =
  | RepositoryClass // 直接传入类
  | [RepositoryClass, RepositoryOptions?] // [类, 选项]
  | { name: string; implementation: RepositoryClass; lifetime?: LifetimeType }; // 完整对象

/**
 * 插件 DI 配置
 */
export interface PluginDIConfig {
  services?: ServiceDefinition | ServiceDefinition[];
  repositories?: RepositoryDefinition | RepositoryDefinition[];
}

/**
 * 主要的 DI 配置接口
 */
export interface DIConfig {
  services?: ServiceDefinition[] | Record<string, ServiceDefinition>;
  repositories?: RepositoryDefinition[] | Record<string, RepositoryDefinition>;
  scoped?: ServiceDefinition[] | Record<string, ServiceDefinition>; // 请求作用域服务
  plugins?: Record<string, PluginDIConfig>;
}

/**
 * 服务注册器选项
 */
export interface ServiceRegistrarOptions {
  /**
   * 默认生命周期
   */
  defaultLifetime?: LifetimeType;

  /**
   * 默认注入模式
   */
  defaultInjectionMode?: InjectionModeType;

  /**
   * 是否启用自动命名
   */
  autoNaming?: boolean;

  /**
   * 命名约定
   */
  namingConvention?: 'camelCase' | 'kebabCase' | 'snakeCase';

  /**
   * 是否严格模式
   */
  strict?: boolean;
}

/**
 * 服务注册器接口
 */
export interface IServiceRegistrar {
  /**
   * 注册单个服务
   */
  registerService(
    serviceClass: any,
    options?: ServiceRegistrationOptions
  ): void;

  /**
   * 批量注册服务
   */
  registerServices(
    services: any[],
    options?: ServiceRegistrationOptions
  ): Promise<void>;

  /**
   * 注册单个仓储
   */
  registerRepository(
    repositoryClass: any,
    options?: RepositoryRegistrationOptions
  ): void;

  /**
   * 批量注册仓储
   */
  registerRepositories(
    repositories: any[],
    options?: RepositoryRegistrationOptions
  ): Promise<void>;

  /**
   * 从路径扫描并注册服务
   */
  scanAndRegisterServices(
    paths: string[],
    options?: ScanOptions
  ): Promise<void>;

  /**
   * 从路径扫描并注册仓储
   */
  scanAndRegisterRepositories(
    paths: string[],
    options?: ScanOptions
  ): Promise<void>;

  /**
   * 解析服务
   */
  resolve<T = any>(name: string): T;

  /**
   * 检查服务是否已注册
   */
  hasRegistration(name: string): boolean;

  /**
   * 获取所有注册的服务名称
   */
  getRegistrationNames(): string[];

  /**
   * 清空所有注册
   */
  clear(): void;
}

/**
 * 服务注册选项
 */
export interface ServiceRegistrationOptions {
  /**
   * 服务名称（可选，默认从类名推导）
   */
  name?: string;

  /**
   * 生命周期
   */
  lifetime?: LifetimeType;

  /**
   * 注入模式
   */
  injectionMode?: InjectionModeType;

  /**
   * 依赖项
   */
  dependencies?: string[];

  /**
   * 是否覆盖已存在的注册
   */
  override?: boolean;
}

/**
 * 仓储注册选项
 */
export interface RepositoryRegistrationOptions {
  /**
   * 仓储名称（可选，默认从类名推导）
   */
  name?: string;

  /**
   * 生命周期
   */
  lifetime?: LifetimeType;

  /**
   * 注入模式
   */
  injectionMode?: InjectionModeType;

  /**
   * 依赖项
   */
  dependencies?: string[];

  /**
   * 是否覆盖已存在的注册
   */
  override?: boolean;
}

/**
 * 扫描选项
 */
export interface ScanOptions {
  /**
   * 文件模式
   */
  patterns?: string[];

  /**
   * 排除模式
   */
  exclude?: string[];

  /**
   * 命名约定
   */
  namingConvention?: 'camelCase' | 'kebabCase' | 'snakeCase';

  /**
   * 默认生命周期
   */
  defaultLifetime?: LifetimeType;

  /**
   * 默认注入模式
   */
  defaultInjectionMode?: InjectionModeType;

  /**
   * 是否递归扫描
   */
  recursive?: boolean;
}

/**
 * 依赖注入统计信息
 */
export interface DIStats {
  /**
   * 已注册的服务数量
   */
  totalServices: number;

  /**
   * 已注册的仓储数量
   */
  totalRepositories: number;

  /**
   * 扫描的文件数量
   */
  scannedFiles: number;

  /**
   * 注册成功的数量
   */
  successfulRegistrations: number;

  /**
   * 注册失败的数量
   */
  failedRegistrations: number;

  /**
   * 错误信息
   */
  errors: string[];
}

/**
 * 服务元数据
 */
export interface ServiceMetadata {
  /**
   * 服务名称
   */
  name: string;

  /**
   * 服务类型
   */
  type: 'service' | 'repository';

  /**
   * 生命周期
   */
  lifetime: LifetimeType;

  /**
   * 注入模式
   */
  injectionMode: InjectionModeType;

  /**
   * 依赖项
   */
  dependencies: string[];

  /**
   * 文件路径
   */
  filePath?: string;

  /**
   * 注册时间
   */
  registeredAt: Date;
}

/**
 * 依赖解析上下文
 */
export interface ResolutionContext {
  /**
   * 当前解析的服务名称
   */
  serviceName: string;

  /**
   * 解析路径
   */
  resolutionPath: string[];

  /**
   * 容器实例
   */
  container: AwilixContainer;

  /**
   * 日志记录器
   */
  logger: Logger;
}

/**
 * 依赖注入错误类型
 */
export interface DIError {
  /**
   * 错误类型
   */
  type:
    | 'REGISTRATION_ERROR'
    | 'RESOLUTION_ERROR'
    | 'CIRCULAR_DEPENDENCY'
    | 'MISSING_DEPENDENCY';

  /**
   * 错误消息
   */
  message: string;

  /**
   * 相关服务名称
   */
  serviceName?: string;

  /**
   * 依赖路径
   */
  dependencyPath?: string[];

  /**
   * 原始错误
   */
  originalError?: Error;
}
