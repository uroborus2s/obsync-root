import type { AwilixContainer } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  BatchCreateAttendeesParams,
  BatchCreateAttendeesResponse,
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
 * 包含日程管理和参与者管理功能
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

  // 日程参与者管理功能
  batchCreateAttendees(
    params: BatchCreateAttendeesParams
  ): Promise<BatchCreateAttendeesResponse>;
}

/**
 * 创建WPS日程适配器的工厂函数
 * 包含日程管理和参与者管理功能
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
      const { calendar_id, id_type = 'external', ...queryParams } = params;

      const headers = { 'X-Kso-Id-Type': id_type };

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
    },

    /**
     * 批量添加日程参与者
     */
    async batchCreateAttendees(
      params: BatchCreateAttendeesParams
    ): Promise<BatchCreateAttendeesResponse> {
      await httpClient.ensureAccessToken();
      const { calendar_id, event_id, attendees, id_type = 'external' } = params;

      // 检查参与者数量，如果超过1000则抛出错误
      if (attendees.length > 1000) {
        throw new Error(
          `批量添加参与者失败：参与者数量不能超过1000个，当前数量: ${attendees.length}`
        );
      }

      // 构建请求体
      const requestBody = {
        attendees,
        is_notification: false // 默认状态
      };

      // 设置请求头
      const headers = { 'X-Kso-Id-Type': id_type };

      const response = await httpClient.post<BatchCreateAttendeesResponse>(
        `/v7/calendars/${calendar_id}/events/${event_id}/attendees/batch_create`,
        requestBody,
        headers
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
