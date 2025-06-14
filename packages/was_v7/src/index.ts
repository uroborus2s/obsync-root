// 导出模块类型
export type { CalendarModule } from './modules/calendar.js';
export type { ChatModule } from './modules/chat.js';
export type { CompanyModule } from './modules/company.js';
export type { DepartmentModule, DeptTreeNode } from './modules/department.js';
export type { MessageModule } from './modules/message.js';
export type { ScheduleModule } from './modules/schedule.js';
export type { UserAuthModule } from './modules/user-auth.js';
export type { UserModule } from './modules/user.js';

// 导出插件配置类型
export type { WasV7PluginOptions } from './plugin.js';

// 导出类型定义，便于使用方引用
export * from './types/index.js';
// 默认导出插件工厂函数
export { wasV7Plugin as default } from './plugin.js';
