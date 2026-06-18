import { describe, expect, it } from 'vitest';
import {
  buildServiceAdapterToken,
  diagnoseServiceAdapterTokens
} from '../adapter-registration.js';

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

  it('diagnoses duplicate adapter names before registration', () => {
    const diagnostics = diagnoseServiceAdapterTokens('queue', [
      { adapterName: 'client', factory: () => ({}) },
      { adapterName: 'client', factory: () => ({}) }
    ]);

    expect(diagnostics).toEqual([
      {
        code: 'ADAPTER_DUPLICATE_NAME',
        adapterName: 'client',
        token: 'queueClient',
        message: 'Duplicate service adapter name: client'
      }
    ]);
  });

  it('diagnoses adapter token conflicts with existing root registrations', () => {
    const diagnostics = diagnoseServiceAdapterTokens(
      'queue',
      [{ adapterName: 'client', factory: () => ({}) }],
      ['queueClient']
    );

    expect(diagnostics).toEqual([
      {
        code: 'ADAPTER_TOKEN_CONFLICT',
        adapterName: 'client',
        token: 'queueClient',
        message: 'Service adapter token already exists in root container: queueClient'
      }
    ]);
  });
});
