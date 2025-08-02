// @stratix/icasync 课程聚合服务
// 负责将原始课程数据聚合为日程任务

import {
  curry2,
  Either,
  eitherLeft as left,
  eitherRight as right
} from '@stratix/utils/functional';
import type { ICourseRawRepository } from '../repositories/CourseRawRepository.js';
import type { IJuheRenwuRepository } from '../repositories/JuheRenwuRepository.js';
import type { CourseRaw, JuheRenwu, NewJuheRenwu } from '../types/database.js';

/**
 * 聚合配置接口
 */
export interface AggregationConfig {
  /** 学年学期 */
  xnxq: string;
  /** 是否只处理需要打卡的课程 */
  onlyCheckInRequired?: boolean;
  /** 批处理大小 */
  batchSize?: number;
}

/**
 * 聚合结果接口
 */
export interface AggregationResult {
  /** 成功聚合的任务数量 */
  successCount: number;
  /** 失败的任务数量 */
  failureCount: number;
  /** 处理的开课号列表 */
  processedKkhs: string[];
  /** 错误信息 */
  errors: string[];
}

/**
 * 课程聚合服务接口
 */
export interface ICourseAggregationService {
  /**
   * 全量聚合指定学期的课程数据
   */
  aggregateFullSemester(
    config: AggregationConfig
  ): Promise<Either<string, AggregationResult>>;

  /**
   * 全量聚合前清理并重新聚合数据
   * 先清空juhe_renwu表，然后从u_jw_kcb_cur表重新聚合数据
   */
  fullAggregationWithClear(
    config: AggregationConfig
  ): Promise<Either<string, AggregationResult>>;

  /**
   * 增量聚合指定开课号的课程数据
   */
  aggregateIncremental(
    kkh: string,
    rq: string
  ): Promise<Either<string, JuheRenwu[]>>;

  /**
   * 聚合单个开课号的所有课程
   */
  aggregateSingleCourse(
    kkh: string,
    xnxq: string
  ): Promise<Either<string, JuheRenwu[]>>;

  /**
   * 验证聚合数据的完整性
   */
  validateAggregation(
    kkh: string,
    xnxq: string
  ): Promise<Either<string, boolean>>;
}

/**
 * 课程聚合服务实现
 * 使用函数式编程模式处理课程数据聚合
 */
