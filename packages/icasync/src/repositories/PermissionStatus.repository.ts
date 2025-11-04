/**
 * 权限状态更新仓储
 *
 * 功能：
 * 1. 更新out_jw_kcb_xs表（学生课程关联）的gx_zt和gx_sj状态
 * 2. 更新out_jw_kcb_js表（教师课程关联）的gx_zt和gx_sj状态
 * 3. 支持根据kkh和xnxq批量更新状态
 */

import type { Logger } from '@stratix/core';
import type { DatabaseAPI, DatabaseResult } from '@stratix/database';
import {
  isRight,
  isLeft,
  eitherMap as map,
  eitherRight as right,
  eitherLeft as left
} from '@stratix/utils/functional';
import { QueryError, sql } from '@stratix/database';
import { format } from 'date-fns';

/**
 * 权限状态更新配置接口
 */
export interface PermissionStatusUpdateConfig {
  /** 开课号 */
  kkh: string;
  /** 学年学期 */
  xnxq?: string;
  /** 更新状态 */
  gxZt: string;
  /** 用户ID列表（可选，用于精确匹配） */
  userIds?: string[];
}

/**
 * 权限状态更新结果接口
 */
export interface PermissionStatusUpdateResult {
  /** 学生表更新数量 */
  studentUpdateCount: number;
  /** 教师表更新数量 */
  teacherUpdateCount: number;
  /** 总更新数量 */
  totalUpdateCount: number;
  /** 更新时间 */
  updateTime: string;
  /** 错误信息 */
  errors?: string[];
}

/**
 * 权限状态更新仓储接口
 */
export interface IPermissionStatusRepository {
  /**
   * 更新学生课程关联状态
   */
  updateStudentCourseStatus(
    config: PermissionStatusUpdateConfig
  ): Promise<DatabaseResult<number>>;

  /**
   * 更新教师课程关联状态
   */
  updateTeacherCourseStatus(
    config: PermissionStatusUpdateConfig
  ): Promise<DatabaseResult<number>>;

  /**
   * 批量更新权限状态（学生和教师）
   */
  updatePermissionStatus(
    config: PermissionStatusUpdateConfig
  ): Promise<DatabaseResult<PermissionStatusUpdateResult>>;
}

/**
 * 权限状态更新仓储实现
 */
