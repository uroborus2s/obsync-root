import type { AwilixContainer } from '@stratix/core';
import { sleep } from '@stratix/utils/async';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  BatchCreateCalendarPermissionsParams,
  BatchCreateCalendarPermissionsResponse,
  CalendarInfo,
  CalendarPermission,
  CreateCalendarParams,
  CreateCalendarPermissionParams,
  CreateCalendarPermissionResponse,
  DeleteCalendarParams,
  DeleteCalendarPermissionParams,
  GetCalendarListParams,
  GetCalendarListResponse,
  GetCalendarParams,
  GetCalendarPermissionListParams,
  GetCalendarPermissionListResponse,
  GetCalendarResponse,
  UpdateCalendarParams,
  UpdateCalendarResponse
} from '../types/calendar.js';

/**
 * WPS V7 日历API适配器
 * 提供纯函数式的日历和日程管理API调用
 */
export interface WpsCalendarAdapter {
  // 日历管理
  createCalendar(params: CreateCalendarParams): Promise<CalendarInfo>;
  getPrimaryCalendar(): Promise<CalendarInfo>;
  getMainCalendar(): Promise<CalendarInfo>;
  getCalendar(params: GetCalendarParams): Promise<CalendarInfo>;
  getCalendarList(
    params?: GetCalendarListParams
  ): Promise<GetCalendarListResponse>;
  getAllCalendarList(params?: GetCalendarListParams): Promise<CalendarInfo[]>;
  updateCalendar(params: UpdateCalendarParams): Promise<UpdateCalendarResponse>;
  createCalendarPermission(
    params: CreateCalendarPermissionParams
  ): Promise<CreateCalendarPermissionResponse>;
  getCalendarPermissionList(
    params: GetCalendarPermissionListParams
  ): Promise<GetCalendarPermissionListResponse>;
  getAllCalendarPermissions(
    params: GetCalendarPermissionListParams
  ): Promise<CalendarPermission[]>;
  deleteCalendar(params: DeleteCalendarParams): Promise<void>;
  batchCreateCalendarPermissions(
    params: BatchCreateCalendarPermissionsParams
  ): Promise<BatchCreateCalendarPermissionsResponse>;
  batchCreateCalendarPermissionsLimit(
    params: BatchCreateCalendarPermissionsParams
  ): Promise<BatchCreateCalendarPermissionsResponse>;
  deleteCalendarPermission(
    params: DeleteCalendarPermissionParams
  ): Promise<void>;
}

/**
 * 创建WPS日历适配器的工厂函数
 */
