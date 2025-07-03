/**
 * 用户日历仓库
 * 处理user_calendar表的数据操作
 */

import { Logger } from '@stratix/core';
import { Kysely } from '@stratix/database';
import { ExtendedDatabase, UserCalendarEntity } from './index.js';

/**
 * 创建用户日历参数
 */
export interface CreateUserCalendarParams {
  wpsId?: string;
  xgh: string;
  name: string;
  calendar_id: string;
  status?: 'normal';
}

/**
 * 关联日历ID和学号参数
 */
export interface AssociateCalendarParams {
  xgh: string;
  calendar_id: string;
  name?: string;
  wpsId?: string;
  status?: 'normal';
}

/**
 * 更新用户日历参数
 */
export interface UpdateUserCalendarParams {
  wpsId?: string;
  name?: string;
  calendar_id?: string;
  status?: 'normal';
}

/**
 * 用户日历仓库
 */
export class UserCalendarRepository {
  constructor(
    private db: Kysely<ExtendedDatabase>,
    private log: Logger
  ) {}

  /**
   * 根据学号/工号获取用户日历信息
   */
  async findByXgh(xgh: string): Promise<UserCalendarEntity | null> {
    try {
      this.log.debug({ xgh }, '根据学号/工号查询用户日历');

      const result = await this.db
        .selectFrom('user_calendar')
        .selectAll()
        .where('xgh', '=', xgh)
        .where('status', '=', 'normal')
        .executeTakeFirst();

      if (result) {
        this.log.debug(
          { xgh, calendarId: result.calendar_id },
          '找到用户日历信息'
        );
        return result as UserCalendarEntity;
      }

      this.log.debug({ xgh }, '未找到用户日历信息');
      return null;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xgh
        },
        '查询用户日历失败'
      );
      throw error;
    }
  }

  /**
   * 根据WPS用户ID获取用户日历信息
   */
  async findByWpsId(wpsId: string): Promise<UserCalendarEntity | null> {
    try {
      this.log.debug({ wpsId }, '根据WPS用户ID查询用户日历');

      const result = await this.db
        .selectFrom('user_calendar')
        .selectAll()
        .where('wpsId', '=', wpsId)
        .where('status', '=', 'normal')
        .executeTakeFirst();

      if (result) {
        this.log.debug(
          { wpsId, calendarId: result.calendar_id },
          '找到用户日历信息'
        );
        return result as UserCalendarEntity;
      }

      this.log.debug({ wpsId }, '未找到用户日历信息');
      return null;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          wpsId
        },
        '查询用户日历失败'
      );
      throw error;
    }
  }

  /**
   * 批量获取用户日历信息
   */
  async findByXghList(xghList: string[]): Promise<UserCalendarEntity[]> {
    try {
      this.log.debug({ count: xghList.length }, '批量查询用户日历');

      if (xghList.length === 0) {
        return [];
      }

      const results = await this.db
        .selectFrom('user_calendar')
        .selectAll()
        .where('xgh', 'in', xghList)
        .where('status', '=', 'normal')
        .execute();

      this.log.debug(
        {
          requestCount: xghList.length,
          foundCount: results.length
        },
        '批量查询用户日历完成'
      );

      return results as UserCalendarEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          count: xghList.length
        },
        '批量查询用户日历失败'
      );
      throw error;
    }
  }

  /**
   * 创建用户日历记录
   */
  async create(params: CreateUserCalendarParams): Promise<UserCalendarEntity> {
    try {
      this.log.debug(
        { xgh: params.xgh, name: params.name },
        '创建用户日历记录'
      );

      const result = await this.db
        .insertInto('user_calendar')
        .values({
          wpsId: params.wpsId || null,
          xgh: params.xgh,
          name: params.name,
          calendar_id: params.calendar_id,
          status: params.status || 'normal',
          ctime: new Date(),
          mtime: null
        })
        .executeTakeFirstOrThrow();

      const insertId = Number(result.insertId);

      // 获取刚创建的记录
      const createdRecord = await this.db
        .selectFrom('user_calendar')
        .selectAll()
        .where('id', '=', insertId)
        .executeTakeFirstOrThrow();

      this.log.info(
        {
          id: insertId,
          xgh: params.xgh,
          calendarId: params.calendar_id
        },
        '用户日历记录创建成功'
      );

      return createdRecord as UserCalendarEntity;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xgh: params.xgh
        },
        '创建用户日历记录失败'
      );
      throw error;
    }
  }

  /**
   * 更新用户日历记录
   */
  async updateByXgh(
    xgh: string,
    params: UpdateUserCalendarParams
  ): Promise<boolean> {
    try {
      this.log.debug({ xgh, params }, '更新用户日历记录');

      const result = await this.db
        .updateTable('user_calendar')
        .set({
          ...params,
          mtime: new Date()
        })
        .where('xgh', '=', xgh)
        .executeTakeFirst();

      const updated = Number(result.numUpdatedRows) > 0;

      this.log.info(
        { xgh, updated, params },
        updated ? '用户日历记录更新成功' : '用户日历记录未找到或无需更新'
      );

      return updated;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xgh,
          params
        },
        '更新用户日历记录失败'
      );
      throw error;
    }
  }

  /**
   * 删除用户日历记录（软删除，设置状态）
   */
  async deleteByXgh(xgh: string): Promise<boolean> {
    try {
      this.log.debug({ xgh }, '删除用户日历记录');

      const result = await this.db
        .updateTable('user_calendar')
        .set({
          status: null,
          mtime: new Date()
        })
        .where('xgh', '=', xgh)
        .executeTakeFirst();

      const deleted = Number(result.numUpdatedRows) > 0;

      this.log.info(
        { xgh, deleted },
        deleted ? '用户日历记录删除成功' : '用户日历记录未找到'
      );

      return deleted;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xgh
        },
        '删除用户日历记录失败'
      );
      throw error;
    }
  }

  /**
   * 检查用户是否有有效的日历
   */
  async hasValidCalendar(xgh: string): Promise<boolean> {
    try {
      const userCalendar = await this.findByXgh(xgh);
      return userCalendar !== null && !!userCalendar.calendar_id;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xgh
        },
        '检查用户日历有效性失败'
      );
      return false;
    }
  }

  /**
   * 获取所有有效的用户日历
   */
  async findAllValid(): Promise<UserCalendarEntity[]> {
    try {
      this.log.debug('查询所有有效的用户日历');

      const results = await this.db
        .selectFrom('user_calendar')
        .selectAll()
        .where('status', '=', 'normal')
        .where('calendar_id', 'is not', null)
        .execute();

      this.log.debug({ count: results.length }, '查询所有有效用户日历完成');

      return results as UserCalendarEntity[];
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error)
        },
        '查询所有有效用户日历失败'
      );
      throw error;
    }
  }

  /**
   * 关联日历ID和学号
   * 如果记录已存在则更新，不存在则创建
   */
  async associateCalendar(
    params: AssociateCalendarParams
  ): Promise<UserCalendarEntity> {
    try {
      this.log.debug(
        { xgh: params.xgh, calendarId: params.calendar_id },
        '关联日历ID和学号'
      );

      // 先检查是否已存在记录
      const existingRecord = await this.findByXgh(params.xgh);

      if (existingRecord) {
        // 如果记录已存在，更新日历ID
        const updateParams: UpdateUserCalendarParams = {
          calendar_id: params.calendar_id,
          name: params.name || existingRecord.name || undefined,
          status: params.status || 'normal'
        };

        if (params.wpsId || existingRecord.wpsId) {
          updateParams.wpsId =
            params.wpsId ||
            (existingRecord.wpsId ? existingRecord.wpsId : undefined);
        }

        await this.updateByXgh(params.xgh, updateParams);

        // 返回更新后的记录
        const updatedRecord = await this.findByXgh(params.xgh);

        this.log.info(
          { xgh: params.xgh, calendarId: params.calendar_id },
          '日历ID关联更新成功'
        );

        return updatedRecord!;
      } else {
        // 如果记录不存在，创建新记录
        const newRecord = await this.create({
          xgh: params.xgh,
          calendar_id: params.calendar_id,
          name: params.name || `用户_${params.xgh}`,
          wpsId: params.wpsId,
          status: params.status || 'normal'
        });

        this.log.info(
          { xgh: params.xgh, calendarId: params.calendar_id },
          '日历ID关联创建成功'
        );

        return newRecord;
      }
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xgh: params.xgh,
          calendarId: params.calendar_id
        },
        '关联日历ID和学号失败'
      );
      throw error;
    }
  }

  /**
   * 批量关联日历ID和学号
   */
  async batchAssociateCalendar(
    associationList: AssociateCalendarParams[]
  ): Promise<UserCalendarEntity[]> {
    try {
      this.log.debug({ count: associationList.length }, '批量关联日历ID和学号');

      const results: UserCalendarEntity[] = [];

      for (const params of associationList) {
        try {
          const result = await this.associateCalendar(params);
          results.push(result);
        } catch (error) {
          this.log.error(
            {
              error: error instanceof Error ? error.message : String(error),
              xgh: params.xgh,
              calendarId: params.calendar_id
            },
            '单个关联操作失败，继续处理下一个'
          );
        }
      }

      this.log.info(
        {
          totalCount: associationList.length,
          successCount: results.length,
          failCount: associationList.length - results.length
        },
        '批量关联日历ID和学号完成'
      );

      return results;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          count: associationList.length
        },
        '批量关联日历ID和学号失败'
      );
      throw error;
    }
  }

  /**
   * 取消学号的日历关联（清空calendar_id）
   */
  async dissociateCalendar(xgh: string): Promise<boolean> {
    try {
      this.log.debug({ xgh }, '取消学号的日历关联');

      const result = await this.db
        .updateTable('user_calendar')
        .set({
          calendar_id: null,
          mtime: new Date()
        })
        .where('xgh', '=', xgh)
        .executeTakeFirst();

      const updated = Number(result.numUpdatedRows) > 0;

      this.log.info(
        { xgh, updated },
        updated ? '日历关联取消成功' : '未找到相关记录'
      );

      return updated;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          xgh
        },
        '取消日历关联失败'
      );
      throw error;
    }
  }

  /**
   * 根据calendar_id查找关联的学号
   */
  async findXghByCalendarId(calendarId: string): Promise<string | null> {
    try {
      this.log.debug({ calendarId }, '根据日历ID查找关联的学号');

      const result = await this.db
        .selectFrom('user_calendar')
        .select('xgh')
        .where('calendar_id', '=', calendarId)
        .where('status', '=', 'normal')
        .executeTakeFirst();

      if (result) {
        this.log.debug({ calendarId, xgh: result.xgh }, '找到关联的学号');
        return result.xgh;
      }

      this.log.debug({ calendarId }, '未找到关联的学号');
      return null;
    } catch (error) {
      this.log.error(
        {
          error: error instanceof Error ? error.message : String(error),
          calendarId
        },
        '根据日历ID查找学号失败'
      );
      throw error;
    }
  }
}
