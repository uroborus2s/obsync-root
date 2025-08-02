import type { AwilixContainer } from '@stratix/core';
import type { HttpClientService } from '../services/httpClientService.js';
import type {
  BatchCreateSchedulesParams,
  BatchCreateSchedulesResponse,
  CreateScheduleParams,
  CreateScheduleResponse,
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
  createSchedule(params: CreateScheduleParams): Promise<CreateScheduleResponse>;
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
    async createSchedule(
      params: CreateScheduleParams
    ): Promise<CreateScheduleResponse> {
      await httpClient.ensureAccessToken();
      const { calendar_id, ...eventData } = params;

      const response = await httpClient.post<CreateScheduleResponse>(
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

      // 分批处理逻辑：每批最多100个日程
      const BATCH_SIZE = 100;
      const allCreatedEvents: ScheduleInfo[] = [];

      // 将日程数组分割成多个批次
      const eventBatches: Array<typeof events> = [];
      for (let i = 0; i < events.length; i += BATCH_SIZE) {
        eventBatches.push(events.slice(i, i + BATCH_SIZE));
      }

      // 依次处理每个批次
      for (const batch of eventBatches) {
        try {
          const requestBody = { events: batch };

          const response = await httpClient.post<BatchCreateSchedulesResponse>(
            `/v7/calendars/${calendar_id}/events/batch_create`,
            requestBody
          );

          // 将当前批次的结果合并到总结果中
          if (response.data.events) {
            allCreatedEvents.push(...response.data.events);
          }
        } catch (error) {
          // 如果某个批次失败，停止后续处理并抛出错误
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          throw new Error(
            `批量创建日程失败，已处理 ${allCreatedEvents.length} 个日程，错误: ${errorMessage}`
          );
        }
      }

      // 返回合并后的完整结果
      return {
        events: allCreatedEvents
      };
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

      const response = await httpClient.get<GetScheduleListResponse>(
        `/v7/calendars/${calendar_id}/events`,
        queryParams
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
