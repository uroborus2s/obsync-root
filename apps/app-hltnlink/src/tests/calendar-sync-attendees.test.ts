// @wps/hltnlink 日程参与者添加功能测试
import { beforeEach, describe, expect, it, vi } from 'vitest';
import CalendarSyncService from '../services/CalendarSyncService.js';
import type { CourseScheduleData } from '../types/calendar-sync.js';

// 模拟 sleep 函数
vi.mock('@stratix/utils/async', () => ({
  sleep: vi.fn().mockResolvedValue(undefined)
}));

describe('CalendarSyncService 日程参与者添加功能测试', () => {
  let calendarSyncService: CalendarSyncService;
  let mockWasV7ApiSchedule: any;

  beforeEach(() => {
    // 创建模拟的logger
    const mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    };

    // 创建模拟的WPS API适配器
    mockWasV7ApiSchedule = {
      createSchedule: vi.fn(),
      batchCreateAttendees: vi.fn(),
      getScheduleList: vi.fn()
    };

    // 使用模拟的依赖创建服务实例
    calendarSyncService = new CalendarSyncService();
    (calendarSyncService as any).logger = mockLogger;
    (calendarSyncService as any).wasV7ApiSchedule = mockWasV7ApiSchedule;
  });

  describe('addTeacherAsAttendee 方法', () => {
    it('应该正确处理单个教师工号', async () => {
      const calendarId = 'test-calendar-id';
      const eventId = 'test-event-id';
      const teacherCode = 'T001';
      const teacherName = '张教授';

      // 模拟API成功响应
      mockWasV7ApiSchedule.batchCreateAttendees.mockResolvedValue({
        items: [
          {
            user_id: teacherCode,
            display_name: teacherName,
            type: 'user',
            response_status: 'needsAction',
            optional: false
          }
        ]
      });

      // 调用私有方法（通过类型断言）
      await (calendarSyncService as any).addTeacherAsAttendee(
        calendarId,
        eventId,
        teacherCode,
        teacherName
      );

      // 验证API调用
      expect(mockWasV7ApiSchedule.batchCreateAttendees).toHaveBeenCalledWith({
        calendar_id: calendarId,
        event_id: eventId,
        attendees: [
          {
            type: 'user',
            user_id: teacherCode
          }
        ]
      });
    });

    it('应该正确处理多个教师工号（逗号分隔）', async () => {
      const calendarId = 'test-calendar-id';
      const eventId = 'test-event-id';
      const teacherCode = '0154,0326,0789'; // 多个工号
      const teacherName = '张教授';

      // 模拟API成功响应
      mockWasV7ApiSchedule.batchCreateAttendees.mockResolvedValue({
        items: [
          {
            user_id: '0154',
            display_name: teacherName,
            type: 'user',
            response_status: 'needsAction',
            optional: false
          },
          {
            user_id: '0326',
            display_name: teacherName,
            type: 'user',
            response_status: 'needsAction',
            optional: false
          },
          {
            user_id: '0789',
            display_name: teacherName,
            type: 'user',
            response_status: 'needsAction',
            optional: false
          }
        ]
      });

      // 调用私有方法
      await (calendarSyncService as any).addTeacherAsAttendee(
        calendarId,
        eventId,
        teacherCode,
        teacherName
      );

      // 验证API调用
      expect(mockWasV7ApiSchedule.batchCreateAttendees).toHaveBeenCalledWith({
        calendar_id: calendarId,
        event_id: eventId,
        attendees: [
          {
            type: 'user',
            user_id: '0154'
          },
          {
            type: 'user',
            user_id: '0326'
          },
          {
            type: 'user',
            user_id: '0789'
          }
        ]
      });
    });

    it('应该正确处理包含空格的教师工号', async () => {
      const calendarId = 'test-calendar-id';
      const eventId = 'test-event-id';
      const teacherCode = ' 0154 , 0326 , 0789 '; // 包含空格
      const teacherName = '张教授';

      // 模拟API成功响应
      mockWasV7ApiSchedule.batchCreateAttendees.mockResolvedValue({
        items: []
      });

      // 调用私有方法
      await (calendarSyncService as any).addTeacherAsAttendee(
        calendarId,
        eventId,
        teacherCode,
        teacherName
      );

      // 验证API调用，确保空格被正确处理
      expect(mockWasV7ApiSchedule.batchCreateAttendees).toHaveBeenCalledWith({
        calendar_id: calendarId,
        event_id: eventId,
        attendees: [
          {
            type: 'user',
            user_id: '0154'
          },
          {
            type: 'user',
            user_id: '0326'
          },
          {
            type: 'user',
            user_id: '0789'
          }
        ]
      });
    });

    it('应该处理空的教师工号', async () => {
      const calendarId = 'test-calendar-id';
      const eventId = 'test-event-id';
      const teacherCode = ''; // 空字符串
      const teacherName = '张教授';

      const mockLogger = (calendarSyncService as any).logger;

      // 调用私有方法
      await (calendarSyncService as any).addTeacherAsAttendee(
        calendarId,
        eventId,
        teacherCode,
        teacherName
      );

      // 验证记录了警告日志
      expect(mockLogger.warn).toHaveBeenCalledWith(
        'No valid teacher codes found in: '
      );

      // 验证API没有被调用
      expect(mockWasV7ApiSchedule.batchCreateAttendees).not.toHaveBeenCalled();
    });

    it('应该处理API调用失败的情况', async () => {
      const calendarId = 'test-calendar-id';
      const eventId = 'test-event-id';
      const teacherCode = 'T001';
      const teacherName = '张教授';

      // 模拟API失败
      const apiError = new Error('API调用失败');
      mockWasV7ApiSchedule.batchCreateAttendees.mockRejectedValue(apiError);

      // 验证抛出错误
      await expect(
        (calendarSyncService as any).addTeacherAsAttendee(
          calendarId,
          eventId,
          teacherCode,
          teacherName
        )
      ).rejects.toThrow('API调用失败');

      // 验证API被调用
      expect(mockWasV7ApiSchedule.batchCreateAttendees).toHaveBeenCalled();
    });
  });

  describe('batchCreateWpsSchedules 集成测试', () => {
    it('应该在日程创建成功后添加教师参与者', async () => {
      const calendarId = 'test-calendar-id';
      const schedules: CourseScheduleData[] = [
        {
          courseSequence: 'CS101',
          courseName: '计算机科学导论',
          teacherName: '张教授',
          teacherCode: 'T001',
          startTime: '0800',
          endTime: '0940',
          weekday: '1',
          weeks: '1,2,3',
          classroom: '教学楼A101',
          semester: '2025-2026-1',
          batchId: 'test-batch'
        }
      ];

      // 模拟日程列表查询（返回空，表示日程不存在）
      mockWasV7ApiSchedule.getScheduleList.mockResolvedValue({
        items: []
      });

      // 模拟日程创建成功
      mockWasV7ApiSchedule.createSchedule.mockResolvedValue({
        id: 'created-event-id',
        summary: '计算机科学导论',
        calendar_id: calendarId
      });

      // 模拟添加参与者成功
      mockWasV7ApiSchedule.batchCreateAttendees.mockResolvedValue({
        items: [
          {
            user_id: 'T001',
            display_name: '张教授',
            type: 'user',
            response_status: 'needsAction',
            optional: false
          }
        ]
      });

      // 模拟createWpsSchedule方法
      vi.spyOn(
        calendarSyncService as any,
        'createWpsSchedule'
      ).mockResolvedValue({
        success: true,
        data: {
          eventId: 'created-event-id',
          success: true
        }
      });

      // 调用批量创建方法
      const result = await calendarSyncService.batchCreateWpsSchedules(
        calendarId,
        schedules
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(1);
      expect(result.data?.failed).toBe(0);

      // 验证添加参与者API被调用
      expect(mockWasV7ApiSchedule.batchCreateAttendees).toHaveBeenCalledWith({
        calendar_id: calendarId,
        event_id: 'created-event-id',
        attendees: [
          {
            type: 'user',
            user_id: 'T001'
          }
        ]
      });
    });

    it('应该在添加参与者失败时记录警告但不影响日程创建成功状态', async () => {
      const calendarId = 'test-calendar-id';
      const schedules: CourseScheduleData[] = [
        {
          courseSequence: 'CS101',
          courseName: '计算机科学导论',
          teacherName: '张教授',
          teacherCode: 'T001',
          startTime: '0800',
          endTime: '0940',
          weekday: '1',
          weeks: '1,2,3',
          classroom: '教学楼A101',
          semester: '2025-2026-1',
          batchId: 'test-batch'
        }
      ];

      // 模拟日程列表查询（返回空，表示日程不存在）
      mockWasV7ApiSchedule.getScheduleList.mockResolvedValue({
        items: []
      });

      // 模拟日程创建成功
      const mockLogger = (calendarSyncService as any).logger;

      // 模拟createWpsSchedule方法
      vi.spyOn(
        calendarSyncService as any,
        'createWpsSchedule'
      ).mockResolvedValue({
        success: true,
        data: {
          eventId: 'created-event-id',
          success: true
        }
      });

      // 模拟添加参与者失败
      mockWasV7ApiSchedule.batchCreateAttendees.mockRejectedValue(
        new Error('添加参与者失败')
      );

      // 调用批量创建方法
      const result = await calendarSyncService.batchCreateWpsSchedules(
        calendarId,
        schedules
      );

      // 验证结果：日程创建仍然成功
      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(1);
      expect(result.data?.failed).toBe(0);

      // 验证记录了警告日志
      expect(mockLogger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to add teacher as attendee'),
        expect.any(Error)
      );
    });

    it('应该处理多个课程的参与者添加', async () => {
      const calendarId = 'test-calendar-id';
      const schedules: CourseScheduleData[] = [
        {
          courseSequence: 'CS101',
          courseName: '计算机科学导论',
          teacherName: '张教授',
          teacherCode: 'T001',
          startTime: '0800',
          endTime: '0940',
          weekday: '1',
          weeks: '1,2,3',
          classroom: '教学楼A101',
          semester: '2025-2026-1',
          batchId: 'test-batch'
        },
        {
          courseSequence: 'MATH101',
          courseName: '高等数学',
          teacherName: '李教授',
          teacherCode: '0154,0326,0789', // 多个教师工号
          startTime: '1000',
          endTime: '1140',
          weekday: '2',
          weeks: '1,2,3',
          classroom: '教学楼B201',
          semester: '2025-2026-1',
          batchId: 'test-batch'
        }
      ];

      // 模拟日程列表查询（返回空，表示日程不存在）
      mockWasV7ApiSchedule.getScheduleList.mockResolvedValue({
        items: []
      });

      // 模拟createWpsSchedule方法
      vi.spyOn(calendarSyncService as any, 'createWpsSchedule')
        .mockResolvedValueOnce({
          success: true,
          data: { eventId: 'event-1', success: true }
        })
        .mockResolvedValueOnce({
          success: true,
          data: { eventId: 'event-2', success: true }
        });

      // 模拟添加参与者成功
      mockWasV7ApiSchedule.batchCreateAttendees.mockResolvedValue({
        items: [{ user_id: 'T001', display_name: '张教授' }]
      });

      // 调用批量创建方法
      const result = await calendarSyncService.batchCreateWpsSchedules(
        calendarId,
        schedules
      );

      // 验证结果
      expect(result.success).toBe(true);
      expect(result.data?.successful).toBe(2);
      expect(result.data?.failed).toBe(0);

      // 验证添加参与者API被调用两次
      expect(mockWasV7ApiSchedule.batchCreateAttendees).toHaveBeenCalledTimes(
        2
      );

      // 验证第一次调用
      expect(mockWasV7ApiSchedule.batchCreateAttendees).toHaveBeenNthCalledWith(
        1,
        {
          calendar_id: calendarId,
          event_id: 'event-1',
          attendees: [
            {
              type: 'user',
              user_id: 'T001'
            }
          ]
        }
      );

      // 验证第二次调用（多个教师工号）
      expect(mockWasV7ApiSchedule.batchCreateAttendees).toHaveBeenNthCalledWith(
        2,
        {
          calendar_id: calendarId,
          event_id: 'event-2',
          attendees: [
            {
              type: 'user',
              user_id: '0154'
            },
            {
              type: 'user',
              user_id: '0326'
            },
            {
              type: 'user',
              user_id: '0789'
            }
          ]
        }
      );
    });
  });
});
