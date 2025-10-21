// @wps/app-icasync 日历参与者同步服务
// 直接使用 databaseApi 执行 SQL 语句实现参与者同步

import type { Logger } from '@stratix/core';
import type { DatabaseAPI } from '@stratix/database';
import type { WpsCalendarAdapter } from '@stratix/was-v7';

/**
 * 参与者信息
 */
interface ParticipantInfo {
  userId: string;
  userType: 'teacher' | 'student';
  userName?: string;
}

/**
 * 课程参与者同步结果
 */
interface CourseParticipantSyncResult {
  kkh: string;
  calendarId: string;
  success: boolean;
  addedCount: number;
  removedCount: number;
  failedCount: number;
  errors?: string[];
  duration?: number;
}

/**
 * 日历参与者同步服务
 */
export default class CalendarParticipantsSyncService {
  constructor(
    private readonly databaseApi: DatabaseAPI,
    private readonly wasV7ApiCalendar: WpsCalendarAdapter,
    private readonly logger: Logger
  ) {}

  /**
   * 获取所有有效的课程映射
   */
  async getValidCalendarMappings(): Promise<
    Array<{ kkh: string; calendar_id: string }>
  > {
    try {
      this.logger.info('获取所有有效的课程映射');

      const result = await this.databaseApi.executeQuery(async (db) => {
        // 执行 SQL 查询获取有效的课程映射
        const sql = `
          SELECT ic.*
          FROM icasync.icasync_calendar_mapping ic
          INNER JOIN (
            SELECT DISTINCT kkh
            FROM syncdb.u_jw_kcb_cur
            WHERE zt IN ('update', 'add')
          ) uk_filtered
            ON ic.kkh = uk_filtered.kkh
          WHERE ic.is_deleted = false
        `;

        return await (db as any).raw.query(sql);
      });

      const mappings = (result as unknown as any[]) || [];
      this.logger.info(`获取到 ${mappings.length} 条有效的课程映射`);

      return mappings;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error('获取有效课程映射失败', { error: errorMsg });
      throw error;
    }
  }

