/**
 * @stratix/core - Cross Plugin Workflow Loader
 * 
 * 跨插件工作流组件加载器，负责在 @stratix/tasks 容器中加载
 * 其他插件的工作流定义和执行器，实现跨插件依赖注入。
 */

import type { AwilixContainer } from 'awilix';
import { asValue, asFunction, Lifetime } from 'awilix';
import { 
  pluginContainerRegistry, 
  type PluginContainerInfo 
} from './container-registry.js';
import {
  isTaskExecutor,
  isWorkflowDefinition,
  type TaskExecutor,
  type WorkflowDefinitionBase,
  type CrossPluginWorkflowLoader as ICrossPluginWorkflowLoader
} from './workflow-types.js';

/**
 * 跨插件工作流组件加载器
 * 
 * 职责：
 * 1. 发现和加载其他插件的工作流组件
 * 2. 在 @stratix/tasks 容器中注册代理
 * 3. 实现跨容器依赖注入
 * 4. 管理组件命名和冲突解决
 */
export class CrossPluginWorkflowLoader implements ICrossPluginWorkflowLoader {
  constructor(
    private tasksContainer: AwilixContainer,
    private debugEnabled: boolean = false
  ) {}

  /**
   * 加载所有插件的工作流组件
   */
  async loadAllPluginWorkflows(): Promise<void> {
    const workflowPlugins = pluginContainerRegistry.getWorkflowEnabledPlugins();
    
    if (this.debugEnabled) {
      console.log(`🔄 开始加载 ${workflowPlugins.length} 个插件的工作流组件...`);
    }

    for (const pluginInfo of workflowPlugins) {
      if (pluginInfo.pluginName !== '@stratix/tasks') {
        try {
          await this.loadPluginWorkflows(pluginInfo.pluginName);
        } catch (error) {
          console.error(`❌ 加载插件工作流组件失败: ${pluginInfo.pluginName}`, error);
          // 继续加载其他插件，不因单个插件失败而中断
        }
      }
    }

    if (this.debugEnabled) {
      console.log('✅ 所有插件工作流组件加载完成');
    }
  }

  /**
   * 加载特定插件的工作流组件
   */
  async loadPluginWorkflows(pluginName: string): Promise<void> {
    const containerInfo = pluginContainerRegistry.getContainerInfo(pluginName);
    if (!containerInfo?.workflowConfig) {
      if (this.debugEnabled) {
        console.log(`⏭️ 插件 ${pluginName} 未启用工作流功能，跳过加载`);
      }
      return;
    }

    if (this.debugEnabled) {
      console.log(`🔄 加载插件 ${pluginName} 的工作流组件...`);
    }

    try {
      // 1. 加载工作流定义
      await this.loadWorkflowDefinitions(containerInfo);
      
      // 2. 加载执行器（使用跨容器代理）
      await this.loadExecutorsWithCrossContainerDI(containerInfo);
      
      // 3. 加载工作流服务
      await this.loadWorkflowServices(containerInfo);

      if (this.debugEnabled) {
        console.log(`✅ 插件 ${pluginName} 的工作流组件加载完成`);
      }

    } catch (error) {
      console.error(`❌ 加载插件 ${pluginName} 的工作流组件失败:`, error);
      throw error;
    }
  }

  /**
   * 加载工作流定义
   */
  private async loadWorkflowDefinitions(pluginInfo: PluginContainerInfo): Promise<void> {
    const definitionPatterns = pluginInfo.workflowConfig!.patterns
      .filter(pattern => pattern.includes('definitions'));

    if (definitionPatterns.length === 0) {
      if (this.debugEnabled) {
        console.log(`⏭️ 插件 ${pluginInfo.pluginName} 无工作流定义模式，跳过`);
      }
      return;
    }

    try {
      // 使用 loadModules 扫描定义文件
      const modules = await this.tasksContainer.loadModules(definitionPatterns, {
        cwd: pluginInfo.basePath,
        formatName: 'camelCase',
        resolverOptions: {
          lifetime: Lifetime.SINGLETON
        },
        esModules: true
      });

      let definitionCount = 0;

      // 注册工作流定义到 tasks 容器
      for (const [moduleName, moduleExports] of Object.entries(modules)) {
        if (isWorkflowDefinition(moduleExports)) {
          const definition = moduleExports as WorkflowDefinitionBase;
          
          // 添加插件来源信息
          definition.metadata = {
            ...definition.metadata,
            sourcePlugin: pluginInfo.pluginName,
            loadedAt: new Date(),
            moduleName
          };

          // 生成注册键名
          const registrationKeys = this.generateDefinitionRegistrationKeys(
            definition,
            pluginInfo.pluginName,
            moduleName
          );

          // 使用多个键名注册定义
          for (const key of registrationKeys) {
            this.tasksContainer.register(key, asValue(definition));
            
            if (this.debugEnabled) {
              console.log(`📋 工作流定义注册: ${key} (来自 ${pluginInfo.pluginName})`);
            }
          }

          definitionCount++;
        }
      }

      if (this.debugEnabled) {
        console.log(`📋 从插件 ${pluginInfo.pluginName} 加载了 ${definitionCount} 个工作流定义`);
      }

    } catch (error) {
      console.error(`❌ 加载插件 ${pluginInfo.pluginName} 的工作流定义失败:`, error);
      throw error;
    }
  }

