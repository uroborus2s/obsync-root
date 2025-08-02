import type { FastifyPluginOptions } from 'fastify';
interface MyPluginOptions extends FastifyPluginOptions {
    apiUrl?: string;
    timeout?: number;
    retries?: number;
    enableCache?: boolean;
    features?: string[];
}
declare const basicPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const validatedPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const advancedPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
declare const processingOnlyPlugin: import("fastify").FastifyPluginAsync<MyPluginOptions>;
export declare function demonstrateSimplifiedParameters(): void;
export { basicPlugin, validatedPlugin, advancedPlugin, processingOnlyPlugin };
//# sourceMappingURL=simplified-plugin-parameters-example.d.ts.map