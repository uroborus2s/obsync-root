// @stratix/icasync 添加参与者执行器
// 负责向指定日历添加单个参与者（学生或教师）

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { WpsCalendarAdapter } from '@stratix/was-v7';
import type { ICalendarParticipantsRepository } from '../repositories/CalendarParticipantsRepository.js';
import type { ICalendarSyncService } from '../services/CalendarSyncService.js';
import type { PermissionRole } from '../types/database.js';

/**
 * 参与者数据接口
 */
export interface ParticipantData {
  /** 用户编号（学号或工号） */
  userCode: string;
  /** 用户姓名 */
  userName: string;
  /** 用户类型：student | teacher */
  userType: 'student' | 'teacher';
  /** 用户邮箱（可选） */
  email?: string;
  /** 外部用户ID（WPS系统中的用户ID） */
  externalUserId?: string;
  /** 额外元数据 */
  metadata?: Record<string, any>;
}

/**
 * 添加参与者配置接口
 */
export interface AddParticipantConfig {
  /** 日历ID */
  calendarId: string;
  /** 参与者数据 */
  participantData: ParticipantData;
  /** 权限角色：reader | writer | owner */
  role?: 'reader' | 'writer' | 'owner';
  /** 权限级别（兼容性字段） */
  permissions?: string;
  /** 是否跳过重复检查 */
  skipDuplicateCheck?: boolean;
  /** 重试配置 */
  retryConfig?: {
    maxRetries?: number;
    retryDelay?: number;
  };
}

/**
 * 添加参与者结果接口
 */
export interface AddParticipantResult {
  /** 是否成功 */
  success: boolean;
  /** 参与者用户编号 */
  userCode: string;
  /** 参与者姓名 */
  userName: string;
  /** 用户类型 */
  userType: 'student' | 'teacher';
  /** 日历ID */
  calendarId: string;
  /** 权限ID（WPS系统返回的权限ID） */
  permissionId?: string;
  /** 权限角色 */
  role: string;
  /** 操作类型：added | skipped | updated */
  operation: 'added' | 'skipped' | 'updated';
  /** 是否为新添加的参与者 */
  isNewParticipant: boolean;
  /** 错误信息 */
  error?: string;
  /** 详细信息 */
  details?: {
    existingPermissionId?: string;
    wpsUserId?: string;
    metadata?: Record<string, any>;
  };
  /** 执行时长(ms) */
  duration: number;
}

/**
 * 添加参与者执行器
 *
 * 功能：
 * 1. 向指定日历添加单个参与者
 * 2. 支持学生和教师两种用户类型
 * 3. 自动处理用户ID映射（外部ID到WPS内部ID）
 * 4. 支持权限角色配置（reader/writer/owner）
 * 5. 防止重复添加相同参与者
 * 6. 提供详细的操作结果和错误信息
 * 7. 支持重试机制和错误恢复
 */
@Executor({
  name: 'addParticipant',
  description: '添加参与者执行器 - 向日历添加单个参与者',
  version: '1.0.0',
  tags: ['participant', 'calendar', 'permission', 'user', 'add'],
  category: 'icasync'
})
export default class AddParticipantExecutor implements TaskExecutor {
  readonly name = 'addParticipant';
  readonly description = '添加参与者执行器';
  readonly version = '1.0.0';

  constructor(
    private calendarSyncService: ICalendarSyncService,
    private calendarParticipantsRepository: ICalendarParticipantsRepository,
    private wasV7Calendar: WpsCalendarAdapter,
    private logger: Logger
  ) {}