export function createWpsCalendarAdapter(
  pluginContainer: AwilixContainer
): WpsCalendarAdapter {
  const httpClient =
    pluginContainer.resolve<HttpClientService>('httpClientService');

  const calendar: WpsCalendarAdapter = {
    /**
     * 创建日历
     */
    async createCalendar(params: CreateCalendarParams): Promise<CalendarInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.post<CalendarInfo>(
        '/v7/calendars/create',
        params
      );
      return response.data;
    },

    /**
     * 查询主日历信息
     */
    async getPrimaryCalendar(): Promise<CalendarInfo> {
      await httpClient.ensureAccessToken();
      const response = await httpClient.get<CalendarInfo>(
        '/v7/calendars/primary'
      );
      return response.data;
    },

    /**
     * 获取主日历信息（别名方法）
     */
    async getMainCalendar(): Promise<CalendarInfo> {
      return this.getPrimaryCalendar();
    },

    /**
     * 查询日历列表
     */
    async getCalendarList(
      params?: GetCalendarListParams
    ): Promise<GetCalendarListResponse> {
      await httpClient.ensureAccessToken();
      const { page_size = 20, page_token } = params || {};

      const queryParams: Record<string, any> = {};
      if (page_size !== undefined) queryParams.page_size = page_size;
      if (page_token !== undefined) queryParams.page_token = page_token;

      const response = await httpClient.get<GetCalendarListResponse>(
        '/v7/calendars',
        queryParams
      );
      return response.data;
    },

    /**
     * 获取所有日历列表（自动分页）
     */
    async getAllCalendarList(
      params?: GetCalendarListParams
    ): Promise<CalendarInfo[]> {
      const allCalendars: CalendarInfo[] = [];
      let pageToken: string | undefined;

      do {
        const response = await calendar.getCalendarList({
          ...params,
          page_token: pageToken
        });

        allCalendars.push(...(response.Items || []));
        pageToken = response.next_page_token;
        sleep(20);
      } while (pageToken);

      return allCalendars;
    },

    /**
     * 查询日历
     */
    async getCalendar(params: GetCalendarParams): Promise<CalendarInfo> {
      await httpClient.ensureAccessToken();
      const { calendar_id } = params;

      const response = await httpClient.get<GetCalendarResponse>(
        `/v7/calendars/${calendar_id}`
      );
      return response.data.data;
    },

    /**
     * 更新日历
     */
    async updateCalendar(
      params: UpdateCalendarParams
    ): Promise<UpdateCalendarResponse> {
      await httpClient.ensureAccessToken();
      const { calendar_id, summary } = params;

      const requestBody = { summary };

      const response = await httpClient.post<UpdateCalendarResponse>(
        `/v7/calendars/${calendar_id}/update`,
        requestBody
      );
      return response.data;
    },

    /**
     * 创建日历权限
     */
    async createCalendarPermission(
      params: CreateCalendarPermissionParams
    ): Promise<CreateCalendarPermissionResponse> {
      await httpClient.ensureAccessToken();
      const { calendar_id, user_id, role, id_type = 'external' } = params;

      const requestBody = { role, user_id };
      const headers = { 'X-Kso-Id-Type': id_type };

      const response = await httpClient.post(
        `/v7/calendars/${calendar_id}/permissions/create`,
        requestBody,
        headers
      );
      return response;
    },

    /**
     * 查询日历权限列表
     */
    async getCalendarPermissionList(
      params: GetCalendarPermissionListParams
    ): Promise<GetCalendarPermissionListResponse> {
      await httpClient.ensureAccessToken();
      const {
        calendar_id,
        page_size,
        page_token,
        id_type = 'external'
      } = params;

      const queryParams: Record<string, any> = {};
      if (page_size !== undefined) queryParams.page_size = page_size;
      if (page_token !== undefined) queryParams.page_token = page_token;

      const headers = { 'X-Kso-Id-Type': id_type };

      const response = await httpClient.get<GetCalendarPermissionListResponse>(
        `/v7/calendars/${calendar_id}/permissions`,
        queryParams,
        headers
      );
      return response.data;
    },

    /**
     * 获取所有日历权限列表（自动分页）
     */
    async getAllCalendarPermissions(
      params: GetCalendarPermissionListParams
    ): Promise<CalendarPermission[]> {
      const allPermissions: CalendarPermission[] = [];
      let pageToken: string | undefined;

      do {
        const response = await calendar.getCalendarPermissionList({
          page_size: 20,
          ...params,
          page_token: pageToken
        });

        allPermissions.push(...(response.items || []));
        pageToken = response.next_page_token;
      } while (pageToken);

      return allPermissions;
    },

    /**
     * 删除日历
     */
    async deleteCalendar(params: DeleteCalendarParams): Promise<void> {
      await httpClient.ensureAccessToken();
      const { calendar_id } = params;

      await httpClient.post(`/v7/calendars/${calendar_id}/delete`);
    },

    /**
     * 批量创建日历权限（最多支持100个用户）
     * 当权限数组超过100个时，自动分批处理
     */
    async batchCreateCalendarPermissionsLimit(
      params: BatchCreateCalendarPermissionsParams
    ): Promise<BatchCreateCalendarPermissionsResponse> {
      await httpClient.ensureAccessToken();
      const { calendar_id, permissions, id_type = 'external' } = params;

      if (permissions.length > 100) {
        throw new Error('批量创建权限失败，最多支持100个用户');
      }

      // 依次处理每个批次
      try {
        const requestBody = { permissions };
        const headers = { 'X-Kso-Id-Type': id_type };

        const response =
          await httpClient.post<BatchCreateCalendarPermissionsResponse>(
            `/v7/calendars/${calendar_id}/permissions/batch_create`,
            requestBody,
            headers
          );

        // 将当前批次的结果合并到总结果中
        if (response.data.items) {
          return response.data;
        }
        throw new Error('批量创建权限失败，未返回结果');
      } catch (error) {
        // 如果某个批次失败，停止后续处理并抛出错误
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        throw new Error(`批量创建权限失败，错误: ${errorMessage}`);
      }
    },

    /**
     * 批量创建日历权限（最多支持100个用户）
     * 当权限数组超过100个时，自动分批处理
     */
    async batchCreateCalendarPermissions(
      params: BatchCreateCalendarPermissionsParams
    ): Promise<BatchCreateCalendarPermissionsResponse> {
      await httpClient.ensureAccessToken();
      const { calendar_id, permissions, id_type = 'external' } = params;

      // 分批处理逻辑：每批最多100个用户
      const BATCH_SIZE = 100;
      const allCreatedPermissions: CalendarPermission[] = [];

      // 将权限数组分割成多个批次
      const permissionBatches: Array<typeof permissions> = [];
      for (let i = 0; i < permissions.length; i += BATCH_SIZE) {
        permissionBatches.push(permissions.slice(i, i + BATCH_SIZE));
      }
      const headers = { 'X-Kso-Id-Type': id_type };

      // 依次处理每个批次
      for (const batch of permissionBatches) {
        try {
          const requestBody = { permissions: batch };

          const response =
            await httpClient.post<BatchCreateCalendarPermissionsResponse>(
              `/v7/calendars/${calendar_id}/permissions/batch_create`,
              requestBody,
              headers
            );

          // 将当前批次的结果合并到总结果中
          if (response.data.items) {
            allCreatedPermissions.push(...response.data.items);
          }
        } catch (error) {
          // 如果某个批次失败，停止后续处理并抛出错误
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `批量创建权限失败，已处理 ${allCreatedPermissions.length} 个权限，错误: ${errorMessage}`
          );
        }
      }

      // 返回合并后的完整结果
      return {
        items: allCreatedPermissions
      };
    },

    /**
     * 删除日历权限
     */
    async deleteCalendarPermission(
      params: DeleteCalendarPermissionParams
    ): Promise<void> {
      await httpClient.ensureAccessToken();
      const {
        calendar_id,
        calendar_permission_id,
        id_type = 'external'
      } = params;
      const headers = { 'X-Kso-Id-Type': id_type };

      await httpClient.post(
        `/v7/calendars/${calendar_id}/permissions/${calendar_permission_id}/delete`,
        {},
        headers
      );
    }
  };

  return calendar;
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'calendar',
  factory: createWpsCalendarAdapter
};
