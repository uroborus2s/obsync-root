import { AxiosInstance } from 'axios';
import { WasV1Options } from '../../types/config.js';

const MODULE_KEYS = ['auth', 'contact', 'document', 'message'] as const;
type ModuleKey = (typeof MODULE_KEYS)[number];

/**
 * 动态懒加载API模块的客户端
 * @param client Axios客户端实例
 * @param apiModules 配置哪些API模块需要加载
 * @returns Proxy对象，访问api.xxx时动态import并实例化模块
 */
export function createApiClient(
  client: AxiosInstance,
  apiModules?: WasV1Options['apiModules'],
  logger?: any
) {
  const loadedModules: Record<string, any> = {};

  // 动态加载模块
  async function loadModule(name: ModuleKey) {
    if (loadedModules[name]) return loadedModules[name];
    let mod;
    switch (name) {
      case 'auth':
        mod = (await import('./auth.js')).createAuthApi(client);
        break;
      case 'contact':
        mod = (await import('./contact.js')).createContactApi(client);
        break;
      case 'document':
        mod = (await import('./document.js')).createDocumentApi(client);
        break;
      case 'message':
        mod = (await import('./message.js')).createMessageApi(client);
        break;
      default:
        throw new Error(`未知API模块: ${name}`);
    }
    loadedModules[name] = mod;
    logger?.debug?.(`动态加载API模块: ${name}`);
    return mod;
  }

  // Proxy拦截，返回Promise
  return new Proxy(
    {},
    {
      get(_, prop: string) {
        if (!MODULE_KEYS.includes(prop as ModuleKey)) {
          throw new Error(`不支持的API模块: ${prop}`);
        }
        const key = prop as ModuleKey;
        if (!apiModules || apiModules[key] !== false) {
          // 返回Promise，调用时需要await
          return loadModule(key);
        }
        throw new Error(`API模块[${prop}]未启用`);
      }
    }
  );
}
