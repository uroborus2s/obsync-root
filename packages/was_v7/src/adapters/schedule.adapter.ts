import type { AwilixContainer } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  BatchCreateSchedulesParams,
  BatchCreateSchedulesResponse,
  CreateScheduleParams,
  DeleteScheduleParams,
  GetScheduleListParams,
  GetScheduleListResponse,
  GetScheduleParams,
  ScheduleInfo
} from '../types/calendar.js';

/**
 * WPS V7 日程API适配器
 * 提供纯函数式的日程管理API调用
 * 简化版本，只包含6个核心功能
 */
export interface WpsScheduleAdapter {
  // 核心日程管理功能
  createSchedule(params: CreateScheduleParams): Promise<ScheduleInfo>;
  batchCreateSchedules(
    params: BatchCreateSchedulesParams
  ): Promise<BatchCreateSchedulesResponse>;
  deleteSchedule(params: DeleteScheduleParams): Promise<void>;
  getScheduleList(
    params: GetScheduleListParams
  ): Promise<GetScheduleListResponse>;
  getSchedule(params: GetScheduleParams): Promise<ScheduleInfo>;
}

/**
 * 创建WPS日程适配器的工厂函数
 * 简化版本，只包含6个核心功能
 */
export function createWpsScheduleAdapter(
  pluginContainer: AwilixContainer
): WpsScheduleAdapter {
  const httpClient =
    pluginContainer.resolve<HttpClientService>('httpClientService');

  const schedule: WpsScheduleAdapter = {
    /**
     * 创建日程
     */
    async createSchedule(params: CreateScheduleParams): Promise<ScheduleInfo> {
      await httpClient.ensureAccessToken();
      const { calendar_id, ...eventData } = params;

      const response = await httpClient.post<ScheduleInfo>(
        `/v7/calendars/${calendar_id}/events/create`,
        eventData
      );
      return response.data;
    },

    /**
     * 批量创建日程
     */
    async batchCreateSchedules(
      params: BatchCreateSchedulesParams
    ): Promise<BatchCreateSchedulesResponse> {
      await httpClient.ensureAccessToken();
      const { calendar_id, events } = params;

      // 检查events数量，如果超过100则抛出错误
      if (events.length > 100) {
        throw new Error(
          `批量创建日程失败：events数量不能超过100个，当前数量: ${events.length}`
        );
      }

      // 直接发送请求，不进行分割
      const requestBody = { events };

      const response = await httpClient.post<BatchCreateSchedulesResponse>(
        `/v7/calendars/${calendar_id}/events/batch_create`,
        requestBody
      );

      return response.data;
    },

    /**
     * 删除日程
     */
    async deleteSchedule(params: DeleteScheduleParams): Promise<void> {
      await httpClient.ensureAccessToken();
      const { calendar_id, event_id } = params;

      await httpClient.post(
        `/v7/calendars/${calendar_id}/events/${event_id}/delete`
      );
    },

    /**
     * 获取日程列表
     */
    async getScheduleList(
      params: GetScheduleListParams
    ): Promise<GetScheduleListResponse> {
      await httpClient.ensureAccessToken();
      const { calendar_id, ...queryParams } = params;

      const headers = { 'X-Kso-Id-Type': 'external' };
      const response = await httpClient.get<GetScheduleListResponse>(
        `/v7/calendars/${calendar_id}/events`,
        queryParams,
        headers
      );
      return response.data;
    },

    /**
     * 获取单个日程
     */
    async getSchedule(params: GetScheduleParams): Promise<ScheduleInfo> {
      await httpClient.ensureAccessToken();
      const { calendar_id, event_id } = params;

      const response = await httpClient.get<ScheduleInfo>(
        `/v7/calendars/${calendar_id}/events/${event_id}`
      );
      return response.data;
    }
  };

  return schedule;
}

/**
 * 默认导出适配器配置
 */
export default {
  adapterName: 'schedule',
  factory: createWpsScheduleAdapter
};
