/**
 * @stratix/queue 验证工具
 * 提供队列相关数据的验证功能
 */

import * as utils from '@stratix/utils';
import type { JobOptions, RepeatOptions } from '../types/index.js';

/**
 * 验证队列名称
 * @param name 队列名称
 * @returns 是否有效
 */
export function validateQueueName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // 队列名称只能包含字母、数字、下划线和连字符
  return /^[a-zA-Z0-9_-]+$/.test(name);
}

/**
 * 验证作业名称
 * @param name 作业名称
 * @returns 是否有效
 */
export function validateJobName(name: string): boolean {
  if (!name || typeof name !== 'string') {
    return false;
  }

  // 作业名称只能包含字母、数字、下划线、连字符和点号
  return /^[a-zA-Z0-9_.-]+$/.test(name);
}

/**
 * 验证作业ID
 * @param id 作业ID
 * @returns 是否有效
 */
export function validateJobId(id: string): boolean {
  if (!id || typeof id !== 'string') {
    return false;
  }

  // 大多数队列系统使用的作业ID格式
  return /^[a-zA-Z0-9_.-]+$/.test(id);
}

/**
 * 验证作业选项
 * @param options 作业选项
 * @returns 是否有效
 */
export function validateJobOptions(options: JobOptions): boolean {
  if (!options || typeof options !== 'object') {
    return false;
  }

  // 验证重试次数
  if (
    options.attempts !== undefined &&
    (typeof options.attempts !== 'number' || options.attempts < 1)
  ) {
    return false;
  }

  // 验证延迟时间
  if (
    options.delay !== undefined &&
    (typeof options.delay !== 'number' || options.delay < 0)
  ) {
    return false;
  }

  // 验证超时时间
  if (
    options.timeout !== undefined &&
    (typeof options.timeout !== 'number' || options.timeout < 0)
  ) {
    return false;
  }

  // 验证优先级
  if (options.priority !== undefined && typeof options.priority !== 'number') {
    return false;
  }

  // 验证重复选项
  if (options.repeat && !validateRepeatOptions(options.repeat)) {
    return false;
  }

  // 验证依赖项
  if (
    options.dependencies &&
    (!Array.isArray(options.dependencies) ||
      !options.dependencies.every((dep) => validateJobId(dep)))
  ) {
    return false;
  }

  return true;
}

/**
 * 验证重复选项
 * @param options 重复选项
 * @returns 是否有效
 */
export function validateRepeatOptions(options: RepeatOptions): boolean {
  if (!options || typeof options !== 'object') {
    return false;
  }

  // 必须指定cron表达式或时间间隔
  if (options.cron === undefined && options.every === undefined) {
    return false;
  }

  // 验证cron表达式
  if (options.cron !== undefined && typeof options.cron !== 'string') {
    return false;
  }

  // 验证时间间隔
  if (
    options.every !== undefined &&
    (typeof options.every !== 'number' || options.every < 0)
  ) {
    return false;
  }

  // 验证重复次数限制
  if (
    options.limit !== undefined &&
    (typeof options.limit !== 'number' || options.limit < 1)
  ) {
    return false;
  }

  // 验证开始日期
  if (
    options.startDate !== undefined &&
    !(
      typeof options.startDate === 'string' ||
      typeof options.startDate === 'number' ||
      options.startDate instanceof Date
    )
  ) {
    return false;
  }

  // 验证结束日期
  if (
    options.endDate !== undefined &&
    !(
      typeof options.endDate === 'string' ||
      typeof options.endDate === 'number' ||
      options.endDate instanceof Date
    )
  ) {
    return false;
  }

  // 验证时区
  if (options.tz !== undefined && typeof options.tz !== 'string') {
    return false;
  }

  return true;
}

/**
 * 验证并规范化作业数据
 * @param data 作业数据
 * @returns 规范化的数据
 */
export function normalizeJobData(data: any): any {
  if (data === undefined || data === null) {
    return {};
  }

  if (typeof data !== 'object') {
    return { value: data };
  }

  return utils.object.deepClone(data);
}

/**
 * 验证并规范化队列名称
 * @param name 队列名称
 * @returns 规范化的队列名称
 * @throws 如果队列名称无效
 */
export function normalizeQueueName(name: string): string {
  if (!validateQueueName(name)) {
    throw new Error(`无效的队列名称: ${name}`);
  }
  return name;
}

/**
 * 验证并规范化作业名称
 * @param name 作业名称
 * @returns 规范化的作业名称
 * @throws 如果作业名称无效
 */
export function normalizeJobName(name: string): string {
  if (!validateJobName(name)) {
    throw new Error(`无效的作业名称: ${name}`);
  }
  return name;
}

/**
 * 验证并规范化作业选项
 * @param options 作业选项
 * @returns 规范化的作业选项
 * @throws 如果作业选项无效
 */
export function normalizeJobOptions(options?: JobOptions): JobOptions {
  if (!options) {
    return {};
  }

  if (!validateJobOptions(options)) {
    throw new Error('无效的作业选项');
  }

  return utils.object.deepClone(options) as JobOptions;
}
