/**
 * 添加参与者权限执行器
 *
 * 功能：
 * 1. 接收分组用户ID和日历ID
 * 2. 调用batchCreateCalendarPermissionsLimit将用户权限添加到日历
 * 3. 处理单个批次的权限创建
 */

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import type { ICalendarMappingRepository } from '../repositories/CalendarMapping.repository.js';

/**
 * 添加参与者权限配置接口
 */
export interface AddParticipantsConfig {
  /** 开课号 */
  kkh: string;
  /** 学年学期 */
  xnxq: string;
  /** 用户ID数组（单个批次，最多100个） */
  permissions: string[];
  /** 权限级别，默认为reader */
  role?: 'free_busy_reader' | 'reader' | 'writer';
  /** ID类型，默认为internal */
  id_type?: 'internal' | 'external';
  /** 批次索引（用于日志记录） */
  batch_index?: number;
}

/**
 * 添加参与者权限结果接口
 */
export interface AddParticipantsResult {
  /** 处理的用户数量 */
  user_count: number;
  /** 成功创建的权限数量 */
  success_count: number;
  /** 批次索引 */
  batch_index?: number;
  /** 权限级别 */
  role: string;
  /** ID类型 */
  id_type: string;
  /** 创建的权限详情 */
  created_permissions?: Array<{
    user_id: string;
    role: string;
    permission_id?: string;
  }>;
  /** 错误信息 */
  error?: string;
  /** 执行时长(ms) */
  duration: number;
}

/**
 * 添加参与者权限执行器
 */
@Executor({
  name: 'addParticipants',
  description: '添加参与者权限执行器 - 将用户添加为日历的参与者',
  version: '1.0.0',
  category: 'icasync'
})
export default class AddParticipantsProcessor implements TaskExecutor {
  readonly name = 'addParticipants';

  constructor(
    private wasV7ApiCalendar: WpsCalendarAdapter,
    private calendarMappingRepository: ICalendarMappingRepository,
    private logger: Logger
  ) {}

  /**
   * 执行添加参与者权限任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as AddParticipantsConfig;

    try {
      // 1. 验证输入参数
      const validationResult = this.validateInputParameters(config);
      if (!validationResult.valid) {
        return left({
          error: validationResult.error,
          duration: Date.now() - startTime
        });
      }

      const {
        permissions,
        kkh,
        xnxq,
        role = 'reader',
        id_type = 'external',
        batch_index
      } = config;

      // 1.5. 根据kkh和xnxq获取calendarId
      this.logger.debug('查询日历映射', { kkh, xnxq });
      const mappingResult =
        await this.calendarMappingRepository.findByKkhAndXnxq(kkh, xnxq);

      if (isLeft(mappingResult) || !mappingResult.right) {
        const errorMsg = isLeft(mappingResult)
          ? (mappingResult as any).error
          : '未找到对应的日历映射记录';
        this.logger.left('未找到日历映射', {
          kkh,
          xnxq,
          error: errorMsg
        });
        return {
          success: false,
          error: `未找到开课号 ${kkh} 和学年学期 ${xnxq} 对应的日历映射: ${errorMsg}`,
          duration: Date.now() - startTime
        };
      }

      const calendarId = mappingResult.right.calendar_id;
      this.logger.debug('找到日历映射', { kkh, xnxq, calendarId });

      const batchInfo = batch_index ? `第 ${batch_index} 批` : '';
      this.logger.info(
        `开始添加参与者权限${batchInfo}，日历ID: ${calendarId}, 用户数量: ${permissions.length}`
      );

      // 2. 处理空用户列表
      if (permissions.length === 0) {
        const result: AddParticipantsResult = {
          user_count: 0,
          success_count: 0,
          batch_index,
          role,
          id_type,
          created_permissions: [],
          duration: Date.now() - startTime
        };

        this.logger.info(`${batchInfo}用户列表为空，跳过权限创建`);
        return right(result);
      }

      // 3. 调用WPS API批量创建权限
      const createResult = await this.createCalendarPermissions(
        calendarId,
        permissions,
        role,
        id_type
      );

      if (isLeft(createResult)) {
        const result: AddParticipantsResult = {
          user_count: permissions.length,
          success_count: 0,
          batch_index,
          role,
          id_type,
          error: createResult.left,
          duration: Date.now() - startTime
        };

        this.logger.left(`${batchInfo}权限创建失败`, {
          calendarId,
          kkh,
          xnxq,
          user_count: permissions.length,
          error: createResult.left
        });

        return {
          success: false,
          data: result,
          error: createResult.left,
          duration: result.duration
        };
      }

      // 4. 构造成功结果
      const result: AddParticipantsResult = {
        user_count: permissions.length,
        success_count: createResult.right!.length,
        batch_index,
        role,
        id_type,
        created_permissions: createResult.right!,
        duration: Date.now() - startTime
      };

      this.logger.info(`${batchInfo}权限创建完成`, {
        calendarId,
        kkh,
        xnxq,
        user_count: permissions.length,
        success_count: result.success_count,
        role,
        id_type
      });

      return right(result);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left('执行添加参与者权限任务失败', {
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
  private validateInputParameters(config: AddParticipantsConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config) {
      return { valid: false, error: '配置参数不能为空' };
    }

    if (!config.kkh || typeof config.kkh !== 'string') {
      return { valid: false, error: '开课号(kkh)必须是非空字符串' };
    }

    if (!config.xnxq || typeof config.xnxq !== 'string') {
      return { valid: false, error: '学年学期(xnxq)必须是非空字符串' };
    }

    if (!Array.isArray(config.permissions)) {
      return { valid: false, error: '用户ID列表(user_ids)必须是数组' };
    }

    // 验证用户ID数组长度
    if (config.permissions.length > 100) {
      return {
        valid: false,
        error: '单批次用户数量不能超过100个'
      };
    }

    // 验证用户ID格式
    for (const userId of config.permissions) {
      if (!userId || typeof userId !== 'string') {
        return {
          valid: false,
          error: '用户ID必须是非空字符串'
        };
      }
    }

    return { valid: true };
  }

  /**
   * 调用WPS API创建日历权限
   */
  private async createCalendarPermissions(
    calendarId: string,
    userIds: string[],
    role: 'free_busy_reader' | 'reader' | 'writer',
    idType: 'internal' | 'external'
  ) {
    try {
      this.logger.debug('调用WPS API创建日历权限', {
        calendar_id: calendarId,
        user_count: userIds.length,
        role,
        id_type: idType
      });

      // 构造权限参数
      const permissions = userIds.map((userId) => ({
        user_id: userId,
        role
      }));

      // 调用WPS API
      const response =
        await this.wasV7ApiCalendar.batchCreateCalendarPermissionsLimit({
          calendar_id: calendarId,
          permissions,
          id_type: idType
        });

      // 处理响应结果
      const createdPermissions =
        response.items?.map((item) => ({
          user_id: item.user_id,
          role: item.role,
          permission_id: item.id
        })) || [];

      this.logger.debug('WPS API调用成功', {
        calendar_id: calendarId,
        requested_count: userIds.length,
        created_count: createdPermissions.length
      });

      return right(createdPermissions);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left('WPS API调用失败', {
        calendar_id: calendarId,
        user_count: userIds.length,
        error: errorMessage
      });

      return left(errorMessage);
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      // 检查依赖服务是否可用
      if (!this.wasV7ApiCalendar) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}
