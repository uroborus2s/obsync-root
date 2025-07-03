/**
 * 服务层主导出文件
 */

// 仓库层导出
export * from '../repositories/index.js';

// 日程管理服务
export { ScheduleService } from './schedule.service.js';

// 全量同步服务
export { FullSyncService } from './full-sync.service.js';

// 增量同步服务
export {
  IncrementalSyncService,
  type IncrementalSyncConfig,
  type IncrementalSyncStats
} from '../service/incremental-sync.service.js';

// 课程服务
export { CourseService, type CourseTeacherInfo } from './course.service.js';

/**
 * 同步服务模块导出
 */

// 新的基于 taskService 的同步服务
export { SyncTaskService } from '../service/sync-task.service.js';

// 考勤相关服务
export { AttendanceService } from './attendance/attendance.service.js';

// 导出所有服务类和相关类型

// 基础服务
export { TeacherService } from '../service/teacher.service.js';
export { StudentService } from './student.service.js';
export { WpsScheduleProcessorService } from './wps-schedule-processor.service.js';

// 执行器
export { aggregateExecutor } from '../service/executor/aggregate.executor.js';
export { createCourseSyncExecutor } from '../service/executor/course-sync.executor.js';
export { deleteCourseExecutor } from '../service/executor/delete-course.executor.js';
export { getCoursesExecutor } from '../service/executor/get-courses.executor.js';
export { scheduleCreationExecutor } from '../service/executor/schedule-creation.executor.js';

// 类型定义
export type {
  CourseTaskData,
  SyncConfig,
  TaskChildrenStats
} from '../service/sync-task.service.js';