  /**
   * 使用跨容器依赖注入加载执行器
   */
  private async loadExecutorsWithCrossContainerDI(pluginInfo: PluginContainerInfo): Promise<void> {
    const executorPatterns = pluginInfo.workflowConfig!.patterns
      .filter(pattern => pattern.includes('executors'));

    if (executorPatterns.length === 0) {
      if (this.debugEnabled) {
        console.log(`⏭️ 插件 ${pluginInfo.pluginName} 无执行器模式，跳过`);
      }
      return;
    }

    try {
      // 扫描执行器文件
      const modules = await this.scanModulesForClasses(executorPatterns, pluginInfo.basePath);
      let executorCount = 0;

      for (const [moduleName, ExecutorClass] of Object.entries(modules)) {
        if (isTaskExecutor(ExecutorClass.prototype)) {
          const executorName = ExecutorClass.prototype.name || moduleName;
          
          // 生成 @stratix/tasks 容器中的注册键名
          const tasksContainerKeys = this.generateExecutorRegistrationKeys(
            executorName,
            pluginInfo.pluginName,
            moduleName
          );

          // 创建跨容器代理工厂
          const crossContainerFactory = this.createCrossContainerExecutorFactory(
            moduleName,
            pluginInfo.container,
            pluginInfo
          );

          // 在 @stratix/tasks 容器中注册代理
          for (const key of tasksContainerKeys) {
            this.tasksContainer.register(
              key,
              asFunction(crossContainerFactory, {
                lifetime: Lifetime.SINGLETON
              })
            );

            if (this.debugEnabled) {
              console.log(`⚙️ 执行器代理注册: ${key} -> ${pluginInfo.pluginName}.${moduleName}`);
            }
          }

          executorCount++;
        }
      }

      if (this.debugEnabled) {
        console.log(`⚙️ 从插件 ${pluginInfo.pluginName} 加载了 ${executorCount} 个执行器`);
      }

    } catch (error) {
      console.error(`❌ 加载插件 ${pluginInfo.pluginName} 的执行器失败:`, error);
      throw error;
    }
  }

  /**
   * 加载工作流服务
   */
  private async loadWorkflowServices(pluginInfo: PluginContainerInfo): Promise<void> {
    const servicePatterns = pluginInfo.workflowConfig!.patterns
      .filter(pattern => pattern.includes('services'));

    if (servicePatterns.length === 0) {
      if (this.debugEnabled) {
        console.log(`⏭️ 插件 ${pluginInfo.pluginName} 无工作流服务模式，跳过`);
      }
      return;
    }

    try {
      // 扫描服务文件
      const modules = await this.scanModulesForClasses(servicePatterns, pluginInfo.basePath);
      let serviceCount = 0;

      for (const [moduleName, ServiceClass] of Object.entries(modules)) {
        if (this.isWorkflowService(ServiceClass)) {
          // 直接在 tasks 容器中注册服务
          this.tasksContainer.register(
            `workflowService_${moduleName}`,
            asFunction(() => new ServiceClass(), {
              lifetime: Lifetime.SINGLETON
            })
          );

          if (this.debugEnabled) {
            console.log(`🔧 工作流服务注册: workflowService_${moduleName} (来自 ${pluginInfo.pluginName})`);
          }

          serviceCount++;
        }
      }

      if (this.debugEnabled) {
        console.log(`🔧 从插件 ${pluginInfo.pluginName} 加载了 ${serviceCount} 个工作流服务`);
      }

    } catch (error) {
      console.error(`❌ 加载插件 ${pluginInfo.pluginName} 的工作流服务失败:`, error);
      throw error;
    }
  }

