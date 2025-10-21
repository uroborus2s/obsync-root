/**
 * 日历模块类型定义
 * 包括日历管理、日程管理相关的所有类型
 */

// ==================== 基础类型 ====================

/**
 * 日历信息
 */
export interface CalendarInfo {
  /** 日历ID */
  id: string;
  /** 日历的权限级别 */
  role: string;
  /** 日历标题 */
  summary: string;
  /** 日历类型 */
  type: string;
}

/**
 * 日历权限信息
 */
export interface CalendarPermission {
  /** 权限ID */
  id: string;
  /** 日历ID */
  calendar_id: string;
  /** 用户ID或用户组ID */
  user_id: string;
  /** 权限级别：owner | writer | reader */
  role: 'owner' | 'writer' | 'reader' | 'free_busy_reader';
}

/**
 * 日程信息
 */
export interface ScheduleInfo {
  /** 日程ID */
  id: string;
  /** 日历ID */
  calendar_id: string;
  /** 日程标题 */
  summary: string;
  /** 日程描述 */
  description?: string;
  /** 开始时间 */
  start_time: ScheduleDateTime;
  /** 结束时间 */
  end_time: ScheduleDateTime;
  /** 是否全天事件 */
  is_all_day?: boolean;
  /** 重复规则 */
  recurrence?: string[];
  /** 提醒设置 */
  reminders?: ScheduleReminder[];
  /** 日程状态：confirmed | tentative | cancelled */
  status?: 'confirmed' | 'tentative' | 'cancelled';
  /** 透明度：opaque | transparent */
  transparency?: 'opaque' | 'transparent';
  /** 可见性：default | public | private */
  visibility?: 'default' | 'public' | 'private';
  /** 创建者 */
  creator?: ScheduleUser;
  /** 组织者 */
  organizer?: ScheduleUser;
  /** 参与者列表 */
  attendees?: ScheduleAttendee[];
  /** 会议室列表 */
  meeting_rooms?: ScheduleMeetingRoom[];
  /** 创建时间 */
  create_time?: string;
  /** 更新时间 */
  update_time?: string;
}

/**
 * 日程时间
 */
export interface ScheduleDateTime {
  /** 日期时间（ISO 8601格式） */
  datetime?: string;
  /** 日期（YYYY-MM-DD格式，用于全天事件） */
  date?: string;
}

/**
 * 日程提醒
 */
export interface ScheduleReminder {
  /** 提前时间（分钟） */
  minutes: number;
}

/**
 * 日程用户
 */
export interface ScheduleUser {
  /** 用户ID */
  user_id: string;
  /** 用户名 */
  display_name?: string;
  /** 邮箱 */
  email?: string;
}

/**
 * 日程参与者
 */
export interface ScheduleAttendee extends ScheduleUser {
  /** 参与者类型：user | group */
  type?: 'user' | 'group';
  /** 参与状态：needsAction | accepted | declined | tentative */
  response_status?: 'needsAction' | 'accepted' | 'declined' | 'tentative';
  /** 是否为可选参与者 */
  optional?: boolean;
  /** 备注 */
  comment?: string;
}

/**
 * 日程会议室
 */
export interface ScheduleMeetingRoom {
  /** 会议室ID */
  room_id: string;
  /** 会议室名称 */
  display_name?: string;
  /** 会议室邮箱 */
  email?: string;
  /** 预约状态：needsAction | accepted | declined | tentative */
  response_status?: 'needsAction' | 'accepted' | 'declined' | 'tentative';
}

/**
 * 忙闲信息
 */
export interface FreeBusyInfo {
  /** 用户ID */
  user_id: string;
  /** 忙碌时间段 */
  busy_times: FreeBusyTimeSlot[];
  /** 查询错误信息 */
  errors?: FreeBusyError[];
}

/**
 * 忙闲时间段
 */
export interface FreeBusyTimeSlot {
  /** 开始时间 */
  start: string;
  /** 结束时间 */
  end: string;
}

/**
 * 忙闲查询错误
 */
export interface FreeBusyError {
  /** 错误域 */
  domain: string;
  /** 错误原因 */
  reason: string;
}

/**
 * 请假日程信息
 */
