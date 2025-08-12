/**
 * 同步执行规则引擎
 *
 * 管理和执行ICAsync同步的业务规则，包括：
 * 1. 学期全量同步限制规则
 * 2. 同步类型互斥规则
 */

import type { Logger } from '@stratix/core';
import type { WorkflowInstance } from '@stratix/tasks';
import type {
  IICAsyncSyncHistoryService,
  SyncType
} from './ICAsyncSyncHistoryService.js';

/**
 * 规则验证结果
 */
export interface RuleValidationResult {
  /** 是否允许执行 */
  allowed: boolean;
  /** 拒绝原因 */
  reason?: string;
  /** 冲突的实例 */
  conflictingInstance?: WorkflowInstance;
  /** 冲突的同步类型 */
  conflictingType?: SyncType;
  /** 规则名称 */
  ruleName: string;
}

/**
 * 规则验证上下文
 */
export interface RuleValidationContext {
  /** 学年学期 */
  xnxq: string;
  /** 同步类型 */
  syncType: SyncType;
  /** 额外的上下文数据 */
  metadata?: Record<string, any>;
}

/**
 * 同步执行规则接口
 */
export interface ISyncExecutionRule {
  /** 规则名称 */
  readonly name: string;
  /** 规则描述 */
  readonly description: string;
  /** 规则优先级（数字越小优先级越高） */
  readonly priority: number;

  /**
   * 验证规则
   */
  validate(context: RuleValidationContext): Promise<RuleValidationResult>;
}

/**
 * 同步执行规则引擎接口
 */
export interface ISyncExecutionRuleEngine {
  /**
   * 注册规则
   */
  registerRule(rule: ISyncExecutionRule): void;

  /**
   * 移除规则
   */
  removeRule(ruleName: string): void;

  /**
   * 验证同步执行
   */
  validateSyncExecution(
    xnxq: string,
    syncType: SyncType
  ): Promise<RuleValidationResult>;

  /**
   * 获取所有注册的规则
   */
  getRegisteredRules(): ISyncExecutionRule[];
}

/**
 * 学期全量同步限制规则
 * 规则：每个学期只能执行一次全量同步，即使前一次失败也不能重复执行
 */
export class SemesterFullSyncLimitRule implements ISyncExecutionRule {
  readonly name = 'SemesterFullSyncLimit';
  readonly description = '学期全量同步限制：每个学期只能执行一次全量同步';
  readonly priority = 1; // 最高优先级

  constructor(
    private readonly syncHistoryService: IICAsyncSyncHistoryService,
    private readonly logger: Logger
  ) {}

  async validate(
    context: RuleValidationContext
  ): Promise<RuleValidationResult> {
    const { xnxq, syncType } = context;

    // 只对全量同步应用此规则
    if (syncType !== 'full') {
      return {
        allowed: true,
        ruleName: this.name
      };
    }

    try {
      this.logger.debug('执行学期全量同步限制规则检查', { xnxq, syncType });

      // 检查是否已有全量同步记录
      const hasRecordResult =
        await this.syncHistoryService.hasFullSyncRecord(xnxq);

      if (!hasRecordResult.success) {
        this.logger.error('查询全量同步记录失败', {
          xnxq,
          error: hasRecordResult.error
        });
        return {
          allowed: false,
          reason: `检查全量同步记录失败: ${hasRecordResult.error}`,
          ruleName: this.name
        };
      }

      if (hasRecordResult.data) {
        // 获取最新的全量同步实例
        const latestInstanceResult =
          await this.syncHistoryService.getLatestSyncInstance(xnxq, 'full');

        let conflictingInstance: WorkflowInstance | undefined;
        if (latestInstanceResult.success && latestInstanceResult.data) {
          conflictingInstance = latestInstanceResult.data;
        }

        this.logger.warn('学期已存在全量同步记录，不允许重复执行', {
          xnxq,
          conflictingInstanceId: conflictingInstance?.id
        });

        return {
          allowed: false,
          reason: `学期 ${xnxq} 已执行过全量同步，不允许重复执行`,
          conflictingInstance,
          conflictingType: 'full',
          ruleName: this.name
        };
      }

      this.logger.debug('学期全量同步限制规则检查通过', { xnxq });

      return {
        allowed: true,
        ruleName: this.name
      };
    } catch (error) {
      this.logger.error('学期全量同步限制规则检查异常', {
        xnxq,
        syncType,
        error
      });
      return {
        allowed: false,
        reason: `规则检查异常: ${error instanceof Error ? error.message : String(error)}`,
        ruleName: this.name
      };
    }
  }
}

/**
 * 同步类型互斥规则
 * 规则：在任意时刻，只能有一个同步类型的工作流在执行
 */
export class SyncTypeMutexRule implements ISyncExecutionRule {
  readonly name = 'SyncTypeMutex';
  readonly description = '同步类型互斥：同一时刻只能有一个同步类型在执行';
  readonly priority = 2;

  constructor(
    private readonly syncHistoryService: IICAsyncSyncHistoryService,
    private readonly logger: Logger
  ) {}

