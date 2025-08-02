// Decorators 模块 - 装饰器支持（可选）
// 为喜欢装饰器风格的开发者提供装饰器支持

// 元数据管理（核心）
export {
  CONTROLLER_METADATA_KEY,
  METADATA_KEYS,
  MetadataManager,
  ROUTE_METADATA_KEY,
  type ControllerMetadata,
  type ControllerOptions,
  type ParamValidationMetadata,
  type PropertyValidationMetadata,

  // 类型导出
  type RouteMetadata,
  type ValidationRule
} from './metadata.js';

// 控制器装饰器
export { Controller } from './controller.js';

// 路由装饰器
export { Delete, Get, Head, Options, Patch, Post, Put } from './route.js';

// 验证装饰器
export * from './validation.js';
