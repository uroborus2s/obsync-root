import type { AuthManager } from '../auth/auth-manager.js';
import type { HttpClient } from '../core/http-client.js';
import type { CompanyInfo } from '../types/contact.js';

/**
 * 企业管理模块
 * 提供企业信息查询功能
 */
export class CompanyModule {
  constructor(
    private readonly wasV7HttpClient: HttpClient,
    private readonly wasV7AuthManager: AuthManager
  ) {}

  /**
   * 确保有有效的访问令牌
   */
  private async ensureAccessToken(): Promise<void> {
    if (!this.wasV7AuthManager.isTokenValid()) {
      await this.wasV7AuthManager.getAppAccessToken();
    }
  }

  /**
   * 查询企业信息
   * 查询本企业信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/address-book/company/get-company-info.html
   * @returns 企业信息
   */
  async getCurrentCompany(): Promise<CompanyInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<CompanyInfo>(
      '/v7/companies/current'
    );
    return response.data;
  }

  /**
   * 获取企业信息（别名方法）
   */
  async getCompanyInfo(): Promise<CompanyInfo> {
    return this.getCurrentCompany();
  }
}
