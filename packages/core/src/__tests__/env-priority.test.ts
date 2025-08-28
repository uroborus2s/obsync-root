// 环境变量优先级覆盖功能测试
// 测试修改后的 loadEnvironment 方法是否正确实现优先级覆盖

import { createLogger } from '@stratix/utils/logger';
import fs from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ApplicationBootstrap } from '../bootstrap/application-bootstrap.js';

describe('Environment Priority Override', () => {
  const testDir = path.join(process.cwd(), 'test-env-files');
  const originalEnv = { ...process.env };
  let bootstrap: ApplicationBootstrap;

  beforeEach(() => {
    // 创建测试目录
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // 清理环境变量
    for (const key in process.env) {
      if (key.startsWith('TEST_')) {
        delete process.env[key];
      }
    }

    // 创建 ApplicationBootstrap 实例
    const logger = createLogger({ level: 'debug' });
    bootstrap = new ApplicationBootstrap(logger);
  });

  afterEach(() => {
    // 清理测试文件
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    // 恢复原始环境变量
    process.env = { ...originalEnv };
  });

  it('应该按优先级顺序加载环境文件', async () => {
    // 创建测试环境文件
    const envFiles = {
      '.env': 'TEST_VAR1=base\nTEST_VAR2=base\nTEST_VAR3=base',
      '.env.development': 'TEST_VAR2=dev\nTEST_VAR3=dev',
      '.env.development.local': 'TEST_VAR3=dev-local',
      '.env.local': 'TEST_VAR4=local'
    };

    // 写入测试文件
    for (const [filename, content] of Object.entries(envFiles)) {
      fs.writeFileSync(path.join(testDir, filename), content);
    }

    // 设置环境变量
    process.env.NODE_ENV = 'development';

    // 调用 loadEnvironment 方法
    const envOptions = {
      rootDir: testDir,
      override: false,
      strict: false
    };

    // 使用反射调用私有方法进行测试
    const loadEnvironment = (bootstrap as any).loadEnvironment.bind(bootstrap);
    await loadEnvironment(envOptions);

    // 验证优先级覆盖结果
    expect(process.env.TEST_VAR1).toBe('base');        // 只在 .env 中定义
    expect(process.env.TEST_VAR2).toBe('dev');         // .env.development 覆盖 .env
    expect(process.env.TEST_VAR3).toBe('dev-local');   // .env.development.local 覆盖前面的
    expect(process.env.TEST_VAR4).toBe('local');       // 只在 .env.local 中定义
  });

  it('应该正确处理系统环境变量覆盖', async () => {
    // 设置系统环境变量
    process.env.TEST_SYSTEM_VAR = 'system-value';

    // 创建包含同名变量的 .env 文件
    const envContent = 'TEST_SYSTEM_VAR=file-value\nTEST_FILE_VAR=file-value';
    fs.writeFileSync(path.join(testDir, '.env'), envContent);

    // 测试 override=false 的情况
    const envOptions1 = {
      rootDir: testDir,
      override: false,
      strict: false
    };

    const loadEnvironment = (bootstrap as any).loadEnvironment.bind(bootstrap);
    await loadEnvironment(envOptions1);

    // 系统环境变量不应该被覆盖
    expect(process.env.TEST_SYSTEM_VAR).toBe('system-value');
    expect(process.env.TEST_FILE_VAR).toBe('file-value');

    // 重置并测试 override=true 的情况
    const envOptions2 = {
      rootDir: testDir,
      override: true,
      strict: false
    };

    await loadEnvironment(envOptions2);

    // 系统环境变量应该被覆盖
    expect(process.env.TEST_SYSTEM_VAR).toBe('file-value');
    expect(process.env.TEST_FILE_VAR).toBe('file-value');
  });

  it('应该正确处理变量扩展', async () => {
    // 创建包含变量引用的 .env 文件
    const envContent = `
BASE_URL=https://api.example.com
API_VERSION=v1
API_ENDPOINT=\${BASE_URL}/\${API_VERSION}
DATABASE_URL=postgres://user:pass@localhost:5432/\${API_VERSION}_db
`;
    fs.writeFileSync(path.join(testDir, '.env'), envContent.trim());

    const envOptions = {
      rootDir: testDir,
      override: false,
      strict: false
    };

    const loadEnvironment = (bootstrap as any).loadEnvironment.bind(bootstrap);
    await loadEnvironment(envOptions);

    // 验证变量扩展结果
    expect(process.env.BASE_URL).toBe('https://api.example.com');
    expect(process.env.API_VERSION).toBe('v1');
    expect(process.env.API_ENDPOINT).toBe('https://api.example.com/v1');
    expect(process.env.DATABASE_URL).toBe('postgres://user:pass@localhost:5432/v1_db');
  });

  it('应该正确处理生产环境中排除 .local 文件', async () => {
    // 创建测试环境文件
    const envFiles = {
      '.env': 'TEST_VAR=base',
      '.env.production': 'TEST_VAR=prod',
      '.env.production.local': 'TEST_VAR=prod-local',
      '.env.local': 'TEST_VAR=local'
    };

    // 写入测试文件
    for (const [filename, content] of Object.entries(envFiles)) {
      fs.writeFileSync(path.join(testDir, filename), content);
    }

    // 设置生产环境
    process.env.NODE_ENV = 'production';

    const envOptions = {
      rootDir: testDir,
      override: false,
      strict: false
    };

    const loadEnvironment = (bootstrap as any).loadEnvironment.bind(bootstrap);
    await loadEnvironment(envOptions);

    // 在生产环境中，.local 文件应该被排除
    expect(process.env.TEST_VAR).toBe('prod'); // 应该是 .env.production 的值，而不是 .local 文件的值
  });
});
