import { describe, expect, it } from 'vitest';

describe('public API contract', () => {
  it('exports the breaking-upgrade discovery API and does not export removed application APIs', async () => {
    const api = (await import('../index.js')) as Record<string, unknown>;

    expect(api.ApplicationDiscoveryPipeline).toEqual(expect.any(Function));
    expect(api.Component).toEqual(expect.any(Function));
    expect(api.Service).toEqual(expect.any(Function));
    expect(api.Repository).toEqual(expect.any(Function));

    expect(api).not.toHaveProperty('performApplicationAutoDI');
    expect(api).not.toHaveProperty('discoverAndProcessApplicationModules');
    expect(api).not.toHaveProperty('ApplicationErrorHandler');
    expect(api).not.toHaveProperty('safeExecute');
  });
});
