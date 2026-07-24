import { createContainer } from 'awilix';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { WasV7PluginOptions } from '../plugin.js';

vi.mock('@stratix/core/plugin', async (importActual) => {
  const actual = await importActual<typeof import('@stratix/core/plugin')>();
  return {
    ...actual,
    withRegisterAutoDI:
      (plugin: any, config: any) => async (fastify: any, options: any) => {
        const processedOptions = config.parameterProcessor
          ? config.parameterProcessor(options)
          : options;

        if (
          config.parameterValidator &&
          !config.parameterValidator(processedOptions)
        ) {
          throw new Error('Parameter validation failed');
        }

        await plugin(fastify, processedOptions);
      }
  };
});

function createMockFastify() {
  return {
    log: {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn()
    },
    hasDecorator: vi.fn((name: string) => name === 'diContainer'),
    diContainer: createContainer(),
    decorate: vi.fn()
  } as any;
}

async function testPluginWithOptions(options: WasV7PluginOptions) {
  const { default: wasV7Plugin } = await import('../plugin.js');
  const fastify = createMockFastify();
  await wasV7Plugin(fastify, options);
  return fastify;
}

describe('WPS V7 插件参数验证', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validBaseOptions: WasV7PluginOptions = {
    appId: 'test_app_id',
    appSecret: 'test_app_secret'
  };

  it('应该加载有效配置并保留默认参数处理', async () => {
    const fastify = await testPluginWithOptions(validBaseOptions);

    expect(fastify.log.info).toHaveBeenCalledWith(
      'WPS V7 API plugin loaded successfully'
    );
  });

  it('应该允许用户覆盖默认配置', async () => {
    await expect(
      testPluginWithOptions({
        ...validBaseOptions,
        baseUrl: 'https://custom.api.com',
        timeout: 30000,
        retryTimes: 5,
        debug: true
      })
    ).resolves.toBeDefined();
  });

  it('应该在缺少 appId 时抛出具体错误', async () => {
    await expect(
      testPluginWithOptions({ appSecret: 'test_app_secret' } as any)
    ).rejects.toThrow('appId is required');
  });

  it('应该在缺少 appSecret 时抛出具体错误', async () => {
    await expect(
      testPluginWithOptions({ appId: 'test_app_id' } as any)
    ).rejects.toThrow('appSecret is required');
  });

  it.each([
    ['空白 appId', { appId: '   ' }],
    ['非字符串 appId', { appId: 123 as any }],
    ['占位 appId', { appId: 'your-app-id' }],
    ['空白 appSecret', { appSecret: '   ' }],
    ['非字符串 appSecret', { appSecret: 123 as any }],
    ['占位 appSecret', { appSecret: 'your-app-secret' }],
    ['生产 HTTP baseUrl', { baseUrl: 'http://api.example.com', debug: false }],
    ['无效 baseUrl', { baseUrl: 'invalid-url' }],
    ['负数 timeout', { timeout: -1000 }],
    ['零 timeout', { timeout: 0 }],
    ['过大 timeout', { timeout: 400000 }],
    ['非数字 timeout', { timeout: 'invalid' as any }],
    ['负数 retryTimes', { retryTimes: -1 }],
    ['过大 retryTimes', { retryTimes: 15 }],
    ['非数字 retryTimes', { retryTimes: 'invalid' as any }],
    ['非布尔 debug', { debug: 'true' as any }]
  ])('应该拒绝%s', async (_caseName, override) => {
    await expect(
      testPluginWithOptions({ ...validBaseOptions, ...override })
    ).rejects.toThrow('Parameter validation failed');
  });

  it('应该在调试模式下接受 HTTP URL', async () => {
    await expect(
      testPluginWithOptions({
        ...validBaseOptions,
        baseUrl: 'http://localhost:3000',
        debug: true
      })
    ).resolves.toBeDefined();
  });
});
