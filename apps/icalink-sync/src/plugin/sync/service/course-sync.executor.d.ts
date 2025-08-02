import { Logger } from '@stratix/core';
import { AttendanceRepository } from '../repositories/attendance-repository.js';
import { CourseScheduleRepository } from '../repositories/course-schedule-repository.js';
import { StudentCourseRepository } from '../repositories/student-course-repository.js';
import { StudentInfoRepository } from '../repositories/student-info-repository.js';
import { TeacherInfoRepository } from '../repositories/teacher-info-repository.js';
/**
 * 课程同步执行器
 * 执行单个课程的完整同步流程
 */
export declare const createCourseSyncExecutor: (courseScheduleRepo: CourseScheduleRepository, attendanceRepo: AttendanceRepository, studentCourseRepo: StudentCourseRepository, teacherInfoRepo: TeacherInfoRepository, studentInfoRepo: StudentInfoRepository, queueService: QueueService, log: Logger) => {
    onRun(params: {
        courseId: string;
        kkh: string;
        xnxq: string;
        courseData: any;
    }): Promise<{
        success: boolean;
        courseId: string;
        kkh: string;
        participantCount: number;
        teacherCount: any;
        studentCount: any;
    }>;
};
//# sourceMappingURL=course-sync.executor.d.ts.map