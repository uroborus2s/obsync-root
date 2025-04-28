import { validateConfig, wasV1ConfigSchema } from './schemas/config.js';
import { createApiClient } from './services/api/index.js';
import { createWpsApiClient, sendRequest } from './services/request.js';
import {
  clearTokenCache,
  getCompanyToken,
  initTokenCache
} from './services/token.js';
import { WasV1Options } from './types/config.js';

/**
 * 创建WPS客户端
 * @param app Stratix应用实例
 * @param config 插件配置
 * @returns WPS客户端
 */
function createWpsClient(app: any, config: WasV1Options) {
  // 获取日志对象
  const logger = app.hasPlugin('logger') ? app.logger : console;

  // 初始化token缓存
  initTokenCache(config);

  // 创建API客户端
  const apiClient = createWpsApiClient(app, config);

  // 创建API模块
  const api = createApiClient(apiClient);

  // 添加辅助方法
  return {
    // API模块
    ...api,

    // 辅助方法
    getCompanyToken: () => getCompanyToken(app, config),
    clearTokenCache: (appId?: string) => clearTokenCache(appId),

    // 低级API访问方法
    request: <T>(axiosConfig: any, schema?: any) =>
      sendRequest<T>(apiClient, axiosConfig, schema),

    // 原始客户端
    client: apiClient
  };
}

/**
 * WPS API V1插件
 */
export const pluginFactory = () => {
  return {
    name: 'wasV1',
    dependencies: ['core'],
    optionalDependencies: ['logger', 'cache'],

    register: async (app: any, options: WasV1Options) => {
      // 验证配置
      const config = validateConfig(options);

      // 获取日志对象
      const logger = app.hasPlugin('logger') ? app.logger : console;
      logger.info('注册WPS API V1插件');

      // 创建WPS客户端
      const client = createWpsClient(app, config);

      // 注册钩子
      app.hook('beforeClose', async () => {
        // 清理缓存
        clearTokenCache();
        logger.info('清理WPS API V1插件资源');
      });

      // 添加装饰器
      app.decorate('wasV1', client);

      logger.info('WPS API V1插件注册完成');
    },

    // 配置验证模式
    schema: wasV1ConfigSchema
  };
};
