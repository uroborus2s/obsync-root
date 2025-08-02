// 自动加载相关类型定义
// 定义基于 Awilix 的自动加载机制的接口和类型

/**
 * 自动加载选项 - 重构版本
 * 最大化利用 Awilix 原生 loadModules 功能
 */
export interface AutoLoadOptions {
  /** Glob 模式匹配文件 */
  pattern: string;

  /** 注册选项 */
  registrationOptions?: {
    /** 生命周期 */
    lifetime?: 'SINGLETON' | 'SCOPED' | 'TRANSIENT';

    /** 注入模式 */
    injectionMode?: 'PROXY' | 'CLASSIC';

    /** 是否启用异步初始化 */
    asyncInit?: boolean | string;

    /** 是否启用异步销毁 */
    asyncDispose?: boolean | string;

    /** 是否启用急切注入 */
    eagerInject?: boolean;

    /** 是否启用 */
    enabled?: boolean;
  };

  /** 名称格式化函数 - 对应 Awilix formatName */
  formatName?:
    | string
    | ((name: string, descriptor: ModuleDescriptor) => string);

  /** 过滤函数 - 对应 Awilix filter */
  filter?: (descriptor: ModuleDescriptor) => boolean;

  /** 工作目录 - 对应 Awilix cwd */
  cwd?: string;

  /** 是否递归扫描 */
  recursive?: boolean;

  /** 排除模式 */
  exclude?: string[];

  /** 注入器函数 - 对应 Awilix injector */
  injector?: (container: any) => Record<string, any>;
}

/**
 * 自动加载配置
 * 用于配置不同类型模块的自动加载
 */
export interface AutoLoadConfig {
  /** 服务自动加载配置 */
  services?: AutoLoadOptions;

  /** 仓储自动加载配置 */
  repositories?: AutoLoadOptions;

  /** 控制器自动加载配置 */
  controllers?: AutoLoadOptions;

  /** 路由自动加载配置 */
  routes?: AutoLoadOptions;

  /** 中间件自动加载配置 */
  middlewares?: AutoLoadOptions;

  /** 自定义模块自动加载配置 */
  custom?: Record<string, AutoLoadOptions>;
}

/**
 * 模块描述符
 * 描述被扫描到的模块信息
 */
export interface ModuleDescriptor {
  /** 模块名称 */
  name: string;

  /** 模块路径 */
  path: string;

  /** 模块类型 */
  type: ModuleType;

  /** 模块导出 */
  exports: any;

  /** 默认导出 */
  defaultExport?: any;

  /** 命名导出 */
  namedExports?: Record<string, any>;

  /** 文件扩展名 */
  extension: string;

  /** 文件大小 */
  size?: number;

  /** 最后修改时间 */
  lastModified?: Date;

  /** 模块元数据 */
  metadata?: ModuleMetadata;
}

/**
 * 模块类型
 */
export type ModuleType =
  | 'service'
  | 'repository'
  | 'controller'
  | 'route'
  | 'middleware'
  | 'config'
  | 'util'
  | 'unknown';

/**
 * 模块元数据
 * 从模块中提取的元数据信息
 */
export interface ModuleMetadata {
  /** 模块名称 */
  name?: string;

  /** 模块描述 */
  description?: string;

  /** 模块版本 */
  version?: string;

  /** 模块作者 */
  author?: string;

  /** 模块标签 */
  tags?: string[];

  /** 模块依赖 */
  dependencies?: string[];

  /** 是否为单例 */
  singleton?: boolean;

  /** 是否启用 */
  enabled?: boolean;

  /** 自定义配置 */
  config?: Record<string, any>;
}

/**
 * 文件命名约定
 */
export interface NamingConvention {
  /** 服务文件命名模式 */
  service: string[];

  /** 仓储文件命名模式 */
  repository: string[];

  /** 控制器文件命名模式 */
  controller: string[];

  /** 路由文件命名模式 */
  route: string[];

  /** 中间件文件命名模式 */
  middleware: string[];
}

/**
 * 自动加载器选项
 */
export interface AutoLoaderOptions {
  /** 容器实例 */
  container: any;

  /** 自动加载配置 */
  config: AutoLoadConfig;

  /** 命名约定 */
  namingConvention?: NamingConvention;

  /** 是否启用缓存 */
  enableCache?: boolean;

  /** 缓存目录 */
  cacheDir?: string;

  /** 是否监听文件变化 */
  watchFiles?: boolean;

  /** 文件变化处理器 */
  onFileChange?: (event: {
    type: 'add' | 'change' | 'unlink';
    path: string;
    timestamp: Date;
  }) => void;

  /** 错误处理器 */
  onError?: (error: Error, descriptor?: ModuleDescriptor) => void;
}

/**
 * 模块注册结果
 */
export interface ModuleRegistrationResult {
  /** 是否成功 */
  success: boolean;

  /** 注册的模块名称 */
  name: string;

  /** 模块描述符 */
  descriptor: ModuleDescriptor;

  /** 注册时间 */
  registeredAt: Date;

  /** 错误信息 */
  error?: Error;

  /** 警告信息 */
  warnings?: string[];
}

/**
 * 批量注册结果
 */
export interface BatchRegistrationResult {
  /** 总数 */
  total: number;

  /** 成功数 */
  success: number;

  /** 失败数 */
  failed: number;

  /** 跳过数 */
  skipped: number;

  /** 详细结果 */
  results: ModuleRegistrationResult[];

  /** 耗时 */
  duration: number;

  /** 错误汇总 */
  errors: Error[];
}
