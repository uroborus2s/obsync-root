import { describe, it, expect, beforeEach } from 'vitest';
import { BaseDialect } from '../dialects/base-dialect.js';
import { successResult, failureResult } from '../../utils/helpers.js';
import type { ConnectionConfig, DatabaseType } from '../../types/index.js';
import type { DatabaseResult } from '../../utils/error-handler.js';
import type { Kysely } from 'kysely';

// 测试方言类
class TestDialect extends BaseDialect {
  readonly type: DatabaseType = 'sqlite';
  readonly defaultPort: number = 0;

  async createKysely(config: ConnectionConfig): Promise<DatabaseResult<Kysely<any>>> {
    return successResult({} as Kysely<any>);
  }

  validateConfig(config: ConnectionConfig): DatabaseResult<boolean> {
    return successResult(true);
  }

  getHealthCheckQuery(): string {
    return 'SELECT 1';
  }

  checkDriverAvailability(): DatabaseResult<boolean> {
    return this.checkModuleAvailability('better-sqlite3');
  }

  protected formatConnectionString(params: {
    host: string;
    port: number;
    database: string;
    username: string;
    password: string;
    [key: string]: any;
  }): string {
    return `sqlite:${params.database}`;
  }
}

describe('ES6 模块兼容性测试', () => {
  let dialect: TestDialect;

  beforeEach(() => {
    dialect = new TestDialect();
  });

  describe('模块检查功能', () => {
    it('应该能够检查已安装的模块', () => {
      // 测试检查一个肯定存在的模块
      const result = dialect['checkModuleAvailability']('fs');
      expect(result.success).toBe(true);
    });

    it('应该能够检测不存在的模块', () => {
      // 测试检查一个不存在的模块
      const result = dialect['checkModuleAvailability']('non-existent-module-12345');
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('not installed');
    });

    it('应该能够检查数据库驱动模块', () => {
      // 测试检查常见的数据库驱动
      const modules = ['better-sqlite3', 'pg', 'mysql2'];
      
      modules.forEach(moduleName => {
        const result = dialect['checkModuleAvailability'](moduleName);
        // 不管是否安装，都应该返回有效的结果
        expect(typeof result.success).toBe('boolean');
        
        if (!result.success) {
          expect(result.error?.message).toContain(moduleName);
          expect(result.error?.message).toContain('npm install');
        }
      });
    });
  });

  describe('驱动可用性检查', () => {
    it('应该正确检查驱动可用性', () => {
      const result = dialect.checkDriverAvailability();
      
      // 结果应该是有效的
      expect(typeof result.success).toBe('boolean');
      
      if (!result.success) {
        expect(result.error?.message).toContain('better-sqlite3');
      }
    });
  });

  describe('配置验证', () => {
    it('应该能够验证基础配置', () => {
      const config: ConnectionConfig = {
        type: 'sqlite',
        database: 'test.db'
      };

      const result = dialect.validateConfig(config);
      expect(result.success).toBe(true);
    });

    it('应该拒绝无效配置', () => {
      const config: ConnectionConfig = {
        type: 'postgresql', // 错误的类型
        database: 'test.db'
      };

      const result = dialect.validateConfig(config);
      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Invalid database type');
    });
  });

  describe('连接字符串构建', () => {
    it('应该能够构建连接字符串', () => {
      const config: ConnectionConfig = {
        type: 'sqlite',
        database: 'test.db'
      };

      const connectionString = dialect.buildConnectionString(config);
      expect(connectionString).toBe('sqlite:test.db');
    });

    it('应该使用提供的连接字符串', () => {
      const config: ConnectionConfig = {
        type: 'sqlite',
        database: 'test.db',
        connectionString: 'custom://connection/string'
      };

      const connectionString = dialect.buildConnectionString(config);
      expect(connectionString).toBe('custom://connection/string');
    });
  });

  describe('日志记录器', () => {
    it('应该能够创建数据库日志记录器', () => {
      const logger = dialect['createDatabaseLogger']('TestDialect');
      expect(typeof logger).toBe('function');
    });

    it('日志记录器应该能够处理查询事件', () => {
      const logger = dialect['createDatabaseLogger']('TestDialect');
      
      // 模拟查询事件
      const queryEvent = {
        level: 'query',
        query: {
          sql: 'SELECT 1',
          parameters: []
        },
        queryDurationMillis: 10
      };

      // 应该不抛出错误
      expect(() => logger(queryEvent)).not.toThrow();
    });

    it('日志记录器应该能够处理错误事件', () => {
      const logger = dialect['createDatabaseLogger']('TestDialect');
      
      // 模拟错误事件
      const errorEvent = {
        level: 'error',
        error: new Error('Test error'),
        query: {
          sql: 'SELECT 1',
          parameters: []
        }
      };

      // 应该不抛出错误
      expect(() => logger(errorEvent)).not.toThrow();
    });
  });

  describe('错误处理', () => {
    it('应该能够处理连接错误', () => {
      const error = new Error('Connection failed');
      const connectionError = dialect.handleConnectionError(error, 'test-connection');
      
      expect(connectionError.message).toContain('sqlite connection failed');
      expect(connectionError.message).toContain('Connection failed');
    });

    it('应该能够格式化错误消息', () => {
      const error = new Error('Test error');
      const formattedMessage = dialect['formatErrorMessage'](error);
      
      expect(formattedMessage).toContain('sqlite connection failed');
      expect(formattedMessage).toContain('Test error');
    });
  });

  describe('连接选项', () => {
    it('应该能够获取连接选项', () => {
      const config: ConnectionConfig = {
        type: 'sqlite',
        database: 'test.db',
        host: 'localhost',
        port: 5432,
        username: 'user',
        password: 'pass'
      };

      const options = dialect.getConnectionOptions(config);
      
      expect(options.host).toBe('localhost');
      expect(options.port).toBe(5432);
      expect(options.database).toBe('test.db');
      expect(options.user).toBe('user');
      expect(options.password).toBe('pass');
    });

    it('应该使用默认值', () => {
      const config: ConnectionConfig = {
        type: 'sqlite',
        database: 'test.db'
      };

      const options = dialect.getConnectionOptions(config);
      
      expect(options.host).toBe('localhost');
      expect(options.port).toBe(0); // TestDialect 的默认端口
      expect(options.database).toBe('test.db');
    });
  });
});
