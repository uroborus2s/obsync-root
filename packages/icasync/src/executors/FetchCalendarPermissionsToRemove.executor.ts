/**
 * 获取需要删除日历权限的用户信息处理器
 *
 * 功能：
 * 1. 查询需要删除权限的用户列表（学生和教师）
 * 2. 根据kkh获取对应的用户ID列表
 * 3. 返回格式化的权限删除记录列表
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
 * 获取需要删除权限配置接口
 */
export interface FetchCalendarPermissionsToRemoveConfig {
  /** 学年学期 */
  xnxq: string;
  /** 是否包含参与者信息 */
  includeParticipantInfo?: boolean;
  /** 最大记录数 */
  maxRecords?: number;
}

/**
 * 权限删除记录接口
 */
export interface CalendarPermissionToRemove {
  /** 开课号 */
  kkh: string;
  /** 合并的用户列表（学生和教师ID，逗号分隔） */
  merged_user_list: string;
}

/**
 * 获取需要删除权限结果接口
 */
export interface FetchCalendarPermissionsToRemoveResult {
  /** 权限删除记录列表 */
  permissionsToRemove: CalendarPermissionToRemove[];
  /** 处理的课程数量 */
  processedCourses: number;
  /** 总用户数量 */
  totalUsers: number;
  /** 执行时长(ms) */
  duration: number;
  /** 错误信息列表 */
  errors?: string[];
}

/**
 * 获取需要删除日历权限的用户信息处理器
 *
 * 功能：
 * 1. 从out_jw_kcb_xs和out_jw_kcb_js表查询需要删除权限的用户
 * 2. 合并学生和教师ID列表
 * 3. 返回按课程号分组的用户列表
 */
@Executor({
  name: 'fetchCalendarPermissionsToRemove',
  description: '获取需要删除日历权限的用户信息处理器',
  version: '1.0.0',
  tags: ['calendar', 'permissions', 'remove', 'fetch'],
  category: 'icasync'
})
export default class FetchCalendarPermissionsToRemoveExecutor
  implements TaskExecutor
{
  readonly name = 'fetchCalendarPermissionsToRemove';
  readonly description = '获取需要删除日历权限的用户信息处理器';
  readonly version = '1.0.0';

  constructor(
    private databaseApi: DatabaseAPI,
    private logger: Logger
  ) {}

  /**
   * 执行获取需要删除权限的用户信息任务
   */
  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const startTime = Date.now();
    const config = context.config as FetchCalendarPermissionsToRemoveConfig;

    this.logger.info('开始获取需要删除权限的用户信息', {
      xnxq: config.xnxq,
      includeParticipantInfo: config.includeParticipantInfo,
      maxRecords: config.maxRecords
    });

    try {
      // 执行SQL查询获取需要删除权限的用户列表
      const result = await this.rightbaseApi.executeQuery(
        async (db) => {
          const query = sql<CalendarPermissionToRemove>`
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
            WHERE gx_sj IS NULL OR sj > gx_sj
            GROUP BY 
              kkh
            UNION ALL
            SELECT 
              kkh, 
              GROUP_CONCAT(DISTINCT gh SEPARATOR ', ') AS user_list 
            FROM 
              out_jw_kcb_js 
            WHERE gx_sj IS NULL OR sj > gx_sj
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
          result.error?.message || '查询需要删除权限的用户信息失败'
        );
      }

      const permissionsToRemove = result.right || [];
      const duration = Date.now() - startTime;

      // 统计信息
      const processedCourses = permissionsToRemove.length;
      const totalUsers = permissionsToRemove.reduce((total, record) => {
        const userCount = record.merged_user_list
          ? record.merged_user_list.split(',').length
          : 0;
        return total + userCount;
      }, 0);

      const executionResult: FetchCalendarPermissionsToRemoveResult = {
        permissionsToRemove,
        processedCourses,
        totalUsers,
        duration
      };

      this.logger.info('成功获取需要删除权限的用户信息', {
        processedCourses,
        totalUsers,
        duration
      });

      return {
        success: true,
        data: {
          items: permissionsToRemove,
          ...executionResult
        }
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.error('获取需要删除权限的用户信息失败', {
        error: errorMessage,
        duration,
        xnxq: config.xnxq
      });

      return {
        success: false,
        error: `获取需要删除权限的用户信息失败: ${errorMessage}`
      };
    }
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
