import type { AuthManager } from '../auth/auth-manager.js';
import type { HttpClient } from '../core/http-client.js';
import type {
  CalendarInfo,
  CreateCalendarParams,
  CreateCalendarPermissionParams,
  CreateCalendarPermissionResponse,
  GetPrimaryCalendarResponse
} from '../types/calendar.js';

/**
 * 日历管理模块
 * 提供日历的创建、查询和权限管理功能
 */
export class CalendarModule {
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
   * 创建日历
   * 用户身份限制最多创建100个日历，应用身份不限制
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/calendar/create-calendar.html
   * @param params 创建参数
   * @returns 创建的日历信息
   */
  async createCalendar(params: CreateCalendarParams): Promise<CalendarInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<CalendarInfo>(
      '/v7/calendars/create',
      params
    );
    return response.data;
  }

  /**
   * 查询主日历信息
   * 获取用户的主日历信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/calendar/get-calendar.html
   * @returns 主日历信息
   */
  async getPrimaryCalendar(): Promise<CalendarInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<GetPrimaryCalendarResponse>(
      '/v7/calendars/primary'
    );
    return response.data.calendar;
  }

  /**
   * 创建日历权限
   * 为指定日历创建权限，允许其他用户访问日历
   *
   * @see https://openapi.wps.cn/v7/calendars/{calendar_id}/permissions/create
   * @param params 权限创建参数
   * @returns 创建的权限信息
   */
  async createCalendarPermission(
    params: CreateCalendarPermissionParams
  ): Promise<CreateCalendarPermissionResponse> {
    await this.ensureAccessToken();

    // 从参数中提取calendar_id用于URL路径
    const { calendar_id, user_id, role, id_type = 'internal' } = params;

    // 构建请求体，只包含role和user_id
    const requestBody = {
      role,
      user_id
    };

    // 构建请求头，包含X-Kso-Id-Type
    const headers = {
      'X-Kso-Id-Type': id_type
    };

    const response =
      await this.wasV7HttpClient.post<CreateCalendarPermissionResponse>(
        `/v7/calendars/${calendar_id}/permissions/create`,
        requestBody,
        headers
      );
    return response.data;
  }

  /**
   * 获取主日历信息（别名方法）
   * @returns 主日历信息
   */
  async getMainCalendar(): Promise<CalendarInfo> {
    return this.getPrimaryCalendar();
  }
}
