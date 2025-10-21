/**
 * 添加单个日历权限处理器
 *
 * 功能：
 * 1. 根据kkh获取对应的日历ID
 * 2. 解析用户分组并按照100个为一组进行分批处理
 * 3. 批量添加日历权限
 * 4. 为学生设置reader权限，为教师设置writer权限
 */

import { Executor, type Logger } from '@stratix/core';
import {
  type ExecutionContext,
  type ExecutionResult,
  type TaskExecutor
} from '@stratix/tasks';
import type { WpsCalendarAdapter, WpsUserAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMappingRepository.js';
import { type IPermissionStatusRepository } from '../repositories/PermissionStatusRepository.js';

/**
 * 添加单个日历权限配置接口
 */
export interface AddSingleCalendarPermissionConfig {
  /** 开课号 */
  kkh: string;
  /** 需要添加权限的用户ID列表（逗号分隔） */
  usersList: string[][];
  /** 是否为测试运行模式 */
  dryRun?: boolean;
}

/**
 * 权限添加操作结果接口
 */
export interface PermissionAdditionResult {
  /** 批次编号 */
  batchNumber: number;
  /** 用户数量 */
  userCount: number;
  /** 成功添加的权限数量 */
  successCount: number;
  /** 失败的权限数量 */
  failureCount: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  error?: string;
  /** 详细的用户权限结果 */
  userResults?: Array<{
    userId: string;
    role: string;
    success: boolean;
    error?: string;
  }>;
}

/**
 * 添加单个日历权限结果接口
 */
export interface AddSingleCalendarPermissionResult {
  /** 开课号 */
  kkh: string;
  /** 日历ID */
  calendarId?: string;
  /** 总成功添加的权限数量 */
  totalSuccessCount: number;
  /** 总失败的权限数量 */
  totalFailureCount: number;
  /** 处理的批次数量 */
  batchCount: number;
  /** 详细的批次结果 */
  batchResults: PermissionAdditionResult[];
  /** 执行时长(ms) */
  duration: number;
  /** 是否为测试运行 */
  dryRun: boolean;
  /** 状态更新结果 */
  statusUpdateResult?: {
    studentUpdateCount: number;
    teacherUpdateCount: number;
    totalUpdateCount: number;
  };
  /** 错误信息列表 */
  errors?: string[];
}

/**
 * 添加单个日历权限处理器
 *
 * 功能：
 * 1. 根据kkh获取对应的日历ID
 * 2. 解析用户ID列表并进行分批处理
 * 3. 批量添加日历权限，学生为reader，教师为writer
 * 4. 支持dryRun模式进行测试
 */
@Executor({
  name: 'addSingleCalendarPermissionProcessor',
  description: '添加单个日历权限处理器',
  version: '1.0.0',
  tags: ['calendar', 'permissions', 'add', 'single'],
  category: 'icasync'
})
export default class AddSingleCalendarPermissionProcessor
  implements TaskExecutor
{
  readonly name = 'addSingleCalendarPermissionProcessor';
  readonly description = '添加单个日历权限处理器';
  readonly version = '1.0.0';

  constructor(
    private calendarMappingRepository: ICalendarMappingRepository,
    private wasV7ApiCalendar: WpsCalendarAdapter,
    private permissionStatusRepository: IPermissionStatusRepository,
    private logger: Logger,
    private wasV7ApiUser: WpsUserAdapter
  ) {}

  /**
   * 执行添加单个日历权限任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as AddSingleCalendarPermissionConfig;
    const batchSize = 100;

    this.logger.info('开始添加单个日历权限', {
      kkh: config.kkh,
      batchSize,
      dryRun: config.dryRun
    });

    try {
      let statusUpdateResult;
      // 将二维数组转换为1纬数组
      const userIds = config.usersList.reduce(
        (acc, val) => acc.concat(val),
        []
      );

      // 1. 根据kkh获取日历ID
      const calendarMapping = await this.getCalendarIdByKkh(config.kkh);
      if (!calendarMapping) {
        // 5. 更新原始数据状态（如果权限添加成功且不是dryRun模式）
        if (userIds.length > 0 && !config.dryRun) {
          statusUpdateResult = await this.updateOriginalDataStatus(
            config.kkh,
            userIds
          );
        }
        throw new Error(`未找到开课号 ${config.kkh} 对应的日历映射`);
      }

      const calendarId = calendarMapping.calendar_id;
      if (!calendarId) {
        throw new Error(`开课号 ${config.kkh} 的日历ID为空`);
      }

      // 2. 解析用户ID列表
      if (config.usersList.length === 0) {
        this.logger.warn('没有需要添加权限的用户', { kkh: config.kkh });
        return this.createSuccessResult(
          config.kkh,
          calendarId,
          [],
          startTime,
          config.dryRun
        );
      }

      // 4. 批量添加权限
      const batchResults = await this.addPermissionsBatch(
        calendarId,
        config.usersList,
        config.dryRun
      );

      const duration = Date.now() - startTime;
      const totalSuccessCount = batchResults.reduce(
        (sum, batch) => sum + batch.successCount,
        0
      );
      const totalFailureCount = batchResults.reduce(
        (sum, batch) => sum + batch.failureCount,
        0
      );

      // 5. 更新原始数据状态（如果权限添加成功且不是dryRun模式）
      if (userIds.length > 0 && !config.dryRun) {
        this.logger.info(
          `开始更新原始数据状态, kkh: ${config.kkh}, userCount: ${userIds.length}`
        );
        statusUpdateResult = await this.updateOriginalDataStatus(
          config.kkh,
          userIds
        );
      }

      const result: AddSingleCalendarPermissionResult = {
        kkh: config.kkh,
        calendarId,
        totalSuccessCount,
        totalFailureCount,
        batchCount: batchResults.length,
        batchResults,
        duration,
        dryRun: config.dryRun || false,
        statusUpdateResult
      };

      this.logger.info(
        `完成添加单个日历权限, kkh: ${config.kkh}, calendarId: ${calendarId}, totalSuccessCount: ${totalSuccessCount}, totalFailureCount: ${totalFailureCount}, batchCount: ${batchResults.length}, duration: ${duration}`
      );

      return {
        success: true,
        data: result
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('添加单个日历权限失败', {
        error: errorMessage,
        duration,
        kkh: config.kkh,
        dryRun: config.dryRun
      });

      return {
        success: false,
        error: `添加日历权限失败: ${errorMessage}`
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
   * 批量添加权限
   */
  private async addPermissionsBatch(
    calendarId: string,
    userBatches: string[][],
    dryRun?: boolean
  ): Promise<PermissionAdditionResult[]> {
    const results: PermissionAdditionResult[] = [];

    for (let i = 0; i < userBatches.length; i++) {
      const batch = userBatches[i];
      const batchNumber = i + 1;

      this.logger.debug('处理权限添加批次', {
        calendarId,
        batchNumber,
        userCount: batch.length,
        dryRun
      });

      try {
        if (dryRun) {
          // 测试模式，不实际添加
          this.logger.info('DryRun模式：模拟添加权限批次', {
            calendarId,
            batchNumber,
            userCount: batch.length
          });

          results.push({
            batchNumber,
            userCount: batch.length,
            successCount: batch.length,
            failureCount: 0,
            success: true
          });
        } else {
          // 实际添加权限
          const batchResult = await this.addSingleBatchPermissions(
            calendarId,
            batch,
            batchNumber
          );
          results.push(batchResult);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        this.logger.error('批次权限添加失败', {
          calendarId,
          batchNumber,
          userCount: batch.length,
          error: errorMessage
        });

        results.push({
          batchNumber,
          userCount: batch.length,
          successCount: 0,
          failureCount: batch.length,
          success: false,
          error: errorMessage
        });
      }
    }

    return results;
  }

  /**
   * 添加单个批次的权限
   */
  private async addSingleBatchPermissions(
    calendarId: string,
    userIds: string[],
    batchNumber: number
  ): Promise<PermissionAdditionResult> {
    try {
      // 获取WPS中存在的用户
      const wpsUsersResponse = await this.wasV7ApiUser.getUsersByExUserIds({
        status: ['active', 'notactive', 'disabled'] as any[],
        ex_user_ids: userIds
      });

      // 提取存在的用户ID
      const existingUserIds =
        wpsUsersResponse.items?.map((user: any) => user.ex_user_id) || [];
      const existingUserIdSet = new Set(existingUserIds);

      // 找出不存在的用户ID
      const nonExistentUserIds = userIds.filter(
        (userId) => !existingUserIdSet.has(userId)
      );

      // 记录不存在的用户ID警告
      if (nonExistentUserIds.length > 0) {
        this.logger.warn(
          `发现不存在的用户ID，将跳过这些用户的权限添加: ${nonExistentUserIds.join(', ')}`,
          {
            calendarId,
            batchNumber,
            totalUserIds: userIds.length
          }
        );
      }

      // 只为存在的用户构建权限列表
      const validUserIds = userIds.filter((userId) =>
        existingUserIdSet.has(userId)
      );

      if (validUserIds.length === 0) {
        this.logger.warn('批次中没有有效的用户ID，跳过权限添加', {
          calendarId,
          batchNumber,
          originalUserCount: userIds.length,
          validUserCount: 0
        });

        return {
          batchNumber,
          userCount: userIds.length,
          successCount: 0,
          failureCount: userIds.length,
          success: true, // 虽然没有添加权限，但这不是错误
          error: '批次中没有有效的用户ID'
        };
      }

      // 构建权限列表，区分学生和教师
      const permissions = validUserIds.map((userId) => ({
        user_id: userId,
        role: 'reader' as 'reader'
      }));

      // 调用WPS API批量添加权限
      const response =
        await this.wasV7ApiCalendar.batchCreateCalendarPermissionsLimit({
          calendar_id: calendarId,
          permissions
        });

      this.logger.debug('成功添加权限批次', {
        calendarId,
        batchNumber,
        originalUserCount: userIds.length,
        validUserCount: validUserIds.length,
        skippedUserCount: nonExistentUserIds.length,
        response
      });

      return {
        batchNumber,
        userCount: userIds.length,
        successCount: validUserIds.length,
        failureCount: nonExistentUserIds.length,
        success: true
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error('批次权限添加失败', {
        calendarId,
        batchNumber,
        userCount: userIds.length,
        error: errorMessage
      });

      return {
        batchNumber,
        userCount: userIds.length,
        successCount: 0,
        failureCount: userIds.length,
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * 确定用户角色
   * 学生ID通常以数字开头，教师ID通常以字母开头
   */
  private determineUserRole(userId: string): 'reader' | 'writer' {
    // 简单的规则：如果用户ID以数字开头，认为是学生（reader）
    // 如果以字母开头，认为是教师（writer）
    const firstChar = userId.charAt(0);
    return /\d/.test(firstChar) ? 'reader' : 'writer';
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
          gxZt: '1', // 状态1表示已处理
          userIds
        });

      if (updateResult.success) {
        this.logger.info(
          `原始数据状态更新成功, kkh: ${kkh}, studentUpdateCount: ${updateResult.data.studentUpdateCount}, teacherUpdateCount: ${updateResult.data.teacherUpdateCount}, totalUpdateCount: ${updateResult.data.totalUpdateCount}`
        );

        return {
          studentUpdateCount: updateResult.data.studentUpdateCount,
          teacherUpdateCount: updateResult.data.teacherUpdateCount,
          totalUpdateCount: updateResult.data.totalUpdateCount
        };
      } else {
        this.logger.error(
          `原始数据状态更新失败, kkh: ${kkh},msg: ${updateResult.error?.message}`
        );
        return undefined;
      }
    } catch (error) {
      this.logger.error(
        `更新原始数据状态时发生异常, kkh: ${kkh},msg: ${error instanceof Error ? error.message : JSON.stringify(error)}`
      );
      return undefined;
    }
  }

  /**
   * 创建成功结果
   */
  private createSuccessResult(
    kkh: string,
    calendarId: string,
    batchResults: PermissionAdditionResult[],
    startTime: number,
    dryRun?: boolean
  ): ExecutionResult {
    const duration = Date.now() - startTime;
    const result: AddSingleCalendarPermissionResult = {
      kkh,
      calendarId,
      totalSuccessCount: 0,
      totalFailureCount: 0,
      batchCount: 0,
      batchResults,
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

    if (
      config.batch_size !== undefined &&
      (typeof config.batch_size !== 'number' ||
        config.batch_size <= 0 ||
        config.batch_size > 100)
    ) {
      errors.push('batch_size 参数必须是1-100之间的正整数');
    }

    if (config.dryRun !== undefined && typeof config.dryRun !== 'boolean') {
      errors.push('dryRun 参数必须是布尔值');
    }

    if (config.xnxq !== undefined && typeof config.xnxq !== 'string') {
      errors.push('xnxq 参数必须是字符串');
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
