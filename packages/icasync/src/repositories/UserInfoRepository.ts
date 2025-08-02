// @stratix/icasync 用户信息仓储
import type { DatabaseResult } from '@stratix/database';
import { QueryError } from '@stratix/database';
import type {
  ClassInfo,
  DatabaseUserSyncStatus,
  NewStudentCourse,
  NewStudentInfo,
  NewTeacherInfo,
  StudentCourse,
  StudentInfo,
  StudentInfoUpdate,
  TeacherInfo,
  TeacherInfoUpdate,
  UserInfo,
  UserSyncSummary
} from '../types/database.js';
import type { IStudentCourseRepository } from './StudentCourseRepository.js';
import type { IStudentRepository } from './StudentRepository.js';
import type { ITeacherRepository } from './TeacherRepository.js';

// 依赖注入装饰器 - 使用框架自动发现机制

/**
 * 用户信息仓储接口
 */
export interface IUserInfoRepository {
  // 学生信息操作
  findStudentById(id: number): Promise<DatabaseResult<StudentInfo | null>>;
  findStudentByXh(xh: string): Promise<DatabaseResult<StudentInfo | null>>;
  findStudentsByClass(bjdm: string): Promise<DatabaseResult<StudentInfo[]>>;
  findStudentsByMajor(zydm: string): Promise<DatabaseResult<StudentInfo[]>>;
  findStudentsByCollege(xydm: string): Promise<DatabaseResult<StudentInfo[]>>;
  createStudent(data: NewStudentInfo): Promise<DatabaseResult<StudentInfo>>;
  updateStudent(
    id: number,
    data: StudentInfoUpdate
  ): Promise<DatabaseResult<StudentInfo | null>>;

  // 教师信息操作
  findTeacherById(id: number): Promise<DatabaseResult<TeacherInfo | null>>;
  findTeacherByGh(gh: string): Promise<DatabaseResult<TeacherInfo | null>>;
  findTeachersByDepartment(
    ssdwdm: string
  ): Promise<DatabaseResult<TeacherInfo[]>>;
  createTeacher(data: NewTeacherInfo): Promise<DatabaseResult<TeacherInfo>>;
  updateTeacher(
    id: number,
    data: TeacherInfoUpdate
  ): Promise<DatabaseResult<TeacherInfo | null>>;

  // 学生课程关联操作
  findStudentCourseById(
    id: number
  ): Promise<DatabaseResult<StudentCourse | null>>;
  findStudentsByKkh(kkh: string): Promise<DatabaseResult<StudentCourse[]>>;
  findCoursesByStudent(xh: string): Promise<DatabaseResult<StudentCourse[]>>;
  createStudentCourse(
    data: NewStudentCourse
  ): Promise<DatabaseResult<StudentCourse>>;
  deleteStudentCourse(id: number): Promise<DatabaseResult<boolean>>;

  // 综合查询操作
  getUserInfo(
    userCode: string,
    userType: 'student' | 'teacher'
  ): Promise<DatabaseResult<UserInfo | null>>;
  getAllUsers(): Promise<DatabaseResult<UserInfo[]>>;
  getUsersByCollege(collegeCode: string): Promise<DatabaseResult<UserInfo[]>>;
  getChangedUsers(since?: Date): Promise<DatabaseResult<UserInfo[]>>;

  // 班级信息操作
  getClassInfo(bjdm: string): Promise<DatabaseResult<ClassInfo | null>>;
  getAllClasses(): Promise<DatabaseResult<ClassInfo[]>>;
  getClassesByMajor(zydm: string): Promise<DatabaseResult<ClassInfo[]>>;

  // 同步操作
  syncUsersToView(): Promise<DatabaseResult<UserSyncSummary>>;
  getUserSyncStatus(): Promise<DatabaseResult<DatabaseUserSyncStatus>>;

  // 统计查询
  countStudents(): Promise<DatabaseResult<number>>;
  countTeachers(): Promise<DatabaseResult<number>>;
  countStudentsByClass(bjdm: string): Promise<DatabaseResult<number>>;
  countStudentsByMajor(zydm: string): Promise<DatabaseResult<number>>;
  countTeachersByDepartment(ssdwdm: string): Promise<DatabaseResult<number>>;