export interface LeaveEventInfo {
  /** 请假日程ID */
  leave_event_id: string;
  /** 日历ID */
  calendar_id: string;
  /** 请假标题 */
  summary: string;
  /** 请假描述 */
  description?: string;
  /** 开始时间 */
  start: ScheduleDateTime;
  /** 结束时间 */
  end: ScheduleDateTime;
  /** 是否全天请假 */
  is_all_day?: boolean;
  /** 请假类型 */
  leave_type?: string;
  /** 创建时间 */
  create_time?: string;
  /** 更新时间 */
  update_time?: string;
}

// ==================== 请求参数类型 ====================

/**
 * 创建日历参数
 */
export interface CreateCalendarParams {
  /** 日历标题 */
  summary: string;
}

/**
 * 创建日历权限参数
 */
export interface CreateCalendarPermissionParams {
  /** 日历ID */
  calendar_id: string;
  /** 用户ID */
  user_id: string;
  /** 权限级别：free_busy_reader | reader | writer | owner */
  role: 'free_busy_reader' | 'reader' | 'writer' | 'owner';
  /** ID类型：internal | external */
  id_type?: 'internal' | 'external';
}

/**
 * 创建日程参数
 */
export interface CreateScheduleParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程标题 */
  summary: string;
  /** 日程描述 */
  description?: string;
  /** 开始时间 */
  start_time: ScheduleDateTime;
  /** 结束时间 */
  end_time: ScheduleDateTime;
  /** 是否全天事件 */
  is_all_day?: boolean;
  /** 重复规则 */
  recurrence?: string[];
  /** 提醒设置 */
  reminders?: ScheduleReminder[];
  /** 日程状态 */
  status?: 'confirmed' | 'tentative' | 'cancelled';
  /** 透明度 */
  transparency?: 'opaque' | 'transparent';
  /** 可见性 */
  visibility?: 'default' | 'public' | 'private';
  /** 参与者列表 */
  attendees?: Omit<ScheduleAttendee, 'user_id'>[];
  /** 会议室列表 */
  meeting_rooms?: Omit<ScheduleMeetingRoom, 'room_id'>[];
  /** 地点 */
  locations: { name: string }[];
}

/**
 * 更新日程参数
 */
export interface UpdateScheduleParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
  /** 日程标题 */
  summary?: string;
  /** 日程描述 */
  description?: string;
  /** 开始时间 */
  start?: ScheduleDateTime;
  /** 结束时间 */
  end?: ScheduleDateTime;
  /** 是否全天事件 */
  is_all_day?: boolean;
  /** 重复规则 */
  recurrence?: string[];
  /** 提醒设置 */
  reminders?: ScheduleReminder[];
  /** 日程状态 */
  status?: 'confirmed' | 'tentative' | 'cancelled';
  /** 透明度 */
  transparency?: 'opaque' | 'transparent';
  /** 可见性 */
  visibility?: 'default' | 'public' | 'private';
}

/**
 * 删除日程参数
 */
export interface DeleteScheduleParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
}

/**
 * 查询日程参数
 */
export interface GetScheduleParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
}

/**
 * 查询日程列表参数
 */
export interface GetScheduleListParams {
  /** 日历ID */
  calendar_id: string;
  /** 开始时间（ISO 8601格式） */
  start_time?: string;
  /** 结束时间（ISO 8601格式） */
  end_time?: string;
  /** 分页大小，最大100 */
  page_size?: number;
  /** 分页标记 */
  page_token?: string;
  /** 是否包含已删除的日程 */
  show_deleted?: boolean;
  /** 是否展开重复日程 */
  single_events?: boolean;
  /** 排序方式：startTime | updated */
  order_by?: 'startTime' | 'updated';
  /** ID类型：internal | external */
  id_type?: 'internal' | 'external';
}

/**
 * 查看日程忙闲参数
 */
export interface GetFreeBusyParams {
  /** 查询开始时间（ISO 8601格式） */
  time_min: string;
  /** 查询结束时间（ISO 8601格式） */
  time_max: string;
  /** 用户ID列表 */
  user_ids: string[];
}

/**
 * 批量添加日程参与者参数
 */
export interface BatchCreateAttendeesParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
  /** 参与者列表 */
  attendees: Omit<ScheduleAttendee, 'user_id'>[];
  /** ID类型：internal | external */
  id_type?: 'internal' | 'external';
}

