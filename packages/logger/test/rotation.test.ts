import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLogger } from '../src/logger';

describe('Log Rotation', () => {
  const tempDir = path.join(os.tmpdir(), 'stratix-logger-rotation-test');
  const logFile = path.join(tempDir, 'app.log');

  // 测试前清理
  beforeEach(async () => {
    await fs.ensureDir(tempDir);
    if (await fs.pathExists(logFile)) {
      await fs.remove(logFile);
    }

    // 清理所有旧的轮转日志文件
    const files = await fs.readdir(tempDir);
    for (const file of files) {
      if (file.startsWith('app-') && file.endsWith('.log')) {
        await fs.remove(path.join(tempDir, file));
      }
    }
  });

  // 测试后清理
  afterEach(async () => {
    if (await fs.pathExists(tempDir)) {
      await fs.remove(tempDir);
    }
  });

  // 测试基于大小的轮转
  it('should rotate logs based on size', async () => {
    // 设置非常小的大小限制以触发轮转
    const logger = createLogger({
      destination: logFile,
      rotation: {
        size: '10B', // 10字节，非常小以便快速触发轮转
        maxFiles: 3
      }
    });

    // 写入足够多的日志触发多次轮转
    for (let i = 0; i < 10; i++) {
      logger.info(`Log message ${i}`);
    }

    // 等待日志写入和轮转完成
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 验证日志文件存在
    expect(await fs.pathExists(logFile)).toBeTruthy();

    // 验证轮转文件存在（至少应该有一个）
    const files = await fs.readdir(tempDir);
    const rotatedFiles = files.filter(
      (f) => f !== 'app.log' && f.startsWith('app-') && f.endsWith('.log')
    );

    expect(rotatedFiles.length).toBeGreaterThan(0);
    // 由于限制了最大文件数为3，加上当前活动日志，总数不应超过4
    expect(files.length).toBeLessThanOrEqual(4);
  });

  // 测试自定义文件名格式化
  it('should use custom filename formatter for rotated logs', async () => {
    const customFilenameFormat = (time: number) => {
      if (!time) return 'app.log';
      return `custom-log-${time}.log`;
    };

    const logger = createLogger({
      destination: logFile,
      rotation: {
        size: '10B',
        maxFiles: 2,
        filename: customFilenameFormat
      }
    });

    // 写入足够触发轮转的日志
    for (let i = 0; i < 5; i++) {
      logger.info(`Log message ${i}`);
    }

    // 等待日志写入和轮转完成
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 检查文件列表
    const files = await fs.readdir(tempDir);
    const customRotatedFiles = files.filter(
      (f) => f.startsWith('custom-log-') && f.endsWith('.log')
    );

    expect(customRotatedFiles.length).toBeGreaterThan(0);
    expect(files).toContain('app.log');
  });

  // 测试压缩旧日志文件
  it('should compress rotated log files when configured', async () => {
    const logger = createLogger({
      destination: logFile,
      rotation: {
        size: '10B',
        maxFiles: 2,
        compress: true
      }
    });

    // 写入足够触发轮转的日志
    for (let i = 0; i < 5; i++) {
      logger.info(`Log message ${i}`);
    }

    // 等待日志写入、轮转和压缩完成
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 检查是否有压缩文件
    const files = await fs.readdir(tempDir);
    const compressedFiles = files.filter((f) => f.endsWith('.gz'));

    expect(compressedFiles.length).toBeGreaterThan(0);
  });

  // 测试基于时间的轮转
  it('should rotate logs based on time interval', async () => {
    // 模拟时间轮转，设置非常短的间隔
    vi.useFakeTimers();

    const logger = createLogger({
      destination: logFile,
      rotation: {
        interval: '1s', // 1秒轮转一次，仅用于测试
        maxFiles: 3
      }
    });

    // 写入第一批日志
    logger.info('First log batch');

    // 推进时间触发轮转
    vi.advanceTimersByTime(1100); // 前进1.1秒

    // 写入第二批日志
    logger.info('Second log batch');

    // 再次推进时间
    vi.advanceTimersByTime(1100);

    // 写入第三批日志
    logger.info('Third log batch');

    // 恢复真实定时器
    vi.useRealTimers();

    // 等待所有异步操作完成
    await new Promise((resolve) => setTimeout(resolve, 500));

    // 验证有多个日志文件
    const files = await fs.readdir(tempDir);
    const logFiles = files.filter((f) => f.endsWith('.log'));

    expect(logFiles.length).toBeGreaterThan(1);
  });
});
