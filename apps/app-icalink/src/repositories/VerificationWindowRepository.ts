import type { Logger } from '@stratix/core';
import {
  BaseRepository,
  DataColumnType,
  SchemaBuilder
} from '@stratix/database';
import { isNone, isSome, type Maybe } from '@stratix/utils/functional';
import type {
  IcalinkDatabase,
  IcalinkVerificationWindow
} from '../types/database.js';

/**
 * 签到窗口表 Schema 定义
 */
const schema = new SchemaBuilder('icalink_verification_windows')
  .addColumn('id', DataColumnType.BIGINT, {
    primaryKey: true,
    autoIncrement: true
  })
  .addColumn('window_id', DataColumnType.STRING, {
    nullable: false,
    unique: true
  })
  .addColumn('course_id', DataColumnType.BIGINT, { nullable: false })
  .addColumn('verification_round', DataColumnType.INTEGER, { nullable: false })
  .addColumn('open_time', DataColumnType.TIMESTAMP, { nullable: false })
  .addColumn('close_time', DataColumnType.TIMESTAMP, { nullable: false })
  .addColumn('opened_by', DataColumnType.STRING, { nullable: false })
  .addColumn('status', DataColumnType.STRING, {
    nullable: false
  })
  .addColumn('duration_minutes', DataColumnType.INTEGER, { nullable: false })
  .addColumn('expected_checkin_count', DataColumnType.INTEGER, {
    nullable: false
  })
  .addColumn('actual_checkin_count', DataColumnType.INTEGER, {
    nullable: false
  })
  .addColumn('created_at', DataColumnType.TIMESTAMP, { nullable: false })
  .addColumn('updated_at', DataColumnType.TIMESTAMP, { nullable: false })
  .addIndex('idx_vw_course_status', ['course_id', 'status'])
  .addIndex('idx_vw_window_id', ['window_id'])
  .setComment('签到窗口表-存储教师开启的签到窗口信息')
  .build();

/**
 * 签到窗口仓储实现
 * 负责签到窗口数据的持久化和查询
 */
export default class VerificationWindowRepository extends BaseRepository<
  IcalinkDatabase,
  'icalink_verification_windows',
  IcalinkVerificationWindow
> {
  protected readonly tableName = 'icalink_verification_windows';
  protected readonly primaryKey = 'id';
  protected readonly tableSchema = schema;

  constructor(protected readonly logger: Logger) {
    super('default');
    this.logger.info('✅ VerificationWindowRepository initialized');
  }

  /**
   * 根据 window_id 查找签到窗口
   * @param windowId 窗口ID
   * @returns 签到窗口实体（可能不存在）
   */
  public async findByWindowId(
    windowId: string
  ): Promise<IcalinkVerificationWindow | undefined> {
    if (!windowId || windowId.trim() === '') {
      this.logger.warn('findByWindowId called with empty windowId');
      return undefined;
    }

    this.logger.debug({ windowId }, 'Finding verification window by window_id');

    const result = (await this.findOne((qb) =>
      qb.where('window_id', '=', windowId)
    )) as unknown as Maybe<IcalinkVerificationWindow>;

    return isSome(result) ? result.value : undefined;
  }

  /**
   * 根据课程ID查找最新的签到窗口
   * @param courseId 课程ID
   * @returns 最新的签到窗口（可能不存在）
   */
  public async findLatestByCourse(courseId: number): Promise<
    | {
        id: number;
        window_id: string;
        course_id: number;
        verification_round: number;
        open_time: Date;
        duration_minutes: number;
      }
    | undefined
  > {
    if (!courseId) {
      this.logger.warn('findLatestByCourse called with invalid courseId');
      return undefined;
    }

    this.logger.debug(
      { courseId },
      'Finding latest verification window by course'
    );

    const result = await this.findOne((qb) =>
      qb
        .clearSelect()
        .select([
          'id',
          'window_id',
          'course_id',
          'verification_round',
          'open_time',
          'duration_minutes'
        ])
        .where('course_id', '=', courseId)
        .where('status', 'in', ['open', 'expired'])
        .orderBy('verification_round', 'desc')
    );

    if (isNone(result)) {
      return undefined;
    }

    return result.value as {
      id: number;
      window_id: string;
      course_id: number;
      verification_round: number;
      open_time: Date;
      duration_minutes: number;
    };
  }

  /**
   * 根据课程ID查找当前活跃的签到窗口
   * @param courseId 课程ID
   * @returns 活跃的签到窗口（可能不存在）
   */
  public async findActiveByCourse(
    courseId: number
  ): Promise<IcalinkVerificationWindow | undefined> {
    if (!courseId) {
      this.logger.warn('findActiveByCourse called with invalid courseId');
      return undefined;
    }

    this.logger.debug(
      { courseId },
      'Finding active verification window by course'
    );

    const now = new Date();
    const result = (await this.findOne((qb) =>
      qb
        .where('course_id', '=', courseId)
        .where('status', '=', 'open')
        .where('open_time', '<=', now)
        .where('close_time', '>=', now)
        .orderBy('verification_round', 'desc')
    )) as unknown as Maybe<IcalinkVerificationWindow>;

    return isSome(result) ? result.value : undefined;
  }

  /**
   * 根据课程ID查找所有签到窗口
   * @param courseId 课程ID
   * @returns 签到窗口列表
   */
  public async findByCourse(
    courseId: number
  ): Promise<IcalinkVerificationWindow[]> {
    if (!courseId) {
      this.logger.warn('findByCourse called with invalid courseId');
      return [];
    }

    this.logger.debug(
      { courseId },
      'Finding all verification windows by course'
    );

    const result = (await this.findMany(
      (qb) => qb.where('course_id', '=', courseId),
      {
        orderBy: { field: 'verification_round', direction: 'desc' }
      }
    )) as unknown as IcalinkVerificationWindow[];

    return result;
  }

  /**
   * 查找超时的签到窗口（用于定时任务）
   * @param beforeTime 截止时间
   * @returns 超时的签到窗口列表
   */
  public async findExpiredWindows(
    beforeTime: Date
  ): Promise<IcalinkVerificationWindow[]> {
    if (!beforeTime) {
      this.logger.warn('findExpiredWindows called with invalid beforeTime');
      return [];
    }

    this.logger.debug({ beforeTime }, 'Finding expired verification windows');

    const result = (await this.findMany(
      (qb) =>
        qb.where('status', '=', 'open').where('close_time', '<', beforeTime),
      {
        orderBy: { field: 'close_time', direction: 'asc' }
      }
    )) as unknown as IcalinkVerificationWindow[];

    return result;
  }

  /**
   * 获取课程的最大验证轮次
   * @param courseId 课程ID
   * @returns 最大验证轮次
   */
  public async getMaxVerificationRound(courseId: number): Promise<number> {
    if (!courseId) {
      this.logger.warn('getMaxVerificationRound called with invalid courseId');
      return 0;
    }

    this.logger.debug({ courseId }, 'Getting max verification round');

    const windows = (await this.findMany(
      (qb) => qb.where('course_id', '=', courseId),
      {
        orderBy: { field: 'verification_round', direction: 'desc' },
        limit: 1
      }
    )) as unknown as IcalinkVerificationWindow[];

    if (windows.length > 0) {
      return windows[0].verification_round;
    }

    return 0;
  }
}
