// @wps/app-icalink Repository导出
// 统一导出所有Repository接口和实现类

// Repository接口导出
export * from './interfaces/index.js';

// Repository实现导出
export { default as AttendanceCourseRepository } from './AttendanceCourseRepository.js';
export { default as AttendanceRecordRepository } from './AttendanceRecordRepository.js';
export { default as LeaveApplicationRepository } from './LeaveApplicationRepository.js';
export { default as LeaveApprovalRepository } from './LeaveApprovalRepository.js';
export { default as LeaveAttachmentRepository } from './LeaveAttachmentRepository.js';
export { default as StudentRepository } from './StudentRepository.js';
export { default as SystemConfigRepository } from './SystemConfigRepository.js';
export { default as TeacherRepository } from './TeacherRepository.js';
