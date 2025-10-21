import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { DatabaseInitializer } from '../../../database/DatabaseInitializer.js';

describe('DatabaseInitializer', () => {
  let dbInitializer: DatabaseInitializer;
  let testDbPath: string;

  beforeEach(() => {
    testDbPath = ':memory:';
    dbInitializer = new DatabaseInitializer({
      databasePath: testDbPath,
      migrationsPath: './database',
      enableWAL: false,
      enableForeignKeys: true
    });
  });

  afterEach(async () => {
    await dbInitializer.close();
  });

  describe('initialization', () => {
    it('should create database initializer successfully', () => {
      expect(dbInitializer).toBeDefined();
      expect(dbInitializer.getDatabase()).toBeDefined();
    });

    it('should create migrations table', () => {
      const db = dbInitializer.getDatabase();
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='_migrations'
      `).all();
      
      expect(tables).toHaveLength(1);
    });
  });

  describe('runMigrations', () => {
    it('should run migrations successfully', async () => {
      await dbInitializer.runMigrations();
      
      const db = dbInitializer.getDatabase();
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'
        ORDER BY name
      `).all();
      
      const tableNames = (tables as any[]).map(t => t.name);
      expect(tableNames).toContain('calendars');
      expect(tableNames).toContain('course_classes');
      expect(tableNames).toContain('calendar_schedules');
    });

    it('should track executed migrations', async () => {
      await dbInitializer.runMigrations();
      
      const db = dbInitializer.getDatabase();
      const migrations = db.prepare(`
        SELECT version, filename FROM _migrations ORDER BY version
      `).all();
      
      expect(migrations).toHaveLength(1);
      expect((migrations as any[])[0].version).toBe('001_create_tables');
    });

    it('should not run the same migration twice', async () => {
      await dbInitializer.runMigrations();
      const firstRun = dbInitializer.getDatabase().prepare(`
        SELECT COUNT(*) as count FROM _migrations
      `).get() as any;
      
      await dbInitializer.runMigrations();
      const secondRun = dbInitializer.getDatabase().prepare(`
        SELECT COUNT(*) as count FROM _migrations
      `).get() as any;
      
      expect(firstRun.count).toBe(secondRun.count);
    });
  });

  describe('healthCheck', () => {
    it('should return healthy status when database is working', async () => {
      await dbInitializer.runMigrations();
      const health = await dbInitializer.healthCheck();
      
      expect(health.status).toBe('healthy');
      expect(health.details.connected).toBe(true);
      expect(health.details.tables).toBeGreaterThan(0);
      expect(health.details.tableNames).toContain('calendars');
      expect(health.details.migrationsExecuted).toBeGreaterThan(0);
    });
  });

  describe('database operations', () => {
    beforeEach(async () => {
      await dbInitializer.runMigrations();
    });

    it('should get table info', () => {
      const tableInfo = dbInitializer.getTableInfo('calendars');
      expect(tableInfo).toBeDefined();
      expect(Array.isArray(tableInfo)).toBe(true);
      expect(tableInfo.length).toBeGreaterThan(0);
    });

    it('should get indexes', () => {
      const indexes = dbInitializer.getIndexes('calendars');
      expect(indexes).toBeDefined();
      expect(Array.isArray(indexes)).toBe(true);
    });

    it('should perform vacuum operation', async () => {
      await expect(dbInitializer.vacuum()).resolves.toBeUndefined();
    });
  });

  describe('foreign keys', () => {
    beforeEach(async () => {
      await dbInitializer.runMigrations();
    });

    it('should enforce foreign key constraints', () => {
      const db = dbInitializer.getDatabase();
      
      expect(() => {
        db.prepare(`
          INSERT INTO course_classes (calendar_id, course_id, student_number, student_name, xnxq)
          VALUES (99999, 'TEST_001', '20240001', '测试学生', '2024-2025-1')
        `).run();
      }).toThrow();
    });

    it('should cascade delete when calendar is deleted', () => {
      const db = dbInitializer.getDatabase();
      
      const calendarId = db.prepare(`
        INSERT INTO calendars (calendar_id, wps_calendar_id, calendar_name, course_id, course_name, teacher_name, teacher_id)
        VALUES ('TEST_CAL_001', 'wps_test', '测试课程', 'TEST_001', '测试课程', '测试教师', 'T001')
        RETURNING calendar_id
      `).get() as any;
      
      db.prepare(`
        INSERT INTO course_classes (calendar_id, course_id, student_number, student_name, xnxq)
        VALUES (?, 'TEST_001', '20240001', '测试学生', '2024-2025-1')
      `).run(calendarId.calendar_id);
      
      const beforeDelete = db.prepare(`
        SELECT COUNT(*) as count FROM course_classes WHERE calendar_id = ?
      `).get(calendarId.calendar_id) as any;
      expect(beforeDelete.count).toBe(1);
      
      db.prepare(`
        DELETE FROM calendars WHERE calendar_id = ?
      `).run(calendarId.calendar_id);
      
      const afterDelete = db.prepare(`
        SELECT COUNT(*) as count FROM course_classes WHERE calendar_id = ?
      `).get(calendarId.calendar_id) as any;
      expect(afterDelete.count).toBe(0);
    });
  });
});