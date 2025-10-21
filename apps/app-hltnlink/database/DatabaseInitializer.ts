import type { DatabaseAPI } from '@stratix/database';
import { DatabaseErrorHandler, ErrorClassifier, type DatabaseResult } from '@stratix/database';
import { sql } from '@stratix/database';

export interface DatabaseMigration {
  version: string;
  filename: string;
  up: string;
  down?: string;
  executedAt?: Date;
}

export interface DatabaseInitializerOptions {
  connectionName?: string;
  migrationsPath?: string;
}

export class DatabaseInitializer {
  private migrations: DatabaseMigration[] = [
    {
      version: '001',
      filename: '001_create_tables.sql',
      up: `
        -- =================================================================
        -- 日历表 (calendars) - WPS日历与课程的映射关系表
        -- =================================================================
        CREATE TABLE IF NOT EXISTS calendars (
            calendar_id VARCHAR(200) PRIMARY KEY,
            wps_calendar_id VARCHAR(50) NOT NULL UNIQUE,
            calendar_name VARCHAR(255) NOT NULL,
            calendar_summary TEXT,
            course_id VARCHAR(50) NOT NULL,
            course_name VARCHAR(255) NOT NULL,
            course_code VARCHAR(50),
            teacher_name VARCHAR(100) NOT NULL,
            teacher_id VARCHAR(50) NOT NULL,
            academic_year VARCHAR(20),
            semester VARCHAR(10),
            xnxq VARCHAR(20),
            metadata TEXT,
            status VARCHAR(20) DEFAULT 'ACTIVE',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(course_id, xnxq)
        );

        -- =================================================================
        -- 开课班表 (course_classes) - 日历分享者与选课学生的映射关系表
        -- =================================================================
        CREATE TABLE IF NOT EXISTS course_classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            calendar_id VARCHAR(200) NOT NULL,
            course_id VARCHAR(50) NOT NULL,
            student_number VARCHAR(50) NOT NULL,
            student_name VARCHAR(100) NOT NULL,
            student_school VARCHAR(255),
            student_major VARCHAR(255),
            student_class VARCHAR(100),
            xnxq VARCHAR(20) NOT NULL,
            wps_user_id VARCHAR(50),
            wps_email VARCHAR(255),
            permission_type VARCHAR(20) DEFAULT 'read',
            share_status VARCHAR(20) DEFAULT 'PENDING',
            extra_info TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (calendar_id) REFERENCES calendars(calendar_id) ON DELETE CASCADE,
            UNIQUE(calendar_id, student_number),
            UNIQUE(course_id, student_number, xnxq)
        );

        -- =================================================================
        -- 日历课程表 (calendar_schedules) - 日历日程与课程节次的映射关系表
        -- =================================================================
        CREATE TABLE IF NOT EXISTS calendar_schedules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            calendar_id VARCHAR(200) NOT NULL,
            course_id VARCHAR(50) NOT NULL,
            wps_event_id VARCHAR(50),
            event_title VARCHAR(255) NOT NULL,
            event_description TEXT,
            start_time DATETIME NOT NULL,
            end_time DATETIME NOT NULL,
            all_day BOOLEAN DEFAULT FALSE,
            classroom VARCHAR(255),
            building VARCHAR(255),
            campus VARCHAR(100),
            week_number INTEGER,
            weekday INTEGER,
            class_period VARCHAR(50),
            class_time VARCHAR(50),
            xnxq VARCHAR(20) NOT NULL,
            recurrence_rule TEXT,
            recurrence_type VARCHAR(20) DEFAULT 'NONE',
            sync_status VARCHAR(20) DEFAULT 'PENDING',
            metadata TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (calendar_id) REFERENCES calendars(calendar_id) ON DELETE CASCADE
        );

        -- =================================================================
        -- 索引优化
        -- =================================================================
        CREATE INDEX IF NOT EXISTS idx_calendars_wps_calendar_id ON calendars(wps_calendar_id);
        CREATE INDEX IF NOT EXISTS idx_calendars_course_id ON calendars(course_id);
        CREATE INDEX IF NOT EXISTS idx_calendars_teacher_id ON calendars(teacher_id);
        CREATE INDEX IF NOT EXISTS idx_calendars_xnxq ON calendars(xnxq);
        CREATE INDEX IF NOT EXISTS idx_calendars_status ON calendars(status);
        CREATE INDEX IF NOT EXISTS idx_calendars_updated_at ON calendars(updated_at);

        CREATE INDEX IF NOT EXISTS idx_course_classes_calendar_id ON course_classes(calendar_id);
        CREATE INDEX IF NOT EXISTS idx_course_classes_course_id ON course_classes(course_id);
        CREATE INDEX IF NOT EXISTS idx_course_classes_student_number ON course_classes(student_number);
        CREATE INDEX IF NOT EXISTS idx_course_classes_xnxq ON course_classes(xnxq);
        CREATE INDEX IF NOT EXISTS idx_course_classes_wps_user_id ON course_classes(wps_user_id);
        CREATE INDEX IF NOT EXISTS idx_course_classes_share_status ON course_classes(share_status);
        CREATE INDEX IF NOT EXISTS idx_course_classes_updated_at ON course_classes(updated_at);

        CREATE INDEX IF NOT EXISTS idx_calendar_schedules_calendar_id ON calendar_schedules(calendar_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_schedules_course_id ON calendar_schedules(course_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_schedules_wps_event_id ON calendar_schedules(wps_event_id);
        CREATE INDEX IF NOT EXISTS idx_calendar_schedules_start_time ON calendar_schedules(start_time);
        CREATE INDEX IF NOT EXISTS idx_calendar_schedules_xnxq ON calendar_schedules(xnxq);
        CREATE INDEX IF NOT EXISTS idx_calendar_schedules_week_weekday ON calendar_schedules(week_number, weekday);
        CREATE INDEX IF NOT EXISTS idx_calendar_schedules_sync_status ON calendar_schedules(sync_status);
        CREATE INDEX IF NOT EXISTS idx_calendar_schedules_updated_at ON calendar_schedules(updated_at);
      `,
      down: `
        DROP TABLE IF EXISTS calendar_schedules;
        DROP TABLE IF EXISTS course_classes;
        DROP TABLE IF EXISTS calendars;
      `
    }
  ];

