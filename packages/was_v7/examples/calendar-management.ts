/**
 * WPS V7 日历管理示例
 * 演示如何使用新增的查询日历和更新日历功能
 */

import type { WpsCalendarAdapter } from '../src/adapters/calendar.adapter.js';
import type {
  GetCalendarListParams,
  GetCalendarParams,
  UpdateCalendarParams,
  UpdateScheduleParams
} from '../src/types/calendar.js';

/**
 * 日历管理示例类
 */
export class CalendarManagementExample {
  constructor(private calendarAdapter: WpsCalendarAdapter) {}

  /**
   * 示例1: 查询日历列表
   */
  async listCalendars() {
    console.log('=== 查询日历列表示例 ===');

    try {
      // 1. 查询第一页日历列表
      const params: GetCalendarListParams = {
        page_size: 10
      };

      const response = await this.calendarAdapter.getCalendarList(params);
      console.log('日历列表:', response.items);
      console.log('下一页标记:', response.next_page_token);

      // 2. 获取所有日历列表（自动分页）
      const allCalendars = await this.calendarAdapter.getAllCalendarList();
      console.log('所有日历数量:', allCalendars.length);

      return response;
    } catch (error) {
      console.error('查询日历列表失败:', error);
      throw error;
    }
  }

  /**
   * 示例2: 查询单个日历详情
   */
  async getCalendarDetails(calendarId: string) {
    console.log('=== 查询日历详情示例 ===');

    try {
      const params: GetCalendarParams = {
        calendar_id: calendarId
      };

      const calendar = await this.calendarAdapter.getCalendar(params);
      console.log('日历详情:', {
        id: calendar.id,
        title: calendar.summary,
        type: calendar.type,
        role: calendar.role
      });

      return calendar;
    } catch (error) {
      console.error('查询日历详情失败:', error);
      throw error;
    }
  }

  /**
   * 示例3: 更新日历信息
   */
  async updateCalendarTitle(calendarId: string, newTitle: string) {
    console.log('=== 更新日历示例 ===');

    try {
      const params: UpdateCalendarParams = {
        calendar_id: calendarId,
        summary: newTitle
      };

      const response = await this.calendarAdapter.updateCalendar(params);
      console.log('更新结果:', {
        code: response.code,
        message: response.msg
      });

      // 验证更新结果
      if (response.code === 0) {
        console.log('日历更新成功！');

        // 重新查询验证更新
        const updatedCalendar = await this.getCalendarDetails(calendarId);
        console.log('更新后的标题:', updatedCalendar.summary);
      } else {
        console.error('日历更新失败:', response.msg);
      }

      return response;
    } catch (error) {
      console.error('更新日历失败:', error);
      throw error;
    }
  }

  /**
   * 示例4: 完整的日历管理流程
   */
  async completeCalendarManagement() {
    console.log('=== 完整日历管理流程示例 ===');

    try {
      // 1. 获取主日历
      const primaryCalendar = await this.calendarAdapter.getPrimaryCalendar();
      console.log('主日历:', primaryCalendar);

      // 2. 查询所有日历列表
      const calendars = await this.listCalendars();

      // 3. 如果有日历，查询第一个日历的详情
      if (calendars.items && calendars.items.length > 0) {
        const firstCalendar = calendars.items[0];
        await this.getCalendarDetails(firstCalendar.id);

        // 4. 更新日历标题（示例）
        const newTitle = `${firstCalendar.summary} - 已更新 ${new Date().toISOString()}`;
        await this.updateCalendarTitle(firstCalendar.id, newTitle);
      }

      console.log('完整流程执行成功！');
    } catch (error) {
      console.error('完整流程执行失败:', error);
      throw error;
    }
  }