export default class CourseAggregationService
  implements ICourseAggregationService
{
  constructor(
    private readonly courseRawRepository: ICourseRawRepository,
    private readonly juheRenwuRepository: IJuheRenwuRepository
  ) {}

  /**
   * 全量聚合指定学期的课程数据
   */
  async aggregateFullSemester(
    config: AggregationConfig
  ): Promise<Either<string, AggregationResult>> {
    try {
      const { xnxq, onlyCheckInRequired = true, batchSize = 100 } = config;

      // 获取所有需要处理的开课号
      const kkhsResult = await this.courseRawRepository.findDistinctKkh(xnxq);
      if (!kkhsResult.success) {
        return left(`Failed to get course codes: ${kkhsResult.error}`);
      }

      const kkhs = kkhsResult.data;
      const result: AggregationResult = {
        successCount: 0,
        failureCount: 0,
        processedKkhs: [],
        errors: []
      };

      // 使用函数式编程处理批次
      const processBatch = async (kkhBatch: string[]) => {
        const batchResults = await Promise.allSettled(
          kkhBatch.map((kkh) => this.aggregateSingleCourse(kkh, xnxq))
        );

        return batchResults.map((result, index) => ({
          kkh: kkhBatch[index],
          result:
            result.status === 'fulfilled'
              ? result.value
              : left('Promise rejected')
        }));
      };

      // 分批处理
      for (let i = 0; i < kkhs.length; i += batchSize) {
        const batch = kkhs.slice(i, i + batchSize);
        const batchResults = await processBatch(batch);

        for (const { kkh, result: aggregationResult } of batchResults) {
          result.processedKkhs.push(kkh);

          if (aggregationResult._tag === 'Right') {
            result.successCount++;
          } else {
            result.failureCount++;
            result.errors.push(`${kkh}: ${aggregationResult.left}`);
          }
        }
      }

      return right(result);
    } catch (error) {
      return left(
        `Aggregation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 全量聚合前清理并重新聚合数据
   * 先清空juhe_renwu表，然后从u_jw_kcb_cur表重新聚合数据
   */
  async fullAggregationWithClear(
    config: AggregationConfig
  ): Promise<Either<string, AggregationResult>> {
    try {
      const { xnxq } = config;

      // 1. 先清空juhe_renwu表的所有数据
      const clearResult = await this.juheRenwuRepository.clearAllTasks();
      if (!clearResult.success) {
        return left(`Failed to clear existing tasks: ${clearResult.error}`);
      }

      // 2. 从u_jw_kcb_cur表重新聚合数据
      const aggregationResult = await this.aggregateFullSemester(config);
      if (aggregationResult._tag === 'Left') {
        return aggregationResult;
      }

      return right({
        ...aggregationResult.right,
        processedKkhs: [
          `Cleared ${clearResult.data} existing tasks`,
          ...aggregationResult.right.processedKkhs
        ]
      });
    } catch (error) {
      return left(
        `Full aggregation with clear failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 增量聚合指定开课号的课程数据
   */
  async aggregateIncremental(
    kkh: string,
    rq: string
  ): Promise<Either<string, JuheRenwu[]>> {
    try {
      // 先软删除现有的聚合数据
      const deleteResult =
        await this.juheRenwuRepository.softDeleteByKkhAndDate(kkh, rq);
      if (!deleteResult.success) {
        return left(
          `Failed to soft delete existing data: ${deleteResult.error}`
        );
      }

      // 获取指定日期的原始课程数据
      const rawCoursesResult = await this.courseRawRepository.findByKkhAndDate(
        kkh,
        rq
      );
      if (!rawCoursesResult.success) {
        return left(`Failed to get raw courses: ${rawCoursesResult.error}`);
      }

      const rawCourses = rawCoursesResult.data;
      if (rawCourses.length === 0) {
        return right([]);
      }

      // 聚合数据
      const aggregatedTasks = await this.aggregateRawCourses(rawCourses);
      if (aggregatedTasks._tag === 'Left') {
        return aggregatedTasks;
      }

      // 保存聚合结果
      const saveResult = await this.juheRenwuRepository.createTasksBatch(
        aggregatedTasks.right
      );
      if (!saveResult.success) {
        return left(`Failed to save aggregated tasks: ${saveResult.error}`);
      }

      return right(saveResult.data);
    } catch (error) {
      return left(
        `Incremental aggregation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 聚合单个开课号的所有课程
   */
  async aggregateSingleCourse(
    kkh: string,
    xnxq: string
  ): Promise<Either<string, JuheRenwu[]>> {
    try {
      // 获取原始课程数据
      const rawCoursesResult =
        await this.courseRawRepository.findByKkhAndSemester(kkh, xnxq);
      if (!rawCoursesResult.success) {
        return left(`Failed to get raw courses: ${rawCoursesResult.error}`);
      }

      const rawCourses = rawCoursesResult.data;
      if (rawCourses.length === 0) {
        return right([]);
      }

      // 聚合数据
      const aggregatedTasks = await this.aggregateRawCourses(rawCourses);
      if (aggregatedTasks._tag === 'Left') {
        return aggregatedTasks;
      }

      // 保存聚合结果
      const saveResult = await this.juheRenwuRepository.createTasksBatch(
        aggregatedTasks.right
      );
      if (!saveResult.success) {
        return left(`Failed to save aggregated tasks: ${saveResult.error}`);
      }

      return right(saveResult.data);
    } catch (error) {
      return left(
        `Single course aggregation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 验证聚合数据的完整性
   */
  async validateAggregation(
    kkh: string,
    xnxq: string
  ): Promise<Either<string, boolean>> {
    try {
      // 获取原始数据统计
      const rawCountResult =
        await this.courseRawRepository.countByKkhAndSemester(kkh, xnxq);
      if (!rawCountResult.success) {
        return left(`Failed to count raw courses: ${rawCountResult.error}`);
      }

      // 获取聚合数据统计
      const aggregatedCountResult =
        await this.juheRenwuRepository.countByKkh(kkh);
      if (!aggregatedCountResult.success) {
        return left(
          `Failed to count aggregated tasks: ${aggregatedCountResult.error}`
        );
      }

      // 验证数据完整性（聚合后的数据应该少于或等于原始数据）
      const isValid =
        aggregatedCountResult.data <= rawCountResult.data &&
        aggregatedCountResult.data > 0;

      return right(isValid);
    } catch (error) {
      return left(
        `Validation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 聚合原始课程数据（私有方法）
   * 实现课程数据的分组和合并逻辑
   */
  private async aggregateRawCourses(
    rawCourses: CourseRaw[]
  ): Promise<Either<string, NewJuheRenwu[]>> {
    try {
      // 使用函数式编程进行数据处理
      const groupByKey = curry2(
        (keyFn: (item: CourseRaw) => string, items: CourseRaw[]) => {
          return items.reduce(
            (groups, item) => {
              const key = keyFn(item);
              if (!groups[key]) {
                groups[key] = [];
              }
              groups[key].push(item);
              return groups;
            },
            {} as Record<string, CourseRaw[]>
          );
        }
      );

      // 创建分组键函数
      const createGroupKey = (course: CourseRaw) => {
        const jc = course.jc || 0;
        return `${course.kkh}_${course.rq}_${jc < 5 ? 'am' : 'pm'}`;
      };

      // 过滤有效课程数据
      const validCourses = rawCourses.filter(
        (course: CourseRaw) => course.zt === 'add' || course.zt === 'update'
      );

      // 分组处理
      const groupedCourses = groupByKey(createGroupKey)(validCourses);

      // 转换为聚合任务
      const aggregatedTasks: NewJuheRenwu[] = [];

      for (const [groupKey, courses] of Object.entries(groupedCourses)) {
        const aggregatedTask = this.createAggregatedTask(courses);
        if (aggregatedTask._tag === 'Right') {
          aggregatedTasks.push(aggregatedTask.right);
        } else {
          return left(
            `Failed to create aggregated task for group ${groupKey}: ${aggregatedTask.left}`
          );
        }
      }

      return right(aggregatedTasks);
    } catch (error) {
      return left(
        `Raw course aggregation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * 创建聚合任务（私有方法）
   */
  private createAggregatedTask(
    courses: CourseRaw[]
  ): Either<string, NewJuheRenwu> {
    if (courses.length === 0) {
      return left('No courses to aggregate');
    }

    const firstCourse = courses[0];

    try {
      // 聚合节次
      const jcList = courses.map((c) => c.jc || 0).sort((a, b) => a - b);
      const jcS = jcList.join('/');

      // 聚合教室
      const roomList = courses.map((c) => c.room || '无');
      const roomS = [...new Set(roomList)].join('/');

      // 聚合教师
      const ghList = courses.map((c) => c.ghs).filter(Boolean);
      const ghS = [...new Set(ghList)].join(',');

      const xmList = courses.map((c) => c.xms).filter(Boolean);
      const xmS = [...new Set(xmList)].join(',');

      // 计算时间
      const startTimes = courses
        .map((c) => c.st)
        .filter(Boolean)
        .sort();
      const endTimes = courses
        .map((c) => c.ed)
        .filter(Boolean)
        .sort();
      const sjF = startTimes[0];
      const sjT = endTimes[endTimes.length - 1];

      // 确定时间段
      const firstJc = firstCourse.jc || 0;
      const sjd = firstJc < 5 ? 'am' : 'pm';

      const aggregatedTask: NewJuheRenwu = {
        kkh: firstCourse.kkh,
        xnxq: firstCourse.xnxq,
        jxz: firstCourse.jxz,
        zc: firstCourse.zc,
        rq: (firstCourse.rq || '').substring(0, 10), // 只取日期部分
        kcmc: firstCourse.kcmc,
        sfdk: firstCourse.sfdk,
        jc_s: jcS,
        room_s: roomS,
        gh_s: ghS,
        xm_s: xmS,
        lq: firstCourse.lq,
        sj_f: sjF,
        sj_t: sjT,
        sjd,
        gx_zt: '0' // 默认为未处理
      };

      return right(aggregatedTask);
    } catch (error) {
      return left(
        `Task creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
