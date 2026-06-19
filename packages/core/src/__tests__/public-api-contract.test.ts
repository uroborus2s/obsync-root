import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };

describe('public API contract', () => {
  it('reports the package version through Stratix version APIs', async () => {
    const api = (await import('../index.js')) as Record<string, any>;

    expect(api.Stratix.getVersion()).toBe(packageJson.version);
    expect(api.Stratix.getVersionInfo().version).toBe(packageJson.version);
  });

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
    expect(api.experimental).toEqual(expect.any(Object));
    expect((api.experimental as Record<string, unknown>).createRegistrationPlan)
      .toEqual(expect.any(Function));
    expect((api.experimental as Record<string, unknown>).recordRegistrationPlan)
      .toEqual(expect.any(Function));

    expect(api).not.toHaveProperty('createRegistrationPlan');
    expect(api).not.toHaveProperty('recordRegistrationPlan');
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

  it('exports the designed framework error classes from the root API', async () => {
    const api = (await import('../index.js')) as Record<string, any>;

    expect(api.StratixError).toEqual(expect.any(Function));
    expect(api.ConfigurationError).toEqual(expect.any(Function));
    expect(api.DiscoveryError).toEqual(expect.any(Function));
    expect(api.RegistrationError).toEqual(expect.any(Function));
    expect(api.PluginLoadError).toEqual(expect.any(Function));

    expect(new api.ConfigurationError('invalid config')).toBeInstanceOf(
      api.StratixError
    );
    expect(new api.DiscoveryError('discovery failed')).toBeInstanceOf(
      api.StratixError
    );
    expect(new api.RegistrationError('registration failed')).toBeInstanceOf(
      api.StratixError
    );
    expect(new api.PluginLoadError('plugin failed')).toBeInstanceOf(
      api.StratixError
    );
  });
});