  // 批量操作
  createStudentsBatch(
    students: NewStudentInfo[]
  ): Promise<DatabaseResult<StudentInfo[]>>;
  createTeachersBatch(
    teachers: NewTeacherInfo[]
  ): Promise<DatabaseResult<TeacherInfo[]>>;
  createStudentCoursesBatch(
    relations: NewStudentCourse[]
  ): Promise<DatabaseResult<StudentCourse[]>>;
}

/**
 * 用户信息仓储实现
 * 使用依赖注入模式组合其他仓储
 */
export default class UserInfoRepository implements IUserInfoRepository {
  constructor(
    private readonly studentRepository: IStudentRepository,
    private readonly teacherRepository: ITeacherRepository,
    private readonly studentCourseRepository: IStudentCourseRepository
  ) {}

  // ==================== 学生信息操作 ====================

  async findStudentById(
    id: number
  ): Promise<DatabaseResult<StudentInfo | null>> {
    return await this.studentRepository.findByIdNullable(id);
  }

  async findStudentByXh(
    xh: string
  ): Promise<DatabaseResult<StudentInfo | null>> {
    return await this.studentRepository.findByXh(xh);
  }

  async findStudentsByClass(
    bjdm: string
  ): Promise<DatabaseResult<StudentInfo[]>> {
    return await this.studentRepository.findByClass(bjdm);
  }

  async findStudentsByMajor(
    zydm: string
  ): Promise<DatabaseResult<StudentInfo[]>> {
    return await this.studentRepository.findByMajor(zydm);
  }

  async findStudentsByCollege(
    xydm: string
  ): Promise<DatabaseResult<StudentInfo[]>> {
    return await this.studentRepository.findByCollege(xydm);
  }

  async createStudent(
    data: NewStudentInfo
  ): Promise<DatabaseResult<StudentInfo>> {
    return await this.studentRepository.create(data);
  }

  async updateStudent(
    id: number,
    data: StudentInfoUpdate
  ): Promise<DatabaseResult<StudentInfo | null>> {
    return await this.studentRepository.updateNullable(id, data);
  }

  // ==================== 教师信息操作 ====================

  async findTeacherById(
    id: number
  ): Promise<DatabaseResult<TeacherInfo | null>> {
    return await this.teacherRepository.findByIdNullable(id.toString());
  }

  async findTeacherByGh(
    gh: string
  ): Promise<DatabaseResult<TeacherInfo | null>> {
    return await this.teacherRepository.findByGh(gh);
  }

  async findTeachersByDepartment(
    ssdwdm: string
  ): Promise<DatabaseResult<TeacherInfo[]>> {
    return await this.teacherRepository.findByDepartment(ssdwdm);
  }

  async createTeacher(
    data: NewTeacherInfo
  ): Promise<DatabaseResult<TeacherInfo>> {
    return await this.teacherRepository.create(data);
  }

  async updateTeacher(
    id: number,
    data: TeacherInfoUpdate
  ): Promise<DatabaseResult<TeacherInfo | null>> {
    return await this.teacherRepository.updateNullable(id.toString(), data);
  }

  // ==================== 学生课程关联操作 ====================

  async findStudentCourseById(
    id: number
  ): Promise<DatabaseResult<StudentCourse | null>> {
    return await this.studentCourseRepository.findByIdNullable(id);
  }

  async findStudentsByKkh(
    kkh: string
  ): Promise<DatabaseResult<StudentCourse[]>> {
    return await this.studentCourseRepository.findByKkh(kkh);
  }

  async findCoursesByStudent(
    xh: string
  ): Promise<DatabaseResult<StudentCourse[]>> {
    return await this.studentCourseRepository.findByXh(xh);
  }

  async createStudentCourse(
    data: NewStudentCourse
  ): Promise<DatabaseResult<StudentCourse>> {
    return await this.studentCourseRepository.create(data);
  }

  async deleteStudentCourse(id: number): Promise<DatabaseResult<boolean>> {
    return await this.studentCourseRepository.delete(id);
  }

  // ==================== 综合查询操作 ====================

