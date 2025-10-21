// @wps/hltnlink Repository层单元测试
// 验证Repository层的基本功能和结构

import { describe, it, expect } from 'vitest';
import {
  CalendarRepository,
  CourseClassRepository,
  CalendarScheduleRepository,
  RepositoryFactory,
  isCalendarRepository,
  isCourseClassRepository,
  isCalendarScheduleRepository,
  REPOSITORY_TABLE_NAMES,
  REPOSITORY_PRIMARY_KEYS,
  REPOSITORY_LIFETIMES
} from '../../repositories/index.js';

// Mock Logger
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {}
} as any;

describe('Repository层单元测试', () => {
  describe('Repository类实例化测试', () => {
    it('应该能够创建CalendarRepository实例', () => {
      const repository = RepositoryFactory.createCalendarRepository(mockLogger);
      expect(repository).toBeInstanceOf(CalendarRepository);
      expect((repository as any).tableName).toBe('calendars');
      expect((repository as any).primaryKey).toBe('calendar_id');
    });

    it('应该能够创建CourseClassRepository实例', () => {
      const repository = RepositoryFactory.createCourseClassRepository(mockLogger);
      expect(repository).toBeInstanceOf(CourseClassRepository);
      expect((repository as any).tableName).toBe('course_classes');
      expect((repository as any).primaryKey).toBe('id');
    });

    it('应该能够创建CalendarScheduleRepository实例', () => {
      const repository = RepositoryFactory.createCalendarScheduleRepository(mockLogger);
      expect(repository).toBeInstanceOf(CalendarScheduleRepository);
      expect((repository as any).tableName).toBe('calendar_schedules');
      expect((repository as any).primaryKey).toBe('id');
    });

    it('应该能够批量创建所有Repository实例', () => {
      const repositories = RepositoryFactory.createAllRepositories(mockLogger);
      
      expect(repositories.calendarRepository).toBeInstanceOf(CalendarRepository);
      expect(repositories.courseClassRepository).toBeInstanceOf(CourseClassRepository);
      expect(repositories.calendarScheduleRepository).toBeInstanceOf(CalendarScheduleRepository);
    });
  });

  describe('Repository方法测试', () => {
    let calendarRepository: CalendarRepository;
    let courseClassRepository: CourseClassRepository;
    let calendarScheduleRepository: CalendarScheduleRepository;

    beforeEach(() => {
      calendarRepository = RepositoryFactory.createCalendarRepository(mockLogger);
      courseClassRepository = RepositoryFactory.createCourseClassRepository(mockLogger);
      calendarScheduleRepository = RepositoryFactory.createCalendarScheduleRepository(mockLogger);
    });

    it('CalendarRepository应该有正确的方法', () => {
      // 检查基础方法
      expect(typeof calendarRepository.findById).toBe('function');
      expect(typeof calendarRepository.create).toBe('function');
      expect(typeof calendarRepository.update).toBe('function');
      expect(typeof calendarRepository.delete).toBe('function');

      // 检查业务方法
      expect(typeof calendarRepository.findByWpsCalendarId).toBe('function');
      expect(typeof calendarRepository.findByCourseId).toBe('function');
      expect(typeof calendarRepository.findByTeacherId).toBe('function');
      expect(typeof calendarRepository.findBySemester).toBe('function');
      expect(typeof calendarRepository.findActiveCalendars).toBe('function');
      expect(typeof calendarRepository.existsByCourseAndSemester).toBe('function');
      expect(typeof calendarRepository.updateStatusBatch).toBe('function');
      expect(typeof calendarRepository.countBySemester).toBe('function');
      expect(typeof calendarRepository.getDistinctSemesters).toBe('function');
    });

    it('CourseClassRepository应该有正确的方法', () => {
      // 检查基础方法
      expect(typeof courseClassRepository.findById).toBe('function');
      expect(typeof courseClassRepository.create).toBe('function');
      expect(typeof courseClassRepository.update).toBe('function');
      expect(typeof courseClassRepository.delete).toBe('function');

      // 检查业务方法
      expect(typeof courseClassRepository.findByCalendarId).toBe('function');
      expect(typeof courseClassRepository.findByCourseId).toBe('function');
      expect(typeof courseClassRepository.findByStudentNumber).toBe('function');
      expect(typeof courseClassRepository.findBySemester).toBe('function');
      expect(typeof courseClassRepository.findPendingShares).toBe('function');
      expect(typeof courseClassRepository.existsByCalendarAndStudent).toBe('function');
      expect(typeof courseClassRepository.updateShareStatusBatch).toBe('function');
      expect(typeof courseClassRepository.countByCalendar).toBe('function');
      expect(typeof courseClassRepository.getShareStatusStats).toBe('function');
    });

    it('CalendarScheduleRepository应该有正确的方法', () => {
      // 检查基础方法
      expect(typeof calendarScheduleRepository.findById).toBe('function');
      expect(typeof calendarScheduleRepository.create).toBe('function');
      expect(typeof calendarScheduleRepository.update).toBe('function');
      expect(typeof calendarScheduleRepository.delete).toBe('function');

      // 检查业务方法
      expect(typeof calendarScheduleRepository.findByCalendarId).toBe('function');
      expect(typeof calendarScheduleRepository.findByCourseId).toBe('function');
      expect(typeof calendarScheduleRepository.findByWpsEventId).toBe('function');
      expect(typeof calendarScheduleRepository.findBySemester).toBe('function');
      expect(typeof calendarScheduleRepository.findByTimeRange).toBe('function');
      expect(typeof calendarScheduleRepository.findPendingSync).toBe('function');
      expect(typeof calendarScheduleRepository.hasTimeConflict).toBe('function');
      expect(typeof calendarScheduleRepository.updateSyncStatusBatch).toBe('function');
      expect(typeof calendarScheduleRepository.countByCalendar).toBe('function');
      expect(typeof calendarScheduleRepository.getSyncStatusStats).toBe('function');
    });
  });

  describe('Repository类型守卫测试', () => {
    it('类型守卫应该正确识别Repository类型', () => {
      const calendarRepo = RepositoryFactory.createCalendarRepository(mockLogger);
      const courseClassRepo = RepositoryFactory.createCourseClassRepository(mockLogger);
      const scheduleRepo = RepositoryFactory.createCalendarScheduleRepository(mockLogger);

      // 测试正确识别
      expect(isCalendarRepository(calendarRepo)).toBe(true);
      expect(isCourseClassRepository(courseClassRepo)).toBe(true);
      expect(isCalendarScheduleRepository(scheduleRepo)).toBe(true);

      // 测试错误识别
      expect(isCalendarRepository(courseClassRepo)).toBe(false);
      expect(isCourseClassRepository(scheduleRepo)).toBe(false);
      expect(isCalendarScheduleRepository(calendarRepo)).toBe(false);

      // 测试非Repository对象
      expect(isCalendarRepository({})).toBe(false);
      expect(isCourseClassRepository(null)).toBe(false);
      expect(isCalendarScheduleRepository(undefined)).toBe(false);
    });
  });

  describe('Repository常量测试', () => {
    it('应该有正确的表名常量', () => {
      expect(REPOSITORY_TABLE_NAMES.CALENDARS).toBe('calendars');
      expect(REPOSITORY_TABLE_NAMES.COURSE_CLASSES).toBe('course_classes');
      expect(REPOSITORY_TABLE_NAMES.CALENDAR_SCHEDULES).toBe('calendar_schedules');
    });

    it('应该有正确的主键常量', () => {
      expect(REPOSITORY_PRIMARY_KEYS.CALENDARS).toBe('calendar_id');
      expect(REPOSITORY_PRIMARY_KEYS.COURSE_CLASSES).toBe('id');
      expect(REPOSITORY_PRIMARY_KEYS.CALENDAR_SCHEDULES).toBe('id');
    });

    it('应该有正确的生命周期常量', () => {
      expect(REPOSITORY_LIFETIMES.SCOPED).toBe('SCOPED');
      expect(REPOSITORY_LIFETIMES.SINGLETON).toBe('SINGLETON');
      expect(REPOSITORY_LIFETIMES.TRANSIENT).toBe('TRANSIENT');
    });
  });

  describe('Repository接口一致性测试', () => {
    it('所有Repository应该继承自BaseRepository', () => {
      const calendarRepo = RepositoryFactory.createCalendarRepository(mockLogger);
      const courseClassRepo = RepositoryFactory.createCourseClassRepository(mockLogger);
      const scheduleRepo = RepositoryFactory.createCalendarScheduleRepository(mockLogger);

      // 检查是否有BaseRepository的基础方法
      const baseRepositoryMethods = [
        'findById',
        'findOne',
        'findMany',
        'findAll',
        'create',
        'createMany',
        'update',
        'updateMany',
        'delete',
        'deleteMany',
        'count',
        'exists',
        'paginate'
      ];

      baseRepositoryMethods.forEach(method => {
        expect(typeof (calendarRepo as any)[method]).toBe('function');
        expect(typeof (courseClassRepo as any)[method]).toBe('function');
        expect(typeof (scheduleRepo as any)[method]).toBe('function');
      });
    });

    it('所有Repository应该有正确的表名和主键配置', () => {
      const calendarRepo = RepositoryFactory.createCalendarRepository(mockLogger);
      const courseClassRepo = RepositoryFactory.createCourseClassRepository(mockLogger);
      const scheduleRepo = RepositoryFactory.createCalendarScheduleRepository(mockLogger);

      // 检查表名配置
      expect((calendarRepo as any).tableName).toBe('calendars');
      expect((courseClassRepo as any).tableName).toBe('course_classes');
      expect((scheduleRepo as any).tableName).toBe('calendar_schedules');

      // 检查主键配置
      expect((calendarRepo as any).primaryKey).toBe('calendar_id');
      expect((courseClassRepo as any).primaryKey).toBe('id');
      expect((scheduleRepo as any).primaryKey).toBe('id');
    });

    it('所有Repository应该有logger配置', () => {
      const calendarRepo = RepositoryFactory.createCalendarRepository(mockLogger);
      const courseClassRepo = RepositoryFactory.createCourseClassRepository(mockLogger);
      const scheduleRepo = RepositoryFactory.createCalendarScheduleRepository(mockLogger);

      expect((calendarRepo as any).logger).toBeDefined();
      expect((courseClassRepo as any).logger).toBeDefined();
      expect((scheduleRepo as any).logger).toBeDefined();
    });
  });

  describe('Repository工厂函数测试', () => {
    it('RepositoryFactory应该提供所有创建方法', () => {
      expect(typeof RepositoryFactory.createCalendarRepository).toBe('function');
      expect(typeof RepositoryFactory.createCourseClassRepository).toBe('function');
      expect(typeof RepositoryFactory.createCalendarScheduleRepository).toBe('function');
      expect(typeof RepositoryFactory.createAllRepositories).toBe('function');
    });

    it('每次调用工厂方法应该创建新的实例', () => {
      const repo1 = RepositoryFactory.createCalendarRepository(mockLogger);
      const repo2 = RepositoryFactory.createCalendarRepository(mockLogger);

      expect(repo1).not.toBe(repo2);
      expect(repo1).toBeInstanceOf(CalendarRepository);
      expect(repo2).toBeInstanceOf(CalendarRepository);
    });
  });
});
