import type { AwilixContainer, Logger } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type { CompanyInfo } from '../types/contact.js';

/**
 * WPS V7 企业API适配器
 * 提供纯函数式的企业信息API调用
 */
export interface WpsCompanyAdapter {
  // 企业信息查询
  getCurrentCompany(): Promise<CompanyInfo>;
  getCompanyInfo(): Promise<CompanyInfo>;
}

/**
 * 创建WPS企业适配器的工厂函数
 */
export function createWpsCompanyAdapter(pluginContainer: AwilixContainer): WpsCompanyAdapter {
  const httpClient = pluginContainer.resolve<HttpClientService>('httpClientService');
  const logger = pluginContainer.resolve<Logger>('logger');

  return {
    /**
     * 获取当前企业信息
     */
    async getCurrentCompany(): Promise<CompanyInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get('/v7/contacts/company');
      return response.data;
    },

    /**
     * 获取企业信息（别名方法）
     */
    async getCompanyInfo(): Promise<CompanyInfo> {
      return this.getCurrentCompany();
    }
  };
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'company',
  factory: createWpsCompanyAdapter
};
