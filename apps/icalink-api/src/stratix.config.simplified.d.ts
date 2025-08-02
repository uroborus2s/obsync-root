/**
 * 方案1：简化配置语法
 *
 * 主要改进：
 * 1. 使用对象语法替代数组嵌套
 * 2. 提供插件配置的智能推导
 * 3. 简化敏感信息处理
 * 4. 减少重复配置
 */
import { type StratixConfig } from '@stratix/core';
export declare const createConfig: (sensitiveInfo: any) => StratixConfig;
export declare const convertToLegacyFormat: (config: ReturnType<typeof createConfig>) => StratixConfig;
declare const _default: (sensitiveInfo: any) => StratixConfig;
export default _default;
//# sourceMappingURL=stratix.config.simplified.d.ts.map