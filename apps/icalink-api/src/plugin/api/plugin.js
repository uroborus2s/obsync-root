/**
 * @stratix/agendaedu 插件
 * 学校课表数据同步到WPS协作日程的插件
 */
import { fp } from '@stratix/core';
import { attendanceController } from './controllers/attendance.controller.js';
import { authController } from './controllers/auth.controller.js';
import { apiOnRequest } from './hooks/onRequest.js';
import { AttendanceRepository } from './repositories/attendance-repository.js';
import { CourseAggregateRepository } from './repositories/course-aggregate-repository.js';
import { CourseScheduleRepository } from './repositories/course-schedule-repository.js';
import { LeaveApplicationRepository } from './repositories/leave-application-repository.js';
import { LeaveApprovalRepository } from './repositories/leave-approval-repository.js';
import { LeaveAttachmentRepository } from './repositories/leave-attachment-repository.js';
import { StudentAttendanceRepository } from './repositories/student-attendance-repository.js';
import { StudentCourseRepository } from './repositories/student-course-repository.js';
import { StudentInfoRepository } from './repositories/student-info-repository.js';
import { TeacherInfoRepository } from './repositories/teacher-info-repository.js';
import { UserCalendarRepository } from './repositories/user-calendar-repository.js';
import { AttendanceService } from './services/attendance/attendance.service.js';
import { CourseService } from './services/course.service.js';
import { createPageUrlFactory } from './services/generatePageUrl.js';
import { StudentService } from './services/student.service.js';
import { TeacherService } from './services/teacher.service.js';
/**
 * AgendaEdu插件主函数
 */
async function apiPlugin(fastify, options) {
    fastify.registerDI(AttendanceRepository, {
        name: 'attendanceRepo',
        lifetime: 'SINGLETON'
    });
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
    fastify.registerDI(LeaveAttachmentRepository, {
        name: 'leaveAttachmentRepo',
        lifetime: 'SINGLETON'
    });
    fastify.registerDI(AttendanceService, {
        name: 'attendanceService',
        lifetime: 'SINGLETON'
    });
    fastify.registerDI(CourseService, {
        name: 'courseService',
        lifetime: 'SINGLETON'
    });
    fastify.registerDI(createPageUrlFactory(options.appUrl), {
        name: 'pageUrlService',
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
    // 注册认证钩子
    await apiOnRequest(fastify, options);
    // 注册API路由
    await authController(fastify, options);
    await attendanceController(fastify);
    fastify.log.info('Initializing @stratix/icalink plugin...');
    fastify.log.info('AgendaEdu plugin initialized successfully');
}
// 导出插件
export const wrapApiPlugin = fp(apiPlugin, {
    name: '@stratix/icalink-api',
    dependencies: ['@stratix/database', '@stratix/was-v7']
});
//# sourceMappingURL=plugin.js.map