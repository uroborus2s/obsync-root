// @stratix/icasync 日历同步工作流处理器
// 复合执行器，处理单个日历的完整同步流程，包括嵌套的参与者和日程处理

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { ICalendarSyncService } from '../services/CalendarSyncService.js';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';

/**
 * 日历同步工作流配置接口
 */
export interface CalendarSyncWorkflowConfig {
  xnxq: string; // 学年学期
  kkh: string; // 课程号
  calendarName?: string; // 日历名称
  forceSync?: boolean; // 是否强制同步
  syncSteps: string[]; // 同步步骤列表
  maxParticipants?: number; // 最大参与者数量
  maxSchedules?: number; // 最大日程数量
  timeout?: number; // 超时时间(ms)
}

/**
 * 同步步骤执行结果接口
 */
export interface SyncStepResult {
  step: string; // 步骤名称
  success: boolean; // 是否成功
  duration: number; // 执行时长(ms)
  data?: any; // 返回数据
  error?: string; // 错误信息
}

/**
 * 日历同步工作流结果接口
 */
export interface CalendarSyncWorkflowResult {
  success: boolean; // 整体是否成功
  kkh: string; // 课程号
  calendarId?: string; // 日历ID（如果创建成功）
  calendarName?: string; // 日历名称
  executedSteps: SyncStepResult[]; // 执行的步骤结果
  totalSteps: number; // 总步骤数
  successfulSteps: number; // 成功步骤数
  failedSteps: number; // 失败步骤数
  participantsCount: number; // 同步的参与者数量
  schedulesCount: number; // 同步的日程数量
  duration: number; // 总执行时长(ms)
  errors?: string[]; // 错误信息列表
}

/**
 * 日历同步工作流处理器
 *
 * 这是一个复合执行器，内部处理单个日历的完整同步流程：
 * 1. checkCalendarExists - 检查日历是否已存在
 * 2. createOrUpdateCalendar - 创建或更新日历
 * 3. fetchAndAddParticipants - 获取并添加参与者（内部嵌套循环）
 * 4. fetchAndAddSchedules - 获取并添加日程（内部嵌套循环）
 * 5. calendarSyncSummary - 日历同步汇总
 *
 * 特点：
 * - 支持配置化的执行步骤
 * - 自动处理嵌套循环（参与者和日程的并行添加）
 * - 详细的步骤执行统计和错误处理
 * - 支持部分失败的情况下继续执行
 */
@Executor({
  name: 'calendarSyncWorkflow',
  description: '日历同步工作流处理器 - 复合执行器，处理单日历完整同步流程',
  version: '3.0.0',
  tags: ['calendar', 'sync', 'workflow', 'composite', 'nested-loop', 'v3.0'],
  category: 'icasync'
})
export default class CalendarSyncWorkflowProcessor implements TaskExecutor {
  readonly name = 'calendarSyncWorkflow';
  readonly description = '日历同步工作流处理器';
  readonly version = '3.0.0';

  constructor(
    private calendarSyncService: ICalendarSyncService,
    private calendarMappingRepository: ICalendarMappingRepository,
    private logger: Logger
  ) {}

