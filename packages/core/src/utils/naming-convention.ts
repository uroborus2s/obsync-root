// 命名约定工具
// 负责文件命名约定的解析和转换

import type { ModuleType } from '../types/auto-load.js';

/**
 * 模块命名信息
 */
export interface ModuleNaming {
  /** 原始文件名 */
  originalName: string;
  /** 模块名称 */
  moduleName: string;
  /** 模块类型 */
  moduleType: ModuleType;
  /** 注册名称 */
  registrationName: string;
  /** 是否为默认导出 */
  isDefaultExport: boolean;
}

/**
 * 命名约定配置
 */
export interface NamingConventionConfig {
  /** 服务命名模式 */
  servicePatterns: string[];
  /** 仓储命名模式 */
  repositoryPatterns: string[];
  /** 控制器命名模式 */
  controllerPatterns: string[];
  /** 路由命名模式 */
  routePatterns: string[];
  /** 中间件命名模式 */
  middlewarePatterns: string[];
  /** 配置文件命名模式 */
  configPatterns: string[];
  /** 工具文件命名模式 */
  utilPatterns: string[];
}

/**
 * 命名约定工具
 * 负责处理各种命名约定转换，采用函数式编程风格
 */
export class NamingConvention {
  /** 默认命名约定配置 */
  private static readonly DEFAULT_CONFIG: NamingConventionConfig = {
    servicePatterns: ['.service.', 'Service.', '-service.', '_service.'],
    repositoryPatterns: [
      '.repository.',
      'Repository.',
      '.repo.',
      'Repo.',
      '-repository.',
      '_repository.'
    ],
    controllerPatterns: [
      '.controller.',
      'Controller.',
      '.ctrl.',
      'Ctrl.',
      '-controller.',
      '_controller.'
    ],
    routePatterns: [
      '.route.',
      'Route.',
      '.routes.',
      'Routes.',
      '-route.',
      '_route.'
    ],
    middlewarePatterns: [
      '.middleware.',
      'Middleware.',
      '.mw.',
      '-middleware.',
      '_middleware.'
    ],
    configPatterns: ['.config.', 'Config.', '.conf.', '-config.', '_config.'],
    utilPatterns: [
      '.util.',
      'Util.',
      '.utils.',
      'Utils.',
      '.helper.',
      'Helper.',
      '-util.',
      '_util.'
    ]
  };

  /**
   * 转换为驼峰命名
   */
  static toCamelCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^[A-Z]/, (char) => char.toLowerCase());
  }

  /**
   * 转换为帕斯卡命名
   */
  static toPascalCase(str: string): string {
    return str
      .replace(/[-_\s]+(.)?/g, (_, char) => (char ? char.toUpperCase() : ''))
      .replace(/^[a-z]/, (char) => char.toUpperCase());
  }

  /**
   * 转换为蛇形命名
   */
  static toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/[-\s]+/g, '_')
      .toLowerCase()
      .replace(/^_/, '');
  }

  /**
   * 从文件路径解析模块名
   */
  static resolveModuleName(
    filePath: string,
    config?: Partial<NamingConventionConfig>
  ): ModuleNaming {
    const finalConfig = { ...NamingConvention.DEFAULT_CONFIG, ...config };
    const fileName = filePath.split('/').pop() || '';
    const moduleType = NamingConvention.inferModuleType(fileName, finalConfig);

    // 移除文件扩展名
    const nameWithoutExt = fileName.replace(/\.(ts|js|mjs|cjs)$/, '');

    // 移除模块类型后缀
    const cleanName = NamingConvention.removeModuleTypeSuffix(
      nameWithoutExt,
      moduleType,
      finalConfig
    );

    // 生成不同格式的名称
    const camelCaseName = NamingConvention.toCamelCase(cleanName);

    // 根据模块类型决定注册名称格式
    const registrationName = NamingConvention.getRegistrationName(
      camelCaseName,
      moduleType
    );

    return {
      originalName: fileName,
      moduleName: camelCaseName,
      moduleType,
      registrationName,
      isDefaultExport: true // 默认假设是默认导出
    };
  }

  /**
   * 根据文件名推断模块类型
   */
  static inferModuleType(
    fileName: string,
    config?: Partial<NamingConventionConfig>
  ): ModuleType {
    const finalConfig = { ...NamingConvention.DEFAULT_CONFIG, ...config };

    // 检查各种模块类型的模式
    if (
      NamingConvention.matchesPatterns(fileName, finalConfig.servicePatterns)
    ) {
      return 'service';
    }
    if (
      NamingConvention.matchesPatterns(fileName, finalConfig.repositoryPatterns)
    ) {
      return 'repository';
    }
    if (
      NamingConvention.matchesPatterns(fileName, finalConfig.controllerPatterns)
    ) {
      return 'controller';
    }
    if (NamingConvention.matchesPatterns(fileName, finalConfig.routePatterns)) {
      return 'route';
    }
    if (
      NamingConvention.matchesPatterns(fileName, finalConfig.middlewarePatterns)
    ) {
      return 'middleware';
    }
    if (
      NamingConvention.matchesPatterns(fileName, finalConfig.configPatterns)
    ) {
      return 'config';
    }
    if (NamingConvention.matchesPatterns(fileName, finalConfig.utilPatterns)) {
      return 'util';
    }

    return 'unknown';
  }

  /**
   * 检查文件名是否匹配指定模式
   */
  private static matchesPatterns(
    fileName: string,
    patterns: string[]
  ): boolean {
    return patterns.some((pattern) => fileName.includes(pattern));
  }

  /**
   * 移除模块类型后缀
   */
  private static removeModuleTypeSuffix(
    name: string,
    moduleType: ModuleType,
    config: NamingConventionConfig
  ): string {
    let patterns: string[] = [];

    switch (moduleType) {
      case 'service':
        patterns = config.servicePatterns;
        break;
      case 'repository':
        patterns = config.repositoryPatterns;
        break;
      case 'controller':
        patterns = config.controllerPatterns;
        break;
      case 'route':
        patterns = config.routePatterns;
        break;
      case 'middleware':
        patterns = config.middlewarePatterns;
        break;
      case 'config':
        patterns = config.configPatterns;
        break;
      case 'util':
        patterns = config.utilPatterns;
        break;
      default:
        return name;
    }

    // 查找并移除匹配的模式
    for (const pattern of patterns) {
      if (name.includes(pattern)) {
        return name.replace(pattern, '.');
      }
    }

    return name;
  }

  /**
   * 获取注册名称
   */
  private static getRegistrationName(
    baseName: string,
    moduleType: ModuleType
  ): string {
    switch (moduleType) {
      case 'service':
        return baseName.endsWith('Service') ? baseName : baseName + 'Service';
      case 'repository':
        return baseName.endsWith('Repository')
          ? baseName
          : baseName + 'Repository';
      case 'controller':
        return baseName.endsWith('Controller')
          ? baseName
          : baseName + 'Controller';
      case 'middleware':
        return baseName.endsWith('Middleware')
          ? baseName
          : baseName + 'Middleware';
      default:
        return baseName;
    }
  }
}
