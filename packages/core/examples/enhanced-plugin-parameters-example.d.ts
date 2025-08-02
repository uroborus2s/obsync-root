import type { FastifyPluginOptions } from 'fastify';
interface MyPluginOptions extends FastifyPluginOptions {
    apiUrl?: string;
    timeout?: number;
    retries?: number;
    enableCache?: boolean;
    cacheConfig?: {
        ttl?: number;
        maxSize?: number;
    };
    features?: string[];
}
declare const basicEnhancedPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const validatedPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const transformedPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const advancedValidationPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
export declare function demonstrateEnhancedParameters(): void;
export { basicEnhancedPlugin, validatedPlugin, transformedPlugin, advancedValidationPlugin };
//# sourceMappingURL=enhanced-plugin-parameters-example.d.ts.map