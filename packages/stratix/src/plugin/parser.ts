/**
 * 插件解析器
 * 负责验证和解析插件配置
 */
import { ExternalPlugin, PluginConfig, StratixPlugin } from './types.js';

/**
 * 插件解析错误类型
 */
export enum PluginParserErrorType {
  /**
   * 插件配置验证失败
   */
  INVALID_CONFIG = 'INVALID_CONFIG',

  /**
   * 插件缺少必要属性
   */
  MISSING_REQUIRED_PROPERTY = 'MISSING_REQUIRED_PROPERTY',

  /**
   * 插件版本无效
   */
  INVALID_VERSION = 'INVALID_VERSION',

  /**
   * 插件依赖冲突
   */
  DEPENDENCY_CONFLICT = 'DEPENDENCY_CONFLICT',

  /**
   * 插件名称无效
   */
  INVALID_NAME = 'INVALID_NAME',

  /**
   * 无效的插件格式
   */
  INVALID_FORMAT = 'INVALID_FORMAT'
}

/**
 * 插件解析错误
 */
export class PluginParserError extends Error {
  /**
   * 错误类型
   */
  readonly type: PluginParserErrorType;

  /**
   * 插件名称
   */
  readonly pluginName?: string;

  /**
   * 详细信息
   */
  readonly details?: Record<string, any>;

  /**
   * 构造函数
   * @param type 错误类型
   * @param message 错误消息
   * @param pluginName 插件名称
   * @param details 详细信息
   */
  constructor(
    type: PluginParserErrorType,
    message: string,
    pluginName?: string,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = 'PluginParserError';
    this.type = type;
    this.pluginName = pluginName;
    this.details = details;
  }
}

/**
 * 插件解析器选项
 */
export interface PluginParserOptions {
  /**
   * 严格模式
   * 启用后，所有验证都将严格执行
   */
  strict?: boolean;

  /**
   * 自动修复问题
   * 尝试自动修复插件配置中的小问题
   */
  autoFix?: boolean;
}

/**
 * 插件解析结果
 */
export interface PluginParseResult {
  /**
   * 插件实例
   */
  plugin: StratixPlugin;

  /**
   * 插件配置
   */
  config: PluginConfig;

  /**
   * 警告信息
   */
  warnings?: string[];
}

/**
 * 插件解析器
 */
export class PluginParser {
  /**
   * 应用实例
   */
  private readonly _app: any;

  /**
   * 是否启用严格模式
   */
  private readonly _strictMode: boolean;

  /**
   * 是否自动修复问题
   */
  private readonly _autoFix: boolean;

  /**
   * 构造函数
   * @param app 应用实例
   * @param options 解析器选项
   */
  constructor(app: any, options: PluginParserOptions = {}) {
    this._app = app;
    this._strictMode = options.strict ?? false;
    this._autoFix = options.autoFix ?? true;
  }

