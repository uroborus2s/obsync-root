import { describe, expect, it, vi } from 'vitest';
import type { OsspPluginOptions } from '../index.js';

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
      info: vi.fn()
    }
  } as any;
}

async function testPluginWithOptions(options: Partial<OsspPluginOptions>) {
  const { default: osspPlugin } = await import('../index.js');
  await osspPlugin(createMockFastify(), options as OsspPluginOptions);
}

describe('@stratix/ossp plugin parameter validation', () => {
  const validOptions: OsspPluginOptions = {
    endPoint: 'oss.example.com',
    accessKey: 'prod-access-key',
    secretKey: 'prod-secret-key'
  };

  it('accepts explicit non-placeholder credentials', async () => {
    await expect(testPluginWithOptions(validOptions)).resolves.toBeUndefined();
  });

  it('accepts aliyun credentials without custom endpoint', async () => {
    await expect(
      testPluginWithOptions({
        provider: 'aliyun-oss',
        accessKeyId: 'prod-access-key',
        accessKeySecret: 'prod-secret-key',
        region: 'oss-cn-hangzhou'
      })
    ).resolves.toBeUndefined();
  });

  it.each([
    ['missing accessKey', { accessKey: undefined }],
    ['missing secretKey', { secretKey: undefined }],
    ['placeholder accessKey', { accessKey: 'minioadmin' }],
    ['placeholder secretKey', { secretKey: 'minioadmin' }]
  ])('rejects %s', async (_caseName, override) => {
    await expect(
      testPluginWithOptions({ ...validOptions, ...override })
    ).rejects.toThrow('Parameter validation failed');
  });
});
