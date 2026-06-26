import { describe, expect, it, vi } from 'vitest';
import { OsspClientAdapter, OSSProvider } from '../index.js';

function createAdapter() {
  return new OsspClientAdapter({
    resolve(name: string) {
      if (name === 'logger') {
        return {
          error: vi.fn(),
          info: vi.fn(),
          warn: vi.fn()
        };
      }

      return {
        provider: OSSProvider.ALIYUN_OSS,
        accessKeyId: 'test-access-key',
        accessKeySecret: 'test-access-secret',
        bucket: 'test-bucket',
        region: 'oss-cn-hangzhou',
        useSSL: true
      };
    }
  } as any);
}

describe('Aliyun OSS adapter', () => {
  it('is selected by aliyun-oss provider and signs download urls', async () => {
    const adapter = createAdapter();

    expect(adapter.provider).toBe(OSSProvider.ALIYUN_OSS);
    await expect(
      adapter.presignedGetObject('test-bucket', 'dir/file.txt', {
        expiry: 60
      })
    ).resolves.toContain('OSSAccessKeyId=test-access-key');
  });

  it('signs browser POST policies with the configured bucket', async () => {
    const adapter = createAdapter();
    const result = await adapter.presignedPostPolicy({
      conditions: [{ bucket: 'test-bucket' }],
      expiration: '2030-01-01T00:00:00.000Z'
    });

    expect(result.postURL).toContain('test-bucket');
    expect(result.formData.OSSAccessKeyId).toBe('test-access-key');
    expect(result.formData.Signature).toBeTruthy();
    expect(result.formData.policy).toBeTruthy();
  });
});
