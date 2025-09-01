// @stratix/icasync 创建单个日程处理器
// 用于增量同步工作流中创建单个WPS日程的处理器

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import { WpsCalendarAdapter, WpsScheduleAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type { ICourseRawRepository } from '../repositories/CourseRawRepository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { IScheduleMappingRepository } from '../repositories/ScheduleMappingRepository.js';
import type { ICalendarSyncService } from '../services/CalendarSyncService.js';

/**
 * 创建单个日程配置接口
 * 继承ScheduleData并添加必要的字段
 */
export interface CreateSingleScheduleData {
  kkh: string; // 开课号
  juheRenwuId: number; // 聚合任务ID
  startTime: string; // 开始时间
  endTime: string; // 结束时间
  location: { name: string }[]; // 地点
  reminders?: number; // 提醒设置
  summary: string; // 日程标题
  description?: string; // 日程描述
  dryRun?: boolean; // 是否为测试运行
}

/**
 * 创建单个日程结果接口
 */
export interface CreateSingleScheduleResult {
  juheRenwuId: number; // 聚合任务ID
  kkh: string; // 开课号
  calendarId?: string; // 日历ID
  scheduleId?: string; // 创建的日程ID
  createOperations: {
    calendarFound: boolean; // 是否找到对应日历
    calendarCreated: boolean; // 是否自动创建了日历
    wpsScheduleCreated: boolean; // WPS日程是否创建成功
    mappingCreated: boolean; // 映射记录是否创建成功
    juheRenwuUpdated: boolean; // juhe_renwu状态是否更新成功
    originalRecordsUpdated: boolean; // 原始记录状态是否更新成功
  };
  duration: number; // 执行时长(ms)
  dryRun: boolean; // 是否为测试运行
  error?: string; // 错误信息
}

/**
 * 创建单个日程处理器
 *
 * 功能：
 * 1. 根据kkh获取对应的日历ID
 * 2. 根据juhe_renwu记录信息创建WPS日程
 * 3. 创建schedule_mapping映射记录
 * 4. 更新juhe_renwu状态为'1'（已同步）
 * 5. 更新对应的u_jw_kcb_cur原始记录状态
 *
 * 这是增量同步工作流第四步的子节点处理器
 */
@Executor({
  name: 'createSingleScheduleProcessor',
  description: '创建单个日程处理器 - 用于增量同步中创建单个WPS日程',
  version: '1.0.0',
  tags: ['create', 'schedule', 'single', 'incremental'],
  category: 'icasync'
})
export default class CreateSingleScheduleProcessor implements TaskExecutor {
  readonly name = 'createSingleScheduleProcessor';
  readonly description = '创建单个日程处理器';
  readonly version = '1.0.0';

  constructor(
    private scheduleMappingRepository: IScheduleMappingRepository,
    private juheRenwuRepository: IJuheRenwuRepository,
    private calendarMappingRepository: ICalendarMappingRepository,
    private courseRawRepository: ICourseRawRepository,
    private calendarSyncService: ICalendarSyncService,
    private logger: Logger,
    private wasV7ApiSchedule: WpsScheduleAdapter,
    private wasV7ApiCalendar: WpsCalendarAdapter
  ) {}

  /**
   * 执行创建单个日程任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as CreateSingleScheduleData;

    this.logger.info('开始执行创建单个日程任务', {
      juheRenwuId: config.juheRenwuId,
      summary: config.summary
    });

    try {
      // 验证配置
      const validation = this.validateConfig(config);
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }

      // 执行创建单个日程
      const result = await this.performCreateSingleSchedule(config);

      result.duration = Date.now() - startTime;

      this.logger.info('创建单个日程任务完成', {
        juheRenwuId: config.juheRenwuId,
        calendarId: result.calendarId,
        scheduleId: result.scheduleId,
        createOperations: result.createOperations,
        duration: result.duration,
        dryRun: result.dryRun,
        success: !result.error
      });

      return {
        success: !result.error,
        data: result,
        error: result.error
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('创建单个日程任务失败', {
        juheRenwuId: config.juheRenwuId,
        duration,
        error: errorMessage
      });

      return {
        success: false,
        error: errorMessage,
        data: {
          juheRenwuId: config.juheRenwuId,
          createOperations: {
            calendarFound: false,
            wpsScheduleCreated: false,
            mappingCreated: false,
            juheRenwuUpdated: false,
            originalRecordsUpdated: false
          },
          duration,
          dryRun: (context.config as any).dryRun || false,
          error: errorMessage
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: CreateSingleScheduleData): {
    valid: boolean;
    error?: string;
  } {
    if (!config.juheRenwuId || config.juheRenwuId <= 0) {
      return { valid: false, error: '聚合任务ID不能为空且必须为正数' };
    }

    if (!config.kkh) {
      return { valid: false, error: '开课号不能为空' };
    }

    if (!config.summary) {
      return { valid: false, error: '课程名称不能为空' };
    }

    if (!config.startTime || !config.endTime) {
      return { valid: false, error: '开始时间和结束时间不能为空' };
    }

    return { valid: true };
  }

  /**
   * 执行创建单个日程
   */
  private async performCreateSingleSchedule(
    config: CreateSingleScheduleData
  ): Promise<CreateSingleScheduleResult> {
    let calendarId: string | undefined;
    let scheduleId: string | undefined;

    const createOperations = {
      calendarFound: false,
      calendarCreated: false,
      wpsScheduleCreated: false,
      mappingCreated: false,
      juheRenwuUpdated: false,
      originalRecordsUpdated: false
    };

    let error: string | undefined;

    try {
      this.logger.debug('开始创建单个日程', {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh,
        dryRun: config.dryRun || false
      });

      // 1. 查找日历映射获取日历ID，如果不存在则自动创建
      const calendarMappingResult =
        await this.calendarMappingRepository.findByKkh(config.kkh);
      if (!calendarMappingResult.success || !calendarMappingResult.data) {
        this.logger.info(
          `未找到开课号${config.kkh}对应的日历映射，开始自动创建日历`,
          {
            juheRenwuId: config.juheRenwuId,
            kkh: config.kkh
          }
        );

        // 自动创建日历和映射关系
        const autoCreateResult =
          await this.autoCreateCalendarAndMapping(config);
        if (autoCreateResult.success) {
          calendarId = autoCreateResult.calendarId;
          createOperations.calendarCreated = true;
          createOperations.mappingCreated = true;
          this.logger.info('自动创建日历和映射关系成功', {
            juheRenwuId: config.juheRenwuId,
            kkh: config.kkh,
            calendarId
          });
        } else {
          const errorMsg = `自动创建日历失败: ${autoCreateResult.error}`;
          this.logger.error(errorMsg, {
            juheRenwuId: config.juheRenwuId,
            kkh: config.kkh
          });
          error = errorMsg;
        }
      } else {
        calendarId = calendarMappingResult.data.calendar_id;
        createOperations.calendarFound = true;
        this.logger.debug('找到日历映射', {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          calendarId
        });
      }

      // 如果没有找到日历，无法继续创建日程
      if (!calendarId) {
        return {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          createOperations,
          duration: 0,
          dryRun: config.dryRun || false,
          error
        };
      }

      // 2. 创建WPS日程
      if (!config.dryRun) {
        try {
          const createScheduleParams = {
            calendar_id: calendarId,
            summary: config.summary,
            description: config.description,
            start_time: { datetime: config.startTime },
            end_time: { datetime: config.endTime },
            locations: config.location || [],
            reminders: [{ minutes: config.reminders || 15 }] // 提前15分钟提醒
          };

          const scheduleListResult =
            await this.wasV7ApiSchedule.getScheduleList({
              calendar_id: calendarId,
              start_time: config.startTime,
              end_time: config.endTime
            });
          const scheduleList = scheduleListResult.items;
          if (
            !scheduleList.some(
              (schedule) => schedule.summary === config.summary
            )
          ) {
            const createScheduleResult =
              await this.wasV7ApiSchedule.createSchedule(createScheduleParams);
            if (createScheduleResult && createScheduleResult.id) {
              scheduleId = createScheduleResult.id;
              createOperations.wpsScheduleCreated = true;
              this.logger.debug('WPS日程创建成功', {
                juheRenwuId: config.juheRenwuId,
                kkh: config.kkh,
                calendarId,
                scheduleId
              });
            } else {
              const errorMsg = `创建WPS日程失败: 未返回有效的日程ID`;
              this.logger.error(errorMsg, {
                juheRenwuId: config.juheRenwuId,
                kkh: config.kkh,
                calendarId
              });
              if (!error) error = errorMsg;
            }
          } else {
            scheduleId = scheduleList.find(
              (schedule) => schedule.summary === config.summary
            )?.id;
            createOperations.wpsScheduleCreated = true;
          }
        } catch (createError) {
          const errorMsg = `创建WPS日程异常: ${createError instanceof Error ? createError.message : String(createError)}`;
          this.logger.error(errorMsg, {
            juheRenwuId: config.juheRenwuId,
            kkh: config.kkh,
            calendarId
          });
          if (!error) error = errorMsg;
        }
      } else {
        // 测试运行：模拟生成日程ID
        scheduleId = `test-schedule-${config.juheRenwuId}`;
        createOperations.wpsScheduleCreated = true;
        this.logger.debug('[测试运行] 模拟创建WPS日程', {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          calendarId,
          scheduleId
        });
      }

      // 3. 创建映射记录（如果日程创建成功）
      if (scheduleId && !config.dryRun) {
        const updateJuheRenwuResult = await this.updateJuheRenwuStatus(
          config.juheRenwuId,
          '1'
        );
        createOperations.juheRenwuUpdated = updateJuheRenwuResult;

        const updateOriginalResult = await this.updateOriginalRecords(
          config.juheRenwuId
        );
        createOperations.originalRecordsUpdated = updateOriginalResult;

        return {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          calendarId,
          scheduleId,
          createOperations,
          duration: 0, // 将在上层设置
          dryRun: config.dryRun || false,
          error
        };
      }

      // 默认返回结果（如果没有创建日程）
      return {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh,
        calendarId,
        scheduleId,
        createOperations,
        duration: 0,
        dryRun: config.dryRun || false,
        error
      };
    } catch (processError) {
      const errorMsg = `处理创建单个日程时发生错误: ${processError instanceof Error ? processError.message : String(processError)}`;
      this.logger.error(errorMsg, {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh || 'unknown-kkh'
      });

      return {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh || 'unknown-kkh',
        calendarId,
        scheduleId,
        createOperations,
        duration: 0,
        dryRun: config.dryRun || false,
        error: errorMsg
      };
    }
  }

  /**
   * 更新juhe_renwu记录状态
   */
  private async updateJuheRenwuStatus(
    juheRenwuId: number,
    newStatus: string
  ): Promise<boolean> {
    try {
      const updateResult = await this.juheRenwuRepository.updateGxZtById(
        juheRenwuId,
        newStatus
      );
      if (updateResult.success) {
        this.logger.debug('juhe_renwu状态更新成功', {
          juheRenwuId,
          newStatus
        });
        return true;
      } else {
        this.logger.error('juhe_renwu状态更新失败', {
          juheRenwuId,
          newStatus,
          error: updateResult.error
        });
        return false;
      }
    } catch (error) {
      this.logger.error('更新juhe_renwu状态时发生异常', {
        juheRenwuId,
        newStatus,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 更新对应的u_jw_kcb_cur原始记录状态
   */
  private async updateOriginalRecords(juheRenwuId: number): Promise<boolean> {
    try {
      const updateResult =
        await this.courseRawRepository.updateOriginalCoursesByJuheRenwuIds(
          [juheRenwuId],
          '1' // 设置为已处理
        );

      if (updateResult.success) {
        this.logger.debug('原始记录状态更新成功', {
          juheRenwuId,
          updatedCount: updateResult.data
        });
        return updateResult.data > 0;
      } else {
        this.logger.error('原始记录状态更新失败', {
          juheRenwuId,
          error: updateResult.error
        });
        return false;
      }
    } catch (error) {
      this.logger.error('更新原始记录状态时发生异常', {
        juheRenwuId,
        error: error instanceof Error ? error.message : String(error)
      });
      return false;
    }
  }

  /**
   * 健康检查
   */
  /**
   * 自动创建日历和映射关系
   * 当找不到对应的日历映射时，自动创建新日历并建立映射关系
   */
  private async autoCreateCalendarAndMapping(
    config: CreateSingleScheduleData
  ): Promise<{ success: boolean; calendarId?: string; error?: string }> {
    try {
      this.logger.info('开始自动创建日历', {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh,
        courseName: config.summary
      });

      // 1. 构建日历信息
      const calendarName = `${config.summary}`;
      // 2. 调用WPS API创建日历
      if (!config.dryRun) {
        const createCalendarResult = await this.wasV7ApiCalendar.createCalendar(
          { summary: `${config.summary}` }
        );

        if (!createCalendarResult || !createCalendarResult.id) {
          return {
            success: false,
            error: '调用WPS API创建日历失败：未返回有效的日历ID'
          };
        }

        const calendarId = createCalendarResult.id;

        // 3. 获取juhe_renwu记录以获取xnxq信息
        const juheRenwuResult = await this.juheRenwuRepository.findByIdNullable(
          config.juheRenwuId
        );
        if (!juheRenwuResult.success || !juheRenwuResult.data) {
          return {
            success: false,
            error: `无法获取juhe_renwu记录(ID: ${config.juheRenwuId})以获取学年学期信息`
          };
        }

        const xnxq = juheRenwuResult.data.xnxq || 'unknown';

        // 4. 在事务中创建映射关系
        const mappingData = {
          kkh: config.kkh,
          xnxq: xnxq,
          calendar_id: calendarId,
          calendar_name: calendarName
        };

        const mappingResult =
          await this.calendarMappingRepository.create(mappingData);

        if (!mappingResult.success) {
          this.logger.error('创建日历映射失败，需要手动清理日历', {
            calendarId,
            kkh: config.kkh,
            error: mappingResult.error
          });
          return {
            success: false,
            error: `创建日历映射失败: ${mappingResult.error?.message}`
          };
        }

        this.logger.info('自动创建日历和映射关系成功', {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          calendarId,
          calendarName
        });

        return {
          success: true,
          calendarId
        };
      } else {
        // 测试运行：模拟创建日历
        const mockCalendarId = `test-calendar-${config.kkh}`;

        this.logger.info('[测试运行] 模拟创建日历和映射关系', {
          juheRenwuId: config.juheRenwuId,
          kkh: config.kkh,
          calendarId: mockCalendarId,
          calendarName
        });

        return {
          success: true,
          calendarId: mockCalendarId
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('自动创建日历异常', {
        juheRenwuId: config.juheRenwuId,
        kkh: config.kkh,
        error: errorMessage
      });

      return {
        success: false,
        error: `自动创建日历异常: ${errorMessage}`
      };
    }
  }

  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查所有依赖服务是否可用
      if (
        !this.scheduleMappingRepository ||
        !this.juheRenwuRepository ||
        !this.calendarMappingRepository ||
        !this.courseRawRepository ||
        !this.calendarSyncService
      ) {
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
