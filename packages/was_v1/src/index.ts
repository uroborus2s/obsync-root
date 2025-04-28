import { pluginFactory } from './plugin.js';

// 导出插件工厂函数创建的默认插件实例
const wasV1Plugin = pluginFactory();
export default wasV1Plugin;

// 导出插件工厂函数，允许自定义插件配置
export { pluginFactory } from './plugin.js';

// 导出类型定义，便于使用方引用
export * from './types/index.js';
