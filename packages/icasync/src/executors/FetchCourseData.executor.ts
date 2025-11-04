/**
 * 课表数据获取执行器
 *
 * 功能：
 * 1. 根据用户类型（教师/学生）和学号/工号获取课程表数据
 * 2. 支持按学年学期过滤
 * 3. 返回课程号列表用于后续权限恢复
 * 4. 这是课表恢复工作流的循环节点执行器
 */

import type { Logger } from '@stratix/core';
import { Executor } from '@stratix/core';
import type {
  ExecutionContext,
  ExecutionResult,
  TaskExecutor
} from '@stratix/tasks';
import type { IStudentCourseRepository } from '../repositories/StudentCourseRepository.js';
import type { ITeacherCourseRepository } from '../repositories/TeacherCourseRepository.js';
import type { CourseInfo, CourseRestoreConfig } from '../types/database.js';

/**
 * 验证结果接口
 */
interface ValidationResult {
  valid: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * 课表数据获取配置接口
 */
export interface FetchCourseDataConfig extends CourseRestoreConfig {
  /** 批处理大小 */
  batchSize?: number;
  /** 最大并发数 */
  maxConcurrency?: number;
}

/**
 * 课表数据获取结果接口
 */
export interface FetchCourseDataResult {
  /** 课程信息列表 */
  items: CourseInfo[];
  /** 总数量 */
  totalCount: number;
  /** 是否为测试运行 */
  dryRun?: boolean;
}

/**
 * 课表数据获取执行器
 *
 * 功能：
 * 1. 根据用户类型获取对应的课程表数据
 * 2. 学生课表：从 out_jw_kcb_xs 表获取
 * 3. 教师课表：从 out_jw_kcb_js 表获取
 * 4. 返回课程号列表供后续处理
 */
@Executor({
  name: 'fetchCourseDataExecutor',
  description: '课表数据获取执行器 - 根据用户类型获取课程表数据',
  version: '1.0.0',
  tags: ['course', 'data', 'fetch', 'restore'],
  category: 'icasync'
})
export default class FetchCourseDataExecutor implements TaskExecutor {
  readonly name = 'fetchCourseDataExecutor';
  readonly description = '课表数据获取执行器';
  readonly version = '1.0.0';

  constructor(
    private studentCourseRepository: IStudentCourseRepository,
    private teacherCourseRepository: ITeacherCourseRepository,
    private logger: Logger
  ) {}

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    const config = context.config as FetchCourseDataConfig;

    this.logger.info('开始执行课表数据获取', {
      userType: config.userType,
      xgh: config.xgh,
      xnxq: config.xnxq,
      dryRun: config.dryRun
    });

    try {
      // 验证输入参数
      this.internalValidateConfig(config);

      // 根据用户类型获取课程数据
      const courses = await this.fetchCoursesByUserType(config);

      const result: FetchCourseDataResult = {
        items: courses,
        totalCount: courses.length,
        dryRun: config.dryRun
      };

      this.logger.info('课表数据获取完成', {
        userType: config.userType,
        xgh: config.xgh,
        courseCount: courses.length,
        dryRun: config.dryRun
      });

      return right(result
      );
    } catch (error) {
      this.logger.error('课表数据获取失败', {
        userType: config.userType,
        xgh: config.xgh,
        error: error instanceof Error ? error.message : String(error)
      });

      return left(error instanceof Error ? error.message : '课表数据获取失败'
      );
    }
  }