export default class PermissionStatusRepository
  implements IPermissionStatusRepository
{
  constructor(
    private databaseApi: DatabaseAPI,
    private logger: Logger
  ) {}

  /**
   * 获取本地时间的MySQL datetime格式字符串
   */
  private getLocalMySQLDateTime(): string {
    return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
  }

  /**
   * 更新学生课程关联状态
   */
  async updateStudentCourseStatus(
    config: PermissionStatusUpdateConfig
  ): Promise<DatabaseResult<number>> {
    try {
      this.logger.debug(
        `开始更新学生课程关联状态, kkh: ${config.kkh}, gxZt: ${config.gxZt}`
      );

      const updateTime = this.getLocalMySQLDateTime();

      const result = await this.rightbaseApi.executeQuery(
        async (db) => {
          let query = sql`
          UPDATE out_jw_kcb_xs 
          SET 
            gx_zt = ${config.gxZt},
            gx_sj = ${updateTime}
          WHERE kkh = ${config.kkh}
        `;

          // 添加学年学期条件
          if (config.xnxq) {
            query = sql`${query} AND xnxq = ${config.xnxq}`;
          }

          // 添加用户ID条件
          if (config.userIds && config.userIds.length > 0) {
            query = sql`${query} AND xh IN (${sql.join(config.userIds)})`;
          }

          const result = await query.execute(db);
          return result.numAffectedRows ? Number(result.numAffectedRows) : 0;
        },
        { connectionName: 'syncdb' }
      );

      if (isRight(result)) {
        this.logger.debug('学生课程关联状态更新成功', {
          kkh: config.kkh,
          xnxq: config.xnxq,
          gxZt: config.gxZt,
          updatedCount: result.right,
          updateTime
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left('更新学生课程关联状态失败', {
        kkh: config.kkh,
        xnxq: config.xnxq,
        gxZt: config.gxZt,
        error: errorMessage
      });

      return {
        success: false,
        error: QueryError.create(`更新学生课程关联状态失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 更新教师课程关联状态
   */
  async updateTeacherCourseStatus(
    config: PermissionStatusUpdateConfig
  ): Promise<DatabaseResult<number>> {
    try {
      this.logger.debug(
        `开始更新教师课程关联状态, kkh: ${config.kkh}, gxZt: ${config.gxZt}`
      );

      const updateTime = this.getLocalMySQLDateTime();

      const result = await this.rightbaseApi.executeQuery(
        async (db) => {
          let query = sql`
          UPDATE out_jw_kcb_js 
          SET 
            gx_zt = ${config.gxZt},
            gx_sj = ${updateTime}
          WHERE kkh = ${config.kkh}
        `;

          // 添加学年学期条件
          if (config.xnxq) {
            query = sql`${query} AND xnxq = ${config.xnxq}`;
          }

          // 添加用户ID条件
          if (config.userIds && config.userIds.length > 0) {
            query = sql`${query} AND gh IN (${sql.join(config.userIds)})`;
          }

          const result = await query.execute(db);
          return result.numAffectedRows ? Number(result.numAffectedRows) : 0;
        },
        { connectionName: 'syncdb' }
      );

      if (isRight(result)) {
        this.logger.debug('教师课程关联状态更新成功', {
          kkh: config.kkh,
          xnxq: config.xnxq,
          gxZt: config.gxZt,
          updatedCount: result.right,
          updateTime
        });
      }

      return result;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left('更新教师课程关联状态失败', {
        kkh: config.kkh,
        xnxq: config.xnxq,
        gxZt: config.gxZt,
        error: errorMessage
      });

      return {
        success: false,
        error: QueryError.create(`更新教师课程关联状态失败: ${errorMessage}`)
      };
    }
  }

  /**
   * 批量更新权限状态（学生和教师）
   */
  async updatePermissionStatus(
    config: PermissionStatusUpdateConfig
  ): Promise<DatabaseResult<PermissionStatusUpdateResult>> {
    try {
      this.logger.info(
        `开始批量更新权限状态,kkh: ${config.kkh},gxZt: ${config.gxZt},userCount: ${config.userIds?.length}`
      );

      const updateTime = this.getLocalMySQLDateTime();

      // 分别更新学生和教师表
      const [studentResult, teacherResult] = await Promise.all([
        this.updateStudentCourseStatus(config),
        this.updateTeacherCourseStatus(config)
      ]);

      const errors: string[] = [];
      let studentUpdateCount = 0;
      let teacherUpdateCount = 0;

      if (isRight(studentResult)) {
        studentUpdateCount = studentResult.right;
      } else {
        errors.push(`学生表更新失败: ${studentResult.left?.message}`);
      }

      if (isRight(teacherResult)) {
        teacherUpdateCount = teacherResult.right;
      } else {
        errors.push(`教师表更新失败: ${teacherResult.left?.message}`);
      }

      const result: PermissionStatusUpdateResult = {
        studentUpdateCount,
        teacherUpdateCount,
        totalUpdateCount: studentUpdateCount + teacherUpdateCount,
        updateTime,
        errors: errors.length > 0 ? errors : undefined
      };

      this.logger.info('批量更新权限状态完成', {
        kkh: config.kkh,
        xnxq: config.xnxq,
        gxZt: config.gxZt,
        studentUpdateCount,
        teacherUpdateCount,
        totalUpdateCount: result.totalUpdateCount,
        hasErrors: errors.length > 0
      });

      return right(result
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.left('批量更新权限状态失败', {
        kkh: config.kkh,
        xnxq: config.xnxq,
        gxZt: config.gxZt,
        error: errorMessage
      });

      return {
        success: false,
        error: QueryError.create(`批量更新权限状态失败: ${errorMessage}`)
      };
    }
  }
}
