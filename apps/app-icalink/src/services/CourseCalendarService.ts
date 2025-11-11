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
  BatchSyncResult,
  CalendarParticipant,
  CalendarParticipantsResponse,
  CalendarSyncDetail,
  CalendarSyncResult,
  CourseCalendarTreeNode,
  CourseDetail,
  ICourseCalendarService
} from './interfaces/ICourseCalendarService.js';

/**
 * 参与者信息（包含学生和教师）
 */
interface ParticipantInfo {
  /** 学生信息映射：userId -> 学生详细信息 */
  studentInfoMap: Map<
    string,
    {
      studentName: string | null;
      schoolName: string | null;
      majorName: string | null;
      className: string | null;
    }
  >;
  /** 教师信息映射：userId -> 教师姓名 */
  teacherInfoMap: Map<string, string>;
  /** 所有预期参与者的 userId 集合（学生 + 教师） */
  expectedUserIds: Set<string>;
}

/**
 * 同步操作结果
 */
interface SyncOperationResult {
  /** 当前存在的权限数量 */
  existingPermissionsCount: number;
  /** 成功添加的权限数量 */
  addedCount: number;
  /** 成功删除的权限数量 */
  deletedCount: number;
  /** 失败的操作数量 */
  failedCount: number;
}

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
   * 获取课程的参与者信息（学生 + 教师）
   * @param courseCode 课程代码
   * @param semester 学期
   * @returns 参与者信息对象
   * @private
   */
  private async getParticipantInfo(
    courseCode: string,
    semester: string
  ): Promise<ParticipantInfo> {
    // 1. 查询教学班所有学生
    const teachingClassRecords =
      await this.vTeachingClassRepository.findByCourseCode(courseCode);

    this.logger.debug(
      { courseCode, studentCount: teachingClassRecords.length },
      'Retrieved teaching class records'
    );

    // 2. 查询课程记录以获取教师信息
    const courseRecords =
      await this.attendanceCourseRepository.findByCourseCode(
        courseCode,
        semester
      );

    this.logger.debug(
      { courseCode, semester, courseRecordCount: courseRecords.length },
      'Retrieved course records for teacher info'
    );

    // 3. 提取教师工号和姓名
    const teacherInfoMap = new Map<string, string>();
    if (courseRecords.length > 0) {
      const firstRecord = courseRecords[0];

      // 解析教师工号（逗号分隔）
      const teacherCodes = firstRecord.teacher_codes
        ? firstRecord.teacher_codes
            .split(',')
            .map((code) => code.trim())
            .filter(Boolean)
        : [];

      // 解析教师姓名（逗号分隔）
      const teacherNames = firstRecord.teacher_names
        ? firstRecord.teacher_names
            .split(',')
            .map((name) => name.trim())
            .filter(Boolean)
        : [];

      // 建立工号到姓名的映射
      teacherCodes.forEach((code, index) => {
        const name = teacherNames[index] || '教师';
        teacherInfoMap.set(code, name);
      });
    }

    this.logger.debug(
      {
        teacherCount: teacherInfoMap.size,
        teachers: Array.from(teacherInfoMap.entries()).map(([code, name]) => ({
          code,
          name
        }))
      },
      'Extracted teacher information from course records'
    );

    // 4. 构建学生信息映射
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

    // 5. 构建预期参与者集合（学生 + 教师）
    const expectedUserIds = new Set<string>();

    // 添加所有学生
    studentInfoMap.forEach((_, userId) => {
      expectedUserIds.add(userId);
    });

    // 添加所有教师
    teacherInfoMap.forEach((_, userId) => {
      expectedUserIds.add(userId);
    });

    this.logger.debug(
      {
        expectedStudents: studentInfoMap.size,
        expectedTeachers: teacherInfoMap.size,
        expectedTotal: expectedUserIds.size
      },
      'Calculated expected participants'
    );

    return {
      studentInfoMap,
      teacherInfoMap,
      expectedUserIds
    };
  }

  /**
   * 获取 WPS 日历的当前权限列表
   * @param calendarId 日历ID
   * @returns WPS 权限列表
   * @private
   */
  private async getWpsPermissions(calendarId: string) {
    const permissions = await this.wasV7ApiCalendar.getAllCalendarPermissions({
      calendar_id: calendarId
    });

    this.logger.debug(
      { calendarId, permissionsCount: permissions.length },
      'Retrieved WPS calendar permissions'
    );

    return permissions;
  }

  /**
   * 同步日历参与者权限
   * 对比预期参与者和现有权限，执行添加和删除操作
   *
   * 注意：所有参与者（包括教师和学生）统一设置为 reader（查看者）权限
   *
   * @param calendarId 日历ID
   * @param expectedUserIds 预期参与者的 userId 集合
   * @param teacherUserIds 教师的 userId 集合（保留参数以维持向后兼容性，但不再用于权限区分）
   * @returns 同步操作结果
   * @private
   */
  private async syncPermissions(
    calendarId: string,
    expectedUserIds: Set<string>
  ): Promise<SyncOperationResult> {
    // 1. 获取现有权限列表
    const existingPermissions = await this.getWpsPermissions(calendarId);

    const existingPermissionsCount = existingPermissions.length;
    // 2. 构建现有权限的 userId 集合
    const existingUserIds = new Set(existingPermissions.map((p) => p.user_id));

    // 3. 计算需要删除的权限（存在于 WPS 但不在预期列表中）
    const toDeletePermissions = existingPermissions.filter(
      (p) => !expectedUserIds.has(p.user_id)
    );

    // 4. 计算需要添加的用户（在预期列表中但不在 WPS 权限中）
    const toAddUserIds = Array.from(expectedUserIds).filter(
      (userId) => !existingUserIds.has(userId)
    );

    this.logger.info(
      {
        calendarId,
        existingCount: existingUserIds.size,
        expectedCount: expectedUserIds.size,
        toDeleteCount: toDeletePermissions.length,
        toAddCount: toAddUserIds.length
      },
      'Permission sync plan calculated'
    );

    let addedCount = 0;
    let deletedCount = 0;
    let failedCount = 0;

    // 5. 删除多余的权限
    for (const permission of toDeletePermissions) {
      try {
        await this.wasV7ApiCalendar.deleteCalendarPermission({
          calendar_id: calendarId,
          calendar_permission_id: permission.id,
          id_type: 'external'
        });

        deletedCount++;
        this.logger.debug(
          {
            calendarId,
            userId: permission.user_id,
            permissionId: permission.id
          },
          'Excess permission deleted successfully'
        );
      } catch (deleteError) {
        failedCount++;
        this.logger.error(
          { error: deleteError, calendarId, userId: permission.user_id },
          'Failed to delete excess permission'
        );
      }
    }

    // 6. 批量添加缺失的权限
    if (toAddUserIds.length > 0) {
      try {
        // 所有参与者（教师和学生）统一设为 reader（查看者）权限
        const permissionsToAdd = toAddUserIds.map((userId) => ({
          user_id: userId,
          role: 'reader' as const
        }));

        const batchResult =
          await this.wasV7ApiCalendar.batchCreateCalendarPermissions({
            calendar_id: calendarId,
            permissions: permissionsToAdd
          });

        addedCount = batchResult.items.length;

        this.logger.info(
          { calendarId, addedCount },
          'Successfully added permissions (all as reader)'
        );
      } catch (batchError) {
        failedCount += toAddUserIds.length;

        this.logger.error(
          { error: batchError, calendarId, count: toAddUserIds.length },
          'Failed to batch create permissions'
        );
      }
    }

    this.logger.info(
      {
        calendarId,
        addedCount,
        deletedCount,
        failedCount,
        existingPermissionsCount,
        syncCompleted: true
      },
      'Permission sync completed'
    );

    return {
      existingPermissionsCount,
      addedCount,
      deletedCount,
      failedCount
    };
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
   * 根据日历ID获取日历参与者列表（查询模式，不执行同步）
   *
   * 此方法只查询和对比数据，不执行实际的权限同步操作。
   * 返回当前 WPS 权限列表、预期权限信息以及需要同步的统计数据。
   * 用户可以根据返回的 needsSync 字段判断是否需要调用 syncCalendarParticipants 方法执行同步。
   */
  public async getCalendarParticipants(
    calendarId: string
  ): Promise<ServiceResult<CalendarParticipantsResponse>> {
    try {
      this.logger.debug(
        { calendarId },
        'Getting calendar participants (query mode, no sync)'
      );

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
      const semester = mapping.xnxq;

      // 2. 获取参与者信息（学生 + 教师）
      const participantInfo = await this.getParticipantInfo(
        courseCode,
        semester
      );

      const { studentInfoMap, teacherInfoMap, expectedUserIds } =
        participantInfo;

      // 3. 获取当前 WPS 的权限列表
      const currentPermissions = await this.getWpsPermissions(calendarId);

      // 4. 构建当前权限的 userId 集合
      const currentUserIds = new Set(currentPermissions.map((p) => p.user_id));

      // 5. 计算需要添加和删除的数量
      const toAddUserIds = Array.from(expectedUserIds).filter(
        (userId) => !currentUserIds.has(userId)
      );
      const toDeletePermissions = currentPermissions.filter(
        (p) => !expectedUserIds.has(p.user_id)
      );

      const toAddCount = toAddUserIds.length;
      const toDeleteCount = toDeletePermissions.length;
      const needsSync = toAddCount > 0 || toDeleteCount > 0;

      // 6. 构建参与者列表（基于当前 WPS 权限）
      const finalParticipants: CalendarParticipant[] = [];

      for (const permission of currentPermissions) {
        const userId = permission.user_id;
        const studentInfo = studentInfoMap.get(userId);
        const teacherName = teacherInfoMap.get(userId);

        if (studentInfo) {
          // 学生参与者
          finalParticipants.push({
            id: permission.id,
            calendarId: permission.calendar_id,
            userId: userId,
            role: permission.role,
            studentName: studentInfo.studentName,
            schoolName: studentInfo.schoolName,
            majorName: studentInfo.majorName,
            className: studentInfo.className
          });
        } else if (teacherName) {
          // 教师参与者 - 在姓名后添加（教师）标识
          finalParticipants.push({
            id: permission.id,
            calendarId: permission.calendar_id,
            userId: userId,
            role: permission.role,
            studentName: `${teacherName}（教师）`, // 教师标识
            schoolName: null,
            majorName: null,
            className: null
          });
        } else {
          // 未知用户（既不在学生列表也不在教师列表中）
          finalParticipants.push({
            id: permission.id,
            calendarId: permission.calendar_id,
            userId: userId,
            role: permission.role,
            studentName: '未知用户',
            schoolName: null,
            majorName: null,
            className: null
          });
        }
      }

      this.logger.debug(
        {
          calendarId,
          currentPermissionsCount: currentPermissions.length,
          expectedCount: expectedUserIds.size,
          toAddCount,
          toDeleteCount,
          needsSync
        },
        'Calendar participants query completed'
      );

      return {
        success: true,
        data: {
          participants: finalParticipants,
          totalStudents: studentInfoMap.size + teacherInfoMap.size, // 学生 + 教师总数
          existingPermissions: currentPermissions.length,
          toAddCount,
          toDeleteCount,
          needsSync
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
   * 同步日历参与者（将教学班学生批量添加到日历权限中，并删除多余权限）
   */
  public async syncCalendarParticipants(
    calendarId: string
  ): Promise<ServiceResult<CalendarSyncResult>> {
    try {
      this.logger.debug({ calendarId }, 'Syncing calendar participants');

      // 1. 验证日历是否存在并获取课程代码和学期
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
      const semester = mapping.xnxq;

      this.logger.debug(
        { calendarId, courseCode, semester },
        'Found calendar mapping'
      );

      // 2. 获取参与者信息（学生 + 教师）
      const participantInfo = await this.getParticipantInfo(
        courseCode,
        semester
      );

      const { studentInfoMap, teacherInfoMap, expectedUserIds } =
        participantInfo;

      const totalStudents = studentInfoMap.size;

      // 5. 执行权限同步
      const syncResult = await this.syncPermissions(
        calendarId,
        expectedUserIds
      );

      // 6. 返回同步结果
      const result: CalendarSyncResult = {
        totalStudents,
        existingPermissions: syncResult.existingPermissionsCount,
        addedCount: syncResult.addedCount,
        removedCount: syncResult.deletedCount,
        failedCount: syncResult.failedCount
      };

      this.logger.info(
        { calendarId, syncResult: result },
        'Calendar participants synced successfully'
      );

      return {
        success: true,
        data: result
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
   * 批量同步所有日历的参与者权限
   * 遍历所有有效的日历映射，对每个日历执行同步操作
   */
  public async syncAllCalendarParticipants(): Promise<
    ServiceResult<BatchSyncResult>
  > {
    const startTime = Date.now();

    try {
      this.logger.info('Starting batch sync for all calendar participants');

      // 1. 查询所有有效的日历映射
      const allMappings = await this.calendarMappingRepository.findAllActive();

      const totalCalendars = allMappings.length;

      this.logger.info(
        { totalCalendars },
        'Retrieved all active calendar mappings'
      );

      if (totalCalendars === 0) {
        this.logger.warn('No active calendar mappings found');
        return {
          success: true,
          data: {
            totalCalendars: 0,
            successCount: 0,
            failedCount: 0,
            totalAddedPermissions: 0,
            totalRemovedPermissions: 0,
            details: []
          }
        };
      }

      // 2. 初始化统计变量
      let successCount = 0;
      let failedCount = 0;
      let totalAddedPermissions = 0;
      let totalRemovedPermissions = 0;
      const details: CalendarSyncDetail[] = [];

      // 3. 遍历所有日历映射，逐个同步
      for (let i = 0; i < allMappings.length; i++) {
        const mapping = allMappings[i];
        const calendarId = mapping.calendar_id;
        const courseCode = mapping.kkh;

        // 每处理10个日历输出一次进度
        if ((i + 1) % 10 === 0 || i === 0) {
          this.logger.info(
            { progress: `${i + 1}/${totalCalendars}`, calendarId, courseCode },
            'Syncing calendar participants'
          );
        }

        try {
          // 调用单个日历的同步方法
          const syncResult = await this.syncCalendarParticipants(calendarId);

          if (syncResult.success && syncResult.data) {
            successCount++;
            totalAddedPermissions += syncResult.data.addedCount;
            totalRemovedPermissions += syncResult.data.removedCount;

            details.push({
              calendarId,
              courseCode,
              success: true,
              addedCount: syncResult.data.addedCount,
              removedCount: syncResult.data.removedCount
            });

            this.logger.debug(
              {
                calendarId,
                courseCode,
                addedCount: syncResult.data.addedCount,
                removedCount: syncResult.data.removedCount
              },
              'Calendar sync succeeded'
            );
          } else {
            failedCount++;
            details.push({
              calendarId,
              courseCode,
              success: false,
              error: syncResult.message || '同步失败'
            });

            this.logger.warn(
              { calendarId, courseCode, error: syncResult.message },
              'Calendar sync failed'
            );
          }
        } catch (error) {
          failedCount++;
          const errorMessage =
            error instanceof Error ? error.message : String(error);

          details.push({
            calendarId,
            courseCode,
            success: false,
            error: errorMessage
          });

          this.logger.error(
            { error, calendarId, courseCode },
            'Exception during calendar sync'
          );
        }
      }

      // 4. 计算总耗时
      const duration = Date.now() - startTime;

      // 5. 构建批量同步结果
      const batchResult: BatchSyncResult = {
        totalCalendars,
        successCount,
        failedCount,
        totalAddedPermissions,
        totalRemovedPermissions,
        details
      };

      this.logger.info(
        {
          ...batchResult,
          duration: `${duration}ms`,
          detailsCount: details.length
        },
        'Batch sync completed'
      );

      return {
        success: true,
        data: batchResult
      };
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logger.error(
        { error, duration: `${duration}ms` },
        'Failed to execute batch sync'
      );

      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '批量同步日历参与者失败'
      };
    }
  }

  /**
   * 获取指定用户的所有课程列表
   * @param userType 用户类型（teacher 或 student）
   * @param userId 学号或工号
   * @returns 用户的课程列表
   */
  public async getUserCourses(
    userType: 'teacher' | 'student',
    userId: string
  ): Promise<
    ServiceResult<{
      userType: 'teacher' | 'student';
      userId: string;
      userName: string | null;
      courses: Array<{
        courseCode: string;
        courseName: string;
        semester: string;
        teacherName: string | null;
        classLocation: string | null;
        calendarId: string;
        teachingClassCode: string;
        courseUnit: string | null;
      }>;
    }>
  > {
    try {
      this.logger.debug({ userType, userId }, 'Getting user courses');

      // 参数验证
      if (!userId || userId.trim() === '') {
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '用户ID不能为空'
        };
      }

      if (userType !== 'teacher' && userType !== 'student') {
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '用户类型必须是 teacher 或 student'
        };
      }

      const trimmedUserId = userId.trim();
      let userName: string | null = null;
      const courseMap = new Map<
        string,
        {
          courseCode: string;
          courseName: string;
          semester: string;
          teacherName: string | null;
          classLocation: string | null;
          calendarId: string;
          teachingClassCode: string;
          courseUnit: string | null;
        }
      >();

      if (userType === 'student') {
        // 查询学生的课程
        this.logger.debug(
          { userId: trimmedUserId },
          'Querying student courses'
        );

        const teachingClassRecords =
          await this.vTeachingClassRepository.findByStudentId(trimmedUserId);

        if (teachingClassRecords.length > 0) {
          // 获取学生姓名（从第一条记录）
          userName = teachingClassRecords[0].student_name;

          // 遍历教学班记录，查询对应的日历映射
          for (const record of teachingClassRecords) {
            const courseCode = record.course_code;

            // 避免重复添加同一课程
            if (courseMap.has(courseCode)) {
              continue;
            }

            // 查询日历映射（需要学期信息，从 attendance_courses 表获取）
            // 不传 semester 参数，查询该课程代码的所有学期数据
            const attendanceCourses =
              await this.attendanceCourseRepository.findByCourseCode(
                courseCode
              );

            if (attendanceCourses.length === 0) {
              this.logger.warn(
                { courseCode },
                'No attendance courses found for student course'
              );
              continue;
            }

            const firstCourse = attendanceCourses[0];
            const semester = firstCourse.semester;

            // 查询日历映射
            const calendarMapping =
              await this.calendarMappingRepository.findByKkhAndXnxq(
                courseCode,
                semester
              );

            if (!isSome(calendarMapping)) {
              this.logger.warn(
                { courseCode, semester },
                'No calendar mapping found for student course'
              );
              continue;
            }

            const mapping = calendarMapping.value;

            courseMap.set(courseCode, {
              courseCode,
              courseName: record.course_name,
              semester,
              teacherName: firstCourse.teacher_names || null,
              classLocation: firstCourse.class_location || null,
              calendarId: mapping.calendar_id,
              teachingClassCode: record.teaching_class_code,
              courseUnit: record.course_unit
            });
          }
        }
      } else {
        // 查询教师的课程
        this.logger.debug(
          { userId: trimmedUserId },
          'Querying teacher courses'
        );

        // 查询所有日历映射，获取所有学期
        const allMappings = await this.calendarMappingRepository.findAll();
        const semesters = new Set(
          allMappings.map((m) => m.xnxq).filter(Boolean)
        );

        // 遍历每个学期，查询教师的课程
        for (const semester of semesters) {
          const teacherCourses =
            await this.attendanceCourseRepository.findByTeacherCode(
              trimmedUserId,
              semester
            );

          if (teacherCourses.length > 0 && !userName) {
            // 尝试从 teacher_names 中提取教师姓名（只提取一次）
            const firstCourse = teacherCourses[0];
            const teacherCodes = firstCourse.teacher_codes?.split(',') || [];
            const teacherNames = firstCourse.teacher_names?.split(',') || [];
            const teacherIndex = teacherCodes.findIndex(
              (code) => code.trim() === trimmedUserId
            );
            if (teacherIndex >= 0 && teacherIndex < teacherNames.length) {
              userName = teacherNames[teacherIndex].trim();
            }
          }

          // 遍历课程，查询对应的日历映射
          for (const course of teacherCourses) {
            const courseCode = course.course_code;
            const courseSemester = course.semester;

            // 避免重复添加同一课程
            const key = `${courseCode}_${courseSemester}`;
            if (courseMap.has(key)) {
              continue;
            }

            // 查询日历映射
            const calendarMapping =
              await this.calendarMappingRepository.findByKkhAndXnxq(
                courseCode,
                courseSemester
              );

            if (!isSome(calendarMapping)) {
              this.logger.warn(
                { courseCode, semester: courseSemester },
                'No calendar mapping found for teacher course'
              );
              continue;
            }

            const mapping = calendarMapping.value;

            // 查询教学班信息获取 teaching_class_code 和 course_unit
            const teachingClassRecords =
              await this.vTeachingClassRepository.findByCourseCode(courseCode);

            const teachingClassCode =
              teachingClassRecords.length > 0
                ? teachingClassRecords[0].teaching_class_code
                : '';
            const courseUnit =
              teachingClassRecords.length > 0
                ? teachingClassRecords[0].course_unit
                : null;

            courseMap.set(key, {
              courseCode,
              courseName: course.course_name,
              semester: courseSemester,
              teacherName: course.teacher_names || null,
              classLocation: course.class_location || null,
              calendarId: mapping.calendar_id,
              teachingClassCode,
              courseUnit
            });
          }
        }
      }

      const courses = Array.from(courseMap.values());

      this.logger.debug(
        {
          userType,
          userId: trimmedUserId,
          userName,
          coursesCount: courses.length
        },
        'User courses retrieved successfully'
      );

      return {
        success: true,
        data: {
          userType,
          userId: trimmedUserId,
          userName,
          courses
        }
      };
    } catch (error) {
      this.logger.error(
        { error, userType, userId },
        'Failed to get user courses'
      );
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '获取用户课程列表失败'
      };
    }
  }

  /**
   * 批量将用户添加到多个日历的权限中
   * @param userType 用户类型（teacher 或 student）
   * @param userId 学号或工号
   * @param calendarIds 日历 ID 列表
   * @returns 批量操作结果
   */
  public async batchAddParticipant(
    userType: 'teacher' | 'student',
    userId: string,
    calendarIds: string[]
  ): Promise<
    ServiceResult<{
      totalCalendars: number;
      successCount: number;
      failedCount: number;
      skippedCount: number;
      details: Array<{
        calendarId: string;
        success: boolean;
        message?: string;
      }>;
    }>
  > {
    try {
      this.logger.info(
        { userType, userId, calendarsCount: calendarIds.length },
        'Starting batch add participant'
      );

      // 参数验证
      if (!userId || userId.trim() === '') {
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '用户ID不能为空'
        };
      }

      if (!calendarIds || calendarIds.length === 0) {
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '日历ID列表不能为空'
        };
      }

      if (userType !== 'teacher' && userType !== 'student') {
        return {
          success: false,
          code: ServiceErrorCode.VALIDATION_ERROR,
          message: '用户类型必须是 teacher 或 student'
        };
      }

      const trimmedUserId = userId.trim();
      let totalCalendars = 0;
      let successCount = 0;
      let failedCount = 0;
      let skippedCount = 0;
      const details: Array<{
        calendarId: string;
        success: boolean;
        message?: string;
      }> = [];

      // 遍历每个日历ID
      for (const calendarId of calendarIds) {
        totalCalendars++;

        try {
          this.logger.debug(
            { calendarId, userId: trimmedUserId },
            'Processing calendar'
          );

          // 1. 获取当前日历的权限列表
          const currentPermissions = await this.getWpsPermissions(calendarId);

          // 2. 检查用户是否已有权限
          const existingPermission = currentPermissions.find(
            (p) => p.user_id === trimmedUserId
          );

          if (existingPermission) {
            this.logger.debug(
              {
                calendarId,
                userId: trimmedUserId,
                role: existingPermission.role
              },
              'User already has permission, skipping'
            );
            skippedCount++;
            details.push({
              calendarId,
              success: true,
              message: `用户已有权限（${existingPermission.role}），跳过`
            });
            continue;
          }

          // 3. 添加权限（所有用户都是 reader 权限）
          const addResult =
            await this.wasV7ApiCalendar.batchCreateCalendarPermissions({
              calendar_id: calendarId,
              permissions: [
                {
                  user_id: trimmedUserId,
                  role: 'reader' // 所有参与者都是 reader 权限
                }
              ]
            });

          if (addResult.items && addResult.items.length > 0) {
            this.logger.debug(
              { calendarId, userId: trimmedUserId },
              'Permission added successfully'
            );
            successCount++;
            details.push({
              calendarId,
              success: true,
              message: '权限添加成功'
            });
          } else {
            this.logger.warn(
              { calendarId, userId: trimmedUserId },
              'Failed to add permission'
            );
            failedCount++;
            details.push({
              calendarId,
              success: false,
              message: '添加权限失败'
            });
          }
        } catch (error) {
          this.logger.error(
            { error, calendarId, userId: trimmedUserId },
            'Exception during add permission'
          );
          failedCount++;
          details.push({
            calendarId,
            success: false,
            message: error instanceof Error ? error.message : '未知错误'
          });
        }
      }

      const result = {
        totalCalendars,
        successCount,
        failedCount,
        skippedCount,
        details
      };

      this.logger.info(result, 'Batch add participant completed');

      return {
        success: true,
        data: result
      };
    } catch (error) {
      this.logger.error(
        { error, userType, userId, calendarsCount: calendarIds.length },
        'Failed to execute batch add participant'
      );
      return {
        success: false,
        code: ServiceErrorCode.INTERNAL_ERROR,
        message: '批量添加参与者失败'
      };
    }
  }
}
