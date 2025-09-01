// @stratix/icasync 获取标记的juhe_renwu记录处理器
// 用于增量同步工作流第二步，获取状态为'4'的juhe_renwu记录用于删除操作

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import { formatISO, parseISO } from 'date-fns';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { IAttendanceCoursesRepository } from '../repositories/AttendanceCoursesRepository.js';

/**
 * 获取标记记录配置接口
 */
export interface FetchMarkedJuheRenwuConfig {
  xnxq: string; // 学年学期
  status: string; // 要查询的状态（通常是'4'）
  includeScheduleInfo?: boolean; // 是否包含日程信息
  maxRecords?: number; // 最大记录数
  processAttendance?: boolean; // 是否处理打卡记录（默认true）
}

/**
 * 获取标记记录结果接口
 */
export interface FetchMarkedJuheRenwuResult {
  markedRecords: Array<{
    id: number;
    kkh: string;
    rq: string;
    start_time: string;
    end_time: string;
    summary: string;
    course_name: string;
    location?: string;
    teacher_names?: string;
    needs_attendance?: boolean; // 是否需要打卡
    external_id?: string; // 打卡记录的外部ID
  }>;
  totalCount: number;
  attendanceProcessed: {
    total: number;
    deleted: number;
    errors: number;
  };
  duration: number;
}

/**
 * 获取标记的juhe_renwu记录处理器
 */
@Executor({
  name: 'fetchMarkedJuheRenwuProcessor',
  description: '获取标记的juhe_renwu记录处理器 - 用于获取状态为4的记录',
  version: '1.0.0',
  tags: ['fetch', 'marked', 'juhe_renwu', 'incremental'],
  category: 'icasync'
})
export default class FetchMarkedJuheRenwuProcessor implements TaskExecutor {
  readonly name = 'fetchMarkedJuheRenwuProcessor';
  readonly description = '获取标记的juhe_renwu记录处理器';
  readonly version = '1.0.0';

  constructor(
    private juheRenwuRepository: IJuheRenwuRepository,
    private attendanceCoursesRepository: IAttendanceCoursesRepository,
    private logger: Logger
  ) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FetchMarkedJuheRenwuConfig;

    this.logger.info('开始获取标记的juhe_renwu记录', {
      xnxq: config.xnxq,
      status: config.status,
      maxRecords: config.maxRecords,
      processAttendance: config.processAttendance !== false
    });

    try {
      const result = await this.juheRenwuRepository.findByGxZt(config.status);

      if (!result.success) {
        return {
          success: false,
          error: result.error?.message || 'Failed to fetch marked records'
        };
      }

      const records = result.data || [];
      const attendanceProcessed = {
        total: 0,
        deleted: 0,
        errors: 0
      };

      const markedRecords = await Promise.all(
        records.map(async (record) => {
          // 使用与FetchSchedulesExecutor相同的时间处理方式
          const startTime = this.convertToRFC3339(
            this.formatTimeForDatabase(record.rq!, record.sj_f!)
          );
          const endTime = this.convertToRFC3339(
            this.formatTimeForDatabase(record.rq!, record.sj_t!)
          );

          // 使用与FetchSchedulesExecutor相同的地点信息构建方式
          const location = this.buildLocationFromAggregated(
            record.lq,
            record.room_s
          );

          // 判断是否需要打卡（根据sfdk字段）
          const needsAttendance = this.needsAttendance(record);
          let externalId: string | undefined;

          // 如果需要打卡且启用了打卡记录处理，则软删除对应的打卡记录
          if (needsAttendance && config.processAttendance !== false) {
            attendanceProcessed.total++;
            
            try {
              externalId = this.generateUniqueId(record);
              
              // 查找对应的打卡记录
              const attendanceResult = await this.attendanceCoursesRepository.findByExternalId(externalId);
              
              if (attendanceResult.success && attendanceResult.data) {
                // 软删除打卡记录
                const deleteResult = await this.attendanceCoursesRepository.softDeleteById(
                  attendanceResult.data.id,
                  'incremental-sync-system'
                );
                
                if (deleteResult.success && deleteResult.data) {
                  attendanceProcessed.deleted++;
                  this.logger.info('成功软删除打卡记录', {
                    externalId,
                    attendanceId: attendanceResult.data.id,
                    juheRenwuId: record.id
                  });
                } else {
                  attendanceProcessed.errors++;
                  this.logger.warn('软删除打卡记录失败', {
                    externalId,
                    attendanceId: attendanceResult.data.id,
                    error: deleteResult.success ? 'Soft delete returned false' : deleteResult.error
                  });
                }
              } else {
                this.logger.debug('未找到对应的打卡记录', {
                  externalId,
                  juheRenwuId: record.id
                });
              }
            } catch (error) {
              attendanceProcessed.errors++;
              this.logger.error('处理打卡记录时发生错误', {
                juheRenwuId: record.id,
                externalId,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }

          return {
            id: record.id,
            kkh: record.kkh,
            rq: record.rq,
            start_time: startTime,
            end_time: endTime,
            summary: record.kcmc || '课程', // 与FetchSchedulesExecutor保持一致的summary格式
            course_name: record.kcmc, // 映射课程名称字段
            location: location, // 映射位置字段（教学楼）
            teacher_names: record.xm_s, // 映射教师姓名字段
            needs_attendance: needsAttendance,
            external_id: externalId
          };
        })
      );

      const duration = Date.now() - startTime;

      this.logger.info('标记记录获取完成', {
        xnxq: config.xnxq,
        status: config.status,
        count: markedRecords.length,
        attendanceProcessed,
        duration
      });

      return {
        success: true,
        data: {
          items: markedRecords,
          totalCount: markedRecords.length,
          attendanceProcessed,
          duration
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('获取标记记录失败', {
        xnxq: config.xnxq,
        status: config.status,
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
   * 判断课程是否需要签到
   * 根据sfdk字段判断是否需要打卡
   */
  private needsAttendance(item: any): boolean {
    // 根据sfdk字段判断：有值且不为'0'表示需要签到
    return Boolean(item.sfdk && item.sfdk !== '0');
  }

  /**
   * 生成唯一ID
   * 使用 kkh + xnxq + jxz + zc + sjd 字段拼接生成external_id，去除特殊字符以便用于URL
   * 从 FetchSchedulesExecutor 复制的实现
   */
  private generateUniqueId(item: any): string {
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
   *
   * 从 FetchSchedulesExecutor 复制的实现
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
        cleanTime = `${timeParts[0].padStart(2, '0')}:${timeParts[1].padStart(
          2,
          '0'
        )}:00`;
      } else if (timeParts.length === 3) {
        // "11:25:00" -> 确保每个部分都是两位数
        cleanTime = `${timeParts[0].padStart(
          2,
          '0'
        )}:${timeParts[1].padStart(2, '0')}:${timeParts[2].padStart(2, '0')}`;
      } else if (timeParts.length === 1 && timeParts[0].length >= 3) {
        // 处理可能的紧凑格式如 "935" -> "09:35:00"
        const compactTime = timeParts[0].padStart(4, '0');
        cleanTime = `${compactTime.slice(0, 2)}:${compactTime.slice(
          2,
          4
        )}:00`;
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
   * 从 FetchSchedulesExecutor 复制的实现
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
   * 构建地点信息（聚合数据）
   * 从 FetchSchedulesExecutor 复制的实现
   */
  private buildLocationFromAggregated(
    lq?: string | null,
    room_s?: string | null
  ): string {
    const parts = [lq, room_s].filter(Boolean);
    return parts.length > 0 ? parts.join('') : '未知地点';
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
