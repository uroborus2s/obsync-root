// @wps/hltnlink Repository层集成测试
// 验证Repository层是否正确集成到Stratix框架中

import { Stratix } from '@stratix/core';
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  CalendarRepository,
  CalendarScheduleRepository,
  CourseClassRepository,
  RepositoryFactory
} from '../../repositories/index.js';

describe('Repository层集成测试', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // 启动Stratix应用进行集成测试
    app = await Stratix.run();
  });

  afterAll(async () => {
    // 关闭应用
    if (app) {
      await app.close();
    }
  });

  describe('Repository类实例化测试', () => {
    it('应该能够创建CalendarRepository实例', () => {
      const logger = {
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {}
      } as any;

      const repository = RepositoryFactory.createCalendarRepository(logger);
      expect(repository).toBeInstanceOf(CalendarRepository);
      expect((repository as any).tableName).toBe('calendars');
    });

    it('应该能够创建CourseClassRepository实例', () => {
      const logger = {
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {}
      } as any;

      const repository = RepositoryFactory.createCourseClassRepository(logger);
      expect(repository).toBeInstanceOf(CourseClassRepository);
      expect((repository as any).tableName).toBe('course_classes');
    });

    it('应该能够创建CalendarScheduleRepository实例', () => {
      const logger = {
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {}
      } as any;

      const repository =
        RepositoryFactory.createCalendarScheduleRepository(logger);
      expect(repository).toBeInstanceOf(CalendarScheduleRepository);
      expect((repository as any).tableName).toBe('calendar_schedules');
    });

    it('应该能够批量创建所有Repository实例', () => {
      const logger = {
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {}
      } as any;

      const repositories = RepositoryFactory.createAllRepositories(logger);

      expect(repositories.calendarRepository).toBeInstanceOf(
        CalendarRepository
      );
      expect(repositories.courseClassRepository).toBeInstanceOf(
        CourseClassRepository
      );
      expect(repositories.calendarScheduleRepository).toBeInstanceOf(
        CalendarScheduleRepository
      );
    });
  });

  describe('Repository方法测试', () => {
    let calendarRepository: CalendarRepository;
    let courseClassRepository: CourseClassRepository;
    let calendarScheduleRepository: CalendarScheduleRepository;

    beforeAll(() => {
      const logger = {
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {}
      } as any;

      calendarRepository = RepositoryFactory.createCalendarRepository(logger);
      courseClassRepository =
        RepositoryFactory.createCourseClassRepository(logger);
      calendarScheduleRepository =
        RepositoryFactory.createCalendarScheduleRepository(logger);
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
      expect(typeof calendarRepository.existsByCourseAndSemester).toBe(
        'function'
      );
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
      expect(typeof courseClassRepository.existsByCalendarAndStudent).toBe(
        'function'
      );
    });

    it('CalendarScheduleRepository应该有正确的方法', () => {
      // 检查基础方法
      expect(typeof calendarScheduleRepository.findById).toBe('function');
      expect(typeof calendarScheduleRepository.create).toBe('function');
      expect(typeof calendarScheduleRepository.update).toBe('function');
      expect(typeof calendarScheduleRepository.delete).toBe('function');

      // 检查业务方法
      expect(typeof calendarScheduleRepository.findByCalendarId).toBe(
        'function'
      );
      expect(typeof calendarScheduleRepository.findByCourseId).toBe('function');
      expect(typeof calendarScheduleRepository.findByWpsEventId).toBe(
        'function'
      );
      expect(typeof calendarScheduleRepository.findBySemester).toBe('function');
      expect(typeof calendarScheduleRepository.findByTimeRange).toBe(
        'function'
      );
      expect(typeof calendarScheduleRepository.findPendingSync).toBe(
        'function'
      );
      expect(typeof calendarScheduleRepository.hasTimeConflict).toBe(
        'function'
      );
    });
  });

  describe('Repository类型守卫测试', () => {
    it('类型守卫应该正确识别Repository类型', () => {
      const logger = {
        info: () => {},
        error: () => {},
        warn: () => {},
        debug: () => {}
      } as any;

      const calendarRepo = RepositoryFactory.createCalendarRepository(logger);
      const courseClassRepo =
        RepositoryFactory.createCourseClassRepository(logger);
      const scheduleRepo =
        RepositoryFactory.createCalendarScheduleRepository(logger);

      // 导入类型守卫函数
      const {
        isCalendarRepository,
        isCourseClassRepository,
        isCalendarScheduleRepository
      } = require('../../repositories/index.js');

      // 测试正确识别
      expect(isCalendarRepository(calendarRepo)).toBe(true);
      expect(isCourseClassRepository(courseClassRepo)).toBe(true);
      expect(isCalendarScheduleRepository(scheduleRepo)).toBe(true);

      // 测试错误识别
      expect(isCalendarRepository(courseClassRepo)).toBe(false);
      expect(isCourseClassRepository(scheduleRepo)).toBe(false);
      expect(isCalendarScheduleRepository(calendarRepo)).toBe(false);
    });
  });

  describe('插件健康检查测试', () => {
    it('应该能够访问插件健康检查端点', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/hltnlink'
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.body);
      expect(body.status).toBe('healthy');
      expect(body.plugin).toBe('hltnlink');
      expect(body.version).toBe('1.0.0');
      expect(body.timestamp).toBeDefined();
    });
  });

  describe('Repository常量测试', () => {
    it('应该有正确的表名常量', () => {
      const { REPOSITORY_TABLE_NAMES } = require('../../repositories/index.js');

      expect(REPOSITORY_TABLE_NAMES.CALENDARS).toBe('calendars');
      expect(REPOSITORY_TABLE_NAMES.COURSE_CLASSES).toBe('course_classes');
      expect(REPOSITORY_TABLE_NAMES.CALENDAR_SCHEDULES).toBe(
        'calendar_schedules'
      );
    });

    it('应该有正确的主键常量', () => {
      const {
        REPOSITORY_PRIMARY_KEYS
      } = require('../../repositories/index.js');

      expect(REPOSITORY_PRIMARY_KEYS.CALENDARS).toBe('calendar_id');
      expect(REPOSITORY_PRIMARY_KEYS.COURSE_CLASSES).toBe('id');
      expect(REPOSITORY_PRIMARY_KEYS.CALENDAR_SCHEDULES).toBe('id');
    });

    it('应该有正确的生命周期常量', () => {
      const { REPOSITORY_LIFETIMES } = require('../../repositories/index.js');

      expect(REPOSITORY_LIFETIMES.SCOPED).toBe('SCOPED');
      expect(REPOSITORY_LIFETIMES.SINGLETON).toBe('SINGLETON');
      expect(REPOSITORY_LIFETIMES.TRANSIENT).toBe('TRANSIENT');
    });
  });
});