  async getUserInfo(
    userCode: string,
    userType: 'student' | 'teacher'
  ): Promise<DatabaseResult<UserInfo | null>> {
    if (!userCode) {
      throw new Error('User code cannot be empty');
    }

    try {
      if (userType === 'student') {
        const studentResult = await this.findStudentByXh(userCode);
        if (!studentResult.success || !studentResult.data) {
          return { success: true, data: null };
        }

        const student = studentResult.data;
        return {
          success: true,
          data: this.studentRepository.convertToUserInfo(student)
        };
      } else {
        const teacherResult = await this.findTeacherByGh(userCode);
        if (!teacherResult.success || !teacherResult.data) {
          return { success: true, data: null };
        }

        const teacher = teacherResult.data;
        return {
          success: true,
          data: this.teacherRepository.convertToUserInfo(teacher)
        };
      }
    } catch (error) {
      return {
        success: false,
        error: new QueryError(
          error instanceof Error ? error.message : String(error),
          undefined,
          undefined,
          error instanceof Error ? error : undefined
        )
      };
    }
  }

  async getAllUsers(): Promise<DatabaseResult<UserInfo[]>> {
    try {
      const users: UserInfo[] = [];

      // 获取所有学生
      const studentsResult = await this.studentRepository.findMany();
      if (studentsResult.success && studentsResult.data) {
        for (const student of studentsResult.data) {
          // 过滤掉必需字段为null的记录
          if (!student.xh || !student.xm) {
            continue;
          }

          users.push({
            userCode: student.xh,
            userName: student.xm,
            userType: 'student',
            collegeCode: student.xydm || undefined,
            collegeName: student.xymc || undefined,
            majorCode: student.zydm || undefined,
            majorName: student.zymc || undefined,
            classCode: student.bjdm || undefined,
            className: student.bjmc || undefined,
            phone: student.sjh || undefined,
            email: student.email || undefined
          });
        }
      }

      // 获取所有教师
      const teachersResult = await this.teacherRepository.findMany();
      if (teachersResult.success && teachersResult.data) {
        for (const teacher of teachersResult.data) {
          // 过滤掉必需字段为null的记录
          if (!teacher.gh || !teacher.xm) {
            continue;
          }

          users.push({
            userCode: teacher.gh,
            userName: teacher.xm,
            userType: 'teacher',
            majorCode: teacher.ssdwdm || undefined,
            majorName: teacher.ssdwmc || undefined,
            phone: teacher.sjh || undefined,
            email: teacher.email || undefined
          });
        }
      }

      return {
        success: true,
        data: users
      };
    } catch (error) {
      return {
        success: false,
        error: new QueryError(
          error instanceof Error ? error.message : String(error),
          undefined,
          undefined,
          error instanceof Error ? error : undefined
        )
      };
    }
  }