/**
 * 批量删除日程参与者参数
 */
export interface BatchDeleteAttendeesParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
  /** 参与者用户ID列表 */
  user_ids: string[];
}

/**
 * 获取日程参与者列表参数
 */
export interface GetAttendeesParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
  /** 分页大小 */
  page_size?: number;
  /** 分页标记 */
  page_token?: string;
}

/**
 * 获取用户组成员参数
 */
export interface GetGroupMembersParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
  /** 用户组ID */
  group_id: string;
  /** 分页大小 */
  page_size?: number;
  /** 分页标记 */
  page_token?: string;
}

/**
 * 查询日历列表参数
 */
export interface GetCalendarListParams {
  /** 分页大小，默认为20，最大值为20 */
  page_size?: number;
  /** 分页标记，第一次请求不需要传递此参数，后续请求传递上一次响应中的next_page_token */
  page_token?: string;
}

/**
 * 查询日历参数
 */
export interface GetCalendarParams {
  /** 日历ID，可从日历列表、主日历详情获取 */
  calendar_id: string;
}

/**
 * 更新日历参数
 */
export interface UpdateCalendarParams {
  /** 日历ID，可从日历列表、主日历详情获取 */
  calendar_id: string;
  /** 日历标题 */
  summary: string;
}

/**
 * 查询日历权限列表参数
 */
export interface GetCalendarPermissionListParams {
  /** 日历ID */
  calendar_id: string;
  /** 分页大小，最大20 */
  page_size?: number;
  /** 分页标记 */
  page_token?: string;
  /** ID类型：internal | external */
  id_type?: 'internal' | 'external';
}

/**
 * 批量添加日程会议室参数
 */
export interface BatchCreateMeetingRoomsParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
  /** 会议室列表 */
  meeting_rooms: Omit<ScheduleMeetingRoom, 'room_id'>[];
}

/**
 * 批量删除日程会议室参数
 */
export interface BatchDeleteMeetingRoomsParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
  /** 会议室ID列表 */
  room_ids: string[];
}

/**
 * 获取日程会议室列表参数
 */
export interface GetScheduleMeetingRoomsParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程ID */
  event_id: string;
  /** 分页大小 */
  page_size?: number;
  /** 分页标记 */
  page_token?: string;
}

/**
 * 创建请假日程参数
 */
export interface CreateLeaveEventParams {
  /** 日历ID */
  calendar_id: string;
  /** 请假标题 */
  summary: string;
  /** 请假描述 */
  description?: string;
  /** 开始时间 */
  start: ScheduleDateTime;
  /** 结束时间 */
  end: ScheduleDateTime;
  /** 是否全天请假 */
  is_all_day?: boolean;
  /** 请假类型 */
  leave_type?: string;
}

/**
 * 删除请假日程参数
 */
export interface DeleteLeaveEventParams {
  /** 日历ID */
  calendar_id: string;
  /** 请假日程ID */
  leave_event_id: string;
}

// ==================== 响应类型 ====================

/**
 * 查询日历列表响应
 */
export interface GetCalendarListResponse {
  /** 日历列表 */
  Items: CalendarInfo[];
  /** 下一页的标记，当该字段为空时，表示没有更多数据 */
  next_page_token?: string;
}

/**
 * 查询日历响应
 */
export interface GetCalendarResponse {
  /** 日历详细信息 */
  data: CalendarInfo;
  /** 状态码 */
  code: number;
  /** 消息 */
  msg: string;
}

/**
 * 更新日历响应
 */
export interface UpdateCalendarResponse {
  /** 状态码 */
  code: number;
  /** 人可阅读的文本信息，可能会包含不同的语言地区返回不同的文本信息 */
  msg: string;
}

/**
 * 创建日历权限响应
 */
export interface CreateCalendarPermissionResponse {
  /** 日历权限数据 */
  data: {
    /** 日历ID */
    calendar_id: string;
    /** 权限ID */
    id: string;
    /** 权限级别 */
    role: string;
    /** 用户ID */
    user_id: string;
  };
  /** 状态码 */
  code: number;
  /** 消息 */
  msg: string;
}

