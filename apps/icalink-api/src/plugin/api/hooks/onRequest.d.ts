import type { FastifyInstance } from '@stratix/core';
import { IicalinkPluginParams } from '../types/attendance.js';
/**
 * 注册认证钩子
 * @param fastify Fastify实例
 * @param options 插件参数
 */
export declare function apiOnRequest(fastify: FastifyInstance, options: IicalinkPluginParams): Promise<void>;
//# sourceMappingURL=onRequest.d.ts.map