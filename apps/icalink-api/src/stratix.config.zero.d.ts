/**
 * 🚀 Stratix零配置方案
 *
 * 核心理念：
 * - 零配置：开箱即用，无需任何配置即可启动
 * - 渐进式：需要时可以逐步添加配置
 * - 智能化：自动推导合理的默认值
 * - 自文档：配置即文档，清晰易懂
 */
import { type StratixConfig } from '@stratix/core';
/**
 * 零配置启动函数
 * 使用智能默认值，适合快速开发和原型验证
 */
export declare const createZeroConfig: () => StratixConfig;
/**
 * 配置选项接口 - 自文档化
 */
export interface ConfigOptions {
    /** 🔐 敏感信息配置（可选） */
    sensitiveInfo?: {
        /** WAS V7 配置 */
        wasV7?: {
            /** 应用ID */
            appId: string;
            /** 应用密钥 */
            appSecret: string;
        };
        /** 数据库配置 */
        databases?: {
            /** 默认数据库 */
            default?: {
                host: string;
                port: number;
                user: string;
                password: string;
                database: string;
            };
            /** 原始数据库 */
            origin?: {
                host: string;
                port: number;
                user: string;
                password: string;
                database: string;
            };
        };
        /** Web配置 */
        web?: {
            /** HTTPS配置 */
            https?: {
                /** 私钥文件名 */
                key: string;
                /** 证书文件名 */
                cert: string;
            };
            /** 自定义端口 */
            port?: number;
        };
        /** API配置 */
        icalink_api?: any;
        /** 日志配置 */
        logger?: {
            /** 日志级别 */
            loglevle?: string;
            /** 禁用请求日志 */
            disableRequestLogging?: boolean;
        };
    };
    /** 🌍 环境配置（可选） */
    environment?: 'development' | 'staging' | 'production';
    /** 📋 应用信息覆盖（可选） */
    app?: {
        name?: string;
        version?: string;
        description?: string;
    };
}
/**
 * 自定义配置创建函数
 * 基于零配置，允许用户渐进式添加配置
 */
export declare const createCustomConfig: (options?: ConfigOptions) => StratixConfig;
/**
 * 开发环境预设
 * 适合本地开发，启用调试功能
 */
export declare const createDevelopmentConfig: (sensitiveInfo?: any) => StratixConfig;
/**
 * 生产环境预设
 * 适合生产部署，优化性能和安全性
 */
export declare const createProductionConfig: (sensitiveInfo: any) => StratixConfig;
/**
 * 测试环境预设
 * 适合集成测试和预发布验证
 */
export declare const createStagingConfig: (sensitiveInfo: any) => StratixConfig;
/**
 * 配置验证结果
 */
export interface ValidationResult {
    /** 是否有效 */
    isValid: boolean;
    /** 错误信息 */
    errors: string[];
    /** 警告信息 */
    warnings: string[];
    /** 修复建议 */
    suggestions: string[];
}
/**
 * 验证配置
 * 提供详细的错误信息和修复建议
 */
export declare const validateConfig: (config: StratixConfig) => ValidationResult;
/**
 * 安全的配置创建函数
 * 自动验证配置并提供详细的反馈
 */
export declare const createValidatedConfig: (options?: ConfigOptions) => StratixConfig;
/**
 * 使用示例
 *
 * 1. 零配置启动（最简单）:
 * ```typescript
 * import { createZeroConfig } from './stratix.config.zero.js';
 * export default createZeroConfig();
 * ```
 *
 * 2. 开发环境快速启动:
 * ```typescript
 * import { createDevelopmentConfig } from './stratix.config.zero.js';
 * export default createDevelopmentConfig();
 * ```
 *
 * 3. 自定义配置（渐进式）:
 * ```typescript
 * import { createCustomConfig } from './stratix.config.zero.js';
 * export default createCustomConfig({
 *   app: {
 *     name: 'my-awesome-app',
 *     version: '2.0.0'
 *   },
 *   sensitiveInfo: {
 *     databases: {
 *       default: {
 *         host: 'localhost',
 *         port: 3306,
 *         user: 'root',
 *         password: 'password',
 *         database: 'mydb'
 *       }
 *     }
 *   }
 * });
 * ```
 *
 * 4. 生产环境配置:
 * ```typescript
 * import { createProductionConfig } from './stratix.config.zero.js';
 * export default createProductionConfig(sensitiveInfo);
 * ```
 *
 * 5. 带验证的安全配置:
 * ```typescript
 * import { createValidatedConfig } from './stratix.config.zero.js';
 * export default createValidatedConfig(options);
 * ```
 */
/**
 * 默认导出 - 向后兼容原有配置方式
 * 如果提供了 sensitiveInfo 参数，使用自定义配置
 * 否则使用零配置
 */
declare const _default: (sensitiveInfo?: any) => StratixConfig;
export default _default;
//# sourceMappingURL=stratix.config.zero.d.ts.map