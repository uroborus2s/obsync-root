/**
 * 队列插件系统
 * 提供队列功能的扩展机制
 */
import { EventEmitter } from 'events';
import type { IQueue, IQueueManager } from './types/index.js';
/**
 * 队列插件接口
 */
export interface IQueuePlugin {
    name: string;
    version: string;
    install(queueManager: IQueueManager): Promise<void>;
    uninstall(queueManager: IQueueManager): Promise<void>;
    onQueueCreated?(queue: IQueue): Promise<void>;
    onQueueDestroyed?(queue: IQueue): Promise<void>;
}
/**
 * 插件管理器
 */
export declare class PluginManager extends EventEmitter {
    private plugins;
    private installedPlugins;
    /**
     * 注册插件
     */
    register(plugin: IQueuePlugin): void;
    /**
     * 安装插件
     */
    install(pluginName: string, queueManager: IQueueManager): Promise<void>;
    /**
     * 卸载插件
     */
    uninstall(pluginName: string, queueManager: IQueueManager): Promise<void>;
    /**
     * 获取已安装的插件列表
     */
    getInstalledPlugins(): string[];
    /**
     * 获取所有注册的插件
     */
    getRegisteredPlugins(): IQueuePlugin[];
    /**
     * 检查插件是否已安装
     */
    isInstalled(pluginName: string): boolean;
}
/**
 * 默认插件管理器实例
 */
export declare const defaultPluginManager: PluginManager;
/**
 * 创建队列插件
 */
export declare function createQueuePlugin(name: string, version: string, options: {
    install?: (queueManager: IQueueManager) => Promise<void>;
    uninstall?: (queueManager: IQueueManager) => Promise<void>;
    onQueueCreated?: (queue: IQueue) => Promise<void>;
    onQueueDestroyed?: (queue: IQueue) => Promise<void>;
}): IQueuePlugin;
//# sourceMappingURL=plugin.d.ts.map