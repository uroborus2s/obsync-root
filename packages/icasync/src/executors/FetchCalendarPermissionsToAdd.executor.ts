/**
 * 获取需要添加日历权限的用户信息处理器
 *
 * 功能：
 * 1. 查询需要添加权限的用户列表（学生和教师）
 * 2. 根据kkh获取对应的用户ID列表
 * 3. 按照100个用户为一组进行分组处理
 * 4. 返回格式化的权限添加记录列表
 */

import { Executor, type Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import { sql } from '@stratix/database';
import {
  type ExecutionContext,
  type ExecutionResult,
  type TaskExecutor
} from '@stratix/tasks';

/**
 * 获取需要添加权限配置接口
 */
export interface FetchCalendarPermissionsToAddConfig {
  /** 学年学期 */
  xnxq: string;
  /** 是否包含参与者信息 */
  includeParticipantInfo?: boolean;
  /** 最大记录数 */
  maxRecords?: number;
  /** 每批处理的用户数量 */
  batchSize?: number;
}

/**
 * 批次信息接口
 */
export interface BatchInfo {
  /** 批次编号 */
  batchNumber: number;
  /** 批次大小 */
  batchSize: number;
  /** 总批次数 */
  totalBatches: number;
  /** 用户数量 */
  userCount: number;
}

/**
 * 权限添加记录接口
 */
export interface CalendarPermissionToAdd {
  /** 开课号 */
  kkh: string;
  /** 合并的用户列表（学生和教师ID，逗号分隔） */
  merged_user_lists: string[][];
  /** 批次信息 */
  batch_info: BatchInfo;
}

/**
 * 获取需要添加权限结果接口
 */
export interface FetchCalendarPermissionsToAddResult {
  /** 权限添加记录列表 */
  items: CalendarPermissionToAdd[];
  /** 处理的课程数量 */
  processedCourses: number;
  /** 总用户数量 */
  totalUsers: number;
  /** 总批次数量 */
  totalBatches: number;
  /** 执行时长(ms) */
  duration: number;
  /** 错误信息列表 */
  errors?: string[];
}

/**
 * 获取需要添加日历权限的用户信息处理器
 *
 * 功能：
 * 1. 从out_jw_kcb_xs和out_jw_kcb_js表查询需要添加权限的用户
 * 2. 合并学生和教师ID列表
 * 3. 按照指定大小进行分组处理
 * 4. 返回按课程号分组的用户列表
 */
@Executor({
  name: 'fetchCalendarPermissionsToAdd',
  description: '获取需要添加日历权限的用户信息处理器',
  version: '1.0.0',
  tags: ['calendar', 'permissions', 'add', 'fetch'],
  category: 'icasync'
})
export default class FetchCalendarPermissionsToAddExecutor
  implements TaskExecutor
{
  readonly name = 'fetchCalendarPermissionsToAdd';
  readonly description = '获取需要添加日历权限的用户信息处理器';
  readonly version = '1.0.0';

  constructor(
    private databaseApi: DatabaseAPI,
    private logger: Logger
  ) {}

  /**
   * 执行获取需要添加权限的用户信息任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FetchCalendarPermissionsToAddConfig;
    const batchSize = config.batchSize || 100;

    this.logger.info('开始获取需要添加权限的用户信息', {
      xnxq: config.xnxq,
      includeParticipantInfo: config.includeParticipantInfo,
      maxRecords: config.maxRecords,
      batchSize
    });

    try {
      // 执行SQL查询获取需要添加权限的用户列表
      const result = await this.rightbaseApi.executeQuery(
        async (db) => {
          const query = sql<{ kkh: string; merged_user_list: string }>`
          SELECT 
            kkh,
            GROUP_CONCAT(DISTINCT user_list SEPARATOR ', ') AS merged_user_list
          FROM (
            -- 子查询：分别获取学生和教师的列表
            SELECT 
              kkh, 
              GROUP_CONCAT(DISTINCT xh SEPARATOR ', ') AS user_list 
            FROM 
              out_jw_kcb_xs 
            WHERE gx_zt = '3' AND zt != 'delete'
            GROUP BY 
              kkh
            UNION ALL
            SELECT 
              kkh, 
              GROUP_CONCAT(DISTINCT gh SEPARATOR ', ') AS user_list 
            FROM 
              out_jw_kcb_js 
            WHERE gx_zt = '3' AND zt != 'delete'
            GROUP BY 
              kkh
          ) AS temp
          GROUP BY kkh
        `;

          const queryResult = await query.execute(db);
          return queryResult.rows;
        },
        { connectionName: 'syncdb', readonly: true }
      );

      if (isLeft(result)) {
        throw new Error(
          result.error?.message || '查询需要添加权限的用户信息失败'
        );
      }

      const rawData = result.right || [];

      // 处理分组逻辑 - 为每个kkh生成分组的用户列表
      const permissionsToAdd: CalendarPermissionToAdd[] = [];
      let totalUsers = 0;
      let totalBatches = 0;

      for (const record of rawData) {
        if (!record.merged_user_list) {
          continue;
        }

        // 获取该kkh的用户分组
        const userBatches = this.processBatchedPermissions(
          record.kkh,
          record.merged_user_list,
          batchSize
        );

        // 为每个批次创建一个CalendarPermissionToAdd对象
        userBatches.forEach((batch, index) => {
          const batchInfo: BatchInfo = {
            batchNumber: index + 1,
            batchSize: batch.length,
            totalBatches: userBatches.length,
            userCount: batch.length
          };

          permissionsToAdd.push({
            kkh: record.kkh,
            merged_user_lists: userBatches,
            batch_info: batchInfo
          });

          totalUsers += batch.length;
        });

        totalBatches += userBatches.length;
      }

      const duration = Date.now() - startTime;

      // 统计信息
      const processedCourses = new Set(rawData.map((r) => r.kkh)).size;

      const executionResult: FetchCalendarPermissionsToAddResult = {
        items: permissionsToAdd,
        processedCourses,
        totalUsers,
        totalBatches,
        duration
      };

      this.logger.info('成功获取需要添加权限的用户信息', {
        processedCourses,
        totalUsers,
        totalBatches,
        duration
      });

      return right(executionResult
      );
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('获取需要添加权限的用户信息失败', {
        error: errorMessage,
        duration,
        xnxq: config.xnxq
      });

      return {
        success: false,
        error: `获取需要添加权限的用户信息失败: ${errorMessage}`
      };
    }
  }

  /**
   * 处理分组权限逻辑
   * 将用户按照指定大小分组，返回每个kkh对应的用户二维数组
   */
  private processBatchedPermissions(
    kkh: string,
    userList: string,
    batchSize: number = 100
  ): string[][] {
    if (!userList || !userList.trim()) {
      return [];
    }

    // 解析用户ID列表
    const userIds = userList
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);

    if (userIds.length === 0) {
      return [];
    }

    // 按批次分组，返回二维数组
    const batches: string[][] = [];
    for (let i = 0; i < userIds.length; i += batchSize) {
      const batch = userIds.slice(i, i + batchSize);
      batches.push(batch);
    }

    return batches;
  }

  /**
   * 验证配置
   */
  validateConfig(config: any): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    if (!config.xnxq || typeof config.xnxq !== 'string') {
      errors.push('xnxq 参数是必需的且必须是字符串');
    }

    if (
      config.maxRecords !== undefined &&
      (typeof config.maxRecords !== 'number' || config.maxRecords <= 0)
    ) {
      errors.push('maxRecords 参数必须是正整数');
    }

    if (
      config.batchSize !== undefined &&
      (typeof config.batchSize !== 'number' ||
        config.batchSize <= 0 ||
        config.batchSize > 100)
    ) {
      errors.push('batchSize 参数必须是1-100之间的正整数');
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
      // 检查数据库连接
      const result = await this.rightbaseApi.executeQuery(
        async (db) => {
          const query = sql`SELECT 1 as test`;
          return await query.execute(db);
        },
        { connectionName: 'syncdb', readonly: true }
      );

      if (isLeft(result)) {
        this.logger.warn('数据库连接检查失败');
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
