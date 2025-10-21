import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseInitializer } from '../../../database/DatabaseInitializer.js';
import { CalendarRepository } from '../../repositories/CalendarRepository.js';
import type { CalendarCreateInput } from '../../types/database.types.js';

describe('CalendarRepository', () => {
  let db: Database.Database;
  let dbInitializer: DatabaseInitializer;
  let repository: CalendarRepository;

  beforeEach(async () => {
    dbInitializer = new DatabaseInitializer({
      databasePath: ':memory:',
      migrationsPath: './database',
      enableWAL: false,
      enableForeignKeys: true
    });

    await dbInitializer.runMigrations();
    db = dbInitializer.getDatabase();
    repository = new CalendarRepository(db);
  });

  afterEach(async () => {
    await dbInitializer.close();
  });

  describe('create', () => {
    it('should create a new calendar successfully', async () => {
      const input: CalendarCreateInput = {
        wps_calendar_id: 'wps_12345',
        calendar_name: '高等数学A',
        calendar_summary: '高等数学A课程日历',
        course_id: 'MATH_001',
        course_name: '高等数学A',
        course_code: 'MATH001',
        teacher_name: '张三',
        teacher_id: 'T001',
        academic_year: '2024-2025',
        semester: '1',
        xnxq: '2024-2025-1',
        metadata: { department: '数学学院' },
        status: 'ACTIVE'
      };

      const calendar = await repository.create(input);

      expect(calendar).toBeDefined();
      expect(calendar.wps_calendar_id).toBe(input.wps_calendar_id);
      expect(calendar.calendar_name).toBe(input.calendar_name);
      expect(calendar.course_id).toBe(input.course_id);
      expect(calendar.teacher_name).toBe(input.teacher_name);
      expect(calendar.status).toBe('ACTIVE');
      expect(calendar.created_at).toBeInstanceOf(Date);
      expect(calendar.updated_at).toBeInstanceOf(Date);
    });

    it('should handle metadata as JSON string', async () => {
      const input: CalendarCreateInput = {
        wps_calendar_id: 'wps_12346',
        calendar_name: '线性代数',
        course_id: 'MATH_002',
        course_name: '线性代数',
        teacher_name: '李四',
        teacher_id: 'T002',
        metadata: { department: '数学学院', credits: 4 }
      };

      const calendar = await repository.create(input);
      expect(calendar.metadata).toBe('{"department":"数学学院","credits":4}');
    });
  });

  describe('findById', () => {
    it('should find calendar by ID', async () => {
      const input: CalendarCreateInput = {
        wps_calendar_id: 'wps_12347',
        calendar_name: '概率论',
        course_id: 'MATH_003',
        course_name: '概率论',
        teacher_name: '王五',
        teacher_id: 'T003'
      };

      const created = await repository.create(input);
      const found = repository.findById(created.calendar_id);

      expect(found).toBeDefined();
      expect(found!.calendar_id).toBe(created.calendar_id);
      expect(found!.wps_calendar_id).toBe(input.wps_calendar_id);
    });

    it('should return null for non-existent ID', () => {
      const found = repository.findById(99999);
      expect(found).toBeNull();
    });
  });

  describe('findByWpsCalendarId', () => {
    it('should find calendar by WPS calendar ID', async () => {
      const input: CalendarCreateInput = {
        wps_calendar_id: 'wps_unique_12348',
        calendar_name: '统计学',
        course_id: 'STAT_001',
        course_name: '统计学',
        teacher_name: '赵六',
        teacher_id: 'T004'
      };

      await repository.create(input);
      const found = repository.findByWpsCalendarId(input.wps_calendar_id);

      expect(found).toBeDefined();
      expect(found!.wps_calendar_id).toBe(input.wps_calendar_id);
      expect(found!.course_name).toBe(input.course_name);
    });

    it('should return null for non-existent WPS calendar ID', () => {
      const found = repository.findByWpsCalendarId('non_existent');
      expect(found).toBeNull();
    });
  });

  describe('findByCourseId', () => {
    it('should find calendar by course ID', async () => {
      const input: CalendarCreateInput = {
        wps_calendar_id: 'wps_12349',
        calendar_name: '数据结构',
        course_id: 'CS_001',
        course_name: '数据结构',
        teacher_name: '陈七',
        teacher_id: 'T005',
        xnxq: '2024-2025-1'
      };

      await repository.create(input);
      const found = repository.findByCourseId(input.course_id, input.xnxq);

      expect(found).toBeDefined();
      expect(found!.course_id).toBe(input.course_id);
      expect(found!.xnxq).toBe(input.xnxq);
    });
  });

  describe('findByTeacherId', () => {
    it('should find calendars by teacher ID with pagination', async () => {
      const teacherId = 'T_MULTI';
      
      const inputs: CalendarCreateInput[] = [
        {
          wps_calendar_id: 'wps_t1',
          calendar_name: '课程1',
          course_id: 'C001',
          course_name: '课程1',
          teacher_name: '教师A',
          teacher_id: teacherId
        },
        {
          wps_calendar_id: 'wps_t2',
          calendar_name: '课程2',
          course_id: 'C002',
          course_name: '课程2',
          teacher_name: '教师A',
          teacher_id: teacherId
        }
      ];

      for (const input of inputs) {
        await repository.create(input);
      }

      const result = repository.findByTeacherId(teacherId, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(false);
    });
  });

  describe('update', () => {
    it('should update calendar fields', async () => {
      const input: CalendarCreateInput = {
        wps_calendar_id: 'wps_update_test',
        calendar_name: '原始名称',
        course_id: 'UPDATE_001',
        course_name: '原始课程',
        teacher_name: '原始教师',
        teacher_id: 'T_UPDATE'
      };

      const created = await repository.create(input);
      
      const updated = await repository.update(created.calendar_id, {
        calendar_name: '更新后名称',
        course_name: '更新后课程',
        status: 'INACTIVE'
      });

      expect(updated).toBeDefined();
      expect(updated!.calendar_name).toBe('更新后名称');
      expect(updated!.course_name).toBe('更新后课程');
      expect(updated!.status).toBe('INACTIVE');
      expect(updated!.teacher_name).toBe('原始教师'); // 未更新的字段应保持原值
    });

    it('should return null when updating non-existent calendar', async () => {
      const updated = await repository.update(99999, { calendar_name: '不存在' });
      expect(updated).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete calendar successfully', async () => {
      const input: CalendarCreateInput = {
        wps_calendar_id: 'wps_delete_test',
        calendar_name: '待删除课程',
        course_id: 'DELETE_001',
        course_name: '待删除课程',
        teacher_name: '测试教师',
        teacher_id: 'T_DELETE'
      };

      const created = await repository.create(input);
      const deleted = await repository.delete(created.calendar_id);
      
      expect(deleted).toBe(true);
      
      const found = repository.findById(created.calendar_id);
      expect(found).toBeNull();
    });

    it('should return false when deleting non-existent calendar', async () => {
      const deleted = await repository.delete(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('count', () => {
    it('should count all calendars', async () => {
      const initialCount = repository.count();
      
      const input: CalendarCreateInput = {
        wps_calendar_id: 'wps_count_test',
        calendar_name: '计数测试',
        course_id: 'COUNT_001',
        course_name: '计数测试',
        teacher_name: '计数教师',
        teacher_id: 'T_COUNT'
      };

      await repository.create(input);
      
      const finalCount = repository.count();
      expect(finalCount).toBe(initialCount + 1);
    });

    it('should count calendars with filters', async () => {
      const teacherId = 'T_FILTER';
      const xnxq = '2024-2025-1';
      
      const inputs: CalendarCreateInput[] = [
        {
          wps_calendar_id: 'wps_filter1',
          calendar_name: '过滤测试1',
          course_id: 'FILTER_001',
          course_name: '过滤测试1',
          teacher_name: '过滤教师',
          teacher_id: teacherId,
          xnxq: xnxq,
          status: 'ACTIVE'
        },
        {
          wps_calendar_id: 'wps_filter2',
          calendar_name: '过滤测试2',
          course_id: 'FILTER_002',
          course_name: '过滤测试2',
          teacher_name: '过滤教师',
          teacher_id: teacherId,
          xnxq: xnxq,
          status: 'INACTIVE'
        }
      ];

      for (const input of inputs) {
        await repository.create(input);
      }

      const countAll = repository.count({ teacher_id: teacherId, xnxq });
      expect(countAll).toBe(2);

      const countActive = repository.count({ teacher_id: teacherId, xnxq, status: 'ACTIVE' });
      expect(countActive).toBe(1);
    });
  });
});