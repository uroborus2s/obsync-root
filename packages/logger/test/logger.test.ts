import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger';

describe('Logger', () => {
  const tempLogFile = path.join(os.tmpdir(), 'stratix-logger-test.log');

  // 测试前清理
  beforeEach(async () => {
    if (await fs.pathExists(tempLogFile)) {
      await fs.remove(tempLogFile);
    }
  });

  // 测试后清理
  afterEach(async () => {
    if (await fs.pathExists(tempLogFile)) {
      await fs.remove(tempLogFile);
    }
  });

  // 基本功能测试
  it('should create a logger with default options', () => {
    const logger = createLogger();
    expect(logger).toBeDefined();
    expect(logger.level).toEqual('info');
  });

  // 测试日志级别
  it('should respect configured log level', () => {
    const logger = createLogger({ level: 'warn' });
    expect(logger.level).toEqual('warn');
    expect(logger.isLevelEnabled('info')).toBeFalsy();
    expect(logger.isLevelEnabled('warn')).toBeTruthy();
    expect(logger.isLevelEnabled('error')).toBeTruthy();
  });

  // 测试文件输出
  it('should write logs to file', async () => {
    const logger = createLogger({ destination: tempLogFile });

    logger.info('test message');
    logger.error({ err: new Error('test error') }, 'error message');

    // 等待日志写入
    await new Promise((resolve) => setTimeout(resolve, 100));

    // 验证日志文件存在且内容正确
    expect(await fs.pathExists(tempLogFile)).toBeTruthy();

    const content = await fs.readFile(tempLogFile, 'utf8');
    const lines = content.trim().split('\n');

    expect(lines.length).toEqual(2);

    const infoLog = JSON.parse(lines[0]);
    const errorLog = JSON.parse(lines[1]);

    expect(infoLog.msg).toEqual('test message');
    expect(infoLog.level).toBeDefined();

    expect(errorLog.msg).toEqual('error message');
    expect(errorLog.err).toBeDefined();
    expect(errorLog.err.message).toEqual('test error');
  });

  // 测试子日志
  it('should create child loggers with bindings', () => {
    const logger = createLogger();
    const childLogger = logger.child({ module: 'test-module' });

    expect(childLogger).toBeDefined();

    // 模拟写入以验证绑定值
    const writeSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    childLogger.info('child logger message');

    // 检查输出中是否包含子日志的绑定值
    expect(writeSpy).toHaveBeenCalled();
    const calls = writeSpy.mock.calls
      .map((args) => args[0])
      .filter(Boolean)
      .join('');
    expect(calls).toContain('module');
    expect(calls).toContain('test-module');

    writeSpy.mockRestore();
  });

  // 测试自定义序列化器
  it('should use custom serializers', () => {
    const customUserSerializer = (user: any) => ({
      id: user.id,
      username: user.username
      // 不包含密码和其他敏感信息
    });

    const logger = createLogger({
      serializers: {
        user: customUserSerializer
      }
    });

    // 模拟写入以验证序列化结果
    const writeSpy = vi
      .spyOn(process.stdout, 'write')
      .mockImplementation(() => true);

    const userData = {
      id: 123,
      username: 'test-user',
      password: 'secret',
      email: 'test@example.com'
    };

    logger.info({ user: userData }, 'user log');

    expect(writeSpy).toHaveBeenCalled();
    const calls = writeSpy.mock.calls
      .map((args) => args[0])
      .filter(Boolean)
      .join('');

    // 应该包含预期字段
    expect(calls).toContain('id');
    expect(calls).toContain('username');

    // 不应包含敏感字段
    expect(calls).not.toContain('password');
    expect(calls).not.toContain('secret');

    writeSpy.mockRestore();
  });
});