  /**
   * 执行添加参与者任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as AddParticipantConfig;

    // 验证配置
    const validationResult = this.validateConfig(config);
    if (!validationResult.valid) {
      return {
        success: false,
        error: validationResult.error,
        duration: Date.now() - startTime
      };
    }

    const {
      calendarId,
      participantData,
      role = 'reader',
      permissions,
      skipDuplicateCheck = false,
      retryConfig = {}
    } = config;

    const { userCode, userName, userType } = participantData;

    try {
      this.logger.info(
        `开始添加参与者，日历ID: ${calendarId}, 用户: ${userName}(${userCode}), 类型: ${userType}`
      );

      // 1. 检查是否已存在（如果不跳过重复检查）
      let existingParticipant = null;
      if (!skipDuplicateCheck) {
        existingParticipant = await this.checkExistingParticipant(
          calendarId,
          userCode,
          userType
        );

        if (existingParticipant && !existingParticipant.is_deleted) {
          const result: AddParticipantResult = {
            success: true,
            userCode,
            userName,
            userType,
            calendarId,
            permissionId: this.extractPermissionId(
              existingParticipant.metadata
            ),
            role: existingParticipant.permission_role || role,
            operation: 'skipped',
            isNewParticipant: false,
            details: {
              existingPermissionId: this.extractPermissionId(
                existingParticipant.metadata
              ),
              metadata: existingParticipant.metadata || undefined
            },
            duration: Date.now() - startTime
          };

          this.logger.info(
            `参与者已存在，跳过添加，用户: ${userName}(${userCode})`
          );

          return {
            success: true,
            data: result,
            duration: result.duration
          };
        }
      }

      // 2. 确定最终权限角色
      const finalRole =
        permissions === 'read'
          ? 'reader'
          : permissions === 'write'
            ? 'writer'
            : role;

      // 3. 获取或映射WPS用户ID
      const wpsUserId = participantData.externalUserId || userCode;

      // 4. 创建WPS日历权限
      const permissionResult = await this.createCalendarPermission(
        calendarId,
        wpsUserId,
        finalRole,
        retryConfig
      );

      if (!permissionResult.success || !permissionResult.permissionId) {
        const result: AddParticipantResult = {
          success: false,
          userCode,
          userName,
          userType,
          calendarId,
          role: finalRole,
          operation: 'added',
          isNewParticipant: true,
          error: permissionResult.error || '权限ID获取失败',
          duration: Date.now() - startTime
        };

        return {
          success: false,
          data: result,
          error: permissionResult.error || '权限ID获取失败',
          duration: result.duration
        };
      }

      // 5. 保存参与者记录到数据库
      const saveResult = await this.saveParticipantRecord(
        calendarId,
        participantData,
        finalRole,
        permissionResult.permissionId,
        existingParticipant,
        context
      );

      const result: AddParticipantResult = {
        success: saveResult.success,
        userCode,
        userName,
        userType,
        calendarId,
        permissionId: permissionResult.permissionId,
        role: finalRole,
        operation: existingParticipant ? 'updated' : 'added',
        isNewParticipant: !existingParticipant,
        details: {
          wpsUserId,
          metadata: {
            created_by: 'addParticipant_executor',
            wps_permission_id: permissionResult.permissionId,
            original_role: role,
            final_role: finalRole
          }
        },
        error: saveResult.success ? undefined : saveResult.error,
        duration: Date.now() - startTime
      };

      if (result.success) {
        this.logger.info(
          `参与者添加成功，用户: ${userName}(${userCode}), 权限ID: ${permissionResult.permissionId}`
        );
      } else {
        this.logger.error(
          `参与者记录保存失败，用户: ${userName}(${userCode}), 错误: ${saveResult.error}`
        );
      }

      return {
        success: result.success,
        data: result,
        error: result.error,
        duration: result.duration
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `添加参与者执行器异常，用户: ${userName}(${userCode})`,
        error
      );

      const result: AddParticipantResult = {
        success: false,
        userCode,
        userName,
        userType,
        calendarId,
        role: role,
        operation: 'added',
        isNewParticipant: false,
        error: `执行器异常: ${errorMessage}`,
        duration: Date.now() - startTime
      };

      return {
        success: false,
        data: result,
        error: errorMessage,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: AddParticipantConfig): {
    valid: boolean;
    error?: string;
  } {
    if (!config) {
      return { valid: false, error: '配置参数不能为空' };
    }

    if (!config.calendarId || typeof config.calendarId !== 'string') {
      return { valid: false, error: '日历ID(calendarId)必须是非空字符串' };
    }

    if (!config.participantData) {
      return { valid: false, error: '参与者数据(participantData)不能为空' };
    }

    const { userCode, userName, userType } = config.participantData;

    if (!userCode || typeof userCode !== 'string') {
      return { valid: false, error: '用户编号(userCode)必须是非空字符串' };
    }

    if (!userName || typeof userName !== 'string') {
      return { valid: false, error: '用户姓名(userName)必须是非空字符串' };
    }

    if (!userType || !['student', 'teacher'].includes(userType)) {
      return {
        valid: false,
        error: '用户类型(userType)必须是student或teacher'
      };
    }

    if (config.role && !['reader', 'writer', 'owner'].includes(config.role)) {
      return {
        valid: false,
        error: '权限角色(role)必须是reader、writer或owner之一'
      };
    }

    return { valid: true };
  }

  /**
   * 检查现有参与者
   */
  private async checkExistingParticipant(
    calendarId: string,
    userCode: string,
    userType: 'student' | 'teacher'
  ) {
    try {
      const result =
        await this.calendarParticipantsRepository.findByCalendarAndUser(
          calendarId,
          userCode,
          userType
        );
      return result.success ? result.data : null;
    } catch (error) {
      this.logger.warn(`检查现有参与者时出错，用户: ${userCode}`, error);
      return null;
    }
  }

