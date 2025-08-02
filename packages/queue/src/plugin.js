/**
 * 队列插件系统
 * 提供队列功能的扩展机制
 */
import { EventEmitter } from 'events';
/**
 * 插件管理器
 */
export class PluginManager extends EventEmitter {
    plugins = new Map();
    installedPlugins = new Set();
    /**
     * 注册插件
     */
    register(plugin) {
        if (this.plugins.has(plugin.name)) {
            throw new Error(`Plugin '${plugin.name}' is already registered`);
        }
        this.plugins.set(plugin.name, plugin);
        this.emit('pluginRegistered', plugin);
    }
    /**
     * 安装插件
     */
    async install(pluginName, queueManager) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin '${pluginName}' not found`);
        }
        if (this.installedPlugins.has(pluginName)) {
            throw new Error(`Plugin '${pluginName}' is already installed`);
        }
        await plugin.install(queueManager);
        this.installedPlugins.add(pluginName);
        this.emit('pluginInstalled', plugin);
    }
    /**
     * 卸载插件
     */
    async uninstall(pluginName, queueManager) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin '${pluginName}' not found`);
        }
        if (!this.installedPlugins.has(pluginName)) {
            throw new Error(`Plugin '${pluginName}' is not installed`);
        }
        await plugin.uninstall(queueManager);
        this.installedPlugins.delete(pluginName);
        this.emit('pluginUninstalled', plugin);
    }
    /**
     * 获取已安装的插件列表
     */
    getInstalledPlugins() {
        return Array.from(this.installedPlugins);
    }
    /**
     * 获取所有注册的插件
     */
    getRegisteredPlugins() {
        return Array.from(this.plugins.values());
    }
    /**
     * 检查插件是否已安装
     */
    isInstalled(pluginName) {
        return this.installedPlugins.has(pluginName);
    }
}
/**
 * 默认插件管理器实例
 */
export const defaultPluginManager = new PluginManager();
/**
 * 创建队列插件
 */
export function createQueuePlugin(name, version, options) {
    return {
        name,
        version,
        install: options.install || (async () => { }),
        uninstall: options.uninstall || (async () => { }),
        onQueueCreated: options.onQueueCreated,
        onQueueDestroyed: options.onQueueDestroyed
    };
}
//# sourceMappingURL=plugin.js.map