  constructor(
    private databaseAPI: DatabaseAPI,
    private options: DatabaseInitializerOptions = {}
  ) {}

  async runMigrations(): Promise<DatabaseResult<void>> {
    try {
      const migrationResult = await this.createMigrationsTable();
      if (!migrationResult.success) {
        return migrationResult;
      }
      
      const executedMigrations = await this.getExecutedMigrations();
      if (!executedMigrations.success) {
        return DatabaseErrorHandler.failure(executedMigrations.error);
      }

      const pendingMigrations = this.migrations.filter(
        migration => !executedMigrations.data.some(
          (executed: DatabaseMigration) => executed.version === migration.version
        )
      );

      if (pendingMigrations.length === 0) {
        console.log('✅ All migrations are up to date');
        return DatabaseErrorHandler.success(undefined);
      }

      console.log(`🔄 Running ${pendingMigrations.length} pending migrations...`);

      return await this.databaseAPI.transaction(async (trx) => {
        for (const migration of pendingMigrations) {
          console.log(`  📋 Executing migration: ${migration.filename}`);
          
          await trx.executeQuery(sql.raw(migration.up));
          
          await trx
            .insertInto('_migrations')
            .values({
              version: migration.version,
              filename: migration.filename,
              executed_at: new Date().toISOString()
            })
            .execute();
          
          console.log(`  ✅ Migration ${migration.filename} completed`);
        }
        
        console.log('🎉 All migrations completed successfully');
        return undefined;
      });

    } catch (error) {
      console.error('💥 Migration failed:', error);
      return DatabaseErrorHandler.failure(ErrorClassifier.classify(error));
    }
  }

  private async createMigrationsTable(): Promise<DatabaseResult<void>> {
    const migrationTableSQL = `
      CREATE TABLE IF NOT EXISTS _migrations (
        version VARCHAR(50) PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        executed_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    return await this.databaseAPI.executeQuery(
      async (db) => {
        await db.executeQuery(sql.raw(migrationTableSQL));
      },
      { connectionName: this.options.connectionName }
    );
  }

  private async getExecutedMigrations(): Promise<DatabaseResult<DatabaseMigration[]>> {
    return await this.databaseAPI.executeQuery(
      async (db) => {
        const result = await db
          .selectFrom('_migrations')
          .select(['version', 'filename', 'executed_at'])
          .orderBy('version')
          .execute();
        
        return result.map((row: any) => ({
          version: row.version,
          filename: row.filename,
          executedAt: new Date(row.executed_at),
          up: '',
          down: ''
        }));
      },
      { connectionName: this.options.connectionName }
    );
  }

  async healthCheck(): Promise<DatabaseResult<{
    status: 'healthy' | 'unhealthy';
    details: Record<string, any>;
  }>> {
    try {
      const healthResult = await this.databaseAPI.healthCheck(this.options.connectionName);
      
      if (!healthResult.success) {
        return DatabaseErrorHandler.success({
          status: 'unhealthy' as const,
          details: {
            error: healthResult.error.message,
            connectionName: this.options.connectionName
          }
        });
      }

      const tablesResult = await this.databaseAPI.executeQuery(
        async (db) => {
          // SQLite specific query, would need to be adapted for other databases
          const tables = await db
            .selectFrom(sql.raw('sqlite_master').as('sm'))
            .select('name')
            .where('type', '=', 'table')
            .where('name', 'not like', 'sqlite_%')
            .where('name', '!=', '_migrations')
            .orderBy('name')
            .execute();
          
          return tables.map((t: any) => t.name);
        },
        { connectionName: this.options.connectionName }
      );

      const executedMigrations = await this.getExecutedMigrations();

      return DatabaseErrorHandler.success({
        status: 'healthy' as const,
        details: {
          connected: healthResult.data,
          tables: tablesResult.success ? tablesResult.data.length : 0,
          tableNames: tablesResult.success ? tablesResult.data : [],
          migrationsExecuted: executedMigrations.success ? executedMigrations.data.length : 0,
          lastMigration: executedMigrations.success && executedMigrations.data.length > 0 
            ? executedMigrations.data[executedMigrations.data.length - 1].filename 
            : 'none',
          connectionName: this.options.connectionName
        }
      });

    } catch (error) {
      return DatabaseErrorHandler.success({
        status: 'unhealthy' as const,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
          connectionName: this.options.connectionName
        }
      });
    }
  }

  async getTableInfo(tableName: string): Promise<DatabaseResult<any[]>> {
    return await this.databaseAPI.executeQuery(
      async (db) => {
        // SQLite specific - would need adaptation for other DBs
        const result = await db.executeQuery(sql.raw(`PRAGMA table_info(${tableName})`));
        return (result as any).rows || [];
      },
      { connectionName: this.options.connectionName }
    );
  }

  async vacuum(): Promise<DatabaseResult<void>> {
    console.log('🧹 Running database vacuum...');
    
    const result = await this.databaseAPI.executeQuery(
      async (db) => {
        await db.executeQuery(sql.raw('VACUUM'));
        console.log('✅ Database vacuum completed');
      },
      { connectionName: this.options.connectionName }
    );

    if (!result.success) {
      console.error('❌ Database vacuum failed:', result.error);
    }

    return result;
  }
}