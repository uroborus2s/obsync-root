import type { Logger, StratixPlugin } from '@stratix/core';
import { AuthManager } from './auth/auth-manager.js';
import { HttpClient } from './core/http-client.js';
import { CalendarModule } from './modules/calendar.js';
import { ChatModule } from './modules/chat.js';
import { CompanyModule } from './modules/company.js';
import { DepartmentModule } from './modules/department.js';
import { MessageModule } from './modules/message.js';
import { ScheduleModule } from './modules/schedule.js';
import { UserAuthModule } from './modules/user-auth.js';
import { UserModule } from './modules/user.js';
import { WpsConfig } from './types/index.js';
import { SignatureUtil } from './utils/signature.js';

/**
 * WPS V7 API 插件配置选项
 */
export interface WasV7PluginOptions extends WpsConfig {}

/**
 * 默认插件实例（需要配置）
 */
export const wasV7Plugin: StratixPlugin = {
  name: '@stratix/was-v7',
  version: '1.0.0',
  description: 'WPS V7 API 插件',
  skipOverride: true,
  defaultOptions: {
    baseUrl: 'https://openapi.wps.cn',
    timeout: 30000,
    retryTimes: 3,
    debug: false
  },
  diRegisters: {
    wasV7SignatureUtil: {
      value: (options: WpsConfig) =>
        new SignatureUtil(options.appId, options.appSecret),
      lifetime: 'singleton'
    },
    wasV7HttpClient: {
      value:
        (options: WpsConfig) =>
        (wasV7SignatureUtil: SignatureUtil, log: Logger) =>
          new HttpClient(wasV7SignatureUtil, log, options),
      lifetime: 'singleton'
    },
    wasV7AuthManager: {
      value:
        (options: WpsConfig) => (wasV7HttpClient: HttpClient, log: Logger) =>
          new AuthManager(wasV7HttpClient, options),
      lifetime: 'singleton'
    },
    wasV7Department: {
      value: DepartmentModule,
      lifetime: 'singleton'
    },
    wasV7Company: {
      value: CompanyModule,
      lifetime: 'singleton'
    },
    wasV7User: {
      value: UserModule,
      lifetime: 'singleton'
    },
    wasV7UserAuth: {
      value: UserAuthModule,
      lifetime: 'singleton'
    },
    wasV7Calendar: {
      value: CalendarModule,
      lifetime: 'singleton'
    },
    wasV7Schedule: {
      value: ScheduleModule,
      lifetime: 'singleton'
    },
    wasV7Message: {
      value: MessageModule,
      lifetime: 'singleton'
    },
    wasV7Chat: {
      value: ChatModule,
      lifetime: 'singleton'
    }
  }
};