  /**
   * 执行日历同步工作流任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as CalendarSyncWorkflowConfig;

    this.logger.info('开始执行日历同步工作流', {
      xnxq: config.xnxq,
      kkh: config.kkh,
      calendarName: config.calendarName,
      syncSteps: config.syncSteps,
      forceSync: config.forceSync
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

      // 执行同步工作流
      const result = await this.performCalendarSyncWorkflow(config);

      result.duration = Date.now() - startTime;

      this.logger.info('日历同步工作流完成', {
        xnxq: config.xnxq,
        kkh: config.kkh,
        success: result.success,
        successfulSteps: result.successfulSteps,
        failedSteps: result.failedSteps,
        participantsCount: result.participantsCount,
        schedulesCount: result.schedulesCount,
        duration: result.duration
      });

      return {
        success: result.success,
        data: result,
        error: result.errors?.join('; ')
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('日历同步工作流失败', {
        xnxq: config.xnxq,
        kkh: config.kkh,
        duration,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        data: {
          success: false,
          kkh: config.kkh,
          calendarName: config.calendarName,
          executedSteps: [],
          totalSteps: config.syncSteps.length,
          successfulSteps: 0,
          failedSteps: 0,
          participantsCount: 0,
          schedulesCount: 0,
          duration,
          errors: [error instanceof Error ? error.message : String(error)]
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: CalendarSyncWorkflowConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config.xnxq) {
      return { valid: false, error: '学年学期参数(xnxq)不能为空' };
    }

    if (!config.kkh) {
      return { valid: false, error: '课程号参数(kkh)不能为空' };
    }

    if (!config.syncSteps || config.syncSteps.length === 0) {
      return { valid: false, error: '同步步骤列表(syncSteps)不能为空' };
    }

    // 验证步骤名称
    const validSteps = [
      'checkCalendarExists',
      'createOrUpdateCalendar',
      'fetchAndAddParticipants',
      'fetchAndAddSchedules',
      'calendarSyncSummary'
    ];

    for (const step of config.syncSteps) {
      if (!validSteps.includes(step)) {
        return { valid: false, error: `无效的同步步骤: ${step}` };
      }
    }

    return { valid: true };
  }

  /**
   * 执行日历同步工作流
   */
  private async performCalendarSyncWorkflow(
    config: CalendarSyncWorkflowConfig
  ): Promise<CalendarSyncWorkflowResult> {
    const result: CalendarSyncWorkflowResult = {
      success: false,
      kkh: config.kkh,
      calendarName: config.calendarName,
      executedSteps: [],
      totalSteps: config.syncSteps.length,
      successfulSteps: 0,
      failedSteps: 0,
      participantsCount: 0,
      schedulesCount: 0,
      duration: 0,
      errors: []
    };

    let currentCalendarId: string | undefined;

    // 逐步执行同步步骤
    for (const step of config.syncSteps) {
      const stepStartTime = Date.now();
      
      try {
        this.logger.info('开始执行同步步骤', {
          step,
          kkh: config.kkh,
          xnxq: config.xnxq
        });

        const stepResult = await this.executeStep(
          step,
          config,
          currentCalendarId
        );

        const stepDuration = Date.now() - stepStartTime;

        // 记录步骤结果
        const stepResultRecord: SyncStepResult = {
          step,
          success: stepResult.success,
          duration: stepDuration,
          data: stepResult.data,
          error: stepResult.error
        };

        result.executedSteps.push(stepResultRecord);

        if (stepResult.success) {
          result.successfulSteps++;
          
          // 更新相关计数器
          if (step === 'createOrUpdateCalendar' && stepResult.data?.calendarId) {
            currentCalendarId = stepResult.data.calendarId;
            result.calendarId = currentCalendarId;
            result.calendarName = stepResult.data.calendarName || config.calendarName;
          } else if (step === 'fetchAndAddParticipants' && stepResult.data?.addedCount) {
            result.participantsCount = stepResult.data.addedCount;
          } else if (step === 'fetchAndAddSchedules' && stepResult.data?.addedCount) {
            result.schedulesCount = stepResult.data.addedCount;
          }

          this.logger.info('同步步骤执行成功', {
            step,
            kkh: config.kkh,
            duration: stepDuration,
            data: stepResult.data
          });
        } else {
          result.failedSteps++;
          const errorMsg = stepResult.error || `步骤 ${step} 执行失败`;
          result.errors?.push(errorMsg);

          this.logger.error('同步步骤执行失败', {
            step,
            kkh: config.kkh,
            duration: stepDuration,
            error: errorMsg
          });

          // 根据步骤的重要性决定是否继续
          if (this.isStepCritical(step)) {
            this.logger.error('关键步骤失败，终止工作流执行', {
              step,
              kkh: config.kkh
            });
            break;
          }
        }
      } catch (error) {
        const stepDuration = Date.now() - stepStartTime;
        const errorMsg = error instanceof Error ? error.message : String(error);
        
        result.failedSteps++;
        result.errors?.push(`步骤 ${step} 异常: ${errorMsg}`);
        
        result.executedSteps.push({
          step,
          success: false,
          duration: stepDuration,
          error: errorMsg
        });

        this.logger.error('同步步骤执行异常', {
          step,
          kkh: config.kkh,
          duration: stepDuration,
          error: errorMsg
        });

        // 关键步骤异常时终止执行
        if (this.isStepCritical(step)) {
          break;
        }
      }
    }

    // 判断整体成功性：至少关键步骤都成功
    result.success = result.failedSteps === 0 || this.hasAllCriticalStepsSucceeded(result.executedSteps);

    return result;
  }

