/**
 * @stratix/queue 驱动工厂
 * 创建和管理不同类型的队列驱动
 */

import { isPresent } from '@stratix/utils/common';
import { DriverFactory, QueueDriver } from '../types/driver.js';

// 驱动类型映射
const driverRegistry: Record<string, any> = {};

/**
 * 驱动工厂实现
 * 负责创建和管理不同类型的队列驱动
 */
export const driverFactory: DriverFactory = {
  /**
   * 创建驱动实例
   * @param type 驱动类型
   * @param options 驱动选项
   * @returns 驱动实例
   */
  async createDriver(type: string, options?: any): Promise<QueueDriver> {
    // 默认使用BullMQ驱动
    const driverType = type || 'bullmq';

    // 检查驱动类型是否已注册
    if (!driverRegistry[driverType]) {
      try {
        // 根据类型动态导入驱动
        switch (driverType) {
          case 'bullmq':
            // 避免循环依赖，使用异步导入并等待完成
            const bullmqModule = await import('./bullmq-driver.js');
            driverRegistry[driverType] = bullmqModule.default;
            break;
          case 'memory':
            const memoryModule = await import('./memory-driver.js');
            driverRegistry[driverType] = memoryModule.default;
            break;
          default:
            throw new Error(`未知的队列驱动类型: ${driverType}`);
        }
      } catch (error) {
        throw new Error(
          `无法加载队列驱动 ${driverType}: ${(error as Error).message}`
        );
      }
    }

    // 确保驱动已注册
    if (!driverRegistry[driverType]) {
      throw new Error(`队列驱动 ${driverType} 未注册`);
    }

    try {
      // 创建驱动实例
      const DriverClass = driverRegistry[driverType];
      const driver = new DriverClass(options);

      // 初始化驱动并等待完成
      if (typeof driver.init === 'function') {
        await driver.init(options);
      }

      return driver;
    } catch (error) {
      throw new Error(`创建队列驱动实例失败: ${(error as Error).message}`);
    }
  },

  /**
   * 注册自定义驱动
   * @param type 驱动类型
   * @param driverClass 驱动类
   */
  registerDriver(type: string, driverClass: any): void {
    if (typeof type !== 'string' || !type) {
      throw new Error('type must be a string');
    }

    if (!isPresent(driverClass) || typeof driverClass !== 'function') {
      throw new Error(
        'driverClass must be a valid class or constructor function'
      );
    }

    driverRegistry[type] = driverClass;
  }
};

export default driverFactory;
