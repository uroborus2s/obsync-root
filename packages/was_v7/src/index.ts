// 导出适配器接口
export type { WpsCalendarAdapter } from './adapters/calendar.adapter.js';
export type { WpsChatAdapter } from './adapters/chat.adapter.js';
export type { WpsCompanyAdapter } from './adapters/company.adapter.js';
export type { WpsDBSheetAdapter } from './adapters/dbsheet.adapter.js';
export type { WpsDepartmentAdapter } from './adapters/department.adapter.js';
export type { WpsDriveAdapter } from './adapters/drives.adapter.js';
export type { WpsMessageAdapter } from './adapters/message.adapter.js';
export type { WpsScheduleAdapter } from './adapters/schedule.adapter.js';
export type { WpsUserAuthAdapter } from './adapters/user-auth.adapter.js';
export type { GetUserParams, WpsUserAdapter } from './adapters/user.adapter.js';

// 导出插件配置类型
export type { WasV7PluginOptions } from './plugin.js';

// 导出错误类
export { WpsError } from './core/error.js';

// 导出类型定义，便于使用方引用
export * from './types/index.js';

// 默认导出插件工厂函数
export { default } from './plugin.js';
