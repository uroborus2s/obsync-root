/**
 * WPS OAuth认证控制器
 * 处理WPS OAuth认证流程，包括重定向、回调和cookie管理
 */
import type { FastifyInstance } from '@stratix/core';
import { IicalinkPluginParams } from '../types/attendance.js';
export declare function authController(fastify: FastifyInstance, options: IicalinkPluginParams): Promise<void>;
//# sourceMappingURL=auth.controller.d.ts.map