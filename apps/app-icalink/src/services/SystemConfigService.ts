import type { Logger } from '@stratix/core';
import {
  isLeft,
  eitherLeft as left,
  eitherRight as right,
  type Either
} from '@stratix/utils/functional';
import type SystemConfigRepository from '../repositories/SystemConfigRepository.js';
import type { IcalinkSystemConfig } from '../types/database.js';
import { ServiceError, ServiceErrorCode } from '../types/service.js';

/**
 * 课程时间段配置
 */
export interface CoursePeriodConfig {
  period: number;
  default: {
    start_time: string;
    end_time: string;
  };
  conditions?: Array<{
    condition_type: string;
    condition_value: string;
    start_time: string;
    end_time: string;
  }>;
}

/**
 * 课程时间表配置
 */
export interface CourseScheduleConfig {
  total_periods: number;
  periods: CoursePeriodConfig[];
}

/**
 * 系统配置服务
 * 负责系统配置的业务逻辑和验证
 */
export default class SystemConfigService {
  constructor(
    private readonly systemConfigRepository: SystemConfigRepository,
    private readonly logger: Logger
  ) {
    this.logger.info('✅ SystemConfigService initialized');
  }

  /**
   * 获取配置
   * @param configKey 配置键
   * @returns 配置实体
   */
  public async getConfig(
    configKey: string
  ): Promise<Either<ServiceError, IcalinkSystemConfig | null>> {
    try {
      // 参数验证
      if (!configKey || configKey.trim() === '') {
        return left({
          code: String(ServiceErrorCode.INVALID_PARAMETER),
          message: 'Config key is required'
        });
      }

      this.logger.debug('Getting system config', { configKey });

      const configResult =
        await this.systemConfigRepository.findByKey(configKey);

      // 处理Maybe类型
      if (
        configResult &&
        (configResult as any).isSome &&
        (configResult as any).isSome()
      ) {
        return right((configResult as any).value);
      }

      return right(null);
    } catch (error: any) {
      this.logger.error('Failed to get system config', {
        configKey,
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to get system config',
        details: error.message
      });
    }
  }

  /**
   * 获取所有配置
   * @returns 配置列表
   */
  public async getAllConfigs(): Promise<
    Either<ServiceError, IcalinkSystemConfig[]>
  > {
    try {
      this.logger.debug('Getting all system configs');

      const configs = await this.systemConfigRepository.findAll();

      return right(configs);
    } catch (error: any) {
      this.logger.error('Failed to get all system configs', {
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to get all system configs',
        details: error.message
      });
    }
  }

  /**
   * 根据分组获取配置
   * @param configGroup 配置分组
   * @returns 配置列表
   */
  public async getConfigsByGroup(
    configGroup: string
  ): Promise<Either<ServiceError, IcalinkSystemConfig[]>> {
    try {
      // 参数验证
      if (!configGroup || configGroup.trim() === '') {
        return left({
          code: String(ServiceErrorCode.INVALID_PARAMETER),
          message: 'Config group is required'
        });
      }

      this.logger.debug('Getting system configs by group', { configGroup });

      const configs =
        await this.systemConfigRepository.findByGroup(configGroup);

      return right(configs);
    } catch (error: any) {
      this.logger.error('Failed to get system configs by group', {
        configGroup,
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to get system configs by group',
        details: error.message
      });
    }
  }

  /**
   * 更新配置
   * @param configKey 配置键
   * @param configValue 配置值
   * @param configType 配置类型
   * @param configGroup 配置分组
   * @param description 配置描述
   * @param updatedBy 更新人
   * @returns 更新结果
   */
  public async updateConfig(
    configKey: string,
    configValue: string,
    configType: string,
    configGroup: string = 'default',
    description?: string,
    updatedBy?: string
  ): Promise<Either<ServiceError, boolean>> {
    try {
      // 参数验证
      const validationError = this.validateConfig(
        configKey,
        configValue,
        configType
      );
      if (validationError) {
        return left(validationError);
      }

      this.logger.debug('Updating system config', {
        configKey,
        configType,
        configGroup
      });

      const affectedRows = await this.systemConfigRepository.upsert(
        configKey,
        configValue,
        configType,
        configGroup,
        description,
        updatedBy
      );

      return right(affectedRows > 0);
    } catch (error: any) {
      this.logger.error('Failed to update system config', {
        configKey,
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to update system config',
        details: error.message
      });
    }
  }

