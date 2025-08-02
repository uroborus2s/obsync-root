/**
 * @stratix/core - Plugin Container Registry
 * 
 * 全局插件容器注册表，管理所有插件的 Awilix 容器引用，
 * 支持跨插件依赖注入和工作流组件管理。
 */

import type { AwilixContainer } from 'awilix';

/**
 * 工作流配置接口
 */
export interface WorkflowConfig {
  enabled: boolean;
  patterns: string[];
  metadata?: {
    category?: string;
    provides?: {
      definitions?: string[];
      executors?: string[];
      services?: string[];
    };
  };
}

/**
 * 插件元数据接口
 */
export interface PluginMetadata {
  version?: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  loadedAt?: Date;
}

/**
 * 插件容器信息接口
 */
export interface PluginContainerInfo {
  pluginName: string;
  container: AwilixContainer;
  basePath: string;
  workflowConfig?: WorkflowConfig;
  metadata?: PluginMetadata;
}

/**
 * 跨容器解析器接口
 */
export interface CrossContainerResolver {
  resolve<T>(name: string): T;
  has(name: string): boolean;
  getContainer(): AwilixContainer;
}

/**
 * 全局插件容器注册表
 * 
 * 职责：
 * 1. 管理所有插件的容器引用
 * 2. 支持跨插件依赖注入
 * 3. 提供工作流插件发现机制
 * 4. 容器生命周期管理
 */
export class PluginContainerRegistry {
  private containers = new Map<string, PluginContainerInfo>();
  private tasksContainer: AwilixContainer | null = null;
  private disposed = false;

  /**
   * 注册插件容器
   * 
   * @param info 插件容器信息
   */
  registerContainer(info: PluginContainerInfo): void {
    if (this.disposed) {
      throw new Error('容器注册表已被销毁，无法注册新容器');
    }

    // 验证插件信息
    this.validatePluginInfo(info);

    // 注册容器
    this.containers.set(info.pluginName, {
      ...info,
      metadata: {
        ...info.metadata,
        loadedAt: new Date()
      }
    });

    // 如果是 @stratix/tasks 插件，保存其容器引用
    if (info.pluginName === '@stratix/tasks') {
      this.tasksContainer = info.container;
    }

    console.log(`📦 插件容器已注册: ${info.pluginName}`, {
      basePath: info.basePath,
      workflowEnabled: !!info.workflowConfig?.enabled,
      patterns: info.workflowConfig?.patterns?.length || 0
    });
  }

  /**
   * 获取插件容器
   * 
   * @param pluginName 插件名称
   * @returns 容器实例或 undefined
   */
  getContainer(pluginName: string): AwilixContainer | undefined {
    const info = this.containers.get(pluginName);
    return info?.container;
  }

  /**
   * 获取插件容器信息
   * 
   * @param pluginName 插件名称
   * @returns 容器信息或 undefined
   */
  getContainerInfo(pluginName: string): PluginContainerInfo | undefined {
    return this.containers.get(pluginName);
  }

  /**
   * 获取 @stratix/tasks 容器
   * 
   * @returns tasks 容器实例或 null
   */
  getTasksContainer(): AwilixContainer | null {
    return this.tasksContainer;
  }

  /**
   * 获取所有包含工作流配置的插件
   * 
   * @returns 工作流启用的插件列表
   */
  getWorkflowEnabledPlugins(): PluginContainerInfo[] {
    return Array.from(this.containers.values())
      .filter(info => info.workflowConfig?.enabled === true);
  }

  /**
   * 获取所有已注册的插件
   * 
   * @returns 所有插件信息列表
   */
  getAllPlugins(): PluginContainerInfo[] {
    return Array.from(this.containers.values());
  }

  /**
   * 检查插件是否已注册
   * 
   * @param pluginName 插件名称
   * @returns 是否已注册
   */
  hasPlugin(pluginName: string): boolean {
    return this.containers.has(pluginName);
  }

  /**
   * 创建跨容器解析器
   * 
   * @param targetPluginName 目标插件名称
   * @returns 跨容器解析器
   */
  createCrossContainerResolver(targetPluginName: string): CrossContainerResolver {
    const targetContainer = this.getContainer(targetPluginName);
    if (!targetContainer) {
      throw new Error(`插件容器未找到: ${targetPluginName}`);
    }

    return {
      resolve: <T>(name: string): T => {
        try {
          return targetContainer.resolve<T>(name);
        } catch (error) {
          throw new Error(
            `跨容器解析失败: ${targetPluginName}.${name} - ${error.message}`
          );
        }
      },

      has: (name: string): boolean => {
        return targetContainer.hasRegistration(name);
      },

      getContainer: (): AwilixContainer => {
        return targetContainer;
      }
    };
  }

