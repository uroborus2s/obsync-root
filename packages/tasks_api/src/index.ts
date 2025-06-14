/**
 * @stratix/tasks-api 插件入口
 * 提供任务管理系统的RESTful API接口
 */

// 导出插件
export { tasksApiPlugin as default } from './plugin.js';

// 导出类型
export type { TasksApiPluginOptions } from './types/index.js';
