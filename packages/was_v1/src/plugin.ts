import { wasV1ConfigSchema } from './schemas/config.js';
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
 * @param app 应用实例
 * @param config 配置选项
 * @returns WPS客户端
 */
function createWpsClient(app: any, config: WasV1Options) {
  // 获取logger
  const logger = app.hasPlugin('logger') ? app.logger : console;

  // 初始化token缓存
  initTokenCache(config);

  // 创建API请求实例
  const apiClient = createWpsApiClient(app, config);

  // 创建API模块，传入apiModules配置
  const api = createApiClient(apiClient, config.apiModules, logger);

  // 构建客户端对象
  return {
    // 运行环境
    app,
    // 配置信息
    config,
    // API客户端
    apiClient,
    // API模块
    api,
    // Token相关方法
    token: {
      getCompanyToken: () => getCompanyToken(app, config),
      clearCache: clearTokenCache
    },
    // 低级API访问方法
    request: <T>(axiosConfig: any, schema?: any) =>
      sendRequest<T>(apiClient, axiosConfig, schema)
  };
}

/**
 * 插件工厂函数
 * @param options 配置选项
 * @returns 插件函数
 */
export function pluginFactory(options: WasV1Options) {
  // 验证配置
  const parseResult = wasV1ConfigSchema.safeParse(options);
  if (!parseResult.success) {
    const errorMessage = `WasV1插件配置验证失败: ${parseResult.error.message}`;
    throw new Error(errorMessage);
  }

  // 返回插件函数
  return function (app: any, opts: any, done: Function) {
    try {
      // 创建WPS客户端
      const wpsClient = createWpsClient(app, options);

      // 将客户端挂载到app实例
      app.decorate('wpsV1', wpsClient);

      // 注册钩子函数用于资源释放
      app.addHook('onClose', async (instance: any, done: Function) => {
        try {
          clearTokenCache();
          done();
        } catch (error) {
          done(error);
        }
      });

      // 完成插件注册
      done();
    } catch (error) {
      done(error);
    }
  };
}
