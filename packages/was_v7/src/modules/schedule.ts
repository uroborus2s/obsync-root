import type { AuthManager } from '../auth/auth-manager.js';
import type { HttpClient } from '../core/http-client.js';
import type {
  BatchCreateAttendeesParams,
  BatchCreateMeetingRoomsParams,
  BatchDeleteAttendeesParams,
  BatchDeleteMeetingRoomsParams,
  CreateLeaveEventParams,
  CreateLeaveEventResponse,
  CreateScheduleParams,
  CreateScheduleResponse,
  DeleteLeaveEventParams,
  DeleteScheduleParams,
  FreeBusyInfo,
  GetAttendeesParams,
  GetAttendeesResponse,
  GetFreeBusyParams,
  GetFreeBusyResponse,
  GetGroupMembersParams,
  GetGroupMembersResponse,
  GetScheduleListParams,
  GetScheduleListResponse,
  GetScheduleMeetingRoomsParams,
  GetScheduleMeetingRoomsResponse,
  GetScheduleParams,
  LeaveEventInfo,
  ScheduleAttendee,
  ScheduleInfo,
  ScheduleMeetingRoom,
  ScheduleUser,
  UpdateScheduleParams
} from '../types/calendar.js';

/**
 * 日程管理模块
 * 提供完整的日程管理功能，包括日程CRUD、参与者管理、会议室管理、请假日程等
 */
export class ScheduleModule {
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

  // ==================== 日程基础管理 ====================