  /**
   * 解析插件
   * @param plugin 插件对象
   * @returns 解析结果
   * @throws PluginParserError 解析错误
   */
  parsePlugin(plugin: any): PluginParseResult {
    if (!plugin || typeof plugin !== 'object') {
      throw new PluginParserError(
        PluginParserErrorType.INVALID_FORMAT,
        '无效的插件格式：插件必须是一个对象',
        undefined,
        { received: typeof plugin }
      );
    }

    // 验证必要属性
    this._validateRequiredProperties(plugin);

    // 验证插件名称
    this._validatePluginName(plugin.name);

    // 获取插件配置
    const config = this._extractPluginConfig(plugin);

    // 验证版本格式
    this._validateVersion(config.version, plugin.name);

    // 收集警告信息
    const warnings: string[] = [];

    // 检查可选字段
    if (!config.description && this._strictMode) {
      warnings.push(`插件 ${plugin.name} 没有提供描述信息`);
    }

    // 检查依赖项
    if (config.dependencies) {
      this._validateDependencies(config.dependencies, plugin.name);
    }

    return {
      plugin: plugin as StratixPlugin,
      config,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * 验证必要属性
   * @param plugin 插件对象
   * @throws PluginParserError 验证失败
   */
  private _validateRequiredProperties(plugin: any): void {
    // 检查必要属性：name、version、register
    const requiredProps = ['name', 'version', 'register'];

    for (const prop of requiredProps) {
      if (prop in plugin === false) {
        throw new PluginParserError(
          PluginParserErrorType.MISSING_REQUIRED_PROPERTY,
          `插件缺少必要属性: ${prop}`,
          plugin.name,
          { missingProperty: prop }
        );
      }
    }

    // 验证register必须是函数
    if (typeof plugin.register !== 'function') {
      throw new PluginParserError(
        PluginParserErrorType.INVALID_FORMAT,
        `插件 ${plugin.name} 的 register 属性必须是一个函数`,
        plugin.name,
        { propertyType: typeof plugin.register }
      );
    }

    // 检查schema属性类型
    if ('schema' in plugin && typeof plugin.schema !== 'object') {
      throw new PluginParserError(
        PluginParserErrorType.INVALID_FORMAT,
        `插件 ${plugin.name} 的 schema 属性必须是一个对象`,
        plugin.name,
        { propertyType: typeof plugin.schema }
      );
    }

    // 检查decorations属性类型
    if ('decorations' in plugin && typeof plugin.decorations !== 'object') {
      throw new PluginParserError(
        PluginParserErrorType.INVALID_FORMAT,
        `插件 ${plugin.name} 的 decorations 属性必须是一个对象`,
        plugin.name,
        { propertyType: typeof plugin.decorations }
      );
    }
  }

  /**
   * 验证插件名称
   * @param name 插件名称
   * @throws PluginParserError 验证失败
   */
  private _validatePluginName(name: any): void {
    if (typeof name !== 'string') {
      throw new PluginParserError(
        PluginParserErrorType.INVALID_NAME,
        '插件名称必须是字符串',
        String(name),
        { nameType: typeof name }
      );
    }

    if (name.trim() === '') {
      throw new PluginParserError(
        PluginParserErrorType.INVALID_NAME,
        '插件名称不能为空',
        name
      );
    }

    // 验证插件名称格式
    const namePattern = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;
    if (this._strictMode && !namePattern.test(name)) {
      throw new PluginParserError(
        PluginParserErrorType.INVALID_NAME,
        '插件名称格式无效：只能包含小写字母、数字和连字符，且不能以连字符开头或结尾',
        name
      );
    }
  }

  /**
   * 验证版本号
   * @param version 版本号
   * @param pluginName 插件名称
   * @throws PluginParserError 验证失败
   */
  private _validateVersion(version: any, pluginName: string): void {
    if (typeof version !== 'string') {
      throw new PluginParserError(
        PluginParserErrorType.INVALID_VERSION,
        '插件版本必须是字符串',
        pluginName,
        { versionType: typeof version }
      );
    }

    // 简单的语义化版本格式检查 (x.y.z)
    const semverPattern = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;
    if (this._strictMode && !semverPattern.test(version)) {
      throw new PluginParserError(
        PluginParserErrorType.INVALID_VERSION,
        `插件 ${pluginName} 的版本号格式无效：应符合语义化版本规范 (x.y.z)`,
        pluginName,
        { version }
      );
    }
  }

  /**
   * 验证依赖项
   * @param dependencies 依赖项数组
   * @param pluginName 插件名称
   * @throws PluginParserError 验证失败
   */
  private _validateDependencies(
    dependencies: string[],
    pluginName: string
  ): void {
    // 检查依赖项格式
    for (const depName of dependencies) {
      if (typeof depName !== 'string' || depName.trim() === '') {
        throw new PluginParserError(
          PluginParserErrorType.DEPENDENCY_CONFLICT,
          `插件 ${pluginName} 的依赖项名称无效`,
          pluginName,
          { dependencyName: depName }
        );
      }

      // 在严格模式下检查循环依赖
      if (this._strictMode && depName === pluginName) {
        throw new PluginParserError(
          PluginParserErrorType.DEPENDENCY_CONFLICT,
          `插件 ${pluginName} 不能依赖自身`,
          pluginName,
          { dependencyName: depName }
        );
      }
    }
  }

  /**
   * 提取插件配置
   * @param plugin 插件对象
   * @returns 插件配置
   */
  private _extractPluginConfig(plugin: any): PluginConfig {
    // 基础配置
    const config: PluginConfig = {
      name: plugin.name,
      version: plugin.version,
      description: plugin.description || '',
      dependencies: plugin.dependencies || []
    };

    // 提取可选配置
    if (plugin.author) {
      config.author = plugin.author;
    }

    if (plugin.license) {
      config.license = plugin.license;
    }

    if (plugin.homepage) {
      config.homepage = plugin.homepage;
    }

    if (plugin.repository) {
      config.repository = plugin.repository;
    }

    if (plugin.keywords && Array.isArray(plugin.keywords)) {
      config.keywords = plugin.keywords;
    }

    return config;
  }

  /**
   * 检测插件类型
   * @param plugin 插件对象
   * @returns 插件类型
   */
  detectPluginType(plugin: StratixPlugin): 'internal' | 'external' {
    // 根据插件特征判断类型
    if ('isInternal' in plugin && plugin.isInternal === true) {
      return 'internal';
    } else if ('path' in plugin) {
      return 'external';
    } else {
      // 默认为外部插件
      return 'external';
    }
  }

  /**
   * 将插件转换为外部插件类型
   * @param plugin 插件对象
   * @returns 外部插件
   */
  asExternalPlugin(plugin: StratixPlugin): ExternalPlugin {
    if (this.detectPluginType(plugin) !== 'external') {
      this._app.logger.warn(
        { pluginName: plugin.name },
        '将内部插件作为外部插件处理'
      );
    }

    return plugin as ExternalPlugin;
  }
}
