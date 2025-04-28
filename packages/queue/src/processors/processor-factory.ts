/**
 * 处理器工厂
 * 根据配置创建合适的处理器实例
 */

import { ProcessorOptions } from '../types/index.js';
import { AbstractProcessor } from './abstract-processor.js';
import { LocalProcessor } from './local-processor.js';
import {
  SandboxProcessor,
  SandboxProcessorOptions
} from './sandbox-processor.js';

/**
 * 处理器类型
 */
export enum ProcessorType {
  /**
   * 本地处理器
   */
  LOCAL = 'local',

  /**
   * 沙箱处理器
   */
  SANDBOX = 'sandbox'
}

/**
 * 处理器工厂类
 * 负责创建和管理处理器实例
 */
export class ProcessorFactory {
  /**
   * 创建处理器实例
   * @param name 处理器名称
   * @param options 处理器选项
   * @returns 处理器实例
   */
  public static create<T = any, R = any>(
    name: string,
    options: ProcessorOptions = {}
  ): AbstractProcessor<T, R> {
    // 确定处理器类型
    const type = options.sandboxed
      ? ProcessorType.SANDBOX
      : ProcessorType.LOCAL;

    // 根据类型创建处理器
    return this.createByType<T, R>(type, name, options);
  }

  /**
   * 根据类型创建处理器
   * @param type 处理器类型
   * @param name 处理器名称
   * @param options 处理器选项
   * @returns 处理器实例
   */
  public static createByType<T = any, R = any>(
    type: ProcessorType,
    name: string,
    options: ProcessorOptions = {}
  ): AbstractProcessor<T, R> {
    switch (type) {
      case ProcessorType.SANDBOX:
        return new SandboxProcessor<T, R>(
          name,
          options as SandboxProcessorOptions
        );

      case ProcessorType.LOCAL:
      default:
        return new LocalProcessor<T, R>(name, options);
    }
  }

  /**
   * 创建本地处理器
   * @param name 处理器名称
   * @param options 处理器选项
   * @returns 本地处理器实例
   */
  public static createLocalProcessor<T = any, R = any>(
    name: string,
    options: ProcessorOptions = {}
  ): LocalProcessor<T, R> {
    return new LocalProcessor<T, R>(name, options);
  }

  /**
   * 创建沙箱处理器
   * @param name 处理器名称
   * @param options 沙箱处理器选项
   * @returns 沙箱处理器实例
   */
  public static createSandboxProcessor<T = any, R = any>(
    name: string,
    options: SandboxProcessorOptions = {}
  ): SandboxProcessor<T, R> {
    return new SandboxProcessor<T, R>(name, options);
  }
}
