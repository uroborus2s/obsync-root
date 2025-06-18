/**
 * @stratix/agendaedu 插件
 * 学校课表数据同步到WPS协作日程的插件
 */

import type { FastifyInstance } from '@stratix/core';
import { fp } from '@stratix/core';
import { AttendanceRepository } from './repositories/attendance-repository.js';
import { CourseAggregateRepository } from './repositories/course-aggregate-repository.js';
import { CourseScheduleRepository } from './repositories/course-schedule-repository.js';
import { LeaveApplicationRepository } from './repositories/leave-application-repository.js';
import { LeaveApprovalRepository } from './repositories/leave-approval-repository.js';
import { StudentAttendanceRepository } from './repositories/student-attendance-repository.js';
import { StudentCourseRepository } from './repositories/student-course-repository.js';
import { StudentInfoRepository } from './repositories/student-info-repository.js';
import { TeacherInfoRepository } from './repositories/teacher-info-repository.js';
import { UserCalendarRepository } from './repositories/user-calendar-repository.js';
import { AttendanceService } from './services/attendance/attendance.service.js';
import { FullSyncService } from './services/full-sync.service.js';
import { createPageUrlFactory } from './services/generatePageUrl.js';
import { StudentService } from './services/student.service.js';
import {
  CreateAttendanceTableExecutor,
  SyncTeacherScheduleExecutor
} from './services/task-executors.service.js';
import { TeacherService } from './services/teacher.service.js';
import { UpdateAggregateService } from './services/update-aggregate.service.js';
import { WpsScheduleProcessorService } from './services/wps-schedule-processor.service.js';
import { IicalinkPluginParams } from './types/attendance.js';

/**
 * AgendaEdu插件主函数
 */
async function icalinkSyncPlugin(
  fastify: FastifyInstance,
  options: IicalinkPluginParams
): Promise<void> {
  // 注册仓库
  fastify.registerDI(CourseScheduleRepository, {
    name: 'courseScheduleRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(CourseAggregateRepository, {
    name: 'courseAggregateRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(StudentCourseRepository, {
    name: 'studentCourseRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(StudentInfoRepository, {
    name: 'studentInfoRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(AttendanceRepository, {
    name: 'attendanceRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(UserCalendarRepository, {
    name: 'userCalendarRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(StudentAttendanceRepository, {
    name: 'studentAttendanceRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(TeacherInfoRepository, {
    name: 'teacherInfoRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(LeaveApplicationRepository, {
    name: 'leaveApplicationRepo',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(LeaveApprovalRepository, {
    name: 'leaveApprovalRepo',
    lifetime: 'SINGLETON'
  });

  // 注册服务
  fastify.registerDI(UpdateAggregateService, {
    name: 'updateAggregateService',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(WpsScheduleProcessorService, {
    name: 'wpsScheduleProcessorService',
    lifetime: 'SINGLETON'
  });

  // 注册任务执行器
  fastify.registerDI(CreateAttendanceTableExecutor, {
    name: 'createAttendanceTableExecutor',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(SyncTeacherScheduleExecutor, {
    name: 'syncTeacherScheduleExecutor',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(FullSyncService, {
    name: 'fullSyncService',
    lifetime: 'SINGLETON'
  });

  // 注册用户服务工厂
  fastify.registerDI(StudentService.createStudentFactory, {
    name: 'createStudent',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(TeacherService.createTeacherFactory, {
    name: 'createTeacher',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(AttendanceService, {
    name: 'attendanceService',
    lifetime: 'SINGLETON'
  });

  fastify.registerDI(createPageUrlFactory(options.appUrl), {
    name: 'pageUrlService',
    lifetime: 'SINGLETON'
  });

  fastify.log.info('Initializing @stratix/icalink plugin...');

  fastify.log.info('AgendaEdu plugin initialized successfully');
}

// 导出插件
export const wrapIcalinkSyncPlugin = fp(icalinkSyncPlugin, {
  name: '@stratix/icalink-sync',
  dependencies: [
    '@stratix/database',
    '@stratix/tasks',
    '@stratix/queue',
    '@stratix/was-v7'
  ]
});
