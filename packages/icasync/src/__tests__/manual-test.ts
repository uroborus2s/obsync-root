// @stratix/icasync 手动测试脚本
// 用于验证新功能的基本工作流程

import { CalendarSyncService } from '../services/CalendarSync.service.js';

// 模拟依赖
const mockLogger = {
  info: (msg: string) => console.log(`[INFO] ${msg}`),
  warn: (msg: string) => console.log(`[WARN] ${msg}`),
  error: (msg: string) => console.log(`[ERROR] ${msg}`),
  debug: (msg: string) => console.log(`[DEBUG] ${msg}`)
};

const mockCalendarMappingRepository = {
  findByKkhAndXnxq: async () => ({ success: true, data: null }),
  findByKkh: async () => ({ success: true, data: null }),
  findByXnxq: async () => ({ 
    success: true, 
    data: [
      { id: 1, kkh: 'TEST001', calendar_id: 'old-cal-1', is_deleted: false },
      { id: 2, kkh: 'TEST002', calendar_id: 'old-cal-2', is_deleted: false }
    ]
  }),
  create: async () => ({ success: true, data: { id: 1 } }),
  updateNullable: async () => ({ success: true })
};

const mockCalendarParticipantsRepository = {
  findByCalendarId: async () => ({ success: true, data: [] }),
  createParticipantsBatch: async () => ({ success: true }),
  deleteByCalendarId: async () => ({ success: true }),
  updateNullable: async () => ({ success: true })
};

const mockJuheRenwuRepository = {
  findByKkh: async () => ({ 
    success: true, 
    data: [{
      id: 1,
      kkh: 'TEST001',
      xnxq: '2024-2025-1',
      kcmc: '测试课程',
      xm_s: '张老师',
      gh_s: 'T001'
    }]
  }),
  updateSyncStatusBatch: async () => ({ success: true })
};

const mockStudentCourseRepository = {
  findByKkh: async () => ({ success: true, data: [] })
};

const mockStudentRepository = {
  findByXh: async () => ({ success: true, data: null })
};

const mockTeacherRepository = {
  findByGh: async () => ({ success: true, data: null })
};

const mockTasksWorkflow = {};

const mockWasV7Calendar = {
  createCalendar: async (params: any) => ({
    id: `calendar-${Date.now()}`,
    summary: params.summary
  }),
  deleteCalendar: async () => ({}),
  batchCreateCalendarPermissions: async () => ({ items: [] }),
  deleteCalendarPermission: async () => ({})
};

const mockWasV7Schedule = {
  batchCreateSchedules: async () => ({ events: [] }),
  deleteSchedule: async () => ({}),
  getScheduleList: async () => ({ items: [] })
};

// 创建服务实例
const calendarSyncService = new CalendarSyncService(
  mockCalendarMappingRepository as any,
  mockCalendarParticipantsRepository as any,
  mockJuheRenwuRepository as any,
  mockStudentCourseRepository as any,
  mockStudentRepository as any,
  mockTeacherRepository as any,
  mockLogger as any,
  mockTasksWorkflow as any,
  mockWasV7Calendar as any,
  mockWasV7Schedule as any
);

// 测试新功能
async function testNewFeatures() {
  console.log('=== 开始测试新功能 ===\n');

  try {
    // 1. 测试删除学期内所有日历
    console.log('1. 测试删除学期内所有日历');
    const deleteAllResult = await calendarSyncService.deleteAllCalendarsForSemester('2024-2025-1');
    console.log('删除结果:', {
      successCount: deleteAllResult.successCount,
      failedCount: deleteAllResult.failedCount,
      totalCount: deleteAllResult.totalCount,
      deletedCalendarIds: deleteAllResult.deletedCalendarIds
    });
    console.log('');

    // 2. 测试单个日历创建（会先删除现有的）
    console.log('2. 测试单个日历创建');
    const createResult = await calendarSyncService.createCourseCalendar('TEST001', '2024-2025-1');
    console.log('创建结果:', {
      successCount: createResult.successCount,
      failedCount: createResult.failedCount,
      createdCalendarIds: createResult.createdCalendarIds,
      deletedCalendarIds: createResult.deletedCalendarIds
    });
    console.log('');

    // 3. 测试批量创建日历（会先删除学期内所有现有日历）
    console.log('3. 测试批量创建日历');
    const batchResult = await calendarSyncService.createCourseCalendarsBatch(
      ['TEST001', 'TEST002'], 
      '2024-2025-1'
    );
    console.log('批量创建结果:', {
      successCount: batchResult.successCount,
      failedCount: batchResult.failedCount,
      totalCount: batchResult.totalCount,
      createdCalendarIds: batchResult.createdCalendarIds,
      deletedCalendarIds: batchResult.deletedCalendarIds
    });

    console.log('\n=== 所有测试完成 ===');

  } catch (error) {
    console.error('测试过程中发生错误:', error);
  }
}

// 运行测试
if (require.main === module) {
  testNewFeatures();
}

export { testNewFeatures };
