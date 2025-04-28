import { AxiosInstance } from 'axios';
import { createAuthApi } from './auth.js';
import { createContactApi } from './contact.js';
import { createDocumentApi } from './document.js';
import { createMessageApi } from './message.js';

/**
 * 创建完整的API客户端
 * @param client Axios客户端实例
 * @returns 组合了所有API模块的客户端
 */
export function createApiClient(client: AxiosInstance) {
  return {
    auth: createAuthApi(client),
    contact: createContactApi(client),
    document: createDocumentApi(client),
    message: createMessageApi(client)
  };
}
