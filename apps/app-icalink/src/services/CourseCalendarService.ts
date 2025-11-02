import type { Logger } from '@stratix/core';
import { isSome } from '@stratix/utils/functional';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import type AttendanceCourseRepository from '../repositories/AttendanceCourseRepository.js';
import type AttendanceCoursesRepository from '../repositories/AttendanceCoursesRepository.js';
import type CalendarMappingRepository from '../repositories/CalendarMappingRepository.js';
import type VTeachingClassRepository from '../repositories/VTeachingClassRepository.js';
import type { ICalendarCourseItem } from '../repositories/interfaces/ICalendarMappingRepository.js';
import type { IcasyncAttendanceCourse } from '../types/database.js';
import {
  ServiceErrorCode,
  type PaginatedResult,
  type ServiceResult
} from '../types/service.js';
import type {
  CalendarParticipant,
  CalendarParticipantsResponse,
  CalendarSyncResult,
  CourseCalendarTreeNode,
  CourseDetail,
  ICourseCalendarService
} from './interfaces/ICourseCalendarService.js';

/**
 * 课程日历服务实现
 * 负责课程日历相关的业务逻辑
 */
export default class CourseCalendarService implements ICourseCalendarService {
  constructor(
    private readonly logger: Logger,
    private readonly calendarMappingRepository: CalendarMappingRepository,
    private readonly attendanceCourseRepository: AttendanceCourseRepository,
    private readonly attendanceCoursesRepository: AttendanceCoursesRepository,
    private readonly vTeachingClassRepository: VTeachingClassRepository,
    private readonly wasV7ApiCalendar: WpsCalendarAdapter
  ) {
    this.logger.info('✅ CourseCalendarService initialized');
  }