  async getUsersByCollege(
    collegeCode: string
  ): Promise<DatabaseResult<UserInfo[]>> {
    if (!collegeCode) {
      throw new Error('College code cannot be empty');
    }

    try {
      const users: UserInfo[] = [];

      // 获取学院的学生
      const studentsResult = await this.findStudentsByCollege(collegeCode);
      if (studentsResult.success && studentsResult.data) {
        for (const student of studentsResult.data) {
          // 过滤掉必需字段为null的记录
          if (!student.xh || !student.xm) {
            continue;
          }

          users.push({
            userCode: student.xh,
            userName: student.xm,
            userType: 'student',
            collegeCode: student.xydm || undefined,
            collegeName: student.xymc || undefined,
            majorCode: student.zydm || undefined,
            majorName: student.zymc || undefined,
            classCode: student.bjdm || undefined,
            className: student.bjmc || undefined,
            phone: student.sjh || undefined,
            email: student.email || undefined
          });
        }
      }

      // 获取学院的教师（假设教师的部门代码对应学院代码）
      const teachersResult = await this.findTeachersByDepartment(collegeCode);
      if (teachersResult.success && teachersResult.data) {
        for (const teacher of teachersResult.data) {
          // 过滤掉必需字段为null的记录
          if (!teacher.gh || !teacher.xm) {
            continue;
          }

          users.push({
            userCode: teacher.gh,
            userName: teacher.xm,
            userType: 'teacher',
            majorCode: teacher.ssdwdm || undefined,
            majorName: teacher.ssdwmc || undefined,
            phone: teacher.sjh || undefined,
            email: teacher.email || undefined
          });
        }
      }

      return {
        success: true,
        data: users
      };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'getUsersByCollege query',
          [collegeCode]
        )
      };
    }
  }

  async getChangedUsers(since?: Date): Promise<DatabaseResult<UserInfo[]>> {
    try {
      const users: UserInfo[] = [];

      // 获取变更的学生
      let studentsResult;
      if (since) {
        studentsResult = await this.studentRepository.findMany((eb: any) =>
          eb('updated_at', '>', since)
        );
      } else {
        studentsResult = await this.studentRepository.findMany((eb: any) =>
          eb('zt', 'is not', null)
        );
      }

      if (studentsResult.success && studentsResult.data) {
        for (const student of studentsResult.data) {
          // 过滤掉必需字段为null的记录
          if (!student.xh || !student.xm) {
            continue;
          }

          users.push({
            userCode: student.xh,
            userName: student.xm,
            userType: 'student',
            collegeCode: student.xydm || undefined,
            collegeName: student.xymc || undefined,
            majorCode: student.zydm || undefined,
            majorName: student.zymc || undefined,
            classCode: student.bjdm || undefined,
            className: student.bjmc || undefined,
            phone: student.sjh || undefined,
            email: student.email || undefined
          });
        }
      }

      // 获取变更的教师
      let teachersResult;
      if (since) {
        teachersResult = await this.teacherRepository.findMany((eb: any) =>
          eb('updated_at', '>', since)
        );
      } else {
        teachersResult = await this.teacherRepository.findMany((eb: any) =>
          eb('zt', 'is not', null)
        );
      }

      if (teachersResult.success && teachersResult.data) {
        for (const teacher of teachersResult.data) {
          // 过滤掉必需字段为null的记录
          if (!teacher.gh || !teacher.xm) {
            continue;
          }

          users.push({
            userCode: teacher.gh,
            userName: teacher.xm,
            userType: 'teacher',
            majorCode: teacher.ssdwdm || undefined,
            majorName: teacher.ssdwmc || undefined,
            phone: teacher.sjh || undefined,
            email: teacher.email || undefined
          });
        }
      }

      return {
        success: true,
        data: users
      };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'getChangedUsers query',
          [since]
        )
      };
    }
  }

  // ==================== 班级信息操作 ====================

  async getClassInfo(bjdm: string): Promise<DatabaseResult<ClassInfo | null>> {
    if (!bjdm) {
      throw new Error('Class code cannot be empty');
    }

    try {
      const studentsResult = await this.findStudentsByClass(bjdm);
      if (
        !studentsResult.success ||
        !studentsResult.data ||
        studentsResult.data.length === 0
      ) {
        return { success: true, data: null };
      }

      const firstStudent = studentsResult.data[0];
      return {
        success: true,
        data: {
          bjdm: firstStudent.bjdm || '',
          bjmc: firstStudent.bjmc || '',
          studentCount: studentsResult.data.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'getClassInfo query',
          [bjdm]
        )
      };
    }
  }

  async getAllClasses(): Promise<DatabaseResult<ClassInfo[]>> {
    try {
      // 这里需要使用GROUP BY查询来获取所有班级信息
      // 由于BaseRepository可能不直接支持复杂的聚合查询，
      // 我们先用简单的方法实现
      const studentsResult = await this.studentRepository.findMany();
      if (!studentsResult.success || !studentsResult.data) {
        return { success: true, data: [] };
      }

      // 手动分组统计
      const classMap = new Map<string, ClassInfo>();
      for (const student of studentsResult.data) {
        const key = student.bjdm || 'unknown';
        if (classMap.has(key)) {
          classMap.get(key)!.studentCount++;
        } else {
          classMap.set(key, {
            bjdm: student.bjdm || '',
            bjmc: student.bjmc || '',
            studentCount: 1
          });
        }
      }

      return {
        success: true,
        data: Array.from(classMap.values())
      };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'getAllClasses query',
          []
        )
      };
    }
  }

  async getClassesByMajor(zydm: string): Promise<DatabaseResult<ClassInfo[]>> {
    if (!zydm) {
      throw new Error('Major code cannot be empty');
    }

    try {
      const studentsResult = await this.findStudentsByMajor(zydm);
      if (!studentsResult.success || !studentsResult.data) {
        return { success: true, data: [] };
      }

      // 手动分组统计
      const classMap = new Map<string, ClassInfo>();
      for (const student of studentsResult.data) {
        const key = student.bjdm;
        if (key && classMap.has(key)) {
          classMap.get(key)!.studentCount++;
        } else if (key) {
          classMap.set(key, {
            bjdm: student.bjdm || '',
            bjmc: student.bjmc || '',
            studentCount: 1
          });
        }
      }

      return {
        success: true,
        data: Array.from(classMap.values())
      };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'getClassesByMajor query',
          [zydm]
        )
      };
    }
  }

  // ==================== 同步操作 ====================

  async syncUsersToView(): Promise<DatabaseResult<UserSyncSummary>> {
    // 这个方法需要与UserViewRepository配合实现
    // 将原始用户数据同步到用户视图表
    // 由于涉及复杂的业务逻辑，这里先返回占位符
    return {
      success: true,
      data: {
        totalUsers: 0,
        syncedUsers: 0,
        failedUsers: 0,
        newUsers: 0,
        updatedUsers: 0
      }
    };
  }

  async getUserSyncStatus(): Promise<DatabaseResult<DatabaseUserSyncStatus>> {
    try {
      const studentsCount = await this.countStudents();
      const teachersCount = await this.countTeachers();

      const totalUsers =
        (studentsCount.success ? studentsCount.data : 0) +
        (teachersCount.success ? teachersCount.data : 0);

      return {
        success: true,
        data: {
          lastSyncTime: null, // 需要从同步记录中获取
          totalUsers,
          pendingUsers: 0, // 需要从用户视图表中获取
          syncedUsers: 0, // 需要从用户视图表中获取
          failedUsers: 0 // 需要从用户视图表中获取
        }
      };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'getUserSyncStatus query',
          []
        )
      };
    }
  }

  // ==================== 统计查询 ====================

  async countStudents(): Promise<DatabaseResult<number>> {
    try {
      const result = await this.studentRepository.findMany();
      if (result.success) {
        return { success: true, data: result.data.length };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'countStudents query',
          []
        )
      };
    }
  }

  async countTeachers(): Promise<DatabaseResult<number>> {
    try {
      const result = await this.teacherRepository.findMany();
      if (result.success) {
        return { success: true, data: result.data.length };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'countTeachers query',
          []
        )
      };
    }
  }

  async countStudentsByClass(bjdm: string): Promise<DatabaseResult<number>> {
    if (!bjdm) {
      throw new Error('Class code cannot be empty');
    }

    try {
      const result = await this.studentRepository.findByClass(bjdm);
      if (result.success) {
        return { success: true, data: result.data.length };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'countStudentsByClass query',
          [bjdm]
        )
      };
    }
  }

  async countStudentsByMajor(zydm: string): Promise<DatabaseResult<number>> {
    if (!zydm) {
      throw new Error('Major code cannot be empty');
    }

    try {
      const result = await this.studentRepository.findByMajor(zydm);
      if (result.success) {
        return { success: true, data: result.data.length };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'countStudentsByMajor query',
          [zydm]
        )
      };
    }
  }

  async countTeachersByDepartment(
    ssdwdm: string
  ): Promise<DatabaseResult<number>> {
    if (!ssdwdm) {
      throw new Error('Department code cannot be empty');
    }

    try {
      const result = await this.teacherRepository.findByDepartment(ssdwdm);
      if (result.success) {
        return { success: true, data: result.data.length };
      }
      return { success: false, error: result.error };
    } catch (error) {
      return {
        success: false,
        error: QueryError.create(
          error instanceof Error ? error.message : String(error),
          'countTeachersByDepartment query',
          [ssdwdm]
        )
      };
    }
  }

  // ==================== 批量操作 ====================

  async createStudentsBatch(
    students: NewStudentInfo[]
  ): Promise<DatabaseResult<StudentInfo[]>> {
    return await this.studentRepository.createStudentsBatch(students);
  }

  async createTeachersBatch(
    teachers: NewTeacherInfo[]
  ): Promise<DatabaseResult<TeacherInfo[]>> {
    return await this.teacherRepository.createTeachersBatch(teachers);
  }

  async createStudentCoursesBatch(
    relations: NewStudentCourse[]
  ): Promise<DatabaseResult<StudentCourse[]>> {
    return await this.studentCourseRepository.createStudentCoursesBatch(
      relations
    );
  }
}
