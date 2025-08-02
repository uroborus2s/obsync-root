/**
 * 敏感配置信息接口
 */
export interface SensitiveConfig {
    web: {
        port: number;
        host: string;
        https?: {
            key: string;
            cert: string;
        };
    };
    logger: {
        loglevle: string;
        disableRequestLogging: boolean;
    };
    databases: {
        default: {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
        };
        origin: {
            host: string;
            port: number;
            user: string;
            password: string;
            database: string;
        };
    };
    wasV7: {
        appId: string;
        appSecret: string;
    };
    icalink_api: {
        appUrl: string;
        tokenSecret: string;
    };
}
/**
 * 环境配置加载器
 * 使用 @stratix/core 的加密功能
 */
export declare class EnvironmentLoader {
    /**
     * 获取项目根目录
     */
    private static getProjectRoot;
    /**
     * 加密配置信息
     *
     * @param data - 要加密的配置对象
     * @returns 加密后的字符串
     */
    static encryptConfig(data: SensitiveConfig): string;
    /**
     * 解密配置信息
     *
     * @param encryptedData - 加密的配置字符串
     * @returns 解密后的配置对象
     */
    static decryptConfig(encryptedData: string): SensitiveConfig;
    /**
     * 从文件加载配置
     *
     * @param filePath - 配置文件路径
     * @returns 配置对象
     */
    static loadFromFile(filePath: string): SensitiveConfig;
    /**
     * 验证配置对象的完整性
     *
     * @param config - 要验证的配置对象
     * @returns 验证是否通过
     */
    static validateConfig(config: any): config is SensitiveConfig;
}
/**
 * 加载环境配置的主函数
 *
 * @returns 解密后的敏感配置信息
 */
export declare function loadEnvironment(): SensitiveConfig;
/**
 * 生成加密配置的工具函数
 * 用于将 prod.env.json 转换为加密的环境变量
 */
export declare function generateEncryptedConfig(): void;
//# sourceMappingURL=environment.d.ts.map