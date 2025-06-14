/**
 * @stratix/tasks-api 类型定义
 */

/**
 * 任务API配置
 */
export interface TasksApiConfig {
  /**
   * API路由前缀
   * @default '/api/tasks'
   */
  prefix?: string;

  /**
   * 是否启用健康检查
   * @default true
   */
  healthCheck?: boolean;

  /**
   * 健康检查路径
   * @default '/health'
   */
  healthCheckPath?: string;

  /**
   * 是否启用任务管理API
   * @default true
   */
  taskManagement?: boolean;

  /**
   * 是否启用任务控制API
   * @default true
   */
  taskControl?: boolean;

  /**
   * 是否启用统计API
   * @default true
   */
  statistics?: boolean;

  /**
   * API版本
   * @default 'v1'
   */
  version?: string;
}

/**
 * 任务API插件选项（向后兼容）
 * @deprecated 使用 TasksApiConfig 替代
 */
export interface TasksApiPluginOptions {
  /**
   * 是否启用路由
   * @default true
   */
  enableRoutes?: boolean;

  /**
   * 路由前缀
   * @default '/api/tasks'
   */
  routePrefix?: string;
}
