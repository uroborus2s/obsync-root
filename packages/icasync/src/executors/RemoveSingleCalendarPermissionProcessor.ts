/**
 * 删除单个日历权限处理器
 *
 * 功能：
 * 1. 根据kkh获取对应的日历ID
 * 2. 查询日历权限列表
 * 3. 权限比对并获取需要删除的权限ID
 * 4. 批量删除权限
 */

import { Executor, type Logger } from '@stratix/core';
import {
  type ExecutionContext,
  type ExecutionResult,
  type TaskExecutor
} from '@stratix/tasks';
import type { CalendarPermission, WpsCalendarAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import { type IPermissionStatusRepository } from '../repositories/PermissionStatusRepository.js';

/**
 * 删除单个日历权限配置接口
 */
export interface RemoveSingleCalendarPermissionConfig {
  /** 开课号 */
  kkh: string;
  /** 需要删除权限的用户ID列表（逗号分隔） */
  userList: string;
  /** 是否为测试运行模式 */
  dryRun?: boolean;
}

/**
 * 删除权限操作结果接口
 */
export interface PermissionRemovalResult {
  /** 用户ID */
  userId: string;
  /** 权限ID */
  permissionId?: string;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 删除单个日历权限结果接口
 */
export interface RemoveSingleCalendarPermissionResult {
  /** 开课号 */
  kkh: string;
  /** 日历ID */
  calendarId?: string;
  /** 成功删除的权限数量 */
  successCount: number;
  /** 失败的权限数量 */
  failureCount: number;
  /** 详细的删除结果 */
  removalResults: PermissionRemovalResult[];
  /** 执行时长(ms) */
  duration: number;
  /** 是否为测试运行 */
  dryRun: boolean;
  /** 错误信息列表 */
  errors?: string[];
}

/**
 * 删除单个日历权限处理器
 *
 * 功能：
 * 1. 根据kkh获取对应的日历ID
 * 2. 查询日历权限列表并进行用户ID匹配
 * 3. 批量删除匹配到的权限
 * 4. 支持dryRun模式进行测试
 */
@Executor({
  name: 'removeSingleCalendarPermissionProcessor',
  description: '删除单个日历权限处理器',
  version: '1.0.0',
  tags: ['calendar', 'permissions', 'remove', 'single'],
  category: 'icasync'
})
export default class RemoveSingleCalendarPermissionProcessor
  implements TaskExecutor
{
  readonly name = 'removeSingleCalendarPermissionProcessor';
  readonly description = '删除单个日历权限处理器';
  readonly version = '1.0.0';

  constructor(
    private calendarMappingRepository: ICalendarMappingRepository,
    private wasV7ApiCalendar: WpsCalendarAdapter,
    private permissionStatusRepository: IPermissionStatusRepository,
    private logger: Logger
  ) {}

  /**
   * 执行删除单个日历权限任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as RemoveSingleCalendarPermissionConfig;

    this.logger.info('开始删除单个日历权限', {
      kkh: config.kkh,
      userCount: config.userList ? config.userList.split(',').length : 0,
      dryRun: config.dryRun
    });

    try {
      const userIds = this.parseUserIds(config.userList);

      // 5. 更新原始数据状态（如果权限添加成功且不是dryRun模式）
      if (userIds.length > 0 && !config.dryRun) {
        await this.updateOriginalDataStatus(config.kkh, userIds);
      }

      // 1. 根据kkh获取日历ID
      const calendarMapping = await this.getCalendarIdByKkh(config.kkh);
      if (!calendarMapping) {
        throw new Error(`未找到开课号 ${config.kkh} 对应的日历映射`);
      }

      const calendarId = calendarMapping.calendar_id;
      if (!calendarId) {
        throw new Error(`开课号 ${config.kkh} 的日历ID为空`);
      }

      // 2. 解析用户ID列表
      if (userIds.length === 0) {
        this.logger.warn('没有需要删除权限的用户', { kkh: config.kkh });
        return this.createSuccessResult(
          config.kkh,
          calendarId,
          [],
          startTime,
          config.dryRun
        );
      }

      // 3. 获取日历权限列表
      const permissions = await this.getCalendarPermissions(calendarId);

      // 4. 匹配需要删除的权限
      const permissionsToRemove = this.matchPermissionsToRemove(
        userIds,
        permissions
      );

      if (permissionsToRemove.length === 0) {
        this.logger.info('没有找到需要删除的权限', {
          kkh: config.kkh,
          calendarId,
          userIds: userIds.length
        });
        return this.createSuccessResult(
          config.kkh,
          calendarId,
          [],
          startTime,
          config.dryRun
        );
      }

      // 5. 删除权限（支持dryRun模式）
      const removalResults = await this.removePermissions(
        calendarId,
        permissionsToRemove,
        config.dryRun
      );

      const duration = Date.now() - startTime;
      const successCount = removalResults.filter((r) => r.success).length;
      const failureCount = removalResults.filter((r) => !r.success).length;

      const result: RemoveSingleCalendarPermissionResult = {
        kkh: config.kkh,
        calendarId,
        successCount,
        failureCount,
        removalResults,
        duration,
        dryRun: config.dryRun || false
      };

      this.logger.info('完成删除单个日历权限', {
        kkh: config.kkh,
        calendarId,
        successCount,
        failureCount,
        duration,
        dryRun: config.dryRun
      });

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('删除单个日历权限失败', {
        error: errorMessage,
        duration,
        kkh: config.kkh,
        dryRun: config.dryRun
      });

      return {
        success: false,
        error: `删除日历权限失败: ${errorMessage}`
      };
    }
  }

  /**
   * 根据kkh获取日历ID
   */
  private async getCalendarIdByKkh(kkh: string) {
    const result = await this.calendarMappingRepository.findByKkh(kkh);
    if (!result.success) {
      throw new Error(`查询日历映射失败: ${result.error?.message}`);
    }
    return result.data;
  }

  /**
   * 解析用户ID列表
   */
  private parseUserIds(mergedUserList: string): string[] {
    if (!mergedUserList) return [];

    return mergedUserList
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  }

  /**
   * 获取日历权限列表
   */
  private async getCalendarPermissions(calendarId: string) {
    try {
      const response = await this.wasV7ApiCalendar.getAllCalendarPermissions({
        calendar_id: calendarId,
        page_size: 20 // 获取足够多的权限记录
      });

      return response || [];
    } catch (error) {
      throw new Error(
        `调用WPS API获取权限列表失败: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 匹配需要删除的权限
   */
  private matchPermissionsToRemove(
    userIds: string[],
    permissions: CalendarPermission[]
  ) {
    const permissionsToRemove: Array<{ userId: string; permissionId: string }> =
      [];

    for (const userId of userIds) {
      const permission = permissions.find((p) => p.user_id === userId);
      if (permission && permission.id) {
        permissionsToRemove.push({
          userId,
          permissionId: permission.id
        });
      }
    }

    return permissionsToRemove;
  }

  /**
   * 删除权限
   */
  private async removePermissions(
    calendarId: string,
    permissionsToRemove: Array<{ userId: string; permissionId: string }>,
    dryRun?: boolean
  ): Promise<PermissionRemovalResult[]> {
    const results: PermissionRemovalResult[] = [];

    for (const { userId, permissionId } of permissionsToRemove) {
      try {
        if (dryRun) {
          // 测试模式，不实际删除
          this.logger.info('DryRun模式：模拟删除权限', {
            calendarId,
            userId,
            permissionId
          });
          results.push({
            userId,
            permissionId,
            success: true
          });
        } else {
          // 实际删除权限
          await this.wasV7ApiCalendar.deleteCalendarPermission({
            calendar_id: calendarId,
            calendar_permission_id: permissionId
          });

          this.logger.debug('成功删除权限', {
            calendarId,
            userId,
            permissionId
          });

          results.push({
            userId,
            permissionId,
            success: true
          });
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('删除权限失败', {
          calendarId,
          userId,
          permissionId,
          error: errorMessage
        });

        results.push({
          userId,
          permissionId,
          success: false,
          error: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * 更新原始数据状态
   */
  private async updateOriginalDataStatus(
    kkh: string,
    userIds?: string[]
  ): Promise<
    | {
        studentUpdateCount: number;
        teacherUpdateCount: number;
        totalUpdateCount: number;
      }
    | undefined
  > {
    try {
      this.logger.debug('开始更新原始数据状态', {
        kkh,
        userCount: userIds?.length
      });

      const updateResult =
        await this.permissionStatusRepository.updatePermissionStatus({
          kkh,
          gxZt: '3', // 状态3表示已删除
          userIds
        });

      if (updateResult.success) {
        this.logger.info('原始数据状态更新成功', {
          kkh,
          studentUpdateCount: updateResult.data.studentUpdateCount,
          teacherUpdateCount: updateResult.data.teacherUpdateCount,
          totalUpdateCount: updateResult.data.totalUpdateCount
        });

        return {
          studentUpdateCount: updateResult.data.studentUpdateCount,
          teacherUpdateCount: updateResult.data.teacherUpdateCount,
          totalUpdateCount: updateResult.data.totalUpdateCount
        };
      } else {
        this.logger.error('原始数据状态更新失败', {
          kkh,
          error: updateResult.error?.message
        });
        return undefined;
      }
    } catch (error) {
      this.logger.error('更新原始数据状态时发生异常', {
        kkh,
        error: error instanceof Error ? error.message : String(error)
      });
      return undefined;
    }
  }

  /**
   * 创建成功结果
   */
  private createSuccessResult(
    kkh: string,
    calendarId: string,
    removalResults: PermissionRemovalResult[],
    startTime: number,
    dryRun?: boolean
  ): ExecutionResult {
    const duration = Date.now() - startTime;
    const result: RemoveSingleCalendarPermissionResult = {
      kkh,
      calendarId,
      successCount: 0,
      failureCount: 0,
      removalResults,
      duration,
      dryRun: dryRun || false
    };

    return {
      success: true,
      data: result
    };
  }

  /**
   * 验证配置
   */
  validateConfig(config: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!config.kkh || typeof config.kkh !== 'string') {
      errors.push('kkh 参数是必需的且必须是字符串');
    }

    if (
      !config.merged_user_list ||
      typeof config.merged_user_list !== 'string'
    ) {
      errors.push('merged_user_list 参数是必需的且必须是字符串');
    }

    if (config.dryRun !== undefined && typeof config.dryRun !== 'boolean') {
      errors.push('dryRun 参数必须是布尔值');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查日历映射仓储
      const testResult = await this.calendarMappingRepository.findByKkh('test');
      if (
        !testResult.success &&
        testResult.error?.message !== 'Course number cannot be empty'
      ) {
        this.logger.warn('日历映射仓储检查失败');
        return 'unhealthy';
      }

      // 检查WPS日历适配器（简单的连接测试）
      // 注意：这里不进行实际的API调用，只检查适配器是否可用
      if (!this.wasV7ApiCalendar) {
        this.logger.warn('WPS日历适配器不可用');
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