  /**
   * 创建日程
   * 在指定日历中创建新的日程
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/create-schedule.html
   * @param params 创建参数
   * @returns 创建的日程信息
   */
  async createSchedule({
    calendar_id,
    ...params
  }: CreateScheduleParams): Promise<ScheduleInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<ScheduleInfo>(
      `/v7/calendars/${calendar_id}/events/create`,
      params
    );
    return response.data;
  }

  /**
   * 更新日程
   * 更新指定日程的信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/update-schedule.html
   * @param params 更新参数
   * @returns 更新后的日程信息
   */
  async updateSchedule(params: UpdateScheduleParams): Promise<ScheduleInfo> {
    await this.ensureAccessToken();

    const { calendar_id, event_id, ...updateData } = params;
    const response = await this.wasV7HttpClient.put<CreateScheduleResponse>(
      `/v7/calendars/${calendar_id}/events/${event_id}`,
      updateData
    );
    return response.data.event;
  }

  /**
   * 删除日程
   * 删除指定的日程
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/delete-schedule.html
   * @param params 删除参数
   */
  async deleteSchedule(params: DeleteScheduleParams): Promise<void> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post(
      `/v7/calendars/${params.calendar_id}/events/${params.event_id}/delete`
    );
    console.log(response);
  }

  /**
   * 查询日程
   * 获取指定日程的详细信息
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/get-schedule.html
   * @param params 查询参数
   * @returns 日程信息
   */
  async getSchedule(params: GetScheduleParams): Promise<ScheduleInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.get<ScheduleInfo>(
      `/v7/calendars/${params.calendar_id}/events/${params.event_id}`
    );
    return response.data;
  }

  /**
   * 查询日程列表（分页）
   * 获取指定日历中的日程列表，支持时间范围过滤和分页
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/get-schedule-list.html
   * @param params 查询参数
   * @returns 日程列表响应
   */
  async getScheduleList({
    calendar_id,
    ...params
  }: GetScheduleListParams): Promise<GetScheduleListResponse> {
    await this.ensureAccessToken();

    // 限制分页大小最大为100
    const pageSize = Math.min(params.page_size || 20, 100);
    const queryParams = {
      ...params,
      page_size: pageSize
    };

    const response = await this.wasV7HttpClient.get<GetScheduleListResponse>(
      `/v7/calendars/${calendar_id}/events`,
      queryParams
    );
    return response.data;
  }

  /**
   * 获取所有日程列表（自动分页）
   * 自动处理分页，获取指定日历中的所有日程
   *
   * @param params 查询参数
   * @returns 所有日程列表
   */
  async getAllScheduleList(
    params: Omit<GetScheduleListParams, 'page_token'>
  ): Promise<ScheduleInfo[]> {
    const allSchedules: ScheduleInfo[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.getScheduleList({
        ...params,
        page_token: pageToken
      });

      allSchedules.push(...response.items);
      pageToken = response.next_page_token;
    } while (pageToken);

    return allSchedules;
  }

  /**
   * 查看日程忙闲
   * 查询指定用户在指定时间范围内的忙闲状态
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/free-busy-list.html
   * @param params 查询参数
   * @returns 忙闲信息
   */
  async getFreeBusy(
    params: GetFreeBusyParams
  ): Promise<Record<string, FreeBusyInfo>> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<GetFreeBusyResponse>(
      '/v7/calendars/freebusy',
      params
    );
    return response.data.calendars;
  }

  // ==================== 日程参与者管理 ====================

  /**
   * 添加日程参与者
   * 批量添加参与者到指定日程
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/batch-create-attendees.html
   * @param params 添加参数
   */
  async addScheduleAttendees(
    params: BatchCreateAttendeesParams
  ): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.post(
      `/v7/calendars/${params.calendar_id}/events/${params.event_id}/attendees`,
      { attendees: params.attendees }
    );
  }

  /**
   * 删除日程参与者
   * 批量删除指定日程的参与者
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/batch-delete-attendees.html
   * @param params 删除参数
   */
  async removeScheduleAttendees(
    params: BatchDeleteAttendeesParams
  ): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.delete(
      `/v7/calendars/${params.calendar_id}/events/${params.event_id}/attendees`,
      { user_ids: params.user_ids }
    );
  }

  /**
   * 获取日程参与者列表（分页）
   * 获取指定日程的参与者列表
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/get-attendees.html
   * @param params 查询参数
   * @returns 参与者列表响应
   */
  async getScheduleAttendees(
    params: GetAttendeesParams
  ): Promise<GetAttendeesResponse> {
    await this.ensureAccessToken();

    const queryParams = {
      page_size: params.page_size,
      page_token: params.page_token
    };

    const response = await this.wasV7HttpClient.get<GetAttendeesResponse>(
      `/v7/calendars/${params.calendar_id}/events/${params.event_id}/attendees`,
      queryParams
    );
    return response.data;
  }

  /**
   * 获取所有日程参与者（自动分页）
   * 自动处理分页，获取指定日程的所有参与者
   *
   * @param params 查询参数
   * @returns 所有参与者列表
   */
  async getAllScheduleAttendees(
    params: Omit<GetAttendeesParams, 'page_token'>
  ): Promise<ScheduleAttendee[]> {
    const allAttendees: ScheduleAttendee[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.getScheduleAttendees({
        ...params,
        page_token: pageToken
      });

      allAttendees.push(...response.items);
      pageToken = response.next_page_token;
    } while (pageToken);

    return allAttendees;
  }

  /**
   * 获取某个日程参与者为用户组的成员
   * 当日程参与者是用户组时，获取该用户组的成员列表
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/get-members-of-attendee-groups.html
   * @param params 查询参数
   * @returns 用户组成员列表
   */
  async getAttendeeGroupMembers(
    params: GetGroupMembersParams
  ): Promise<GetGroupMembersResponse> {
    await this.ensureAccessToken();

    const queryParams = {
      page_size: params.page_size,
      page_token: params.page_token
    };

    const response = await this.wasV7HttpClient.get<GetGroupMembersResponse>(
      `/v7/calendars/${params.calendar_id}/events/${params.event_id}/attendees/${params.group_id}/members`,
      queryParams
    );
    return response.data;
  }

  /**
   * 获取用户组所有成员（自动分页）
   * 自动处理分页，获取用户组的所有成员
   *
   * @param params 查询参数
   * @returns 所有成员列表
   */
  async getAllAttendeeGroupMembers(
    params: Omit<GetGroupMembersParams, 'page_token'>
  ): Promise<ScheduleUser[]> {
    const allMembers: ScheduleUser[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.getAttendeeGroupMembers({
        ...params,
        page_token: pageToken
      });

      allMembers.push(...response.items);
      pageToken = response.next_page_token;
    } while (pageToken);

    return allMembers;
  }

  // ==================== 日程会议室管理 ====================

  /**
   * 添加日程会议室
   * 批量添加会议室到指定日程
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/batch-create-meeting-rooms.html
   * @param params 添加参数
   */
  async addScheduleMeetingRooms(
    params: BatchCreateMeetingRoomsParams
  ): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.post(
      `/v7/calendars/${params.calendar_id}/events/${params.event_id}/meeting-rooms`,
      { meeting_rooms: params.meeting_rooms }
    );
  }

  /**
   * 删除日程会议室
   * 批量删除指定日程的会议室
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/batch-delete-meeting-rooms.html
   * @param params 删除参数
   */
  async removeScheduleMeetingRooms(
    params: BatchDeleteMeetingRoomsParams
  ): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.delete(
      `/v7/calendars/${params.calendar_id}/events/${params.event_id}/meeting-rooms`,
      { room_ids: params.room_ids }
    );
  }

  /**
   * 获取日程会议室列表（分页）
   * 获取指定日程的会议室列表
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/get-schedule-meeting-rooms.html
   * @param params 查询参数
   * @returns 会议室列表响应
   */
  async getScheduleMeetingRooms(
    params: GetScheduleMeetingRoomsParams
  ): Promise<GetScheduleMeetingRoomsResponse> {
    await this.ensureAccessToken();

    const queryParams = {
      page_size: params.page_size,
      page_token: params.page_token
    };

    const response =
      await this.wasV7HttpClient.get<GetScheduleMeetingRoomsResponse>(
        `/v7/calendars/${params.calendar_id}/events/${params.event_id}/meeting-rooms`,
        queryParams
      );
    return response.data;
  }

  /**
   * 获取所有日程会议室（自动分页）
   * 自动处理分页，获取指定日程的所有会议室
   *
   * @param params 查询参数
   * @returns 所有会议室列表
   */
  async getAllScheduleMeetingRooms(
    params: Omit<GetScheduleMeetingRoomsParams, 'page_token'>
  ): Promise<ScheduleMeetingRoom[]> {
    const allMeetingRooms: ScheduleMeetingRoom[] = [];
    let pageToken: string | undefined;

    do {
      const response = await this.getScheduleMeetingRooms({
        ...params,
        page_token: pageToken
      });

      allMeetingRooms.push(...response.items);
      pageToken = response.next_page_token;
    } while (pageToken);

    return allMeetingRooms;
  }

  // ==================== 请假日程管理 ====================

  /**
   * 创建请假日程
   * 创建请假类型的日程
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/create-leave-event.html
   * @param params 创建参数
   * @returns 创建的请假日程信息
   */
  async createLeaveEvent(
    params: CreateLeaveEventParams
  ): Promise<LeaveEventInfo> {
    await this.ensureAccessToken();

    const response = await this.wasV7HttpClient.post<CreateLeaveEventResponse>(
      '/v7/calendars/leave-events',
      params
    );
    return response.data.leave_event;
  }

  /**
   * 删除请假日程
   * 删除指定的请假日程
   *
   * @see https://365.kdocs.cn/3rd/open/documents/app-integration-dev/server/calendar/schedule/delete-leave-event.html
   * @param params 删除参数
   */
  async deleteLeaveEvent(params: DeleteLeaveEventParams): Promise<void> {
    await this.ensureAccessToken();

    await this.wasV7HttpClient.delete(
      `/v7/calendars/${params.calendar_id}/leave-events/${params.leave_event_id}`
    );
  }

  // ==================== 便捷方法 ====================

  /**
   * 创建简单日程
   * 快速创建一个简单的日程，只需要基本信息
   *
   * @param calendarId 日历ID
   * @param summary 日程标题
   * @param startTime 开始时间（ISO 8601格式）
   * @param endTime 结束时间（ISO 8601格式）
   * @param description 日程描述（可选）
   * @returns 创建的日程信息
   */
  async createSimpleSchedule(
    calendarId: string,
    summary: string,
    startTime: string,
    endTime: string,
    description?: string
  ): Promise<ScheduleInfo> {
    return this.createSchedule({
      calendar_id: calendarId,
      summary,
      description,
      start_time: { datetime: startTime },
      end_time: { datetime: endTime }
    });
  }

  /**
   * 创建全天日程
   * 创建一个全天的日程
   *
   * @param calendarId 日历ID
   * @param summary 日程标题
   * @param date 日期（YYYY-MM-DD格式）
   * @param description 日程描述（可选）
   * @returns 创建的日程信息
   */
  async createAllDaySchedule(
    calendarId: string,
    summary: string,
    date: string,
    description?: string
  ): Promise<ScheduleInfo> {
    return this.createSchedule({
      calendar_id: calendarId,
      summary,
      description,
      start_time: { date },
      end_time: { date },
      is_all_day: true
    });
  }

  /**
   * 获取今日日程
   * 获取指定日历今天的所有日程
   *
   * @param calendarId 日历ID
   * @returns 今日日程列表
   */
  async getTodaySchedules(calendarId: string): Promise<ScheduleInfo[]> {
    const today = new Date();
    const startOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );
    const endOfDay = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

    return this.getAllScheduleList({
      calendar_id: calendarId,
      start_time: startOfDay.toISOString(),
      end_time: endOfDay.toISOString(),
      single_events: true,
      order_by: 'startTime'
    });
  }

  /**
   * 获取本周日程
   * 获取指定日历本周的所有日程
   *
   * @param calendarId 日历ID
   * @returns 本周日程列表
   */
  async getThisWeekSchedules(calendarId: string): Promise<ScheduleInfo[]> {
    const today = new Date();
    const startOfWeek = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - today.getDay()
    );
    const endOfWeek = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() - today.getDay() + 7
    );

    return this.getAllScheduleList({
      calendar_id: calendarId,
      start_time: startOfWeek.toISOString(),
      end_time: endOfWeek.toISOString(),
      single_events: true,
      order_by: 'startTime'
    });
  }
}
