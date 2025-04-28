/**
 * Stratix框架错误类定义
 */

/**
 * 基础错误类
 */
export class StratixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 插件相关错误
 */
export class PluginError extends StratixError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 无效插件错误
 */
export class InvalidPluginError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 插件已存在错误
 */
export class PluginAlreadyExistsError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 插件未找到错误
 */
export class PluginNotFoundError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 插件依赖错误
 */
export class PluginDependencyError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 插件注册错误
 */
export class PluginRegistrationError extends PluginError {
  /**
   * 原始错误
   */
  public readonly cause: Error;

  constructor(message: string, cause: Error) {
    super(message);
    this.cause = cause;
  }
}

/**
 * 无效插件配置错误
 */
export class InvalidPluginConfigError extends PluginError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 配置相关错误
 */
export class ConfigError extends StratixError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 配置验证错误
 */
export class ConfigValidationError extends ConfigError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 配置文件错误
 */
export class ConfigFileError extends ConfigError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 装饰器相关错误
 */
export class DecoratorError extends StratixError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 装饰器已存在错误
 */
export class DecoratorAlreadyExistsError extends DecoratorError {
  constructor(message: string) {
    super(message);
  }
}

/**
 * 装饰器未找到错误
 */
export class DecoratorNotFoundError extends DecoratorError {
  constructor(message: string) {
    super(message);
  }
}
