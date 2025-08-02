// @stratix/icasync CalendarSyncService 测试
// 测试日历同步服务的核心功能

import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  IWasV7CalendarAdapter,
  IWasV7ScheduleAdapter
} from '../adapters/index.js';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type { ICalendarParticipantsRepository } from '../repositories/CalendarParticipantsRepository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { IStudentCourseRepository } from '../repositories/StudentCourseRepository.js';
import type { IStudentRepository } from '../repositories/StudentRepository.js';
import type { ITeacherRepository } from '../repositories/TeacherRepository.js';
import { CalendarSyncService } from '../services/CalendarSyncService.js';

describe('CalendarSyncService', () => {
  let calendarSyncService: CalendarSyncService;
  let mockCalendarMappingRepository: ICalendarMappingRepository;
  let mockCalendarParticipantsRepository: ICalendarParticipantsRepository;
  let mockJuheRenwuRepository: IJuheRenwuRepository;
  let mockStudentCourseRepository: IStudentCourseRepository;
  let mockStudentRepository: IStudentRepository;
  let mockTeacherRepository: ITeacherRepository;
  let mockWasV7Calendar: IWasV7CalendarAdapter;
  let mockWasV7Schedule: IWasV7ScheduleAdapter;
  let mockLogger: any;
  let mockTasksWorkflow: any;

  beforeEach(() => {
    // 创建模拟对象
    mockCalendarMappingRepository = {
      findByKkhAndXnxq: vi.fn(),
      findByKkh: vi.fn(),
      create: vi.fn(),
      updateNullable: vi.fn()
    } as any;

    mockCalendarParticipantsRepository = {
      findByCalendarId: vi.fn(),
      createParticipantsBatch: vi.fn(),
      deleteByCalendarId: vi.fn(),
      updateNullable: vi.fn()
    } as any;

    mockJuheRenwuRepository = {
      findByKkh: vi.fn(),
      updateSyncStatusBatch: vi.fn()
    } as any;

    mockStudentCourseRepository = {
      findByKkh: vi.fn()
    } as any;

    mockStudentRepository = {
      findByXh: vi.fn()
    } as any;

    mockTeacherRepository = {
      findByGh: vi.fn()
    } as any;

    mockWasV7Calendar = {
      createCalendar: vi.fn(),
      deleteCalendar: vi.fn(),
      batchCreateCalendarPermissions: vi.fn(),
      deleteCalendarPermission: vi.fn(),
      healthCheck: vi.fn()
    } as any;

    mockWasV7Schedule = {
      createSchedule: vi.fn(),
      batchCreateSchedules: vi.fn(),
      deleteSchedule: vi.fn(),
      getScheduleList: vi.fn(),
      updateSchedule: vi.fn(),
      healthCheck: vi.fn()
    } as any;

    mockLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn()
    };

    mockTasksWorkflow = {
      createWorkflow: vi.fn(),
      executeWorkflow: vi.fn(),
      getWorkflowStatus: vi.fn()
    };

    // 创建服务实例
    calendarSyncService = new CalendarSyncService(
      mockCalendarMappingRepository,
      mockCalendarParticipantsRepository,
      mockJuheRenwuRepository,
      mockStudentCourseRepository,
      mockStudentRepository,
      mockTeacherRepository,
      mockLogger,
      mockTasksWorkflow,
      mockWasV7Calendar,
      mockWasV7Schedule
    );
  });

  describe('createCourseCalendar', () => {
    it('应该成功创建课程日历', async () => {
      // 准备测试数据
      const kkh = 'TEST001';
      const xnxq = '2024-2025-1';

      // 模拟日历不存在
      mockCalendarMappingRepository.findByKkhAndXnxq = vi
        .fn()
        .mockResolvedValue({
          success: true,
          data: null
        });

      // 模拟课程信息
      mockJuheRenwuRepository.findByKkh = vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            kkh: 'TEST001',
            xnxq: '2024-2025-1',
            kcmc: '测试课程',
            xm_s: '张老师',
            gh_s: 'T001'
          }
        ]
      });

      // 模拟WPS日历创建成功
      mockWasV7Calendar.createCalendar = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 'calendar-123',
          summary: '测试课程 (TEST001)'
        }
      });

      // 模拟数据库保存成功
      mockCalendarMappingRepository.create = vi.fn().mockResolvedValue({
        success: true,
        data: { id: 1 }
      });

      // 执行测试
      const result = await calendarSyncService.createCourseCalendar(kkh, xnxq);

      // 验证结果
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.createdCalendarIds).toContain('calendar-123');
      expect(result.errors).toHaveLength(0);

      // 验证方法调用
      expect(mockWasV7Calendar.createCalendar).toHaveBeenCalledWith({
        summary: '测试课程 (TEST001)',
        description: expect.stringContaining('课程: 测试课程')
      });
      expect(mockCalendarMappingRepository.create).toHaveBeenCalled();
    });

    it('应该处理日历已存在的情况', async () => {
      // 准备测试数据
      const kkh = 'TEST001';
      const xnxq = '2024-2025-1';

      // 模拟日历已存在
      mockCalendarMappingRepository.findByKkhAndXnxq = vi
        .fn()
        .mockResolvedValue({
          success: true,
          data: {
            id: 1,
            kkh: 'TEST001',
            calendar_id: 'existing-calendar-123',
            is_deleted: false
          }
        });

      // 执行测试
      const result = await calendarSyncService.createCourseCalendar(kkh, xnxq);

      // 验证结果
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.createdCalendarIds).toContain('existing-calendar-123');

      // 验证不会调用WPS API
      expect(mockWasV7Calendar.createCalendar).not.toHaveBeenCalled();
    });

    it('应该处理WPS API调用失败的情况', async () => {
      // 准备测试数据
      const kkh = 'TEST001';
      const xnxq = '2024-2025-1';

      // 模拟日历不存在
      mockCalendarMappingRepository.findByKkhAndXnxq = vi
        .fn()
        .mockResolvedValue({
          success: true,
          data: null
        });

      // 模拟课程信息
      mockJuheRenwuRepository.findByKkh = vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            kkh: 'TEST001',
            xnxq: '2024-2025-1',
            kcmc: '测试课程',
            xm_s: '张老师'
          }
        ]
      });

      // 模拟WPS日历创建失败
      mockWasV7Calendar.createCalendar = vi.fn().mockResolvedValue({
        success: false,
        error: 'WPS API调用失败'
      });

      // 执行测试
      const result = await calendarSyncService.createCourseCalendar(kkh, xnxq);

      // 验证结果
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.errors).toContain('创建WPS日历失败: WPS API调用失败');
    });
  });

  describe('deleteCourseCalendar', () => {
    it('应该成功删除课程日历', async () => {
      // 准备测试数据
      const kkh = 'TEST001';

      // 模拟找到日历映射
      mockCalendarMappingRepository.findByKkh = vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: 1,
          kkh: 'TEST001',
          calendar_id: 'calendar-123',
          is_deleted: false
        }
      });

      // 模拟WPS删除成功
      mockWasV7Calendar.deleteCalendar = vi.fn().mockResolvedValue({
        success: true
      });

      // 模拟数据库更新成功
      mockCalendarMappingRepository.updateNullable = vi.fn().mockResolvedValue({
        success: true
      });

      mockCalendarParticipantsRepository.deleteByCalendarId = vi
        .fn()
        .mockResolvedValue({
          success: true
        });

      // 执行测试
      const result = await calendarSyncService.deleteCourseCalendar(kkh);

      // 验证结果
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.deletedCalendarIds).toContain('calendar-123');

      // 验证方法调用
      expect(mockWasV7Calendar.deleteCalendar).toHaveBeenCalledWith({
        calendar_id: 'calendar-123'
      });
      expect(mockCalendarMappingRepository.updateNullable).toHaveBeenCalled();
    });

    it('应该处理日历不存在的情况', async () => {
      // 准备测试数据
      const kkh = 'TEST001';

      // 模拟未找到日历映射
      mockCalendarMappingRepository.findByKkh = vi.fn().mockResolvedValue({
        success: true,
        data: null
      });

      // 执行测试
      const result = await calendarSyncService.deleteCourseCalendar(kkh);

      // 验证结果（幂等性）
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);

      // 验证不会调用WPS API
      expect(mockWasV7Calendar.deleteCalendar).not.toHaveBeenCalled();
    });
  });

  describe('deleteAllCalendarsForSemester', () => {
    it('应该成功删除学期内所有日历', async () => {
      // 准备测试数据
      const xnxq = '2024-2025-1';

      // 模拟找到现有日历映射
      mockCalendarMappingRepository.findByXnxq = vi.fn().mockResolvedValue({
        success: true,
        data: [
          {
            id: 1,
            kkh: 'TEST001',
            calendar_id: 'calendar-123',
            is_deleted: false
          },
          {
            id: 2,
            kkh: 'TEST002',
            calendar_id: 'calendar-456',
            is_deleted: false
          }
        ]
      });

      // 模拟删除日历成功
      vi.spyOn(calendarSyncService, 'deleteCourseCalendar')
        .mockResolvedValueOnce({
          successCount: 1,
          failedCount: 0,
          totalCount: 1,
          errors: [],
          createdCalendarIds: [],
          deletedCalendarIds: ['calendar-123']
        })
        .mockResolvedValueOnce({
          successCount: 1,
          failedCount: 0,
          totalCount: 1,
          errors: [],
          createdCalendarIds: [],
          deletedCalendarIds: ['calendar-456']
        });

      // 执行测试
      const result =
        await calendarSyncService.deleteAllCalendarsForSemester(xnxq);

      // 验证结果
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.totalCount).toBe(2);
      expect(result.deletedCalendarIds).toEqual([
        'calendar-123',
        'calendar-456'
      ]);

      // 验证方法调用
      expect(mockCalendarMappingRepository.findByXnxq).toHaveBeenCalledWith(
        xnxq
      );
    });

    it('应该处理没有找到日历的情况', async () => {
      // 准备测试数据
      const xnxq = '2024-2025-1';

      // 模拟没有找到日历映射
      mockCalendarMappingRepository.findByXnxq = vi.fn().mockResolvedValue({
        success: true,
        data: []
      });

      // 执行测试
      const result =
        await calendarSyncService.deleteAllCalendarsForSemester(xnxq);

      // 验证结果
      expect(result.successCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.totalCount).toBe(0);
      expect(result.deletedCalendarIds).toHaveLength(0);
    });
  });

  describe('batchCreateCourseCalendars', () => {
    it('应该先删除现有日历再批量创建课程日历', async () => {
      // 准备测试数据
      const kkhList = ['TEST001', 'TEST002'];
      const xnxq = '2024-2025-1';

      // 模拟删除所有现有日历成功
      vi.spyOn(
        calendarSyncService,
        'deleteAllCalendarsForSemester'
      ).mockResolvedValue({
        successCount: 1,
        failedCount: 0,
        totalCount: 1,
        errors: [],
        createdCalendarIds: [],
        deletedCalendarIds: ['old-calendar-123']
      });

      // 模拟每个日历创建都成功
      vi.spyOn(calendarSyncService, 'createCourseCalendar')
        .mockResolvedValueOnce({
          successCount: 1,
          failedCount: 0,
          totalCount: 1,
          errors: [],
          createdCalendarIds: ['calendar-123'],
          deletedCalendarIds: []
        })
        .mockResolvedValueOnce({
          successCount: 1,
          failedCount: 0,
          totalCount: 1,
          errors: [],
          createdCalendarIds: ['calendar-456'],
          deletedCalendarIds: []
        });

      // 执行测试
      const result = await calendarSyncService.createCourseCalendarsBatch(
        kkhList,
        xnxq
      );

      // 验证结果
      expect(result.successCount).toBe(2);
      expect(result.failedCount).toBe(0);
      expect(result.totalCount).toBe(2);
      expect(result.createdCalendarIds).toEqual([
        'calendar-123',
        'calendar-456'
      ]);
      expect(result.deletedCalendarIds).toEqual(['old-calendar-123']);

      // 验证先删除后创建的顺序
      expect(
        calendarSyncService.deleteAllCalendarsForSemester
      ).toHaveBeenCalledWith(xnxq, undefined);
    });

    it('应该处理删除阶段出现错误的情况', async () => {
      // 准备测试数据
      const kkhList = ['TEST001'];
      const xnxq = '2024-2025-1';

      // 模拟删除现有日历失败
      vi.spyOn(
        calendarSyncService,
        'deleteAllCalendarsForSemester'
      ).mockResolvedValue({
        successCount: 0,
        failedCount: 1,
        totalCount: 1,
        errors: ['删除日历失败'],
        createdCalendarIds: [],
        deletedCalendarIds: []
      });

      // 模拟日历创建成功
      vi.spyOn(
        calendarSyncService,
        'createCourseCalendar'
      ).mockResolvedValueOnce({
        successCount: 1,
        failedCount: 0,
        totalCount: 1,
        errors: [],
        createdCalendarIds: ['calendar-123'],
        deletedCalendarIds: []
      });

      // 执行测试
      const result = await calendarSyncService.createCourseCalendarsBatch(
        kkhList,
        xnxq
      );

      // 验证结果 - 即使删除失败，创建操作仍然继续
      expect(result.successCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(result.totalCount).toBe(1);
      expect(result.createdCalendarIds).toEqual(['calendar-123']);
      expect(result.errors).toContain('删除阶段: 删除日历失败');
    });
  });
});
