// @stratix/icasync 获取未处理的juhe_renwu记录处理器
// 用于增量同步工作流第四步，获取未处理的juhe_renwu记录用于创建新日程

import type { AwilixContainer, Logger } from '@stratix/core';
import { Executor, RESOLVER } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import { format, formatISO, parseISO } from 'date-fns';
import type { IAttendanceCoursesRepository } from '../repositories/AttendanceCoursesRepository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { JuheRenwu, NewAttendanceCourse } from '../types/database.js';

/**
 * WPS日程数据格式
 */
export interface WpsScheduleData {
  /** 日程标题 */
  summary: string;
  /** 日程描述 */
  description?: string;
  /** 开始时间 */
  start_time: {
    datetime: string;
  };
  /** 结束时间 */
  end_time: {
    datetime: string;
  };
  /** 地点 */
  locations: Array<{ name: string }>;
  /** 提醒设置 */
  reminders?: Array<{ minutes: number }>;
}

export interface ScheduleData extends WpsScheduleData {
  juheRenwuId: number;
  kkh: string;
}

/**
 * 获取未处理记录配置接口
 */
export interface FetchUnprocessedJuheRenwuConfig {
  xnxq: string; // 学年学期
  includeCalendarInfo?: boolean; // 是否包含日历信息
  includeParticipants?: boolean; // 是否包含参与者信息
  maxRecords?: number; // 最大记录数
}

/**
 * 获取未处理记录结果接口
 */
export interface FetchUnprocessedJuheRenwuResult {
  /** 原始未处理记录 */
  unprocessedRecords: Array<{
    id: number;
    kkh: string;
    rq: string;
    start_time: string;
    end_time: string;
    course_name: string;
    location?: string;
    teacher_names?: string;
    participants?: any[];
    needsAttendance?: boolean; // 是否需要打卡
  }>;
  /** WPS格式的日程数据 */
  wpsSchedules: ScheduleData[];
  /** 创建的考勤课程数量 */
  createdAttendanceCourses: number;
  /** 总记录数 */
  totalCount: number;
  /** 执行时长 */
  duration: number;
}

/**
 * 获取未处理的juhe_renwu记录处理器
 */