  /**
   * 获取课程的所有参与者（教师+学生）
   */
  async getCourseParticipants(kkh: string): Promise<ParticipantInfo[]> {
    try {
      if (!kkh || kkh.trim() === '') {
        throw new Error('开课号不能为空');
      }

      this.logger.info(`获取课程 ${kkh} 的所有参与者`);

      const result = await this.databaseApi.executeQuery(async (db) => {
        // 获取教师
        const teacherSql = `
          SELECT gh AS userId, xm AS userName
          FROM syncdb.out_jsxx
          WHERE kkh = '${kkh}' AND zt IN ('update', 'add')
        `;
        const teachers = await (db as any).raw.query(teacherSql);

        // 获取学生
        const studentSql = `
          SELECT xh AS userId, xm AS userName
          FROM syncdb.out_xsxx
          WHERE kkh = '${kkh}' AND zt IN ('update', 'add')
        `;
        const students = await (db as any).raw.query(studentSql);

        return { teachers: teachers as any[], students: students as any[] };
      });

      const { teachers, students } = result as any;

      const participants: ParticipantInfo[] = [
        ...teachers.map((t: any) => ({
          userId: t.userId,
          userType: 'teacher' as const,
          userName: t.userName
        })),
        ...students.map((s: any) => ({
          userId: s.userId,
          userType: 'student' as const,
          userName: s.userName
        }))
      ];

      this.logger.info(
        `获取到课程 ${kkh} 的 ${participants.length} 个参与者（教师: ${teachers.length}, 学生: ${students.length}）`
      );

      return participants;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`获取课程 ${kkh} 的参与者失败`, { error: errorMsg });
      throw error;
    }
  }

  /**
   * 获取 WPS 日历当前参与者
   */
  private async getWpsCalendarParticipants(
    calendarId: string
  ): Promise<ParticipantInfo[]> {
    try {
      const permissions = await this.wasV7ApiCalendar.getAllCalendarPermissions(
        {
          calendar_id: calendarId,
          page_size: 100
        }
      );

      return (permissions || []).map((perm: any) => ({
        userId: perm.user_id,
        userType: perm.role === 'writer' ? 'teacher' : 'student',
        userName: perm.display_name
      }));
    } catch (error) {
      this.logger.warn(`获取 WPS 日历参与者失败: ${error}`, { calendarId });
      return [];
    }
  }

  /**
   * 计算参与者差异
   */
  private calculateDiff(
    wpsParticipants: ParticipantInfo[],
    dbParticipants: ParticipantInfo[]
  ) {
    const wpsUserIds = new Set(wpsParticipants.map((p) => p.userId));
    const dbUserIds = new Set(dbParticipants.map((p) => p.userId));

    const toAdd = dbParticipants.filter((p) => !wpsUserIds.has(p.userId));
    const toRemove = wpsParticipants.filter((p) => !dbUserIds.has(p.userId));

    return { toAdd, toRemove };
  }

  /**
   * 同步单个课程的参与者
   */
  async syncCourseParticipants(
    kkh: string,
    calendarId: string
  ): Promise<CourseParticipantSyncResult> {
    const startTime = Date.now();

    try {
      this.logger.info(`开始同步课程 ${kkh} 的参与者`, { calendarId });

      // 1. 获取 WPS 日历当前参与者
      const wpsParticipants = await this.getWpsCalendarParticipants(calendarId);
      this.logger.debug(`WPS 日历当前参与者数: ${wpsParticipants.length}`, {
        kkh,
        calendarId
      });

      // 2. 获取数据库中的实际参与者
      const dbParticipants = await this.getCourseParticipants(kkh);
      this.logger.debug(`数据库参与者数: ${dbParticipants.length}`, {
        kkh,
        calendarId
      });

      // 3. 对比差异
      const { toAdd, toRemove } = this.calculateDiff(
        wpsParticipants,
        dbParticipants
      );
      this.logger.info(`参与者差异对比完成`, {
        kkh,
        calendarId,
        toAdd: toAdd.length,
        toRemove: toRemove.length
      });

      // 4. 批量新增参与者
      let addedCount = 0;
      if (toAdd.length > 0) {
        addedCount = await this.addParticipants(calendarId, toAdd);
      }

      // 5. 批量删除参与者
      let removedCount = 0;
      if (toRemove.length > 0) {
        removedCount = await this.removeParticipants(calendarId, toRemove);
      }

      const duration = Date.now() - startTime;
      this.logger.info(`课程 ${kkh} 的参与者同步完成`, {
        calendarId,
        addedCount,
        removedCount,
        duration
      });

      return {
        kkh,
        calendarId,
        success: true,
        addedCount,
        removedCount,
        failedCount: 0,
        duration
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const duration = Date.now() - startTime;

      this.logger.error(`课程 ${kkh} 的参与者同步失败`, {
        calendarId,
        error: errorMsg,
        duration
      });

      return {
        kkh,
        calendarId,
        success: false,
        addedCount: 0,
        removedCount: 0,
        failedCount: 1,
        errors: [errorMsg],
        duration
      };
    }
  }

  /**
   * 批量新增参与者
   */
  private async addParticipants(
    calendarId: string,
    participants: ParticipantInfo[]
  ): Promise<number> {
    const batchSize = 100;
    let addedCount = 0;

    for (let i = 0; i < participants.length; i += batchSize) {
      const batch = participants.slice(i, i + batchSize);

      try {
        const permissions = batch.map((p) => ({
          user_id: p.userId,
          role: (p.userType === 'teacher' ? 'writer' : 'reader') as
            | 'writer'
            | 'reader'
        }));

        await this.wasV7ApiCalendar.batchCreateCalendarPermissionsLimit({
          calendar_id: calendarId,
          permissions,
          id_type: 'external'
        });

        addedCount += batch.length;
        this.logger.debug(`成功添加 ${batch.length} 个参与者`, { calendarId });
      } catch (error) {
        this.logger.error(`添加参与者批次失败: ${error}`, { calendarId });
      }
    }

    return addedCount;
  }

  /**
   * 批量删除参与者
   */
  private async removeParticipants(
    calendarId: string,
    participants: ParticipantInfo[]
  ): Promise<number> {
    let removedCount = 0;

    for (const participant of participants) {
      try {
        const permissions =
          await this.wasV7ApiCalendar.getCalendarPermissionList({
            calendar_id: calendarId,
            page_size: 100
          });

        const permToDelete = permissions.items?.find(
          (p: any) => p.user_id === participant.userId
        );
        if (permToDelete) {
          await this.wasV7ApiCalendar.deleteCalendarPermission({
            calendar_id: calendarId,
            calendar_permission_id: permToDelete.id,
            id_type: 'external'
          });
          removedCount++;
        }
      } catch (error) {
        this.logger.warn(`删除参与者失败: ${participant.userId}`, {
          calendarId
        });
      }
    }

    return removedCount;
  }

  /**
   * 批量同步多个课程的参与者
   */
  async syncMultipleCourses(
    mappings: Array<{ kkh: string; calendar_id: string }>
  ): Promise<CourseParticipantSyncResult[]> {
    this.logger.info(`开始批量同步 ${mappings.length} 个课程的参与者`);

    const maxConcurrency = 5;
    const results: CourseParticipantSyncResult[] = [];

    // 分批处理
    for (let i = 0; i < mappings.length; i += maxConcurrency) {
      const batch = mappings.slice(i, i + maxConcurrency);
      const batchResults = await Promise.all(
        batch.map((mapping) =>
          this.syncCourseParticipants(mapping.kkh, mapping.calendar_id)
        )
      );
      results.push(...batchResults);
    }

    const successCount = results.filter((r) => r.success).length;
    const totalAdded = results.reduce((sum, r) => sum + r.addedCount, 0);
    const totalRemoved = results.reduce((sum, r) => sum + r.removedCount, 0);

    this.logger.info(`批量同步完成`, {
      total: mappings.length,
      success: successCount,
      totalAdded,
      totalRemoved
    });

    return results;
  }
}
