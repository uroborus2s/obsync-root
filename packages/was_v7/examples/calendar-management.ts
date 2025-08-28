/**
 * WPS V7 日历管理示例
 * 演示如何使用新增的查询日历和更新日历功能
 */

import type { WpsCalendarAdapter } from '../src/adapters/calendar.adapter.js';
import type {
  GetCalendarListParams,
  GetCalendarParams,
  UpdateCalendarParams
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
        
        console.log(`第 ${pageNumber} 页结果:`, response.items?.length || 0, '个日历');
        
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
export async function runCalendarManagementExamples(calendarAdapter: WpsCalendarAdapter) {
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