@Executor({
  name: 'fetchUnprocessedJuheRenwuRecords',
  description: '获取未处理的juhe_renwu记录处理器 - 用于获取需要创建日程的记录',
  version: '1.0.0',
  tags: ['fetch', 'unprocessed', 'juhe_renwu', 'incremental'],
  category: 'icasync'
})
export default class FetchUnprocessedJuheRenwuProcessor
  implements TaskExecutor
{
  readonly name = 'fetchUnprocessedJuheRenwuRecords';
  readonly description = '获取未处理的juhe_renwu记录处理器';
  readonly version = '1.0.0';

  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      const config = container.resolve('config');
      return {
        attendanceUrl: config.attendanceUrl || 'http://localhost:3000'
      };
    }
  };

  constructor(
    private juheRenwuRepository: IJuheRenwuRepository,
    private attendanceCoursesRepository: IAttendanceCoursesRepository,
    private logger: Logger,
    private attendanceUrl: string
  ) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FetchUnprocessedJuheRenwuConfig;

    this.logger.info('开始获取未处理的juhe_renwu记录', {
      xnxq: config.xnxq,
      maxRecords: config.maxRecords,
      includeCalendarInfo: config.includeCalendarInfo,
      includeParticipants: config.includeParticipants
    });

    try {
      // 1. 获取未处理的记录（gx_zt为null或空）
      const result = await this.juheRenwuRepository.findUnprocessed(
        config.xnxq,
        config.maxRecords
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error?.message || 'Failed to fetch unprocessed records'
        };
      }

      const records = result.data || [];
      this.logger.info(`查询到 ${records.length} 条未处理记录`);

      // 2. 处理签到课程数据（如果需要签到）
      const createdAttendanceCourses =
        await this.processAttendanceCourses(records);

      // 3. 转换为WPS日程格式
      const wpsSchedules = this.convertToWpsSchedules(records);
      this.logger.info(`转换为 ${wpsSchedules.length} 个WPS日程`);

      const duration = Date.now() - startTime;

      this.logger.info('未处理记录获取完成', {
        xnxq: config.xnxq,
        wpsSchedulesCount: wpsSchedules.length,
        createdAttendanceCourses,
        duration
      });

      return {
        success: true,
        data: {
          items: wpsSchedules.map((wpsSchedule) => ({
            id: wpsSchedule.juheRenwuId,
            kkh: wpsSchedule.kkh,
            summary: wpsSchedule.summary,
            description: wpsSchedule.description,
            start_time: wpsSchedule.start_time.datetime,
            end_time: wpsSchedule.end_time.datetime,
            location: wpsSchedule.locations,
            reminders: wpsSchedule.reminders
          })),
          totalCount: wpsSchedules.length,
          duration
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('获取未处理记录失败', {
        xnxq: config.xnxq,
        duration,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 处理签到课程数据
   * 为需要签到的课程创建签到记录，使用SQL直接处理重复检测，避免内存循环
   */
  private async processAttendanceCourses(
    courseData: JuheRenwu[]
  ): Promise<number> {
    try {
      this.logger.info(`开始处理签到课程数据，共 ${courseData.length} 条记录`);

      // 过滤需要签到的课程（这里可以根据业务规则判断）
      const attendanceCourses = courseData.filter((item) =>
        this.needsAttendance(item)
      );

      if (attendanceCourses.length === 0) {
        this.logger.info('没有需要签到的课程');
        return 0;
      }

      this.logger.info(`发现 ${attendanceCourses.length} 个需要签到的课程`);

      // 构建所有待插入的签到课程记录
      const newAttendanceCourses: NewAttendanceCourse[] = attendanceCourses.map(
        (item) => ({
          juhe_renwu_id: item.id,
          external_id: this.generateUniqueId(item),
          course_code: item.kkh || '',
          course_name: item.kcmc || '',
          semester: item.xnxq || '',
          teaching_week: item.jxz || 0,
          week_day: item.zc || 0,
          teacher_codes: item.gh_s,
          teacher_names: item.xm_s,
          class_location: this.buildLocationFromAggregated(
            item.lq,
            item.room_s
          ),
          start_time: this.formatTimeForDatabase(item.rq!, item.sj_f!),
          end_time: this.formatTimeForDatabase(item.rq!, item.sj_t!),
          periods: item.jc_s,
          time_period: item.sjd,
          attendance_enabled: 1, // 默认启用签到
          attendance_start_offset: 0, // 提前15分钟开始签到
          attendance_end_offset: 15, // 课程开始后30分钟内可签到
          late_threshold: 10, // 10分钟内算迟到
          auto_absent_after: 30, // 30分钟后自动标记缺勤
          created_by: 'system'
        })
      );

      if (newAttendanceCourses.length === 0) {
        this.logger.warn('没有有效的签到课程记录可创建');
        return 0;
      }

      // 使用SQL的INSERT IGNORE或ON DUPLICATE KEY UPDATE来处理重复检测
      // 这里调用Repository的批量插入方法，让Repository层处理重复检测
      const result =
        await this.attendanceCoursesRepository.createBatchWithDuplicateHandling(
          newAttendanceCourses
        );

      if (result.success) {
        const createdCount = result.data!.createdCount || 0;
        const skippedCount = result.data!.skippedCount || 0;

        this.logger.info(
          `签到课程处理完成：成功创建 ${createdCount} 条记录，跳过 ${skippedCount} 条重复记录`
        );
        return createdCount;
      } else {
        this.logger.error('创建签到课程记录失败', { error: result.error });
        return 0;
      }
    } catch (error) {
      this.logger.error('处理签到课程数据异常', { error });
      // 不抛出错误，允许日程创建继续进行
      return 0;
    }
  }

  /**
   * 判断课程是否需要签到
   * 根据sfdk字段判断是否需要打卡
   */
  private needsAttendance(item: JuheRenwu): boolean {
    // 根据sfdk字段判断：有值且不为'0'表示需要签到
    return Boolean(item.sfdk && item.sfdk !== '0');
  }

  /**
   * 生成唯一ID
   * 使用 kkh + xnxq + jxz + zc + sjd 字段拼接生成external_id，去除特殊字符以便用于URL
   */
  private generateUniqueId(item: JuheRenwu): string {
    // 标准化输入数据，确保一致性并去除特殊字符
    const kkh = (item.kkh || '').trim().replace(/[^a-zA-Z0-9]/g, '');
    const xnxq = (item.xnxq || '').trim().replace(/[^a-zA-Z0-9]/g, '');
    const jxz = (item.jxz || '')
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '');
    const zc = (item.zc || '')
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9]/g, '');
    const sjd = (item.sjd || '').trim().replace(/[^a-zA-Z0-9]/g, '');

    // 验证必要字段
    if (!kkh || !xnxq || !jxz || !zc || !sjd) {
      this.logger.warn('生成唯一ID时发现空字段', {
        originalKkh: item.kkh,
        originalXnxq: item.xnxq,
        originalJxz: item.jxz,
        originalZc: item.zc,
        originalSjd: item.sjd,
        cleanedKkh: kkh,
        cleanedXnxq: xnxq,
        cleanedJxz: jxz,
        cleanedZc: zc,
        cleanedSjd: sjd,
        juhe_renwu_id: item.id
      });
    }

    // 拼接生成external_id，使用字母数字字符分隔
    const result = `${kkh}${xnxq}${jxz}${zc}${sjd}`;

    this.logger.debug('生成唯一ID', {
      originalData: {
        kkh: item.kkh,
        xnxq: item.xnxq,
        jxz: item.jxz,
        zc: item.zc,
        sjd: item.sjd
      },
      cleanedData: {
        kkh,
        xnxq,
        jxz,
        zc,
        sjd
      },
      result,
      juhe_renwu_id: item.id
    });

    return result;
  }

  /**
   * 构建地点信息（聚合数据）
   */
  private buildLocationFromAggregated(
    lq?: string | null,
    room_s?: string | null
  ): string {
    const parts = [lq, room_s].filter(Boolean);
    return parts.length > 0 ? parts.join('') : '未知地点';
  }

  /**
   * 格式化时间用于数据库存储
   * 处理源数据中的时间格式差异，转换为MySQL datetime格式 (YYYY-MM-DD HH:MM:SS)
   * 数据库存储使用标准datetime格式，应用层需要时可转换为RFC3339格式
   *
   * 源数据格式示例：
   * - rq: 2025-03-10 或 2025/05/26
   * - sj_t/sj_f: 11:25:00.000 或 09:35
   *
   * 输出格式: 2025-05-26 11:25:00 (MySQL datetime格式)
   */
  private formatTimeForDatabase(dateStr: string, timeStr: string): string {
    try {
      // 清理并标准化日期字符串，确保格式为 YYYY-MM-DD
      let cleanDate = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr;

      // 处理斜杠分隔的日期格式 2025/05/26 -> 2025-05-26
      if (cleanDate.includes('/')) {
        cleanDate = cleanDate.replace(/\//g, '-');
      }

      // 清理时间字符串
      let cleanTime = timeStr.includes(' ')
        ? timeStr.split(' ')[1] || timeStr
        : timeStr;

      // 处理时间格式标准化
      if (cleanTime.includes('.')) {
        // 处理 "11:25:00.000" 格式，去掉毫秒部分
        cleanTime = cleanTime.split('.')[0];
      }

      // 确保时间格式为 HH:MM:SS
      const timeParts = cleanTime.split(':');
      if (timeParts.length === 2) {
        // "09:35" -> "09:35:00"
        cleanTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:00`;
      } else if (timeParts.length === 3) {
        // "11:25:00" -> 确保每个部分都是两位数
        cleanTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(2, '0')}:${timeParts[2].padStart(2, '0')}`;
      } else if (timeParts.length === 1 && timeParts[0].length >= 3) {
        // 处理可能的紧凑格式如 "935" -> "09:35:00"
        const compactTime = timeParts[0].padStart(4, '0');
        cleanTime = `${compactTime.slice(0, 2)}:${compactTime.slice(2, 4)}:00`;
      }

      // 验证时间格式
      if (!/^\d{2}:\d{2}:\d{2}$/.test(cleanTime)) {
        this.logger.warn('时间格式异常，使用默认时间', {
          original: timeStr,
          processed: cleanTime,
          date: dateStr
        });
        cleanTime = '08:00:00'; // 使用默认时间
      }

      // 生成MySQL datetime格式: YYYY-MM-DD HH:MM:SS
      const result = `${cleanDate} ${cleanTime}`;

      this.logger.debug('时间格式化完成(MySQL datetime)', {
        originalDate: dateStr,
        originalTime: timeStr,
        result: result
      });

      return result;
    } catch (error) {
      this.logger.warn('时间格式化失败，使用默认datetime格式', {
        dateStr,
        timeStr,
        error: error instanceof Error ? error.message : String(error)
      });
      // 降级处理：返回当前时间的MySQL格式
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }
  }

  /**
   * 将MySQL datetime格式转换为RFC3339格式
   * @param dateTimeStr MySQL datetime格式的时间字符串
   * @returns RFC3339格式的时间字符串
   */
  private convertToRFC3339(dateTimeStr: string): string {
    try {
      // 将MySQL datetime格式转换为RFC3339格式
      const dateTime = parseISO(dateTimeStr.replace(' ', 'T'));
      const rfc3339 = formatISO(dateTime).replace('Z', '+08:00');

      return rfc3339;
    } catch (error) {
      this.logger.warn('RFC3339格式转换失败，使用默认格式', {
        dateTimeStr,
        error
      });
      // 降级处理：返回基本的ISO格式
      return dateTimeStr;
    }
  }

  /**
   * 将聚合课程数据转换为WPS日程格式
   */
  private convertToWpsSchedules(courseData: JuheRenwu[]): ScheduleData[] {
    return courseData.map((item) => {
      const startTime = this.convertToRFC3339(
        this.formatTimeForDatabase(item.rq!, item.sj_f!)
      );
      const endTime = this.convertToRFC3339(
        this.formatTimeForDatabase(item.rq!, item.sj_t!)
      );

      // 构建地点信息
      const location = this.buildLocationFromAggregated(item.lq, item.room_s);

      // 构建描述信息
      let description = this.buildDescriptionFromAggregated(item);

      return {
        juheRenwuId: item.id,
        kkh: item.kkh!,
        summary: item.kcmc || '课程',
        description,
        start_time: {
          datetime: startTime
        },
        end_time: {
          datetime: endTime
        },
        locations: [{ name: location }],
        reminders: [{ minutes: 15 }] // 提前15分钟提醒
      };
    });
  }

  /**
   * 格式化中文日期
   * @param dateStr 日期字符串 (2025-05-26 或 2025/05/26)
   * @returns 中文格式日期 (YYYY年MM月DD日)
   */
  private formatChineseDate(dateStr: string): string {
    try {
      if (!dateStr) return '未知日期';

      // 清理并标准化日期字符串
      let cleanDate = dateStr.includes(' ') ? dateStr.split(' ')[0] : dateStr;

      // 处理斜杠分隔的日期格式 2025/05/26 -> 2025-05-26
      if (cleanDate.includes('/')) {
        cleanDate = cleanDate.replace(/\//g, '-');
      }

      const date = parseISO(cleanDate);
      return format(date, 'yyyy年MM月dd日');
    } catch (error) {
      this.logger.warn('日期格式化失败', { dateStr, error });
      return dateStr || '未知日期';
    }
  }

  /**
   * 格式化节次信息
   * @param periods 节次字符串 (如 "7/8" 或 "1-2" 或 "1/2/3/4")
   * @returns 格式化的节次 (如 "第7-8节" 或 "第1-4节")
   */
  private formatPeriods(periods: string): string {
    if (!periods) return '未知节次';

    try {
      // 处理不同的节次格式
      let formattedPeriods = periods;

      if (periods.includes('/')) {
        // 处理斜杠分隔的节次格式
        const nums = periods
          .split('/')
          .map((n) => n.trim())
          .filter(Boolean);
        if (nums.length > 0) {
          // 转换为数字并排序
          const sortedNums = nums
            .map(Number)
            .filter((n) => !isNaN(n))
            .sort((a, b) => a - b);
          if (sortedNums.length > 0) {
            if (sortedNums.length === 1) {
              // 单节
              formattedPeriods = sortedNums[0].toString();
            } else if (sortedNums.length === 2) {
              // 两节
              formattedPeriods = `${sortedNums[0]}-${sortedNums[1]}`;
            } else {
              // 多节，取第一节到最后一节
              formattedPeriods = `${sortedNums[0]}-${sortedNums[sortedNums.length - 1]}`;
            }
          }
        }
      } else if (periods.includes(',')) {
        // "7,8" -> "7-8"
        const nums = periods.split(',').map((n) => n.trim());
        if (nums.length === 2) {
          formattedPeriods = `${nums[0]}-${nums[1]}`;
        }
      }

      return `${formattedPeriods}节`;
    } catch (error) {
      this.logger.warn('节次格式化失败', { periods, error });
      return `第${periods}节`;
    }
  }

  /**
   * 生成签到信息
   * @param item 课程数据
   * @returns 签到信息字符串
   */
  private generateAttendanceInfo(item: JuheRenwu): string {
    if (!item.sfdk || item.sfdk === '0') {
      return ''; // 不需要签到
    }

    // 这里可以根据实际需求生成签到URL
    // 目前提供一个占位符格式
    const attendanceUrl = this.generateAttendanceUrl(item);

    if (attendanceUrl) {
      return `\n\n📋 本节课需要签到\n🔗 ${attendanceUrl}`;
    } else {
      return `\n\n📋 本节课需要签到\n💡 请在上课时使用签到系统进行签到`;
    }
  }

  /**
   * 生成签到URL（占位符实现）
   * @param item 课程数据
   * @returns 签到URL或null
   */
  private generateAttendanceUrl(item: JuheRenwu): string | null {
    // 这里是一个示例实现，实际应用中需要根据具体的签到系统来生成URL
    if (item.id && item.kkh) {
      // 示例URL格式，实际使用时需要替换为真实的签到系统URL
      return `${this.attendanceUrl}/attendance/view?id=${this.generateUniqueId(item)}`;
    }
    return null;
  }

  /**
   * 构建描述信息（聚合数据）
   */
  private buildDescriptionFromAggregated(item: JuheRenwu): string {
    // 构建优化的描述信息
    const parts: string[] = [];

    // 教学周信息
    if (item.jxz) {
      parts.push(`📚 教学周: ${item.jxz}`);
    }

    // 时间信息 - 优化格式
    const chineseDate = this.formatChineseDate(item.rq!);
    const formattedPeriods = this.formatPeriods(item.jc_s!);
    parts.push(`🕐 时间: ${chineseDate} ${formattedPeriods}`);

    // 授课教师
    if (item.xm_s) {
      parts.push(`👨‍🏫 授课教师: ${item.xm_s}`);
    }

    // 基础描述
    const baseDescription = parts.join('\n');

    // 签到信息（如果需要）
    const attendanceInfo = this.generateAttendanceInfo(item);

    return baseDescription + attendanceInfo;
  }

  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      if (!this.juheRenwuRepository || !this.attendanceCoursesRepository) {
        return 'unhealthy';
      }
      return 'healthy';
    } catch (error) {
      this.logger.error('健康检查失败', {
        error: error instanceof Error ? error.message : String(error)
      });
      return 'unhealthy';
    }
  }
}
