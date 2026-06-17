import { describe, expect, it } from 'vitest';
import { buildServiceAdapterToken } from '../adapter-registration.js';

describe('service adapter token naming', () => {
  it('keeps existing plugin-prefixed adapter names stable', () => {
    expect(buildServiceAdapterToken('redis', 'redisClient')).toBe(
      'redisClient'
    );
  });

  it('adds the plugin prefix to generic adapter names', () => {
    expect(buildServiceAdapterToken('queue', 'client')).toBe('queueClient');
    expect(buildServiceAdapterToken('ossp', 'client')).toBe('osspClient');
    expect(buildServiceAdapterToken('wasV7Api', 'userAuth')).toBe(
      'wasV7ApiUserAuth'
    );
  });

  it('uses the adapter name directly when no plugin name is available', () => {
    expect(buildServiceAdapterToken(undefined, 'client')).toBe('client');
  });
});