  /**
   * 执行单个同步步骤
   */
  private async executeStep(
    step: string,
    config: CalendarSyncWorkflowConfig,
    currentCalendarId?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    switch (step) {
      case 'checkCalendarExists':
        return this.executeCheckCalendarExists(config);
      
      case 'createOrUpdateCalendar':
        return this.executeCreateOrUpdateCalendar(config);
      
      case 'fetchAndAddParticipants':
        return this.executeFetchAndAddParticipants(config, currentCalendarId);
      
      case 'fetchAndAddSchedules':
        return this.executeFetchAndAddSchedules(config, currentCalendarId);
      
      case 'calendarSyncSummary':
        return this.executeCalendarSyncSummary(config, currentCalendarId);
      
      default:
        return {
          success: false,
          error: `未知的同步步骤: ${step}`
        };
    }
  }

  /**
   * 执行检查日历是否存在步骤
   */
  private async executeCheckCalendarExists(
    config: CalendarSyncWorkflowConfig
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const mappingResult = await this.calendarMappingRepository.findByKkhAndXnxq(
        config.kkh,
        config.xnxq
      );

      if (!mappingResult.success) {
        return {
          success: false,
          error: String(mappingResult.error) || '查询日历映射失败'
        };
      }

      const exists = mappingResult.data !== null;
      
      return {
        success: true,
        data: {
          exists,
          mapping: mappingResult.data,
          shouldUpdate: exists && config.forceSync
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 执行创建或更新日历步骤
   */
  private async executeCreateOrUpdateCalendar(
    config: CalendarSyncWorkflowConfig
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const syncResult = await this.calendarSyncService.createCourseCalendar(
        config.kkh,
        config.xnxq,
        {
          batchSize: 1,
          timeout: 30000
        }
      );

      const success = syncResult.successCount > 0;
      if (!success) {
        return {
          success: false,
          error: syncResult.errors.join('; ') || '创建日历失败'
        };
      }

      return {
        success: true,
        data: {
          calendarId: syncResult.createdCalendarIds[0] || `calendar-${config.kkh}`,
          calendarName: config.calendarName || `课程-${config.kkh}`,
          created: true,
          updated: false
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 执行获取并添加参与者步骤（嵌套循环）
   */
  private async executeFetchAndAddParticipants(
    config: CalendarSyncWorkflowConfig,
    calendarId?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!calendarId) {
      return {
        success: false,
        error: '日历ID为空，无法添加参与者'
      };
    }

    try {
      const participantsResult = await this.calendarSyncService.syncCalendarParticipants(
        calendarId,
        config.kkh
      );

      const success = participantsResult.addedCount >= 0; // 成功条件
      if (!success) {
        return {
          success: false,
          error: participantsResult.errors.join('; ') || '添加参与者失败'
        };
      }

      return {
        success: true,
        data: {
          addedCount: participantsResult.addedCount,
          updatedCount: 0,
          removedCount: participantsResult.removedCount,
          totalParticipants: participantsResult.addedCount + participantsResult.removedCount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 执行获取并添加日程步骤（嵌套循环）
   */
  private async executeFetchAndAddSchedules(
    config: CalendarSyncWorkflowConfig,
    calendarId?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!calendarId) {
      return {
        success: false,
        error: '日历ID为空，无法添加日程'
      };
    }

    try {
      const schedulesResult = await this.calendarSyncService.createCourseSchedules(
        calendarId,
        config.kkh
      );

      const success = schedulesResult.successCount >= 0;
      if (!success) {
        return {
          success: false,
          error: schedulesResult.errors.join('; ') || '添加日程失败'
        };
      }

      return {
        success: true,
        data: {
          addedCount: schedulesResult.successCount,
          updatedCount: 0,
          removedCount: 0,
          totalSchedules: schedulesResult.successCount
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 执行日历同步汇总步骤
   */
  private async executeCalendarSyncSummary(
    config: CalendarSyncWorkflowConfig,
    calendarId?: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // 生成同步汇总信息
      const summary = {
        kkh: config.kkh,
        xnxq: config.xnxq,
        calendarId,
        calendarName: config.calendarName,
        syncTime: new Date().toISOString(),
        forceSync: config.forceSync
      };

      return {
        success: true,
        data: summary
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * 判断步骤是否为关键步骤
   */
  private isStepCritical(step: string): boolean {
    // 创建日历是关键步骤，失败后无法继续
    return step === 'createOrUpdateCalendar';
  }

  /**
   * 判断所有关键步骤是否都成功
   */
  private hasAllCriticalStepsSucceeded(executedSteps: SyncStepResult[]): boolean {
    const criticalSteps = ['createOrUpdateCalendar'];
    
    for (const criticalStep of criticalSteps) {
      const stepResult = executedSteps.find(s => s.step === criticalStep);
      if (stepResult && !stepResult.success) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查依赖的服务和仓储是否可用
      if (!this.calendarSyncService || !this.calendarMappingRepository) {
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