  /**
   * 示例5: 分页查询所有日历
   */
  async paginatedCalendarList() {
    console.log('=== 分页查询日历示例 ===');

    const allCalendars = [];
    let pageToken: string | undefined;
    let pageNumber = 1;

    try {
      do {
        console.log(`正在查询第 ${pageNumber} 页...`);

        const params: GetCalendarListParams = {
          page_size: 5, // 每页5个
          page_token: pageToken
        };

        const response = await this.calendarAdapter.getCalendarList(params);

        console.log(
          `第 ${pageNumber} 页结果:`,
          response.items?.length || 0,
          '个日历'
        );

        if (response.items) {
          allCalendars.push(...response.items);
        }

        pageToken = response.next_page_token;
        pageNumber++;

        // 防止无限循环
        if (pageNumber > 10) {
          console.warn('已达到最大页数限制，停止查询');
          break;
        }
      } while (pageToken);

      console.log('分页查询完成，总共找到', allCalendars.length, '个日历');
      return allCalendars;
    } catch (error) {
      console.error('分页查询失败:', error);
      throw error;
    }
  }
}

/**
 * 使用示例
 */
export async function runCalendarManagementExamples(
  calendarAdapter: WpsCalendarAdapter
) {
  const example = new CalendarManagementExample(calendarAdapter);

  try {
    // 运行各种示例
    await example.listCalendars();
    await example.paginatedCalendarList();
    await example.completeCalendarManagement();

    console.log('所有示例执行完成！');
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}

/**
 * 日程更新示例类
 * 演示如何使用更新日程接口
 */
export class ScheduleUpdateExample {
  constructor(private scheduleAdapter: any) {} // 使用 any 避免循环依赖

  /**
   * 示例1: 更新日程基本信息
   */
  async updateScheduleBasicInfo(calendarId: string, eventId: string) {
    console.log('=== 更新日程基本信息示例 ===');

    try {
      const params: UpdateScheduleParams = {
        calendar_id: calendarId,
        event_id: eventId,
        summary: '更新后的日程标题',
        description: '这是更新后的日程描述',
        visibility: 'default'
      };

      const updatedSchedule = await this.scheduleAdapter.updateSchedule(params);
      console.log('更新成功:', {
        id: updatedSchedule.id,
        summary: updatedSchedule.summary,
        description: updatedSchedule.description
      });

      return updatedSchedule;
    } catch (error) {
      console.error('更新日程基本信息失败:', error);
      throw error;
    }
  }

  /**
   * 示例2: 更新日程时间
   */
  async updateScheduleTime(calendarId: string, eventId: string) {
    console.log('=== 更新日程时间示例 ===');

    try {
      const params: UpdateScheduleParams = {
        calendar_id: calendarId,
        event_id: eventId,
        start_time: {
          datetime: '2024-01-20T10:00:00+08:00'
        },
        end_time: {
          datetime: '2024-01-20T11:00:00+08:00'
        },
        is_notification: true, // 通知参与者
        is_reinvition: true // 重置邀请状态
      };

      const updatedSchedule = await this.scheduleAdapter.updateSchedule(params);
      console.log('时间更新成功:', {
        start: updatedSchedule.start_time,
        end: updatedSchedule.end_time
      });

      return updatedSchedule;
    } catch (error) {
      console.error('更新日程时间失败:', error);
      throw error;
    }
  }

  /**
   * 示例3: 更新日程地点和在线会议
   */
  async updateScheduleLocation(calendarId: string, eventId: string) {
    console.log('=== 更新日程地点和在线会议示例 ===');

    try {
      const params: UpdateScheduleParams = {
        calendar_id: calendarId,
        event_id: eventId,
        locations: [{ name: '会议室A' }],
        online_meeting: {
          provider: 'kso',
          description: '加入金山会议'
        }
      };

      const updatedSchedule = await this.scheduleAdapter.updateSchedule(params);
      console.log('地点和会议更新成功');

      return updatedSchedule;
    } catch (error) {
      console.error('更新日程地点失败:', error);
      throw error;
    }
  }

  /**
   * 示例4: 更新重复日程（单次）
   */
  async updateRecurringScheduleSingle(
    calendarId: string,
    eventId: string,
    whichDayTime: number
  ) {
    console.log('=== 更新重复日程（单次）示例 ===');

    try {
      const params: UpdateScheduleParams = {
        calendar_id: calendarId,
        event_id: eventId,
        mod_type: 'one', // 只修改单次
        which_day_time: whichDayTime, // 指定具体实例的时间戳
        summary: '单次会议标题修改',
        start_time: {
          datetime: '2024-01-20T14:00:00+08:00'
        },
        end_time: {
          datetime: '2024-01-20T15:00:00+08:00'
        }
      };

      const updatedSchedule = await this.scheduleAdapter.updateSchedule(params);
      console.log('单次重复日程更新成功');

      return updatedSchedule;
    } catch (error) {
      console.error('更新单次重复日程失败:', error);
      throw error;
    }
  }

  /**
   * 示例5: 更新重复日程（全部）
   */
  async updateRecurringScheduleAll(calendarId: string, eventId: string) {
    console.log('=== 更新重复日程（全部）示例 ===');

    try {
      const params: UpdateScheduleParams = {
        calendar_id: calendarId,
        event_id: eventId,
        mod_type: 'all', // 修改全部
        summary: '周会 - 已更新',
        recurrence: {
          freq: 'WEEKLY',
          interval: 1,
          by_day: ['MO', 'WE'], // 改为每周一和周三
          until_date: {
            date: '2024-12-31'
          }
        }
      };

      const updatedSchedule = await this.scheduleAdapter.updateSchedule(params);
      console.log('全部重复日程更新成功');

      return updatedSchedule;
    } catch (error) {
      console.error('更新全部重复日程失败:', error);
      throw error;
    }
  }

  /**
   * 示例6: 更新日程提醒
   */
  async updateScheduleReminders(calendarId: string, eventId: string) {
    console.log('=== 更新日程提醒示例 ===');

    try {
      const params: UpdateScheduleParams = {
        calendar_id: calendarId,
        event_id: eventId,
        reminders: [
          { minutes: 15 }, // 提前15分钟
          { minutes: 60 }, // 提前1小时
          { minutes: 1440 } // 提前1天
        ]
      };

      const updatedSchedule = await this.scheduleAdapter.updateSchedule(params);
      console.log('提醒设置更新成功');

      return updatedSchedule;
    } catch (error) {
      console.error('更新日程提醒失败:', error);
      throw error;
    }
  }

  /**
   * 示例7: 清除在线会议
   */
  async clearOnlineMeeting(calendarId: string, eventId: string) {
    console.log('=== 清除在线会议示例 ===');

    try {
      const params: UpdateScheduleParams = {
        calendar_id: calendarId,
        event_id: eventId,
        online_meeting: null // 设置为 null 清除在线会议
      };

      const updatedSchedule = await this.scheduleAdapter.updateSchedule(params);
      console.log('在线会议已清除');

      return updatedSchedule;
    } catch (error) {
      console.error('清除在线会议失败:', error);
      throw error;
    }
  }

  /**
   * 示例8: 更新参与者权限和忙闲状态
   */
  async updateSchedulePermissions(calendarId: string, eventId: string) {
    console.log('=== 更新参与者权限和忙闲状态示例 ===');

    try {
      const params: UpdateScheduleParams = {
        calendar_id: calendarId,
        event_id: eventId,
        attendee_ability: 'can_invite_others', // 参与者可以邀请其他人
        free_busy_status: 'busy' // 设置为忙碌状态
      };

      const updatedSchedule = await this.scheduleAdapter.updateSchedule(params);
      console.log('权限和状态更新成功');

      return updatedSchedule;
    } catch (error) {
      console.error('更新权限和状态失败:', error);
      throw error;
    }
  }
}

/**
 * 日程更新使用示例
 */
export async function runScheduleUpdateExamples(scheduleAdapter: any) {
  const example = new ScheduleUpdateExample(scheduleAdapter);

  try {
    const calendarId = 'primary'; // 使用主日历
    const eventId = 'your-event-id'; // 替换为实际的日程ID

    // 运行各种更新示例
    await example.updateScheduleBasicInfo(calendarId, eventId);
    await example.updateScheduleTime(calendarId, eventId);
    await example.updateScheduleLocation(calendarId, eventId);
    await example.updateScheduleReminders(calendarId, eventId);

    console.log('所有日程更新示例执行完成！');
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}