  /**
   * 获取课程日历树形结构
   * 返回两级结构：根节点 → 日历列表
   * 不包含课程节点，课程数据通过 getCourseDetailsByCalendarId 方法获取
   */
  public async getCourseCalendarTree(): Promise<
    ServiceResult<CourseCalendarTreeNode>
  > {
    try {
      this.logger.debug('Getting course calendar tree');

      // 1. 获取所有未删除的日历映射
      const calendarMappings =
        await this.calendarMappingRepository.findAllActive();

      // 2. 构建根节点
      const rootNode: CourseCalendarTreeNode = {
        id: 'root',
        label: '吉林财经大学课表',
        type: 'root',
        children: []
      };

      // 3. 为每个日历映射创建一级节点（不包含课程子节点）
      for (const mapping of calendarMappings) {
        const calendarNode: CourseCalendarTreeNode = {
          id: `calendar-${mapping.id}`,
          label: mapping.calendar_name || mapping.calendar_id,
          type: 'calendar',
          calendarId: mapping.calendar_id,
          kkh: mapping.kkh,
          xnxq: mapping.xnxq,
          metadata: {
            mappingId: mapping.id,
            createdAt: mapping.created_at,
            updatedAt: mapping.updated_at
          }
        };

        rootNode.children!.push(calendarNode);
      }

      this.logger.debug(
        { calendarCount: calendarMappings.length },
        'Course calendar tree built successfully'
      );

      return {
        success: true,
        data: rootNode
      };
    } catch (error) {
      this.logger.error({ error }, 'Failed to get course calendar tree');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取课程日历树失败'
      };
    }
  }

  /**
   * 根据日历ID获取日历参与者列表（增强版，包含学生详细信息和教学班总数）
   */
  public async getCalendarParticipants(
    calendarId: string
  ): Promise<ServiceResult<CalendarParticipantsResponse>> {
    try {
      this.logger.debug({ calendarId }, 'Getting calendar participants');

      // 1. 验证日历是否存在并获取课程代码
      const calendarMapping =
        await this.calendarMappingRepository.findByCalendarId(calendarId);

      if (!isSome(calendarMapping)) {
        this.logger.warn({ calendarId }, 'Calendar not found');
        return {
          success: false,
          code: ServiceErrorCode.RESOURCE_NOT_FOUND,
          message: '日历不存在'
        };
      }

      const mapping = calendarMapping.value;
      const courseCode = mapping.kkh;

      // 2. 调用WPS API获取权限列表
      const permissionsResponse =
        await this.wasV7ApiCalendar.getAllCalendarPermissions({
          calendar_id: calendarId
        });

      this.logger.debug(
        { calendarId, permissionsCount: permissionsResponse.length },
        'Retrieved permissions from WPS API'
      );

      // 3. 批量查询教学班数据（根据课程代码）
      const teachingClassRecords =
        await this.vTeachingClassRepository.findByCourseCode(courseCode);

      this.logger.debug(
        { courseCode, teachingClassCount: teachingClassRecords.length },
        'Retrieved teaching class records'
      );

      // 4. 构建 userId -> 学生信息 的映射
      const studentInfoMap = new Map<
        string,
        {
          studentName: string | null;
          schoolName: string | null;
          majorName: string | null;
          className: string | null;
        }
      >();

      for (const record of teachingClassRecords) {
        if (record.student_id) {
          studentInfoMap.set(record.student_id, {
            studentName: record.student_name,
            schoolName: record.school_name,
            majorName: record.major_name,
            className: record.class_name
          });
        }
      }

      // 5. 处理权限列表，合并学生信息，并清理无效权限
      const validParticipants: CalendarParticipant[] = [];
      const invalidPermissionIds: string[] = [];

      for (const permission of permissionsResponse) {
        const userId = permission.user_id;
        const studentInfo = studentInfoMap.get(userId);

        if (studentInfo) {
          // 有效的学生权限，添加学生详细信息
          validParticipants.push({
            id: permission.id,
            calendarId: permission.calendar_id,
            userId: userId,
            role: permission.role,
            studentName: studentInfo.studentName,
            schoolName: studentInfo.schoolName,
            majorName: studentInfo.majorName,
            className: studentInfo.className
          });
        } else {
          // 无效的权限（在教学班表中找不到对应学生）
          this.logger.warn(
            { calendarId, userId, permissionId: permission.id },
            'Permission not found in teaching class, will be deleted'
          );
          invalidPermissionIds.push(permission.id);
        }
      }

      // 6. 删除无效的权限
      if (invalidPermissionIds.length > 0) {
        this.logger.info(
          { calendarId, invalidCount: invalidPermissionIds.length },
          'Deleting invalid calendar permissions'
        );

        for (const permissionId of invalidPermissionIds) {
          try {
            await this.wasV7ApiCalendar.deleteCalendarPermission({
              calendar_id: calendarId,
              calendar_permission_id: permissionId
            });

            this.logger.debug(
              { calendarId, permissionId },
              'Invalid permission deleted successfully'
            );
          } catch (deleteError) {
            this.logger.error(
              { error: deleteError, calendarId, permissionId },
              'Failed to delete invalid permission'
            );
            // 继续处理其他权限，不中断流程
          }
        }
      }

      this.logger.debug(
        {
          calendarId,
          totalPermissions: permissionsResponse.length,
          validCount: validParticipants.length,
          invalidCount: invalidPermissionIds.length,
          totalStudents: teachingClassRecords.length
        },
        'Calendar participants processed successfully'
      );

      return {
        success: true,
        data: {
          participants: validParticipants,
          totalStudents: teachingClassRecords.length,
          existingPermissions: validParticipants.length
        }
      };
    } catch (error) {
      this.logger.error(
        { error, calendarId },
        'Failed to get calendar participants'
      );
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取日历参与者失败'
      };
    }
  }

  /**
   * 同步日历参与者（将教学班学生批量添加到日历权限中）
   */
  public async syncCalendarParticipants(
    calendarId: string
  ): Promise<ServiceResult<CalendarSyncResult>> {
    try {
      this.logger.debug({ calendarId }, 'Syncing calendar participants');

      // 1. 验证日历是否存在并获取课程代码
      const calendarMapping =
        await this.calendarMappingRepository.findByCalendarId(calendarId);

      if (!isSome(calendarMapping)) {
        this.logger.warn({ calendarId }, 'Calendar not found');
        return {
          success: false,
          code: ServiceErrorCode.RESOURCE_NOT_FOUND,
          message: '日历不存在'
        };
      }

      const mapping = calendarMapping.value;
      const courseCode = mapping.kkh;

      this.logger.debug({ calendarId, courseCode }, 'Found calendar mapping');

      // 2. 查询教学班所有学生
      const teachingClassRecords =
        await this.vTeachingClassRepository.findByCourseCode(courseCode);

      const totalStudents = teachingClassRecords.length;

      this.logger.debug(
        { courseCode, totalStudents },
        'Retrieved teaching class records'
      );

      // 3. 获取现有权限列表
      const existingPermissions =
        await this.wasV7ApiCalendar.getAllCalendarPermissions({
          calendar_id: calendarId
        });

      const existingPermissionsCount = existingPermissions.length;

      this.logger.debug(
        { calendarId, existingPermissionsCount },
        'Retrieved existing permissions'
      );

      // 4. 构建现有权限的 userId Set
      const existingUserIds = new Set<string>(
        existingPermissions.map((p) => p.user_id)
      );

      // 5. 找出缺失的学生（在教学班中但不在权限列表中）
      const missingStudents = teachingClassRecords.filter(
        (record) => record.student_id && !existingUserIds.has(record.student_id)
      );

      const missingCount = missingStudents.length;

      this.logger.info(
        { calendarId, totalStudents, existingPermissionsCount, missingCount },
        'Found missing students to sync'
      );

      // 6. 如果没有缺失的学生，直接返回
      if (missingCount === 0) {
        this.logger.info({ calendarId }, 'No missing students, sync skipped');
        return {
          success: true,
          data: {
            totalStudents,
            existingPermissions: existingPermissionsCount,
            addedCount: 0,
            failedCount: 0
          }
        };
      }

      // 7. 批量添加权限
      const permissionsToAdd = missingStudents.map((student) => ({
        user_id: student.student_id!,
        role: 'reader' as const // 默认角色为 reader
      }));

      let addedCount = 0;
      let failedCount = 0;

      try {
        const batchResult =
          await this.wasV7ApiCalendar.batchCreateCalendarPermissions({
            calendar_id: calendarId,
            permissions: permissionsToAdd
          });

        addedCount = batchResult.items.length;

        this.logger.info(
          { calendarId, addedCount },
          'Successfully added permissions'
        );
      } catch (batchError) {
        failedCount = missingCount;

        this.logger.error(
          { error: batchError, calendarId, missingCount },
          'Failed to batch create permissions'
        );

        return {
          success: false,
          code: ServiceErrorCode.INTERNAL_ERROR,
          message: '批量添加权限失败'
        };
      }

      // 8. 返回同步结果
      const syncResult: CalendarSyncResult = {
        totalStudents,
        existingPermissions: existingPermissionsCount,
        addedCount,
        failedCount
      };

      this.logger.info(
        { calendarId, syncResult },
        'Calendar participants synced successfully'
      );

      return {
        success: true,
        data: syncResult
      };
    } catch (error) {
      this.logger.error(
        { error, calendarId },
        'Failed to sync calendar participants'
      );
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '同步日历参与者失败'
      };
    }
  }

  /**
   * 根据日历ID获取课程详情列表
   */
  public async getCourseDetailsByCalendarId(
    calendarId: string
  ): Promise<ServiceResult<CourseDetail[]>> {
    try {
      this.logger.debug(
        { calendarId },
        'Getting course details by calendar ID'
      );

      // 1. 验证日历是否存在并获取映射信息
      const calendarMapping =
        await this.calendarMappingRepository.findByCalendarId(calendarId);

      if (!isSome(calendarMapping)) {
        this.logger.warn({ calendarId }, 'Calendar not found');
        return {
          success: false,
          code: ServiceErrorCode.RESOURCE_NOT_FOUND,
          message: '日历不存在'
        };
      }

      const mapping = calendarMapping.value;

      // 2. 根据开课号和学年学期查询课程
      const courses = await this.attendanceCourseRepository.findMany((qb) =>
        qb
          .where('course_code', '=', mapping.kkh)
          .where('semester', '=', mapping.xnxq)
          .where('deleted_at', 'is', null)
          .orderBy('teaching_week', 'asc')
          .orderBy('week_day', 'asc')
          .orderBy('start_time', 'asc')
      );

      // 3. 转换为业务模型
      const courseDetails: CourseDetail[] = courses.map((course) => {
        const typedCourse = course as unknown as IcasyncAttendanceCourse;
        return {
          id: typedCourse.id,
          juheRenwuId: typedCourse.juhe_renwu_id,
          externalId: typedCourse.external_id,
          courseCode: typedCourse.course_code,
          courseName: typedCourse.course_name,
          semester: typedCourse.semester,
          teachingWeek: typedCourse.teaching_week,
          weekDay: typedCourse.week_day,
          teacherCodes: typedCourse.teacher_codes || null,
          teacherNames: typedCourse.teacher_names || null,
          classLocation: typedCourse.class_location || null,
          startTime: typedCourse.start_time,
          endTime: typedCourse.end_time,
          periods: typedCourse.periods || null,
          timePeriod: typedCourse.time_period,
          attendanceEnabled: Boolean(typedCourse.attendance_enabled),
          attendanceStartOffset: typedCourse.attendance_start_offset || null,
          attendanceEndOffset: typedCourse.attendance_end_offset || null,
          lateThreshold: typedCourse.late_threshold || null,
          autoAbsentAfter: typedCourse.auto_absent_after || null,
          createdAt: typedCourse.created_at,
          updatedAt: typedCourse.updated_at,
          createdBy: typedCourse.created_by || null,
          updatedBy: typedCourse.updated_by || null,
          metadata: typedCourse.metadata || null
        };
      });

      this.logger.debug(
        { calendarId, count: courseDetails.length },
        'Course details retrieved successfully'
      );

      return {
        success: true,
        data: courseDetails
      };
    } catch (error) {
      this.logger.error({ error, calendarId }, 'Failed to get course details');
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取课程详情失败'
      };
    }
  }

  /**
   * 分页查询日历-课程关联列表（主列表）
   */
  public async getCalendarCoursesWithPagination(
    page: number,
    pageSize: number,
    searchKeyword?: string
  ): Promise<ServiceResult<PaginatedResult<ICalendarCourseItem>>> {
    try {
      // 参数验证
      if (page < 1) {
        this.logger.warn('Invalid page parameter', { page });
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '页码必须大于等于1'
        };
      }

      if (pageSize <= 0 || pageSize > 100) {
        this.logger.warn('Invalid pageSize parameter', { pageSize });
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '每页数量必须在1-100之间'
        };
      }

      this.logger.debug(
        { page, pageSize, searchKeyword },
        'Getting calendar courses with pagination'
      );

      // 查询数据
      const data =
        await this.calendarMappingRepository.findCalendarCoursesWithPagination(
          page,
          pageSize,
          searchKeyword
        );

      // 查询总数
      const total =
        await this.calendarMappingRepository.getCalendarCoursesTotalCount(
          searchKeyword
        );

      const totalPages = Math.ceil(total / pageSize);

      this.logger.debug(
        { total, dataCount: data.length, page, pageSize, totalPages },
        'Calendar courses retrieved successfully'
      );

      return {
        success: true,
        data: {
          data,
          total,
          page,
          page_size: pageSize,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      };
    } catch (error) {
      this.logger.error(
        { error, page, pageSize, searchKeyword },
        'Failed to get calendar courses'
      );
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取日历课程列表失败'
      };
    }
  }

  /**
   * 根据课程代码分页查询课节列表
   */
  public async getCourseSessionsByCourseCode(
    courseCode: string,
    page: number,
    pageSize: number
  ): Promise<ServiceResult<PaginatedResult<IcasyncAttendanceCourse>>> {
    try {
      // 参数验证
      if (!courseCode || courseCode.trim() === '') {
        this.logger.warn('Empty courseCode parameter');
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '课程代码不能为空'
        };
      }

      if (page < 1) {
        this.logger.warn('Invalid page parameter', { page });
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '页码必须大于等于1'
        };
      }

      if (pageSize <= 0 || pageSize > 100) {
        this.logger.warn('Invalid pageSize parameter', { pageSize });
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '每页数量必须在1-100之间'
        };
      }

      this.logger.debug(
        { courseCode, page, pageSize },
        'Getting course sessions by course code'
      );

      // 查询数据
      const data =
        await this.attendanceCoursesRepository.findByCourseCodeWithPagination(
          courseCode,
          page,
          pageSize
        );

      // 查询总数
      const total =
        await this.attendanceCoursesRepository.getTotalCountByCourseCode(
          courseCode
        );

      const totalPages = Math.ceil(total / pageSize);

      this.logger.debug(
        {
          courseCode,
          total,
          dataCount: data.length,
          page,
          pageSize,
          totalPages
        },
        'Course sessions retrieved successfully'
      );

      return {
        success: true,
        data: {
          data,
          total,
          page,
          page_size: pageSize,
          total_pages: totalPages,
          has_next: page < totalPages,
          has_prev: page > 1
        }
      };
    } catch (error) {
      this.logger.error(
        { error, courseCode, page, pageSize },
        'Failed to get course sessions'
      );
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取课节列表失败'
      };
    }
  }

  /**
   * 根据日历ID获取课程分享人列表（通过WPS API，包含教学班总数）
   * 复用现有的 getCalendarParticipants 方法
   */
  public async getCourseShareParticipants(
    calendarId: string
  ): Promise<ServiceResult<CalendarParticipantsResponse>> {
    // 直接调用现有的 getCalendarParticipants 方法
    return this.getCalendarParticipants(calendarId);
  }
}