/**
 * 创建日程响应
 */
export interface CreateScheduleResponse {
  /** 日程信息 */
  event: ScheduleInfo;
}

/**
 * 批量创建日程参数
 */
export interface BatchCreateSchedulesParams {
  /** 日历ID */
  calendar_id: string;
  /** 日程列表，最多支持100个日程 */
  events: Array<{
    /** 日程标题 */
    summary: string;
    /** 日程描述 */
    description?: string;
    /** 开始时间 */
    start_time: ScheduleDateTime;
    /** 结束时间 */
    end_time: ScheduleDateTime;
    /** 是否全天日程 */
    is_all_day?: boolean;
    /** 时区 */
    time_zone?: string;
    /** 重复规则 */
    recurrence?: string[];
    /** 提醒设置 */
    reminders?: ScheduleReminder[];
    /** 地点 */
    location?: Array<{ name: string }>;
  }>;
}

/**
 * 批量创建日程响应
 */
export interface BatchCreateSchedulesResponse {
  /** 创建的日程列表 */
  items: ScheduleInfo[];
}

/**
 * 查询日程响应
 */
export interface GetScheduleResponse {
  /** 日程信息 */
  event: ScheduleInfo;
}

/**
 * 查询日程列表响应
 */
export interface GetScheduleListResponse {
  /** 日程列表 */
  items: ScheduleInfo[];
  /** 下一页标记 */
  next_page_token?: string;
  /** 总数 */
  total_count?: number;
}

/**
 * 查看日程忙闲响应
 */
export interface GetFreeBusyResponse {
  /** 忙闲信息列表 */
  calendars: Record<string, FreeBusyInfo>;
}

/**
 * 获取日程参与者列表响应
 */
export interface GetAttendeesResponse {
  /** 参与者列表 */
  items: ScheduleAttendee[];
  /** 下一页标记 */
  next_page_token?: string;
  /** 总数 */
  total_count?: number;
}

/**
 * 批量添加日程参与者响应
 */
export interface BatchCreateAttendeesResponse {
  /** 添加的参与者列表 */
  items: ScheduleAttendee[];
}

/**
 * 获取用户组成员响应
 */
export interface GetGroupMembersResponse {
  /** 成员列表 */
  items: ScheduleUser[];
  /** 下一页标记 */
  next_page_token?: string;
  /** 总数 */
  total_count?: number;
}

/**
 * 获取日程会议室列表响应
 */
export interface GetScheduleMeetingRoomsResponse {
  /** 会议室列表 */
  items: ScheduleMeetingRoom[];
  /** 下一页标记 */
  next_page_token?: string;
  /** 总数 */
  total_count?: number;
}

/**
 * 创建请假日程响应
 */
export interface CreateLeaveEventResponse {
  /** 请假日程信息 */
  leave_event: LeaveEventInfo;
}

/**
 * 查询日历权限列表响应
 */
export interface GetCalendarPermissionListResponse {
  /** 权限列表 */
  items: CalendarPermission[];
  /** 下一页标记 */
  next_page_token?: string;
  /** 总数 */
  total_count?: number;
}

/**
 * 删除日历参数
 */
export interface DeleteCalendarParams {
  /** 日历ID */
  calendar_id: string;
  /** ID类型：internal | external */
  id_type?: 'internal' | 'external';
}

/**
 * 批量创建日历权限参数
 */
export interface BatchCreateCalendarPermissionsParams {
  /** 日历ID */
  calendar_id: string;
  /** 权限列表，最多支持100个用户 */
  permissions: Array<{
    /** 用户ID */
    user_id: string;
    /** 权限级别 */
    role: 'free_busy_reader' | 'reader' | 'writer';
  }>;
  /** ID类型：internal | external */
  id_type?: 'internal' | 'external';
}

/**
 * 批量创建日历权限响应
 */
export interface BatchCreateCalendarPermissionsResponse {
  /** 创建的权限列表 */
  items: CalendarPermission[];
}

/**
 * 删除日历权限参数
 */
export interface DeleteCalendarPermissionParams {
  /** 日历ID */
  calendar_id: string;
  /** 权限ID */
  calendar_permission_id: string;
  /** ID类型：internal | external */
  id_type?: 'internal' | 'external';
}
