import type { FastifyPluginOptions } from 'fastify';
interface MyPluginOptions extends FastifyPluginOptions {
    apiUrl?: string;
    timeout?: number;
    features?: string[];
}
declare const minimalPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const customizedPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const deepMergePlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const enhancedPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const fullyCustomPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
export declare function demonstrateDefaultConfigMerge(): void;
export declare function showConfigComparison(): void;
export { minimalPlugin, customizedPlugin, deepMergePlugin, enhancedPlugin, fullyCustomPlugin };
//# sourceMappingURL=default-config-merge-example.d.ts.map