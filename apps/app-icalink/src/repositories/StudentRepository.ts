// @wps/app-icalink 学生信息仓储实现
// 基于 Stratix 框架的仓储实现类

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { BaseRepository, sql } from '@stratix/database';
import type { IcalinkDatabase, OutXsxx } from '../types/database.js';
import type { PaginatedResult, ServiceResult } from '../types/service.js';
import { ServiceErrorCode } from '../types/service.js';
import type {
  IStudentRepository,
  StudentStats,
  StudentWithDetails
} from './interfaces/IStudentRepository.js';

/**
 * 学生信息仓储实现类
 * 继承BaseRepository，实现IStudentRepository接口
 */
export default class StudentRepository
  extends BaseRepository<
    IcalinkDatabase,
    'out_xsxx',
    OutXsxx,
    Partial<OutXsxx>,
    Partial<OutXsxx>
  >
  implements IStudentRepository
{
  protected readonly tableName = 'out_xsxx' as const;
  protected readonly primaryKey = 'id';

  constructor(
    protected readonly databaseApi: DatabaseAPI,
    protected readonly logger: Logger
  ) {
    super('syncdb');
  }

  async onReady() {
    await super.onReady();
  }

  /**
   * 根据学号查找学生
   */
  async findByStudentId(
    studentId: string
  ): Promise<ServiceResult<OutXsxx | null>> {
    this.logger.info({ studentId }, 'Finding student by student ID');

    const result = await this.findOne((qb) => qb.where('xh', '=', studentId));

    if (!result.success) {
      return {
        success: false,
        error: {
          code: ServiceErrorCode.DATABASE_ERROR,
          message:
            result.error?.message || 'Failed to find student by student ID'
        }
      };
    }

    // 处理Option类型
    const studentOption = result.data;
    const student = studentOption.some ? studentOption.value : null;

    return {
      success: true,
      data: student
    };
  }

  // 实现接口的其他方法，返回简单的成功结果
  async findByName(): Promise<ServiceResult<OutXsxx[]>> {
    return { success: true, data: [] };
  }

  async findByClass(): Promise<ServiceResult<OutXsxx[]>> {
    return { success: true, data: [] };
  }

  async findByMajor(): Promise<ServiceResult<OutXsxx[]>> {
    return { success: true, data: [] };
  }

  async findByCollege(): Promise<ServiceResult<OutXsxx[]>> {
    return { success: true, data: [] };
  }

  async findByGrade(): Promise<ServiceResult<OutXsxx[]>> {
    return { success: true, data: [] };
  }

  async findByConditions(): Promise<ServiceResult<OutXsxx[]>> {
    return { success: true, data: [] };
  }

  async findByConditionsPaginated(): Promise<
    ServiceResult<PaginatedResult<OutXsxx>>
  > {
    return {
      success: true,
      data: {
        data: [],
        total: 0,
        page: 1,
        page_size: 20,
        total_pages: 0,
        has_next: false,
        has_prev: false
      }
    };
  }

  async findWithDetails(): Promise<ServiceResult<StudentWithDetails[]>> {
    return { success: true, data: [] };
  }

  async findByCourse(
    courseCode: string,
    semester: string
  ): Promise<ServiceResult<OutXsxx[]>> {
    this.logger.info(
      { courseCode, semester },
      'Finding students by course code and semester from database'
    );

    try {
      // 使用advancedQuery执行原生SQL查询
      const result = await this.advancedQuery(async (db) => {
        const queryResult = await sql<OutXsxx>`
          SELECT DISTINCT
            s.id,
            s.xh,
            s.xm,
            s.xb,
            s.bjmc,
            s.zymc,
            s.xymc,
            s.mz,
            s.sfzh,
            s.sjh,
            s.email,
            s.sznj,
            s.rxnf,
            s.lx,
            s.zt,
            s.update_time,
            s.xydm,
            s.zydm,
            s.bjdm,
            s.ykth,
            s.sj
          FROM out_jw_kcb_xs kcb
          INNER JOIN out_xsxx s ON kcb.xh = s.xh
          WHERE kcb.kkh = ${courseCode}
            AND kcb.xnxq = ${semester}
            AND (s.zt IS NULL OR (s.zt != '毕业' AND s.zt != '退学'))
          ORDER BY s.xh ASC
        `.execute(db);

        return queryResult.rows;
      }, { connectionName: 'syncdb' });

      if (!result.success) {
        throw new Error(result.error?.message || 'Database query failed');
      }

      // 处理查询结果，确保数据格式正确
      const rawStudents = result.data || [];
      const students: OutXsxx[] = rawStudents.map((row: any) => ({
        id: row.id || '',
        xh: row.xh || '',
        xm: row.xm || '',
        xb: row.xb || '',
        bjmc: row.bjmc || '',
        zymc: row.zymc || '',
        xymc: row.xymc || '',
        mz: row.mz || '',
        sfzh: row.sfzh || '',
        sjh: row.sjh || '',
        email: row.email || '',
        sznj: row.sznj || '',
        rxnf: row.rxnf || '',
        lx: row.lx || 0,
        zt: row.zt || '',
        update_time: row.update_time || new Date(),
        xydm: row.xydm || '',
        zydm: row.zydm || '',
        bjdm: row.bjdm || '',
        ykth: row.ykth || '',
        sj: row.sj || ''
      }));

      this.logger.info(
        { courseCode, semester, count: students.length },
        'Found students for course from database'
      );

      // 如果没有找到学生，记录警告但不返回错误
      if (students.length === 0) {
        this.logger.warn(
          { courseCode, semester },
          'No students found for the specified course and semester'
        );
      }

      return {
        success: true,
        data: students
      };
    } catch (error) {
      this.logger.error(
        { error, courseCode, semester },
        'Failed to find students by course from database'
      );
      return {
        success: false,
        error: {
          code: ServiceErrorCode.DATABASE_ERROR,
          message:
            error instanceof Error ? error.message : 'Database query failed'
        }
      };
    }
  }

  /**
   * 根据课程获取学生的完整考勤信息（包括考勤记录和请假申请）
   */
  async findStudentsWithAttendanceInfo(
    courseCode: string,
    semester: string,
    attendanceCourseId?: string
  ): Promise<
    ServiceResult<
      Array<
        OutXsxx & {
          attendance_record?: {
            id: string;
            status: string;
            checkin_time?: Date;
            checkin_location?: string;
            ip_address?: string;
            is_late: boolean;
            late_minutes?: number;
            remark?: string;
          };
          leave_application?: {
            id: string;
            leave_type: string;
            leave_reason: string;
            status: string;
            application_time: Date;
            approval_time?: Date;
          };
        }
      >
    >
  > {
    this.logger.info(
      { courseCode, semester, attendanceCourseId },
      'Finding students with attendance info from database'
    );

    try {
      // 使用advancedQuery执行复杂的关联查询
      const result = await this.advancedQuery(async (db) => {
        const queryResult = await sql<
          OutXsxx & {
            attendance_record_id?: string;
            attendance_status?: string;
            checkin_time?: Date;
            checkin_location?: string;
            ip_address?: string;
            is_late?: boolean;
            late_minutes?: number;
            attendance_remark?: string;
            leave_application_id?: string;
            leave_type?: string;
            leave_reason?: string;
            leave_status?: string;
            application_time?: Date;
            approval_time?: Date;
          }
        >`
          SELECT DISTINCT
            s.id,
            s.xh,
            s.xm,
            s.xb,
            s.bjmc,
            s.zymc,
            s.xymc,
            s.mz,
            s.sfzh,
            s.sjh,
            s.email,
            s.sznj,
            s.rxnf,
            s.lx,
            s.zt,
            s.update_time,
            s.xydm,
            s.zydm,
            s.bjdm,
            s.ykth,
            s.sj,
            -- 考勤记录信息
            ar.id as attendance_record_id,
            ar.status as attendance_status,
            ar.checkin_time,
            ar.checkin_location,
            ar.ip_address,
            ar.is_late,
            ar.late_minutes,
            ar.remark as attendance_remark,
            -- 请假申请信息
            la.id as leave_application_id,
            la.leave_type,
            la.leave_reason,
            la.status as leave_status,
            la.application_time,
            la.approval_time
          FROM out_jw_kcb_xs kcb
          INNER JOIN out_xsxx s ON kcb.xh = s.xh
          LEFT JOIN icalink_attendance_records ar ON (
            ar.student_id = s.xh
            ${attendanceCourseId ? sql`AND ar.attendance_course_id = ${attendanceCourseId}` : sql``}
          )
          LEFT JOIN icalink_leave_applications la ON (
            la.student_id = s.xh
            AND la.course_id = ${courseCode}
            AND la.status IN ('leave_pending', 'leave')
          )
          WHERE kcb.kkh = ${courseCode}
            AND kcb.xnxq = ${semester}
            AND (s.zt IS NULL OR (s.zt != '毕业' AND s.zt != '退学'))
          ORDER BY s.xh ASC
        `.execute(db);

        return queryResult.rows;
      }, { connectionName: 'syncdb' });

      if (!result.success) {
        throw new Error(result.error?.message || 'Database query failed');
      }

      // 处理查询结果，组装完整的学生考勤信息
      const rawData = result.data || [];
      const studentsMap = new Map<
        string,
        OutXsxx & {
          attendance_record?: any;
          leave_application?: any;
        }
      >();

      rawData.forEach((row: any) => {
        const studentId = row.xh!;

        if (!studentsMap.has(studentId)) {
          // 提取学生基本信息
          const student: OutXsxx = {
            id: row.id || '',
            xh: row.xh || '',
            xm: row.xm || '',
            xb: row.xb || '',
            bjmc: row.bjmc || '',
            zymc: row.zymc || '',
            xymc: row.xymc || '',
            mz: row.mz || '',
            sfzh: row.sfzh || '',
            sjh: row.sjh || '',
            email: row.email || '',
            sznj: row.sznj || '',
            rxnf: row.rxnf || '',
            lx: row.lx || 0,
            zt: row.zt || '',
            update_time: row.update_time || new Date(),
            xydm: row.xydm || '',
            zydm: row.zydm || '',
            bjdm: row.bjdm || '',
            ykth: row.ykth || '',
            sj: row.sj || ''
          };

          studentsMap.set(studentId, student);
        }

        const student = studentsMap.get(studentId)!;

        // 添加考勤记录信息
        if (row.attendance_record_id && !student.attendance_record) {
          student.attendance_record = {
            id: row.attendance_record_id,
            status: row.attendance_status || 'not_started',
            checkin_time: row.checkin_time,
            checkin_location: row.checkin_location,
            ip_address: row.ip_address,
            is_late: row.is_late || false,
            late_minutes: row.late_minutes,
            remark: row.attendance_remark
          };
        }

        // 添加请假申请信息
        if (row.leave_application_id && !student.leave_application) {
          student.leave_application = {
            id: row.leave_application_id,
            leave_type: row.leave_type || 'personal',
            leave_reason: row.leave_reason || '',
            status: row.leave_status || 'leave_pending',
            application_time: row.application_time!,
            approval_time: row.approval_time
          };
        }
      });

      const students = Array.from(studentsMap.values());

      this.logger.info(
        { courseCode, semester, attendanceCourseId, count: students.length },
        'Found students with attendance info from database'
      );

      return {
        success: true,
        data: students
      };
    } catch (error) {
      this.logger.error(
        { error, courseCode, semester, attendanceCourseId },
        'Failed to find students with attendance info from database'
      );
      return {
        success: false,
        error: {
          code: ServiceErrorCode.DATABASE_ERROR,
          message:
            error instanceof Error ? error.message : 'Database query failed'
        }
      };
    }
  }

  async searchStudents(): Promise<ServiceResult<OutXsxx[]>> {
    return { success: true, data: [] };
  }

  async getStudentStats(): Promise<ServiceResult<StudentStats>> {
    return {
      success: true,
      data: {
        total_count: 0,
        undergraduate_count: 0,
        graduate_count: 0,
        college_distribution: {},
        major_distribution: {},
        grade_distribution: {}
      }
    };
  }

  async validateStudent(): Promise<
    ServiceResult<{ exists: boolean; isActive: boolean; studentInfo?: OutXsxx }>
  > {
    return {
      success: true,
      data: {
        exists: false,
        isActive: false
      }
    };
  }

  async getBasicInfo(): Promise<
    ServiceResult<{
      student_id: string;
      student_name: string;
      class_name: string;
      major_name: string;
      college_name: string;
      grade: string;
      student_type: string;
    } | null>
  > {
    return { success: true, data: null };
  }

  async getBatchBasicInfo(): Promise<
    ServiceResult<
      {
        student_id: string;
        student_name: string;
        class_name: string;
        major_name: string;
        college_name: string;
        grade: string;
        student_type: string;
      }[]
    >
  > {
    return { success: true, data: [] };
  }

  async getContactInfo(): Promise<
    ServiceResult<{
      student_id: string;
      student_name: string;
      phone?: string;
      email?: string;
    } | null>
  > {
    return { success: true, data: null };
  }

  async updateContactInfo(): Promise<ServiceResult<boolean>> {
    return { success: true, data: true };
  }

  async getStudentCourses(): Promise<ServiceResult<any[]>> {
    return { success: true, data: [] };
  }

  async isEnrolledInCourse(): Promise<ServiceResult<boolean>> {
    return { success: true, data: false };
  }

  async getStatistics(): Promise<ServiceResult<StudentStats>> {
    return this.getStudentStats();
  }

  async getAllColleges(): Promise<
    ServiceResult<{ code: string; name: string; student_count: number }[]>
  > {
    return { success: true, data: [] };
  }

  async getAllMajors(collegeCode?: string): Promise<
    ServiceResult<
      {
        code: string;
        name: string;
        college_code: string;
        college_name: string;
        student_count: number;
      }[]
    >
  > {
    return { success: true, data: [] };
  }

  async getAllClasses(majorCode?: string): Promise<
    ServiceResult<
      {
        code: string;
        name: string;
        major_code: string;
        major_name: string;
        student_count: number;
      }[]
    >
  > {
    return { success: true, data: [] };
  }

  async getAllGrades(): Promise<
    ServiceResult<{ grade: string; student_count: number }[]>
  > {
    return { success: true, data: [] };
  }
}
