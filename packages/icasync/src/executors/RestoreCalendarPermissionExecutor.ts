/**
 * 日历权限恢复执行器
 *
 * 功能：
 * 1. 根据课程号(kkh)查询对应的日历ID
 * 2. 调用WPS API为用户添加日历访问权限
 * 3. 根据用户类型设置不同的权限级别（学生：reader，教师：writer）
 * 4. 这是课表恢复工作流的循环子节点执行器
 */

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import type { IPermissionStatusRepository } from '../repositories/PermissionStatusRepository.js';
import type { PermissionRestoreResult } from '../types/database.js';

/**
 * 验证结果接口
 */
interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * 权限恢复配置接口
 */
export interface RestorePermissionConfig {
  /** 开课号 */
  kkh: string;
  /** 课程编号 */
  kcbh?: string;
  /** 学年学期 */
  xnxq?: string;
  /** 学号或工号 */
  xgh: string;
  /** 是否为测试运行模式 */
  dryRun?: boolean;
  /** 重试次数 */
  maxRetries?: number;
}

/**
 * 日历权限恢复执行器
 *
 * 功能：
 * 1. 根据开课号查找对应的日历ID
 * 2. 调用WPS API添加用户权限
 * 3. 学生设置为reader权限，教师设置为writer权限
 * 4. 更新权限状态记录
 */
@Executor({
  name: 'restoreCalendarPermissionExecutor',
  description: '日历权限恢复执行器 - 为用户恢复日历访问权限',
  version: '1.0.0',
  tags: ['calendar', 'permission', 'restore', 'wps'],
  category: 'icasync'
})
export default class RestoreCalendarPermissionExecutor implements TaskExecutor {
  readonly name = 'restoreCalendarPermissionExecutor';
  readonly description = '日历权限恢复执行器';
  readonly version = '1.0.0';

  constructor(
    private calendarMappingRepository: ICalendarMappingRepository,
    private permissionStatusRepository: IPermissionStatusRepository,
    private wasV7ApiCalendar: WpsCalendarAdapter,
    private logger: Logger
  ) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const config = context.config as RestorePermissionConfig;

    this.logger.info('开始执行日历权限恢复', {
      xgh: config.xgh,
      kkh: config.kkh,
      dryRun: config.dryRun
    });

    try {
      // 验证输入参数
      this.internalValidateConfig(config);

      // 查找日历ID
      const calendarId = await this.findCalendarId(config.kkh);
      if (!calendarId) {
        const error = `未找到开课号 ${config.kkh} 对应的日历`;
        this.logger.warn(error, {
          kkh: config.kkh,
          xgh: config.xgh
        });

        return {
          success: false,
          data: {
            kkh: config.kkh,
            success: false,
            error
          }
        };
      }

      // 恢复权限
      const restoreResult = await this.restorePermission(config, calendarId);

      this.logger.info('日历权限恢复完成', {
        xgh: config.xgh,
        kkh: config.kkh,
        calendarId,
        success: restoreResult.success,
        dryRun: config.dryRun
      });

      return {
        success: true,
        data: restoreResult
      };
    } catch (error) {
      this.logger.error('日历权限恢复失败', {
        xgh: config.xgh,
        kkh: config.kkh,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        success: false,
        data: {
          kkh: config.kkh,
          success: false,
          error: error instanceof Error ? error.message : '权限恢复失败'
        }
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: RestorePermissionConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.xgh || config.xgh.trim().length === 0) {
      errors.push('学号或工号不能为空');
    }

    if (!config.kkh || config.kkh.trim().length === 0) {
      errors.push('开课号不能为空');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 内部验证配置（抛出异常）
   */
  private internalValidateConfig(config: RestorePermissionConfig): void {
    const result = this.validateConfig(config);
    if (!result.valid && result.errors) {
      throw new Error(result.errors.join('; '));
    }
  }

  /**
   * 查找日历ID
   */
  private async findCalendarId(kkh: string): Promise<string | null> {
    this.logger.debug('查找日历ID', { kkh });

    const result = await this.calendarMappingRepository.findByKkh(kkh);
    if (!result.success) {
      this.logger.error('查询日历映射失败', {
        kkh,
        error: result.error
      });
      return null;
    }

    this.logger.debug('找到日历ID', {
      kkh,
      calendarId: result.data?.calendar_id
    });

    return result.data?.calendar_id || null;
  }

  /**
   * 恢复权限
   */
  private async restorePermission(
    config: RestorePermissionConfig,
    calendarId: string
  ): Promise<PermissionRestoreResult> {
    const { xgh, kkh, dryRun } = config;

    this.logger.debug('准备添加日历权限', {
      calendarId,
      userId: xgh,
      dryRun
    });

    if (dryRun) {
      this.logger.info('测试模式：跳过实际权限添加', {
        calendarId,
        userId: xgh
      });

      return {
        kkh: kkh,
        calendarId,
        success: true
      };
    }

    try {
      // 调用WPS API添加权限
      const permissionResult =
        await this.wasV7ApiCalendar.createCalendarPermission({
          calendar_id: calendarId,
          user_id: xgh,
          role: 'reader',
          id_type: 'external'
        });

      this.logger.info('WPS权限添加成功', {
        calendarId,
        userId: xgh,
        permissionId: permissionResult.data.id
      });

      return {
        kkh: kkh,
        calendarId,
        success: true
      };
    } catch (error) {
      this.logger.error('WPS权限添加失败', {
        calendarId,
        userId: xgh,
        error: error instanceof Error ? error.message : String(error)
      });

      return {
        kkh: kkh,
        calendarId,
        success: false,
        error: error instanceof Error ? error.message : '权限添加失败'
      };
    }
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查依赖的服务是否可用
      if (!this.calendarMappingRepository || !this.wasV7ApiCalendar) {
        return 'unhealthy';
      }
      return 'healthy';
    } catch (error) {
      this.logger.error('RestoreCalendarPermissionExecutor 健康检查失败', {
        error
      });
      return 'unhealthy';
    }
  }

  /**
   * 获取执行器配置验证规则
   */
  getConfigValidation(): Record<string, any> {
    return {
      userType: {
        required: true,
        type: 'string',
        enum: ['student', 'teacher']
      },
      xgh: {
        required: true,
        type: 'string',
        minLength: 1
      },
      courseInfo: {
        required: true,
        type: 'object',
        properties: {
          kkh: {
            required: true,
            type: 'string',
            minLength: 1
          },
          kcbh: {
            required: false,
            type: 'string'
          },
          xnxq: {
            required: false,
            type: 'string'
          }
        }
      },
      dryRun: {
        required: false,
        type: 'boolean',
        default: false
      },
      maxRetries: {
        required: false,
        type: 'number',
        default: 3,
        minimum: 0,
        maximum: 10
      }
    };
  }
}

// 框架会自动发现和注册此执行器
// 使用 SCOPED 生命周期，文件名符合 executors/**/*.ts 模式
