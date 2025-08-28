/**
 * 获取课程日程执行器
 *
 * 功能：
 * 1. 根据开课号(kkh)从 juhe_renwu 表查询所有相关联的日程记录
 * 2. 将聚合后的课程数据转换为WPS日程格式
 * 3. 将查询到的日程按每组200个进行分组
 */

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
}

/**
 * 获取日程配置接口
 */
export interface FetchSchedulesConfig {
  /** 开课号 */
  kkh: string;
  /** 每组日程数量，默认200 */
  batch_size?: number;
  /** 时区，默认Asia/Shanghai */
  time_zone?: string;
}

/**
 * 获取日程结果接口
 */
export interface FetchSchedulesResult {
  /** 开课号 */
  kkh: string;
  /** 总日程数量 */
  total_schedules: number;
  /** 分组数量 */
  batch_count: number;
  /** 每组日程数量 */
  batch_size: number;
  /** 分组结果：每组包含日程数组 */
  items: { schedules: WpsScheduleData[] }[];
  /** 错误信息 */
  error?: string;
  /** 执行时长(ms) */
  duration: number;
}

/**
 * 获取课程日程执行器
 */
@Executor({
  name: 'fetchSchedules',
  description: '获取课程日程执行器 - 根据开课号查询课程日程并分组',
  version: '1.0.0',
  tags: ['fetch', 'schedules', 'course', 'group'],
  category: 'icasync'
})
export default class FetchSchedulesExecutor implements TaskExecutor {
  readonly name = 'fetchSchedules';

  static [RESOLVER] = {
    injector: (container: AwilixContainer) => {
      const config = container.resolve('config');
      return {
        attendanceUrl: config.attendanceUrl || 'http://localost:3000'
      };
    }
  };

  constructor(
    private juheRenwuRepository: IJuheRenwuRepository,
    private attendanceCoursesRepository: IAttendanceCoursesRepository,
    private logger: Logger,
    private attendanceUrl: string
  ) {}

  /**
   * 执行获取日程任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FetchSchedulesConfig;

    try {
      // 1. 验证输入参数
      const validationResult = this.validateInputParameters(config);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error,
          duration: Date.now() - startTime
        };
      }

      const { kkh, batch_size = 99, time_zone = 'Asia/Shanghai' } = config;

      this.logger.info(`开始获取课程日程，开课号: ${kkh}`);

      // 2. 查询课程原始数据
      const courseDataResult = await this.getCourseDataByKkh(kkh);
      if (!courseDataResult.success) {
        return {
          success: false,
          error: `查询课程数据失败: ${courseDataResult.error}`,
          duration: Date.now() - startTime
        };
      }

      const courseData = courseDataResult.data!;
      this.logger.info(`查询到 ${courseData.length} 条课程数据`);

      // 3. 处理签到课程数据（如果需要签到）
      await this.processAttendanceCourses(courseData);

      // 4. 转换为WPS日程格式
      const schedules = this.convertToWpsSchedules(courseData);
      this.logger.info(`转换为 ${schedules.length} 个日程`);

      // 5. 将日程按批次分组
      const batches = this.groupSchedules(schedules, batch_size);
      this.logger.info(
        `日程分为 ${batches.length} 个批次，每批最多 ${batch_size} 个`
      );

      // 5. 构造返回结果
      const result: FetchSchedulesResult = {
        kkh,
        total_schedules: schedules.length,
        batch_count: batches.length,
        batch_size,
        items: batches.map((batch) => ({
          schedules: batch
        })),
        duration: Date.now() - startTime
      };

      this.logger.info(`获取课程日程完成`, {
        kkh,
        total: schedules.length,
        batches: batches.length
      });

      return {
        success: true,
        data: result,
        duration: result.duration
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('执行获取日程任务失败', {
        config,
        error: errorMessage
      });

      return {
        success: false,
        error: `执行失败: ${errorMessage}`,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 验证输入参数
   */
  private validateInputParameters(config: FetchSchedulesConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config) {
      return { valid: false, error: '配置参数不能为空' };
    }

    if (!config.kkh || typeof config.kkh !== 'string') {
      return { valid: false, error: '开课号(kkh)必须是非空字符串' };
    }

    // 验证开课号格式
    if (config.kkh.length < 3 || config.kkh.length > 100) {
      return {
        valid: false,
        error: '开课号长度应在3-20个字符之间'
      };
    }

    // 验证批次大小
    if (
      config.batch_size &&
      (config.batch_size < 1 || config.batch_size > 200)
    ) {
      return {
        valid: false,
        error: '批次大小应在1-200之间'
      };
    }

    return { valid: true };
  }

  /**
   * 根据开课号查询聚合课程数据
   * 只查询未处理的课程（gx_zt = '0'）且包含必要字段的数据
   */
  private async getCourseDataByKkh(kkh: string) {
    try {
      this.logger.debug('查询未处理的聚合课程数据', { kkh });

      const result = await this.juheRenwuRepository.findByKkh(kkh);
      if (!result.success) {
        this.logger.warn('查询聚合课程数据失败', {
          kkh,
          error: result.error
        });
        return {
          success: false,
          error: result.error
        };
      }

      this.logger.debug('未处理的聚合课程数据查询完成', {
        kkh,
        count: result.data!.length,
        note: '数据库层面已过滤：未处理(gx_zt=0)且包含必要字段'
      });

      return {
        success: true,
        data: result.data!
      };
    } catch (error) {
      this.logger.error('查询聚合课程数据异常', { kkh, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 处理签到课程数据
   * 为需要签到的课程创建签到记录
   */
  private async processAttendanceCourses(
    courseData: JuheRenwu[]
  ): Promise<void> {
    try {
      this.logger.info(`开始处理签到课程数据，共 ${courseData.length} 条记录`);

      // 过滤需要签到的课程（这里可以根据业务规则判断）
      const attendanceCourses = courseData.filter((item) =>
        this.needsAttendance(item)
      );

      if (attendanceCourses.length === 0) {
        this.logger.info('没有需要签到的课程');
        return;
      }

      this.logger.info(`发现 ${attendanceCourses.length} 个需要签到的课程`);

      // 批量创建签到课程记录，包含冲突检测
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
        return;
      }

      // 批量插入签到课程记录
      const result =
        await this.attendanceCoursesRepository.createBatch(
          newAttendanceCourses
        );

      if (result.success) {
        this.logger.info(`成功创建 ${result.data!.length} 条签到课程记录`);
      } else {
        this.logger.error('创建签到课程记录失败', { error: result.error });
      }
    } catch (error) {
      this.logger.error('处理签到课程数据异常', { error });
      // 不抛出错误，允许日程创建继续进行
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
   * @param dateStr 日期字符串 (YYYY-MM-DD)
   * @param timeStr 时间字符串 (HH:mm:ss)
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

  /**
   * 将日程按指定大小分组
   */
  private groupSchedules(
    schedules: ScheduleData[],
    batchSize: number
  ): ScheduleData[][] {
    const batches: ScheduleData[][] = [];

    for (let i = 0; i < schedules.length; i += batchSize) {
      batches.push(schedules.slice(i, i + batchSize));
    }

    this.logger.debug('日程分组完成', {
      total: schedules.length,
      batchSize,
      batchCount: batches.length,
      batchSizes: batches.map((batch) => batch.length)
    });

    return batches;
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      // 检查依赖服务是否可用
      if (!this.juheRenwuRepository || !this.attendanceCoursesRepository) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}
