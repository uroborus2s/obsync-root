/**
 * @stratix/agendaedu 插件
 * 学校课表数据同步到WPS协作日程的插件
 */
import type { FastifyInstance } from '@stratix/core';
import { IicalinkPluginParams } from './types/attendance.js';
/**
 * AgendaEdu插件主函数
 */
declare function apiPlugin(fastify: FastifyInstance, options: IicalinkPluginParams): Promise<void>;
export declare const wrapApiPlugin: typeof apiPlugin;
export {};
//# sourceMappingURL=plugin.d.ts.map