  async validate(
    context: RuleValidationContext
  ): Promise<RuleValidationResult> {
    const { xnxq, syncType } = context;

    try {
      this.logger.debug('执行同步类型互斥规则检查', { xnxq, syncType });

      // 检查是否有任何类型的同步正在运行
      const runningResult = await this.syncHistoryService.getRunningSync(xnxq);

      if (!runningResult.success) {
        this.logger.error('查询运行中同步失败', {
          xnxq,
          error: runningResult.error
        });
        return {
          allowed: false,
          reason: `检查运行中同步失败: ${runningResult.error}`,
          ruleName: this.name
        };
      }

      if (runningResult.data) {
        const runningSync = runningResult.data;

        this.logger.warn('发现冲突的运行中同步实例', {
          xnxq,
          requestedType: syncType,
          conflictingType: runningSync.syncType,
          conflictingInstanceId: runningSync.instance.id
        });

        return {
          allowed: false,
          reason: `学期 ${xnxq} 已有 ${runningSync.syncType} 同步正在执行，与 ${syncType} 同步互斥`,
          conflictingInstance: runningSync.instance,
          conflictingType: runningSync.syncType,
          ruleName: this.name
        };
      }

      this.logger.debug('同步类型互斥规则检查通过', { xnxq, syncType });

      return {
        allowed: true,
        ruleName: this.name
      };
    } catch (error) {
      this.logger.error('同步类型互斥规则检查异常', { xnxq, syncType, error });
      return {
        allowed: false,
        reason: `规则检查异常: ${error instanceof Error ? error.message : String(error)}`,
        ruleName: this.name
      };
    }
  }
}

/**
 * 同步执行规则引擎实现
 */
export default class SyncExecutionRuleEngine
  implements ISyncExecutionRuleEngine
{
  private readonly rules = new Map<string, ISyncExecutionRule>();

  constructor(
    private readonly icAsyncSyncHistoryService: IICAsyncSyncHistoryService,
    private readonly logger: Logger
  ) {
    this.registerDefaultRules();
  }

  /**
   * 注册默认规则
   */
  private registerDefaultRules(): void {
    // 注册学期全量同步限制规则
    this.registerRule(
      new SemesterFullSyncLimitRule(this.icAsyncSyncHistoryService, this.logger)
    );

    // 注册同步类型互斥规则
    this.registerRule(
      new SyncTypeMutexRule(this.icAsyncSyncHistoryService, this.logger)
    );

    this.logger.info('默认同步执行规则已注册', {
      ruleCount: this.rules.size,
      rules: Array.from(this.rules.keys())
    });
  }

  /**
   * 注册规则
   */
  registerRule(rule: ISyncExecutionRule): void {
    this.rules.set(rule.name, rule);
    this.logger.debug('注册同步执行规则', {
      ruleName: rule.name,
      description: rule.description,
      priority: rule.priority
    });
  }

  /**
   * 移除规则
   */
  removeRule(ruleName: string): void {
    const removed = this.rules.delete(ruleName);
    if (removed) {
      this.logger.debug('移除同步执行规则', { ruleName });
    } else {
      this.logger.warn('尝试移除不存在的规则', { ruleName });
    }
  }

  /**
   * 验证同步执行
   */
  async validateSyncExecution(
    xnxq: string,
    syncType: SyncType
  ): Promise<RuleValidationResult> {
    this.logger.debug('开始同步执行规则验证', { xnxq, syncType });

    const context: RuleValidationContext = {
      xnxq,
      syncType
    };

    // 获取所有规则并按优先级排序
    const sortedRules = Array.from(this.rules.values()).sort(
      (a, b) => a.priority - b.priority
    );

    // 逐个执行规则验证
    for (const rule of sortedRules) {
      try {
        this.logger.debug('执行规则验证', {
          ruleName: rule.name,
          xnxq,
          syncType
        });

        const result = await rule.validate(context);

        if (!result.allowed) {
          this.logger.warn('规则验证失败', {
            ruleName: rule.name,
            xnxq,
            syncType,
            reason: result.reason
          });

          return result;
        }

        this.logger.debug('规则验证通过', {
          ruleName: rule.name,
          xnxq,
          syncType
        });
      } catch (error) {
        this.logger.error('规则验证异常', {
          ruleName: rule.name,
          xnxq,
          syncType,
          error
        });

        return {
          allowed: false,
          reason: `规则 ${rule.name} 验证异常: ${error instanceof Error ? error.message : String(error)}`,
          ruleName: rule.name
        };
      }
    }

    this.logger.info('所有同步执行规则验证通过', {
      xnxq,
      syncType,
      ruleCount: sortedRules.length
    });

    return {
      allowed: true,
      ruleName: 'AllRules'
    };
  }

  /**
   * 获取所有注册的规则
   */
  getRegisteredRules(): ISyncExecutionRule[] {
    return Array.from(this.rules.values()).sort(
      (a, b) => a.priority - b.priority
    );
  }
}