  /**
   * 获取注册统计信息
   * 
   * @returns 统计信息
   */
  getStats(): {
    totalPlugins: number;
    workflowEnabledPlugins: number;
    tasksPluginLoaded: boolean;
    registeredAt: Date[];
  } {
    const allPlugins = this.getAllPlugins();
    const workflowPlugins = this.getWorkflowEnabledPlugins();

    return {
      totalPlugins: allPlugins.length,
      workflowEnabledPlugins: workflowPlugins.length,
      tasksPluginLoaded: this.tasksContainer !== null,
      registeredAt: allPlugins
        .map(info => info.metadata?.loadedAt)
        .filter(Boolean) as Date[]
    };
  }

  /**
   * 销毁注册表
   * 
   * 清理所有容器引用，释放内存
   */
  async dispose(): Promise<void> {
    if (this.disposed) {
      return;
    }

    console.log('🧹 开始销毁插件容器注册表...');

    try {
      // 销毁所有容器
      const disposePromises = Array.from(this.containers.values()).map(async (info) => {
        try {
          await info.container.dispose();
          console.log(`✅ 容器已销毁: ${info.pluginName}`);
        } catch (error) {
          console.warn(`⚠️ 容器销毁失败: ${info.pluginName}`, error);
        }
      });

      await Promise.all(disposePromises);

      // 清理引用
      this.containers.clear();
      this.tasksContainer = null;
      this.disposed = true;

      console.log('✅ 插件容器注册表销毁完成');

    } catch (error) {
      console.error('❌ 插件容器注册表销毁失败:', error);
      throw error;
    }
  }

  /**
   * 验证插件信息
   * 
   * @param info 插件容器信息
   */
  private validatePluginInfo(info: PluginContainerInfo): void {
    if (!info.pluginName) {
      throw new Error('插件名称不能为空');
    }

    if (!info.container) {
      throw new Error('容器实例不能为空');
    }

    if (!info.basePath) {
      throw new Error('基础路径不能为空');
    }

    // 检查插件名称格式
    if (!this.isValidPluginName(info.pluginName)) {
      throw new Error(`无效的插件名称格式: ${info.pluginName}`);
    }

    // 检查是否重复注册
    if (this.containers.has(info.pluginName)) {
      throw new Error(`插件已注册: ${info.pluginName}`);
    }

    // 验证工作流配置
    if (info.workflowConfig) {
      this.validateWorkflowConfig(info.workflowConfig);
    }
  }

  /**
   * 验证插件名称格式
   * 
   * @param pluginName 插件名称
   * @returns 是否有效
   */
  private isValidPluginName(pluginName: string): boolean {
    // 支持的格式：
    // @scope/package-name
    // package-name
    const scopedPattern = /^@[a-z0-9-]+\/[a-z0-9-]+$/;
    const simplePattern = /^[a-z0-9-]+$/;

    return scopedPattern.test(pluginName) || simplePattern.test(pluginName);
  }

  /**
   * 验证工作流配置
   * 
   * @param config 工作流配置
   */
  private validateWorkflowConfig(config: WorkflowConfig): void {
    if (typeof config.enabled !== 'boolean') {
      throw new Error('工作流配置的 enabled 字段必须是布尔值');
    }

    if (!Array.isArray(config.patterns)) {
      throw new Error('工作流配置的 patterns 字段必须是数组');
    }

    if (config.patterns.length === 0) {
      throw new Error('工作流配置的 patterns 不能为空');
    }

    // 验证模式格式
    for (const pattern of config.patterns) {
      if (typeof pattern !== 'string' || pattern.trim().length === 0) {
        throw new Error(`无效的工作流模式: ${pattern}`);
      }
    }
  }
}

/**
 * 全局容器注册表实例
 * 
 * 单例模式，确保整个应用中只有一个注册表实例
 */
export const pluginContainerRegistry = new PluginContainerRegistry();

/**
 * 获取全局容器注册表实例
 * 
 * @returns 容器注册表实例
 */
export function getPluginContainerRegistry(): PluginContainerRegistry {
  return pluginContainerRegistry;
}
