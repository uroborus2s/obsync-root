import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createLogger } from '../src/logger';

describe('Multi-stream Logger', () => {
  const tempDir = path.join(os.tmpdir(), 'stratix-logger-test');
  const infoLogFile = path.join(tempDir, 'info.log');
  const errorLogFile = path.join(tempDir, 'error.log');

  // 测试前清理
  beforeEach(async () => {
    await fs.ensureDir(tempDir);
    if (await fs.pathExists(infoLogFile)) {
      await fs.remove(infoLogFile);
    }
    if (await fs.pathExists(errorLogFile)) {
      await fs.remove(errorLogFile);
    }
  });

  // 测试后清理
  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  // 测试多目标输出
  it('should write logs to multiple targets based on level', async () => {
    const logger = createLogger({
      targets: [
        { level: 'info', target: infoLogFile },
        { level: 'error', target: errorLogFile }
      ]
    });

    // 写入不同级别的日志
    logger.info('info message');
    logger.debug('debug message');
    logger.warn('warning message');
    logger.error('error message');
    logger.fatal('fatal message');

    // 等待日志写入
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证日志文件存在
    expect(await fs.pathExists(infoLogFile)).toBeTruthy();
    expect(await fs.pathExists(errorLogFile)).toBeTruthy();

    // 验证info日志文件内容
    const infoContent = await fs.readFile(infoLogFile, 'utf8');
    const infoLines = infoContent.trim().split('\n');

    // info日志文件应包含info及以上级别的日志（info, warn）
    expect(infoLines.length).toBeGreaterThanOrEqual(3);
    expect(infoContent).toContain('info message');
    expect(infoContent).toContain('warning message');

    // 不应包含debug日志
    expect(infoContent).not.toContain('debug message');

    // 验证error日志文件内容
    const errorContent = await fs.readFile(errorLogFile, 'utf8');
    const errorLines = errorContent.trim().split('\n');

    // error日志文件应只包含error及以上级别的日志（error, fatal）
    expect(errorLines.length).toEqual(2);
    expect(errorContent).toContain('error message');
    expect(errorContent).toContain('fatal message');

    // 不应包含低级别日志
    expect(errorContent).not.toContain('info message');
    expect(errorContent).not.toContain('debug message');
    expect(errorContent).not.toContain('warning message');
  });

  // 测试写入后的日志格式
  it('should maintain correct JSON format in all log files', async () => {
    const logger = createLogger({
      targets: [
        { level: 'info', target: infoLogFile },
        { level: 'error', target: errorLogFile }
      ],
      base: {
        app: 'test-app',
        env: 'test'
      }
    });

    logger.info({ reqId: '123' }, 'request received');
    logger.error({ err: new Error('test error') }, 'request failed');

    // 等待日志写入
    await new Promise((resolve) => setTimeout(resolve, 200));

    // 验证info日志格式
    const infoContent = await fs.readFile(infoLogFile, 'utf8');
    const infoLines = infoContent.trim().split('\n');
    const infoLog = JSON.parse(infoLines[0]);

    expect(infoLog.msg).toEqual('request received');
    expect(infoLog.reqId).toEqual('123');
    expect(infoLog.app).toEqual('test-app');
    expect(infoLog.env).toEqual('test');

    // 验证error日志格式
    const errorContent = await fs.readFile(errorLogFile, 'utf8');
    const errorLines = errorContent.trim().split('\n');
    const errorLog = JSON.parse(errorLines[0]);

    expect(errorLog.msg).toEqual('request failed');
    expect(errorLog.err).toBeDefined();
    expect(errorLog.err.message).toEqual('test error');
    expect(errorLog.app).toEqual('test-app');
    expect(errorLog.env).toEqual('test');
  });
});
