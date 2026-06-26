import { afterEach, describe, expect, it } from 'vitest';

import { decrypt, encrypt } from '../crypto.js';

const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
const ORIGINAL_ENCRYPTION_KEY = process.env.STRATIX_ENCRYPTION_KEY;

describe('crypto utilities', () => {
  afterEach(() => {
    restoreEnv('NODE_ENV', ORIGINAL_NODE_ENV);
    restoreEnv('STRATIX_ENCRYPTION_KEY', ORIGINAL_ENCRYPTION_KEY);
  });

  it('allows the built-in development key outside production', () => {
    process.env.NODE_ENV = 'development';
    delete process.env.STRATIX_ENCRYPTION_KEY;

    const encrypted = encrypt('development secret');

    expect(decrypt(encrypted.encrypted, encrypted.iv, encrypted.authTag)).toBe(
      'development secret'
    );
  });

  it('fails in production when no explicit encryption key is configured', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.STRATIX_ENCRYPTION_KEY;

    expect(() => encrypt('production secret')).toThrow(
      'STRATIX_ENCRYPTION_KEY'
    );
  });

  it('uses an explicit production encryption key', () => {
    process.env.NODE_ENV = 'production';
    process.env.STRATIX_ENCRYPTION_KEY = '12345678901234567890123456789012';

    const encrypted = encrypt('production secret');

    expect(decrypt(encrypted.encrypted, encrypted.iv, encrypted.authTag)).toBe(
      'production secret'
    );
  });

  it('rejects forced default key usage in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.STRATIX_ENCRYPTION_KEY = '12345678901234567890123456789012';

    expect(() => encrypt('production secret', { useDefaultKey: true })).toThrow(
      'default encryption key'
    );
  });
});

function restoreEnv(key: string, value: string | undefined): void {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
}
