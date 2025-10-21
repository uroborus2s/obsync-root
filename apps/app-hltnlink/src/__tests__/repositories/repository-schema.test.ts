// @wps/hltnlink Repository Schema测试
// 验证Repository层的tableSchema配置

import { describe, it, expect } from 'vitest';
import {
  CalendarRepository,
  CourseClassRepository,
  CalendarScheduleRepository,
  RepositoryFactory
} from '../../repositories/index.js';
import {
  calendarTableSchema,
  courseClassTableSchema,
  calendarScheduleTableSchema,
  allTableSchemas,
  tableCreationOrder,
  getTableSchema,
  getAllTableSchemas,
  getTableSchemasInOrder
} from '../../repositories/schemas/index.js';

// Mock Logger
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {}
} as any;

describe('Repository Schema测试', () => {
  describe('Schema定义测试', () => {
    it('应该有正确的Calendar表Schema', () => {
      expect(calendarTableSchema.tableName).toBe('calendars');
      expect(calendarTableSchema.comment).toBe('日历表 - 存储课程日历信息');
      expect(calendarTableSchema.columns).toBeDefined();
      expect(calendarTableSchema.indexes).toBeDefined();
      
      // 检查主键字段
      const primaryKeyColumn = calendarTableSchema.columns.find(col => col.constraints?.primaryKey);
      expect(primaryKeyColumn).toBeDefined();
      expect(primaryKeyColumn?.name).toBe('calendar_id');
      
      // 检查必要字段
      const requiredFields = ['wps_calendar_id', 'course_id', 'teacher_id', 'xnxq'];
      requiredFields.forEach(fieldName => {
        const field = calendarTableSchema.columns.find(col => col.name === fieldName);
        expect(field).toBeDefined();
        expect(field?.constraints?.nullable).toBe(false);
      });
    });

    it('应该有正确的CourseClass表Schema', () => {
      expect(courseClassTableSchema.tableName).toBe('course_classes');
      expect(courseClassTableSchema.comment).toBe('课程班级表 - 存储学生与课程的关联关系');
      expect(courseClassTableSchema.columns).toBeDefined();
      expect(courseClassTableSchema.indexes).toBeDefined();
      
      // 检查外键关系
      const calendarIdColumn = courseClassTableSchema.columns.find(col => col.name === 'calendar_id');
      expect(calendarIdColumn).toBeDefined();
      expect(calendarIdColumn?.constraints?.references).toBeDefined();
      expect(calendarIdColumn?.constraints?.references?.table).toBe('calendars');
      expect(calendarIdColumn?.constraints?.references?.column).toBe('calendar_id');
    });

    it('应该有正确的CalendarSchedule表Schema', () => {
      expect(calendarScheduleTableSchema.tableName).toBe('calendar_schedules');
      expect(calendarScheduleTableSchema.comment).toBe('日历课程表 - 存储具体的课程安排');
      expect(calendarScheduleTableSchema.columns).toBeDefined();
      expect(calendarScheduleTableSchema.indexes).toBeDefined();
      
      // 检查时间字段
      const startTimeColumn = calendarScheduleTableSchema.columns.find(col => col.name === 'start_time');
      const endTimeColumn = calendarScheduleTableSchema.columns.find(col => col.name === 'end_time');
      expect(startTimeColumn).toBeDefined();
      expect(endTimeColumn).toBeDefined();
      expect(startTimeColumn?.type).toBe('timestamp');
      expect(endTimeColumn?.type).toBe('timestamp');
    });
  });

  describe('Schema工具函数测试', () => {
    it('应该正确返回所有表Schema', () => {
      expect(allTableSchemas.calendars).toBe(calendarTableSchema);
      expect(allTableSchemas.course_classes).toBe(courseClassTableSchema);
      expect(allTableSchemas.calendar_schedules).toBe(calendarScheduleTableSchema);
    });

    it('应该有正确的表创建顺序', () => {
      expect(tableCreationOrder).toEqual([
        'calendars',
        'course_classes',
        'calendar_schedules'
      ]);
    });

    it('getTableSchema应该返回正确的Schema', () => {
      expect(getTableSchema('calendars')).toBe(calendarTableSchema);
      expect(getTableSchema('course_classes')).toBe(courseClassTableSchema);
      expect(getTableSchema('calendar_schedules')).toBe(calendarScheduleTableSchema);
    });

    it('getAllTableSchemas应该返回所有Schema', () => {
      const schemas = getAllTableSchemas();
      expect(schemas).toHaveLength(3);
      expect(schemas).toContain(calendarTableSchema);
      expect(schemas).toContain(courseClassTableSchema);
      expect(schemas).toContain(calendarScheduleTableSchema);
    });

    it('getTableSchemasInOrder应该按正确顺序返回Schema', () => {
      const schemasInOrder = getTableSchemasInOrder();
      expect(schemasInOrder).toHaveLength(3);
      expect(schemasInOrder[0].tableName).toBe('calendars');
      expect(schemasInOrder[1].tableName).toBe('course_classes');
      expect(schemasInOrder[2].tableName).toBe('calendar_schedules');
    });
  });

  describe('Repository Schema集成测试', () => {
    it('CalendarRepository应该有正确的tableSchema', () => {
      const repository = RepositoryFactory.createCalendarRepository(mockLogger);
      const schema = (repository as any).tableSchema;
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('calendars');
      expect(schema.columns).toBeDefined();
      expect(schema.indexes).toBeDefined();
    });

    it('CourseClassRepository应该有正确的tableSchema', () => {
      const repository = RepositoryFactory.createCourseClassRepository(mockLogger);
      const schema = (repository as any).tableSchema;
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('course_classes');
      expect(schema.columns).toBeDefined();
      expect(schema.indexes).toBeDefined();
    });

    it('CalendarScheduleRepository应该有正确的tableSchema', () => {
      const repository = RepositoryFactory.createCalendarScheduleRepository(mockLogger);
      const schema = (repository as any).tableSchema;
      
      expect(schema).toBeDefined();
      expect(schema.tableName).toBe('calendar_schedules');
      expect(schema.columns).toBeDefined();
      expect(schema.indexes).toBeDefined();
    });

    it('所有Repository应该启用自动表创建', () => {
      const calendarRepo = RepositoryFactory.createCalendarRepository(mockLogger);
      const courseClassRepo = RepositoryFactory.createCourseClassRepository(mockLogger);
      const scheduleRepo = RepositoryFactory.createCalendarScheduleRepository(mockLogger);

      // 检查自动表创建配置
      const calendarConfig = (calendarRepo as any).autoTableCreation;
      const courseClassConfig = (courseClassRepo as any).autoTableCreation;
      const scheduleConfig = (scheduleRepo as any).autoTableCreation;

      expect(calendarConfig?.enabled).toBe(true);
      expect(courseClassConfig?.enabled).toBe(true);
      expect(scheduleConfig?.enabled).toBe(true);

      expect(calendarConfig?.createIndexes).toBe(true);
      expect(courseClassConfig?.createIndexes).toBe(true);
      expect(scheduleConfig?.createIndexes).toBe(true);
    });
  });

  describe('Schema验证测试', () => {
    it('所有Schema应该有必要的字段', () => {
      const schemas = [calendarTableSchema, courseClassTableSchema, calendarScheduleTableSchema];
      
      schemas.forEach(schema => {
        // 检查基本属性
        expect(schema.tableName).toBeDefined();
        expect(schema.comment).toBeDefined();
        expect(schema.columns).toBeDefined();
        expect(schema.indexes).toBeDefined();
        
        // 检查主键
        const primaryKeyColumns = schema.columns.filter(col => col.constraints?.primaryKey);
        expect(primaryKeyColumns).toHaveLength(1);
        
        // 检查时间戳字段
        const createdAtColumn = schema.columns.find(col => col.name === 'created_at');
        const updatedAtColumn = schema.columns.find(col => col.name === 'updated_at');
        expect(createdAtColumn).toBeDefined();
        expect(updatedAtColumn).toBeDefined();
        expect(createdAtColumn?.type).toBe('timestamp');
        expect(updatedAtColumn?.type).toBe('timestamp');
      });
    });

    it('外键关系应该正确配置', () => {
      // CourseClass表应该引用Calendar表
      const courseClassCalendarRef = courseClassTableSchema.columns.find(
        col => col.name === 'calendar_id'
      );
      expect(courseClassCalendarRef?.constraints?.references?.table).toBe('calendars');
      expect(courseClassCalendarRef?.constraints?.references?.column).toBe('calendar_id');
      
      // CalendarSchedule表应该引用Calendar表
      const scheduleCalendarRef = calendarScheduleTableSchema.columns.find(
        col => col.name === 'calendar_id'
      );
      expect(scheduleCalendarRef?.constraints?.references?.table).toBe('calendars');
      expect(scheduleCalendarRef?.constraints?.references?.column).toBe('calendar_id');
    });

    it('索引应该正确配置', () => {
      // Calendar表索引
      expect(calendarTableSchema.indexes).toBeDefined();
      const calendarIndexes = calendarTableSchema.indexes!;
      expect(calendarIndexes.some(idx => idx.name === 'idx_calendars_wps_calendar_id')).toBe(true);
      expect(calendarIndexes.some(idx => idx.unique === true)).toBe(true);
      
      // CourseClass表索引
      expect(courseClassTableSchema.indexes).toBeDefined();
      const courseClassIndexes = courseClassTableSchema.indexes!;
      expect(courseClassIndexes.some(idx => idx.name === 'idx_course_classes_calendar_id')).toBe(true);
      
      // CalendarSchedule表索引
      expect(calendarScheduleTableSchema.indexes).toBeDefined();
      const scheduleIndexes = calendarScheduleTableSchema.indexes!;
      expect(scheduleIndexes.some(idx => idx.name === 'idx_calendar_schedules_time_range')).toBe(true);
    });
  });
});