  /**
   * 创建WPS日历权限
   */
  private async createCalendarPermission(
    calendarId: string,
    userId: string,
    role: string,
    retryConfig: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<{ success: boolean; permissionId?: string; error?: string }> {
    const maxRetries = retryConfig.maxRetries || 3;
    const retryDelay = retryConfig.retryDelay || 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.wasV7Calendar.createCalendarPermission({
          calendar_id: calendarId,
          user_id: userId,
          role: role as 'reader' | 'writer' | 'owner',
          id_type: 'external'
        });

        return {
          success: true,
          permissionId: result.data.id
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (attempt === maxRetries) {
          return {
            success: false,
            error: `创建WPS权限失败（重试${maxRetries}次后）: ${errorMessage}`
          };
        }

        this.logger.warn(
          `创建WPS权限失败，第${attempt}次重试，用户: ${userId}, 错误: ${errorMessage}`
        );

        // 等待后重试
        if (retryDelay > 0) {
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
      }
    }

    return { success: false, error: '未知错误' };
  }

  /**
   * 保存参与者记录
   */
  private async saveParticipantRecord(
    calendarId: string,
    participantData: ParticipantData,
    role: string,
    permissionId: string,
    existingParticipant: any,
    context: ExecutionContext
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const metadata = {
        wps_permission_id: permissionId,
        created_by: 'addParticipant_executor',
        user_name: participantData.userName,
        ...participantData.metadata
      };

      if (existingParticipant) {
        // 更新现有记录
        const updateResult =
          await this.calendarParticipantsRepository.updateNullable(
            existingParticipant.id,
            {
              permission_role: role as PermissionRole,
              is_deleted: false,
              deleted_at: null,
              metadata: JSON.stringify(metadata)
            }
          );

        return {
          success: updateResult.success,
          error: updateResult.success ? undefined : '更新参与者记录失败'
        };
      } else {
        // 创建新记录
        // 从上下文或配置中获取kkh，如果没有则使用空字符串
        const kkh =
          (context as any)?.inputData?.kkh ||
          (context as any)?.workflowData?.kkh ||
          participantData.metadata?.kkh ||
          '';

        const createResult = await this.calendarParticipantsRepository.create({
          calendar_id: calendarId,
          kkh: kkh,
          user_code: participantData.userCode,
          user_type: participantData.userType,
          permission_role: role as PermissionRole,
          is_deleted: false,
          metadata: JSON.stringify(metadata)
        });

        return {
          success: createResult.success,
          error: createResult.success ? undefined : '创建参与者记录失败'
        };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `保存参与者记录异常: ${errorMessage}`
      };
    }
  }

  /**
   * 从元数据中提取权限ID
   */
  private extractPermissionId(metadata: any): string | undefined {
    if (!metadata) return undefined;

    try {
      const meta =
        typeof metadata === 'string' ? JSON.parse(metadata) : metadata;
      return meta.wps_permission_id;
    } catch {
      return undefined;
    }
  }

  /**
   * 健康检查
   */
  async healthCheck() {
    try {
      // 检查依赖服务是否可用
      if (
        !this.calendarSyncService ||
        !this.calendarParticipantsRepository ||
        !this.wasV7Calendar
      ) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      return 'unhealthy';
    }
  }
}
