// @wps/hltnlink 数据表Schema统一导出
// 用于自动表创建功能

import { calendarScheduleTableSchema } from './calendar-schedule-schema.js';
import { calendarTableSchema } from './calendar-schema.js';
import { courseClassTableSchema } from './course-class-schema.js';

// 重新导出
export { calendarScheduleTableSchema } from './calendar-schedule-schema.js';
export { calendarTableSchema } from './calendar-schema.js';
export { courseClassTableSchema } from './course-class-schema.js';

/**
 * 所有表的Schema定义
 */
export const allTableSchemas = {
  calendars: calendarTableSchema,
  course_classes: courseClassTableSchema,
  calendar_schedules: calendarScheduleTableSchema
};

/**
 * 表创建顺序（考虑外键依赖关系）
 */
export const tableCreationOrder = [
  'calendars', // 主表，无外键依赖
  'course_classes', // 依赖calendars表
  'calendar_schedules' // 依赖calendars表
];

/**
 * 获取指定表的Schema
 */
export function getTableSchema(tableName: keyof typeof allTableSchemas) {
  return allTableSchemas[tableName];
}

/**
 * 获取所有表的Schema列表
 */
export function getAllTableSchemas() {
  return Object.values(allTableSchemas);
}

/**
 * 按创建顺序获取表Schema
 */
export function getTableSchemasInOrder() {
  return tableCreationOrder.map((tableName) => ({
    tableName,
    schema: allTableSchemas[tableName as keyof typeof allTableSchemas]
  }));
}