  /**
   * 创建跨容器执行器代理工厂
   */
  private createCrossContainerExecutorFactory(
    sourceModuleName: string,
    sourceContainer: AwilixContainer,
    pluginInfo: PluginContainerInfo
  ): (tasksContainer: AwilixContainer) => TaskExecutor {
    return (tasksContainer: AwilixContainer) => {
      try {
        // 🔥 关键：从源插件容器解析执行器实例
        // 这里的依赖注入发生在源插件容器中
        const executorInstance = sourceContainer.resolve<TaskExecutor>(sourceModuleName);
        
        if (this.debugEnabled) {
          console.log(`🔄 跨容器代理解析: ${sourceModuleName} (来自 ${pluginInfo.pluginName})`);
        }

        // 返回已经完成依赖注入的执行器实例
        return executorInstance;

      } catch (error) {
        throw new Error(
          `跨容器执行器解析失败: ${sourceModuleName} (插件: ${pluginInfo.pluginName}) - ${error.message}`
        );
      }
    };
  }

  /**
   * 生成工作流定义的注册键名
   */
  private generateDefinitionRegistrationKeys(
    definition: WorkflowDefinitionBase,
    pluginName: string,
    moduleName: string
  ): string[] {
    const keys: string[] = [];

    // 1. 标准格式：workflowDefinition_<id>
    keys.push(`workflowDefinition_${definition.id}`);

    // 2. 直接使用定义ID
    keys.push(definition.id);

    // 3. 插件前缀格式
    const pluginPrefix = this.extractPluginPrefix(pluginName);
    if (pluginPrefix) {
      keys.push(`${pluginPrefix}_${definition.id}`);
      keys.push(`workflowDefinition_${pluginPrefix}_${definition.id}`);
    }

    // 4. 模块名格式
    keys.push(moduleName);
    keys.push(`workflowDefinition_${moduleName}`);

    return [...new Set(keys)];
  }

  /**
   * 生成执行器的注册键名
   */
  private generateExecutorRegistrationKeys(
    executorName: string,
    pluginName: string,
    moduleName: string
  ): string[] {
    const keys: string[] = [];
    const pluginPrefix = this.extractPluginPrefix(pluginName);

    // 1. 标准格式：executor_<name>
    keys.push(`executor_${executorName}`);

    // 2. 插件前缀格式：executor_<plugin>_<name>
    if (pluginPrefix) {
      keys.push(`executor_${pluginPrefix}_${executorName}`);
    }

    // 3. 直接名称
    keys.push(executorName);

    // 4. 插件前缀 + 名称：<plugin>_<name>
    if (pluginPrefix) {
      keys.push(`${pluginPrefix}_${executorName}`);
    }

    // 5. 模块名格式
    keys.push(`executor_${moduleName}`);
    keys.push(moduleName);

    return [...new Set(keys)];
  }

  /**
   * 扫描模块文件获取类定义
   */
  private async scanModulesForClasses(patterns: string[], basePath: string): Promise<Record<string, any>> {
    // 创建临时容器用于扫描
    const tempContainer = this.tasksContainer.createScope();
    
    try {
      return await tempContainer.loadModules(patterns, {
        cwd: basePath,
        formatName: 'camelCase',
        resolverOptions: {
          lifetime: Lifetime.TRANSIENT
        },
        esModules: true
      });
    } finally {
      await tempContainer.dispose();
    }
  }

  /**
   * 提取插件前缀
   */
  private extractPluginPrefix(pluginName: string): string | null {
    // @stratix/user -> user
    // @company/order-service -> order-service
    const match = pluginName.match(/@[^/]+\/(.+)/);
    return match ? match[1] : null;
  }

  /**
   * 检查是否为工作流服务
   */
  private isWorkflowService(moduleExports: any): boolean {
    return moduleExports && 
           typeof moduleExports === 'function' && 
           moduleExports.name && 
           (moduleExports.name.includes('Service') || moduleExports.name.includes('Manager'));
  }
}