  /**
   * 删除配置
   * @param configKey 配置键
   * @returns 删除结果
   */
  public async deleteConfig(
    configKey: string
  ): Promise<Either<ServiceError, boolean>> {
    try {
      // 参数验证
      if (!configKey || configKey.trim() === '') {
        return left({
          code: String(ServiceErrorCode.INVALID_PARAMETER),
          message: 'Config key is required'
        });
      }

      this.logger.debug('Deleting system config', { configKey });

      const affectedRows =
        await this.systemConfigRepository.deleteByKey(configKey);

      return right(affectedRows > 0);
    } catch (error: any) {
      this.logger.error('Failed to delete system config', {
        configKey,
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.DATABASE_ERROR),
        message: 'Failed to delete system config',
        details: error.message
      });
    }
  }

  /**
   * 获取学期开始日期
   * @returns 学期开始日期
   */
  public async getTermStartDate(): Promise<Either<ServiceError, Date | null>> {
    try {
      const configResult = await this.getConfig('term.start_date');

      if (isLeft(configResult)) {
        return configResult as Either<ServiceError, Date | null>;
      }

      const config = (configResult as any).right;
      if (!config || !config.config_value) {
        return right(null);
      }

      const date = new Date(config.config_value);
      if (isNaN(date.getTime())) {
        return left({
          code: String(ServiceErrorCode.INVALID_PARAMETER),
          message: 'Invalid date format in term.start_date'
        });
      }

      return right(date);
    } catch (error: any) {
      this.logger.error('Failed to get term start date', {
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: 'Failed to get term start date',
        details: error.message
      });
    }
  }

  /**
   * 获取课程时间表配置
   * @returns 课程时间表配置
   */
  public async getCourseSchedule(): Promise<
    Either<ServiceError, CourseScheduleConfig | null>
  > {
    try {
      const configResult = await this.getConfig('course.schedule');

      if (isLeft(configResult)) {
        return configResult as Either<
          ServiceError,
          CourseScheduleConfig | null
        >;
      }

      const config = (configResult as any).right;
      if (!config || !config.config_value) {
        return right(null);
      }

      const schedule = JSON.parse(config.config_value) as CourseScheduleConfig;
      return right(schedule);
    } catch (error: any) {
      this.logger.error('Failed to get course schedule', {
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: 'Failed to get course schedule',
        details: error.message
      });
    }
  }

  /**
   * 获取全量同步定时任务时间配置
   * @returns Cron表达式
   */
  public async getFullSyncSchedule(): Promise<
    Either<ServiceError, string | null>
  > {
    try {
      const configResult = await this.getConfig('sync.full.schedule');

      if (isLeft(configResult)) {
        return configResult as Either<ServiceError, string | null>;
      }

      const config = (configResult as any).right;
      if (!config || !config.config_value) {
        return right(null);
      }

      return right(config.config_value);
    } catch (error: any) {
      this.logger.error('Failed to get full sync schedule', {
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: 'Failed to get full sync schedule',
        details: error.message
      });
    }
  }

  /**
   * 获取增量同步定时任务时间配置
   * @returns Cron表达式或时间间隔
   */
  public async getIncrementalSyncSchedule(): Promise<
    Either<ServiceError, string | null>
  > {
    try {
      const configResult = await this.getConfig('sync.incremental.schedule');

      if (isLeft(configResult)) {
        return configResult as Either<ServiceError, string | null>;
      }

      const config = (configResult as any).right;
      if (!config || !config.config_value) {
        return right(null);
      }

      return right(config.config_value);
    } catch (error: any) {
      this.logger.error('Failed to get incremental sync schedule', {
        error: error.message
      });

      return left({
        code: String(ServiceErrorCode.INTERNAL_ERROR),
        message: 'Failed to get incremental sync schedule',
        details: error.message
      });
    }
  }

  /**
   * 验证配置值
   * @param configKey 配置键
   * @param configValue 配置值
   * @param configType 配置类型
   * @returns 验证错误（如果有）
   */
  private validateConfig(
    configKey: string,
    configValue: string,
    configType: string
  ): ServiceError | null {
    if (!configKey || configKey.trim() === '') {
      return {
        code: String(ServiceErrorCode.INVALID_PARAMETER),
        message: 'Config key is required'
      };
    }

    if (!configType || configType.trim() === '') {
      return {
        code: String(ServiceErrorCode.INVALID_PARAMETER),
        message: 'Config type is required'
      };
    }

    // 根据配置类型验证值
    if (configType === 'json' && configValue) {
      try {
        JSON.parse(configValue);
      } catch {
        return {
          code: String(ServiceErrorCode.INVALID_PARAMETER),
          message: 'Invalid JSON format'
        };
      }
    }

    return null;
  }
}
