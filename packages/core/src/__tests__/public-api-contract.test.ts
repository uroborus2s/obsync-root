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

    expect(api.Component).toEqual(expect.any(Function));
    expect(api.Service).toEqual(expect.any(Function));
    expect(api.Repository).toEqual(expect.any(Function));
    expect(api.experimental).toEqual(expect.any(Object));
    expect(
      (api.experimental as Record<string, unknown>).createRegistrationPlan
    ).toEqual(expect.any(Function));
    expect(
      (api.experimental as Record<string, unknown>).recordRegistrationPlan
    ).toEqual(expect.any(Function));

    expect(api).not.toHaveProperty('ApplicationBootstrap');
    expect(api).not.toHaveProperty('ApplicationDiscoveryPipeline');
    expect(api).not.toHaveProperty('getControllerRouteContracts');
    expect(api).not.toHaveProperty('generateOpenApiDocument');
    expect(api).not.toHaveProperty('validateRouteContracts');
    expect(api).not.toHaveProperty('createDIGraph');
    expect(api).not.toHaveProperty('diagnoseDIGraph');
    expect(api).not.toHaveProperty('runDIDiagnostics');
    expect(api).not.toHaveProperty('withRegisterAutoDI');
    expect(api).not.toHaveProperty('registerControllerRoutes');
    expect(api).not.toHaveProperty('diagnoseServiceAdapterTokens');
    expect(api).not.toHaveProperty('RESOLVER');
    expect(api).not.toHaveProperty('Lifetime');
    expect(api).not.toHaveProperty('asFunction');
    expect(api).not.toHaveProperty('asValue');
    expect(api).not.toHaveProperty('fp');
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
    expect(api.HttpError).toEqual(expect.any(Function));

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
    expect(new api.HttpError('not found', 404)).toBeInstanceOf(
      api.StratixError
    );
  });

  it('exports the designed framework errors from the errors subpath', async () => {
    const api = (await import('../errors/index.js')) as Record<string, any>;

    expect(api.HttpError).toEqual(expect.any(Function));
    expect(new api.HttpError('bad request', 400)).toBeInstanceOf(
      api.StratixError
    );
  });

  it('publishes explicit subpath contracts for all documented public API families', async () => {
    expect(packageJson.exports).toHaveProperty('./async');
    expect(packageJson.exports).toHaveProperty('./auth');
    expect(packageJson.exports).toHaveProperty('./context');
    expect(packageJson.exports).toHaveProperty('./plugin');
    expect(packageJson.exports).toHaveProperty('./contracts');
    expect(packageJson.exports).toHaveProperty('./data');
    expect(packageJson.exports).toHaveProperty('./diagnostics');
    expect(packageJson.exports).toHaveProperty('./environment');
    expect(packageJson.exports).toHaveProperty('./errors');
    expect(packageJson.exports).toHaveProperty('./experimental');
    expect(packageJson.exports).toHaveProperty('./functional');
    expect(packageJson.exports).toHaveProperty('./logger');
    expect(packageJson.exports).toHaveProperty('./service');
    expect(packageJson.exports).toHaveProperty('./internal');

    const authApi = (await import('../utils/auth/index.js')) as Record<
      string,
      unknown
    >;
    const contextApi = (await import('../utils/context/index.js')) as Record<
      string,
      unknown
    >;
    const pluginApi = (await import('../public/plugin.js')) as Record<
      string,
      unknown
    >;
    const contractsApi = (await import('../contracts/index.js')) as Record<
      string,
      unknown
    >;
    const dataApi = (await import('../utils/data/index.js')) as Record<
      string,
      unknown
    >;
    const diagnosticsApi = (await import('../diagnostics/index.js')) as Record<
      string,
      unknown
    >;
    const environmentApi =
      (await import('../utils/environment/index.js')) as Record<
        string,
        unknown
      >;
    const loggerApi = (await import('../logger/index.js')) as Record<
      string,
      unknown
    >;
    const serviceApi = (await import('../service/index.js')) as Record<
      string,
      unknown
    >;
    const internalApi = (await import('../internal/index.js')) as Record<
      string,
      unknown
    >;

    expect(authApi.hasPermission).toEqual(expect.any(Function));
    expect(authApi.IdentityErrorType).toEqual(expect.any(Object));
    expect(contextApi.createContext).toEqual(expect.any(Function));
    expect(pluginApi.withRegisterAutoDI).toEqual(expect.any(Function));
    expect(pluginApi.RESOLVER).toBeDefined();
    expect(contractsApi.getControllerRouteContracts).toEqual(
      expect.any(Function)
    );
    expect(contractsApi.createErrorEnvelope).toEqual(expect.any(Function));
    expect(dataApi.chunk).toEqual(expect.any(Function));
    expect(dataApi.deepMerge).toEqual(expect.any(Function));
    expect(diagnosticsApi.createDIGraph).toEqual(expect.any(Function));
    expect(environmentApi.getNodeEnv).toEqual(expect.any(Function));
    expect(environmentApi.isProduction).toEqual(expect.any(Function));
    expect(loggerApi.LoggerFactory).toEqual(expect.any(Function));
    expect(loggerApi.getLogger).toEqual(expect.any(Function));
    expect(serviceApi.createServiceFunction).toEqual(expect.any(Function));
    expect(serviceApi.BaseServiceErrorCode).toEqual(expect.any(Object));
    expect(internalApi.ApplicationBootstrap).toEqual(expect.any(Function));
    expect(internalApi.BootstrapPhase).toEqual(expect.any(Object));
    expect(internalApi.ApplicationDiscoveryRegistrar).toEqual(
      expect.any(Function)
    );
    expect(internalApi.ApplicationDiscoveryPipeline).toEqual(
      expect.any(Function)
    );
    expect(internalApi.registerControllerRoutes).toEqual(expect.any(Function));

    expect(internalApi).not.toHaveProperty('performAutoRegistration');
    expect(internalApi).not.toHaveProperty('processModulesUnified');
    expect(internalApi).not.toHaveProperty('processSingleModule');
    expect(internalApi).not.toHaveProperty('discoverAndProcessModules');
    expect(internalApi).not.toHaveProperty('registerServiceAdapters');
    expect(internalApi).not.toHaveProperty('ensureAwilixPlugin');
    expect(internalApi).not.toHaveProperty('ConventionBasedLifecycleManager');
  });
});