  /**
   * 验证配置参数
   */
  validateConfig(config: FetchCourseDataConfig): ValidationResult {
    const errors: string[] = [];

    if (!config.userType) {
      errors.push('用户类型不能为空');
    } else if (!['student', 'teacher'].includes(config.userType)) {
      errors.push('用户类型必须是 student 或 teacher');
    }

    if (!config.xgh || config.xgh.trim().length === 0) {
      errors.push('学号或工号不能为空');
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * 内部验证配置（抛出异常）
   */
  private internalValidateConfig(config: FetchCourseDataConfig): void {
    const result = this.validateConfig(config);
    if (!result.valid && result.errors) {
      throw new Error(result.errors.join('; '));
    }
  }

  /**
   * 根据用户类型获取课程数据
   */
  private async fetchCoursesByUserType(
    config: FetchCourseDataConfig
  ): Promise<CourseInfo[]> {
    if (config.userType === 'student') {
      return await this.fetchStudentCourses(config);
    } else {
      return await this.fetchTeacherCourses(config);
    }
  }

  /**
   * 获取学生课程数据
   */
  private async fetchStudentCourses(
    config: FetchCourseDataConfig
  ): Promise<CourseInfo[]> {
    this.logger.debug('获取学生课程数据', {
      xh: config.xgh,
      xnxq: config.xnxq
    });

    const result = config.xnxq
      ? await this.studentCourseRepository.findByXhAndXnxq(
          config.xgh,
          config.xnxq
        )
      : await this.studentCourseRepository.findByXh(config.xgh);

    if (isLeft(result)) {
      throw new Error(`获取学生课程数据失败: ${result.error}`);
    }

    // 转换为 CourseInfo 格式
    const courses: CourseInfo[] = result.right
      .filter((course) => course.kkh) // 过滤掉空的开课号
      .map((course) => ({
        kkh: course.kkh!,
        xnxq: course.xnxq || undefined,
        xgh: config.xgh // 添加学号
      }));

    this.logger.debug('学生课程数据获取完成', {
      xh: config.xgh,
      totalRecords: result.right.length,
      filteredRecords: courses.length,
      uniqueCourses: courses.length
    });

    return courses;
  }

  /**
   * 获取教师课程数据
   */
  private async fetchTeacherCourses(
    config: FetchCourseDataConfig
  ): Promise<CourseInfo[]> {
    this.logger.debug('获取教师课程数据', {
      gh: config.xgh,
      xnxq: config.xnxq
    });

    const result = config.xnxq
      ? await this.teacherCourseRepository.findByGhAndXnxq(
          config.xgh,
          config.xnxq
        )
      : await this.teacherCourseRepository.findByGh(config.xgh);

    if (isLeft(result)) {
      throw new Error(`获取教师课程数据失败: ${result.error}`);
    }

    // 转换为 CourseInfo 格式
    const courses: CourseInfo[] = result.right
      .filter((course) => course.kkh) // 过滤掉空的开课号
      .map((course) => ({
        kkh: course.kkh!,
        kcbh: course.kcbh || undefined,
        xnxq: course.xnxq || undefined,
        xgh: config.xgh // 添加工号
      }));

    this.logger.debug('教师课程数据获取完成', {
      gh: config.xgh,
      totalRecords: result.right.length,
      filteredRecords: courses.length,
      uniqueCourses: courses.length
    });

    return courses;
  }

  /**
   * 健康检查
   */
  async healthCheck(): Promise<'healthy' | 'unhealthy' | 'unknown'> {
    try {
      // 检查依赖的仓储是否可用
      if (!this.studentCourseRepository || !this.teacherCourseRepository) {
        return 'unhealthy';
      }
      return 'healthy';
    } catch (error) {
      this.logger.error('FetchCourseDataExecutor 健康检查失败', { error });
      return 'unhealthy';
    }
  }

  /**
   * 获取执行器配置验证规则
   */
  getConfigValidation(): Record<string, any> {
    return {
      userType: {
        required: true,
        type: 'string',
        enum: ['student', 'teacher']
      },
      xgh: {
        required: true,
        type: 'string',
        minLength: 1
      },
      xnxq: {
        required: false,
        type: 'string'
      },
      dryRun: {
        required: false,
        type: 'boolean',
        default: false
      }
    };
  }
}

// 框架会自动发现和注册此执行器
// 使用 SCOPED 生命周期，文件名符合 executors/**/*.ts 模式
