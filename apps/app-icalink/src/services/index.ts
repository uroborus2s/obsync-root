// @wps/app-icalink Service导出
// 统一导出所有Service接口和实现类

// Service接口导出
export * from './interfaces/index.js';

// Service实现导出
export { default as AttendanceService } from './AttendanceService.js';
export { default as LeaveService } from './LeaveService.js';
export { default as UserService } from './UserService.js';
