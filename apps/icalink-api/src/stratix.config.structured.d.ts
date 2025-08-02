/**
 * 方案2：增强结构化配置
 *
 * 主要改进：
 * 1. 模块化配置文件拆分
 * 2. 强类型配置定义
 * 3. 配置验证和默认值
 * 4. 环境特定配置
 * 5. 自文档化配置
 */
import { type StratixConfig } from '@stratix/core';
/**
 * 环境配置接口
 */
export interface EnvironmentConfig {
    readonly environment: 'development' | 'staging' | 'production';
    readonly debug: boolean;
    readonly sensitiveInfo: any;
}
/**
 * 结构化配置构建器
 */
export declare class StratixConfigBuilder {
    private readonly projectRootDir;
    private readonly envConfig;
    constructor(sensitiveInfo: any, environment?: string);
    /**
     * 构建完整配置
     */
    build(): StratixConfig;
    /**
     * 配置验证
     */
    private validateConfig;
    /**
     * 获取环境特定配置
     */
    getEnvironmentConfig(): EnvironmentConfig;
    /**
     * 获取项目根目录
     */
    getProjectRootDir(): string;
}
/**
 * 配置工厂函数
 */
export declare const createStratixConfig: (sensitiveInfo: any, environment?: string) => StratixConfig;
/**
 * 默认导出：保持向后兼容
 */
declare const _default: (sensitiveInfo: any) => StratixConfig;
export default _default;
//# sourceMappingURL=stratix.config.structured.d.ts.map