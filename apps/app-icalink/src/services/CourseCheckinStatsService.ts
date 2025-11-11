import type { Logger } from '@stratix/core';
import type CourseCheckinStatsRepository from '../repositories/CourseCheckinStatsRepository.js';
import type {
  ClassWeeklyAttendanceStats,
  CollegeWeeklyAttendanceStats,
  CourseWeeklyAttendanceStats
} from '../types/attendance-stats.types.js';
import type { IcalinkCourseCheckinStats } from '../types/database.js';

/**
 * 服务执行结果
 */
export interface ServiceResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 分页查询参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  searchKeyword?: string;
  teachingWeek?: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页查询结果
 */
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * 课程签到统计服务接口
 */
export interface ICourseCheckinStatsService {
  findWithPagination(
    params: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<IcalinkCourseCheckinStats>>>;
}

/**
 * 课程签到统计服务实现
 * 负责处理课程历史统计数据的业务逻辑
 */
export default class CourseCheckinStatsService
  implements ICourseCheckinStatsService
{
  constructor(
    private readonly logger: Logger,
    private readonly courseCheckinStatsRepository: CourseCheckinStatsRepository
  ) {
    this.logger.info('✅ CourseCheckinStatsService initialized');
  }

  /**
   * 分页查询课程签到统计数据
   * @param params 查询参数
   * @returns 分页结果
   */
  public async findWithPagination(
    params: PaginationParams
  ): Promise<ServiceResult<PaginatedResult<IcalinkCourseCheckinStats>>> {
    try {
      // 参数验证
      if (!params.page || params.page < 1) {
        this.logger.warn('Invalid page parameter', { page: params.page });
        return {
          success: false,
          error: 'Invalid page parameter, must be >= 1'
        };
      }

      if (!params.pageSize || params.pageSize <= 0 || params.pageSize > 100) {
        this.logger.warn('Invalid pageSize parameter', {
          pageSize: params.pageSize
        });
        return {
          success: false,
          error: 'Invalid pageSize parameter, must be between 1 and 100'
        };
      }

      this.logger.debug('Finding course checkin stats with pagination', {
        params
      });

      // 调用Repository层查询数据
      const result = await this.courseCheckinStatsRepository.findWithPagination(
        {
          page: params.page,
          pageSize: params.pageSize,
          searchKeyword: params.searchKeyword,
          teachingWeek: params.teachingWeek,
          sortField: params.sortField,
          sortOrder: params.sortOrder
        }
      );

      this.logger.debug('Query completed', {
        total: result.total,
        dataCount: result.data.length
      });

      return {
        success: true,
        data: {
          data: result.data,
          total: result.total,
          page: result.page,
          pageSize: result.pageSize,
          totalPages: result.totalPages
        }
      };
    } catch (error: any) {
      this.logger.error('Failed to find course checkin stats', {
        error: error.message,
        stack: error.stack,
        params
      });

      return {
        success: false,
        error: 'Failed to query course checkin stats',
        message: error.message
      };
    }
  }

  /**
   * 根据课程代码查询统计记录
   * @param courseCode 课程代码
   * @returns 统计记录列表
   */
  public async findByCourseCode(
    courseCode: string
  ): Promise<ServiceResult<IcalinkCourseCheckinStats[]>> {
    try {
      if (!courseCode) {
        return {
          success: false,
          error: 'Course code is required'
        };
      }

      this.logger.debug('Finding course stats by course code', { courseCode });

      const result =
        await this.courseCheckinStatsRepository.findByCourseCode(courseCode);

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      this.logger.error('Failed to find course stats by course code', {
        error: error.message,
        courseCode
      });

      return {
        success: false,
        error: 'Failed to query course stats',
        message: error.message
      };
    }
  }

  /**
   * 根据日期范围查询统计记录
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 统计记录列表
   */
  public async findByDateRange(
    startDate: Date,
    endDate: Date
  ): Promise<ServiceResult<IcalinkCourseCheckinStats[]>> {
    try {
      if (!startDate || !endDate) {
        return {
          success: false,
          error: 'Start date and end date are required'
        };
      }

      if (startDate > endDate) {
        return {
          success: false,
          error: 'Start date must be before or equal to end date'
        };
      }

      this.logger.debug('Finding course stats by date range', {
        startDate,
        endDate
      });

      const result = await this.courseCheckinStatsRepository.findByDateRange(
        startDate,
        endDate
      );

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      this.logger.error('Failed to find course stats by date range', {
        error: error.message,
        startDate,
        endDate
      });

      return {
        success: false,
        error: 'Failed to query course stats',
        message: error.message
      };
    }
  }

  /**
   * 获取总记录数
   * @returns 总记录数
   */
  public async getTotalCount(): Promise<ServiceResult<number>> {
    try {
      this.logger.debug('Getting total count of course checkin stats');

      const count = await this.courseCheckinStatsRepository.getTotalCount();

      return {
        success: true,
        data: count
      };
    } catch (error: any) {
      this.logger.error('Failed to get total count', {
        error: error.message
      });

      return {
        success: false,
        error: 'Failed to get total count',
        message: error.message
      };
    }
  }

  /**
   * 获取当前教学周
   * @returns 当前教学周信息
   *
   * @remarks
   * - 从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   */
  public async getCurrentTeachingWeek(): Promise<
    ServiceResult<{ currentWeek: number; termStartDate: string }>
  > {
    try {
      this.logger.debug('Getting current teaching week');

      // 调用 Repository 层获取当前教学周
      const result =
        await this.courseCheckinStatsRepository.getCurrentTeachingWeek();

      return {
        success: true,
        data: result
      };
    } catch (error: any) {
      this.logger.error('Failed to get current teaching week', {
        error: error.message,
        stack: error.stack
      });

      if (error.message.includes('未找到学期开始日期配置')) {
        return {
          success: false,
          error: '未找到学期开始日期配置',
          message: '请先在系统配置中设置学期开始日期'
        };
      }

      return {
        success: false,
        error: 'Failed to get current teaching week',
        message: error.message
      };
    }
  }

  /**
   * 查询学院周度签到统计数据（自动计算当前周并查询到上周）
   * @param courseUnitId 学院ID（必需）
   * @param semester 学期（可选）
   * @param fillMissingWeeks 是否填充缺失的周数据（默认true）
   * @returns 周度统计数据数组
   *
   * @remarks
   * - 自动从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   * - 查询范围：第1周到上周（当前周 - 1）
   * - 如果当前周 ≤ 1，返回空数组
   */
  public async getCollegeWeeklyStats(
    courseUnitId: string,
    semester?: string,
    fillMissingWeeks: boolean = true
  ): Promise<ServiceResult<CollegeWeeklyAttendanceStats[]>> {
    try {
      // 参数验证
      if (!courseUnitId) {
        return {
          success: false,
          error: 'Course unit ID is required'
        };
      }

      this.logger.debug('Getting college weekly stats', {
        courseUnitId,
        semester,
        fillMissingWeeks
      });

      // 调用 Repository 层查询数据（Repository 会自动计算当前周和查询范围）
      const data =
        await this.courseCheckinStatsRepository.findCollegeWeeklyStats(
          courseUnitId,
          semester
        );

      // 如果数据为空，可能是当前周次不足
      if (data.length === 0) {
        return {
          success: true,
          data: [],
          message: '当前周次不足，暂无统计数据'
        };
      }

      // 如果需要填充缺失的周数据
      if (fillMissingWeeks && data.length > 0) {
        // 从数据中获取实际的起始周和结束周
        const weeks = data.map((item) => item.teaching_week);
        const minWeek = Math.min(...weeks);
        const maxWeek = Math.max(...weeks);

        const filledData = this.fillMissingWeeks(data, minWeek, maxWeek);
        return {
          success: true,
          data: filledData
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to get college weekly stats', {
        error: error.message,
        stack: error.stack,
        courseUnitId,
        semester
      });

      // 特殊处理：未找到学期开始日期配置
      if (error.message.includes('未找到学期开始日期配置')) {
        return {
          success: false,
          error: '未找到学期开始日期配置',
          message: '请先在系统配置中设置学期开始日期'
        };
      }

      return {
        success: false,
        error: 'Failed to query college weekly stats',
        message: error.message
      };
    }
  }

  /**
   * 填充缺失的周数据（返回0值记录）
   * @param data 原始数据
   * @param startWeek 起始周
   * @param endWeek 结束周
   * @returns 填充后的数据
   */
  private fillMissingWeeks(
    data: CollegeWeeklyAttendanceStats[],
    startWeek: number,
    endWeek: number
  ): CollegeWeeklyAttendanceStats[] {
    const result: CollegeWeeklyAttendanceStats[] = [];
    const dataMap = new Map(data.map((item) => [item.teaching_week, item]));

    for (let week = startWeek; week <= endWeek; week++) {
      if (dataMap.has(week)) {
        result.push(dataMap.get(week)!);
      } else {
        // 填充0值记录
        result.push({
          teaching_week: week,
          expected_attendance: 0,
          absent_count: 0,
          truant_count: 0,
          leave_count: 0,
          present_count: 0,
          absence_rate: 0,
          truant_rate: 0
        });
      }
    }

    return result;
  }

  /**
   * 获取教学班周度签到统计数据
   * - 自动从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   * - 查询范围：第1周到上周（当前周 - 1）
   * - 如果当前周 ≤ 1，返回空数组
   */
  public async getClassWeeklyStats(
    teachingClassCode: string,
    semester?: string,
    fillMissingWeeks: boolean = true
  ): Promise<ServiceResult<ClassWeeklyAttendanceStats[]>> {
    try {
      // 参数验证
      if (!teachingClassCode) {
        return {
          success: false,
          error: 'Teaching class code is required'
        };
      }

      this.logger.debug('Getting class weekly stats', {
        teachingClassCode,
        semester,
        fillMissingWeeks
      });

      // 调用 Repository 层查询数据（Repository 会自动计算当前周和查询范围）
      const data = await this.courseCheckinStatsRepository.findClassWeeklyStats(
        teachingClassCode,
        semester
      );

      // 如果数据为空，可能是当前周次不足
      if (data.length === 0) {
        return {
          success: true,
          data: [],
          message: '当前周次不足，暂无统计数据'
        };
      }

      // 如果需要填充缺失的周数据
      if (fillMissingWeeks && data.length > 0) {
        // 从数据中获取实际的起始周和结束周
        const weeks = data.map((item) => item.teaching_week);
        const minWeek = Math.min(...weeks);
        const maxWeek = Math.max(...weeks);

        const filledData = this.fillMissingWeeks(data, minWeek, maxWeek);
        return {
          success: true,
          data: filledData
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to get class weekly stats', {
        error: error.message,
        stack: error.stack,
        teachingClassCode,
        semester
      });

      // 特殊处理：未找到学期开始日期配置
      if (error.message.includes('未找到学期开始日期配置')) {
        return {
          success: false,
          error: '未找到学期开始日期配置',
          message: '请先在系统配置中设置学期开始日期'
        };
      }

      return {
        success: false,
        error: 'Failed to query class weekly stats',
        message: error.message
      };
    }
  }

  /**
   * 获取课程周度签到统计数据
   * - 自动从 icalink_system_configs 表获取学期开始日期（config_key = 'term.start_date'）
   * - 根据当前日期计算当前教学周
   * - 查询范围：第1周到上周（当前周 - 1）
   * - 如果当前周 ≤ 1，返回空数组
   */
  public async getCourseWeeklyStats(
    courseCode: string,
    semester?: string,
    fillMissingWeeks: boolean = true
  ): Promise<ServiceResult<CourseWeeklyAttendanceStats[]>> {
    try {
      // 参数验证
      if (!courseCode) {
        return {
          success: false,
          error: 'Course code is required'
        };
      }

      this.logger.debug('Getting course weekly stats', {
        courseCode,
        semester,
        fillMissingWeeks
      });

      // 调用 Repository 层查询数据（Repository 会自动计算当前周和查询范围）
      const data =
        await this.courseCheckinStatsRepository.findCourseWeeklyStats(
          courseCode,
          semester
        );

      // 如果数据为空，可能是当前周次不足
      if (data.length === 0) {
        return {
          success: true,
          data: [],
          message: '当前周次不足，暂无统计数据'
        };
      }

      // 如果需要填充缺失的周数据
      if (fillMissingWeeks && data.length > 0) {
        // 从数据中获取实际的起始周和结束周
        const weeks = data.map((item) => item.teaching_week);
        const minWeek = Math.min(...weeks);
        const maxWeek = Math.max(...weeks);

        const filledData = this.fillMissingWeeks(data, minWeek, maxWeek);
        return {
          success: true,
          data: filledData
        };
      }

      return {
        success: true,
        data
      };
    } catch (error: any) {
      this.logger.error('Failed to get course weekly stats', {
        error: error.message,
        stack: error.stack,
        courseCode,
        semester
      });

      // 特殊处理：未找到学期开始日期配置
      if (error.message.includes('未找到学期开始日期配置')) {
        return {
          success: false,
          error: '未找到学期开始日期配置',
          message: '请先在系统配置中设置学期开始日期'
        };
      }

      return {
        success: false,
        error: 'Failed to query course weekly stats',
        message: error.message
      };
    }
  }
}
