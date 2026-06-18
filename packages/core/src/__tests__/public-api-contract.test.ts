import { describe, expect, it } from 'vitest';

describe('public API contract', () => {
  it('exports the breaking-upgrade discovery API and does not export removed application APIs', async () => {
    const api = (await import('../index.js')) as Record<string, unknown>;

    expect(api.ApplicationDiscoveryPipeline).toEqual(expect.any(Function));
    expect(api.Component).toEqual(expect.any(Function));
    expect(api.Service).toEqual(expect.any(Function));
    expect(api.Repository).toEqual(expect.any(Function));
    expect(api.getControllerRouteContracts).toEqual(expect.any(Function));
    expect(api.generateOpenApiDocument).toEqual(expect.any(Function));
    expect(api.validateRouteContracts).toEqual(expect.any(Function));
    expect(api.createErrorEnvelope).toEqual(expect.any(Function));
    expect(api.ERROR_ENVELOPE_SCHEMA).toEqual(expect.any(Object));
    expect(api.createDIGraph).toEqual(expect.any(Function));
    expect(api.diagnoseDIGraph).toEqual(expect.any(Function));
    expect(api.runDIDiagnostics).toEqual(expect.any(Function));
    expect(api.diagnoseServiceAdapterTokens).toEqual(expect.any(Function));

    expect(api).not.toHaveProperty('performApplicationAutoDI');
    expect(api).not.toHaveProperty('discoverAndProcessApplicationModules');
    expect(api).not.toHaveProperty('ApplicationErrorHandler');
    expect(api).not.toHaveProperty('safeExecute');
    expect(api).not.toHaveProperty('Executor');
    expect(api).not.toHaveProperty('EXECUTOR_METADATA_KEY');
    expect(api).not.toHaveProperty('getExecutorMetadata');
    expect(api).not.toHaveProperty('getExecutorName');
    expect(api).not.toHaveProperty('isExecutor');
    expect(api).not.toHaveProperty('processExecutorRegistration');
    expect(api).not.toHaveProperty('registerExecutorDomain');
  });
});
