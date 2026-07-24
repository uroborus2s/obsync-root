import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import fs from 'node:fs';
import { basename, dirname, isAbsolute, resolve } from 'node:path';
import type { Logger } from 'pino';
import { ApplicationDiscoveryPipeline } from '../discovery/application-pipeline.js';
import type { ApplicationDiscoveryConfig } from '../discovery/interfaces.js';
import {
  createProductionManifestRegistrationPlan,
  loadProductionManifest,
  type LoadedProductionManifest,
  type ProductionManifestRegistrationPlan
} from '../discovery/production-manifest.js';
import { ConfigurationError } from '../errors/index.js';
import type { StratixConfig } from '../types/index.js';

export interface ApplicationDiscoveryRegistrarOptions {
  logger?: Logger;
  getAppRoot(): string;
}

/**
 * Owns application discovery and production-manifest registration orchestration.
 *
 * ApplicationBootstrap keeps lifecycle ordering; this class keeps the discovery
 * branch independently testable and ready for RegistrationPlan evolution.
 */
export class ApplicationDiscoveryRegistrar {
  constructor(private readonly options: ApplicationDiscoveryRegistrarOptions) {}

  loadConfiguredProductionManifest(
    config: StratixConfig
  ): LoadedProductionManifest | undefined {
    const discoveryConfig = config.discovery || {};
    if (discoveryConfig.enabled === false) {
      return undefined;
    }

    const manifestConfig = discoveryConfig.productionManifest;
    if (manifestConfig?.enabled !== true) {
      return undefined;
    }

    const productionManifest = loadProductionManifest(
      this.resolveProductionManifestLoadRoot(discoveryConfig, manifestConfig),
      manifestConfig
    );

    if (productionManifest) {
      this.options.logger?.info(
        `✅ Production manifest loaded: ${productionManifest.sourceFile}`
      );
    }

    return productionManifest;
  }

  async register(
    config: StratixConfig,
    container: AwilixContainer,
    fastifyInstance: FastifyInstance,
    productionManifest?: LoadedProductionManifest
  ): Promise<void> {
    const discoveryConfig = config.discovery || {};
    if (discoveryConfig.enabled === false) {
      return;
    }

    if (
      productionManifest &&
      discoveryConfig.productionManifest?.skipRuntimeDiscovery === true
    ) {
      await this.registerFromProductionManifest(
        discoveryConfig,
        container,
        fastifyInstance,
        productionManifest
      );
      return;
    }

    try {
      this.options.logger?.debug(
        '🚀 Starting application discovery pipeline...'
      );

      const appRoot = this.options.getAppRoot();
      const sourceRoot = fs.existsSync(resolve(appRoot, 'src'))
        ? resolve(appRoot, 'src')
        : appRoot;
      const pipeline = new ApplicationDiscoveryPipeline();
      const result = await pipeline.discoverAndRegister({
        rootDir: sourceRoot,
        ...discoveryConfig,
        container,
        fastify: fastifyInstance
      });

      this.options.logger?.info(
        `✅ Application discovery completed: ${result.registered.length} registrations, ${result.routesRegistered} routes`
      );
    } catch (error) {
      this.options.logger?.error(
        { err: error },
        '❌ Application discovery failed'
      );
      throw error;
    }
  }

  private async registerFromProductionManifest(
    discoveryConfig: NonNullable<StratixConfig['discovery']>,
    container: AwilixContainer,
    fastifyInstance: FastifyInstance,
    productionManifest: LoadedProductionManifest
  ): Promise<void> {
    if (discoveryConfig.productionManifest?.registerFromManifest === true) {
      const registrationPlan = createProductionManifestRegistrationPlan(
        productionManifest,
        {
          compiledOnly: discoveryConfig.productionManifest.compiledOnly === true
        }
      );
      this.assertProductionManifestRegistrationPlan(
        productionManifest,
        discoveryConfig.productionManifest,
        registrationPlan
      );
      const manifestRoot = this.resolveProductionManifestRoot(
        discoveryConfig,
        productionManifest
      );

      if (registrationPlan.sourceFiles.length > 0) {
        this.options.logger?.info(
          `✅ Registering application components from production manifest: ${productionManifest.sourceFile}`
        );
        const pipeline = new ApplicationDiscoveryPipeline();
        const pipelineConfig: ApplicationDiscoveryConfig & {
          container: AwilixContainer;
          fastify: FastifyInstance;
        } = {
          ...discoveryConfig,
          rootDir: manifestRoot,
          files: registrationPlan.sourceFiles,
          manifestRegistration: {
            tokens: registrationPlan.tokenEntries,
            routes: registrationPlan.routes
          },
          container,
          fastify: fastifyInstance
        };
        const result = await pipeline.discoverAndRegister(pipelineConfig);

        this.assertProductionManifestRegistrationResult(
          productionManifest,
          discoveryConfig.productionManifest,
          registrationPlan,
          result
        );

        this.options.logger?.info(
          `✅ Production manifest registration completed: ${result.registered.length} registrations, ${result.routesRegistered} routes`
        );
        return;
      }
    }

    this.options.logger?.info(
      `✅ Production manifest loaded, skipping runtime application discovery: ${productionManifest.sourceFile}`
    );
  }

  private assertProductionManifestRegistrationPlan(
    productionManifest: LoadedProductionManifest,
    manifestConfig: NonNullable<
      NonNullable<StratixConfig['discovery']>['productionManifest']
    >,
    registrationPlan: ProductionManifestRegistrationPlan
  ): void {
    if (
      manifestConfig.strict === false ||
      registrationPlan.issues.length === 0
    ) {
      return;
    }

    throw new ConfigurationError(
      `Production manifest registration plan is incomplete: ${productionManifest.sourceFile}`,
      {
        sourceFile: productionManifest.sourceFile,
        issues: registrationPlan.issues
      }
    );
  }

  private resolveProductionManifestRoot(
    discoveryConfig: NonNullable<StratixConfig['discovery']>,
    productionManifest: LoadedProductionManifest
  ): string {
    const manifestDiscoveryRoot = productionManifest.discovery.rootDir || '.';
    if (discoveryConfig.rootDir) {
      return resolve(discoveryConfig.rootDir, manifestDiscoveryRoot);
    }

    const manifestDirectory = dirname(productionManifest.sourceFile);
    const projectRoot =
      basename(manifestDirectory) === '.stratix'
        ? dirname(manifestDirectory)
        : this.options.getAppRoot();
    return resolve(projectRoot, manifestDiscoveryRoot);
  }

  private resolveProductionManifestLoadRoot(
    discoveryConfig: NonNullable<StratixConfig['discovery']>,
    manifestConfig: NonNullable<
      NonNullable<StratixConfig['discovery']>['productionManifest']
    >
  ): string {
    if (discoveryConfig.rootDir) {
      return discoveryConfig.rootDir;
    }

    if (manifestConfig.path && isAbsolute(manifestConfig.path)) {
      const manifestDirectory = dirname(manifestConfig.path);
      if (basename(manifestDirectory) === '.stratix') {
        return dirname(manifestDirectory);
      }
    }

    return this.options.getAppRoot();
  }

  private assertProductionManifestRegistrationResult(
    productionManifest: LoadedProductionManifest,
    manifestConfig: NonNullable<
      NonNullable<StratixConfig['discovery']>['productionManifest']
    >,
    registrationPlan: ProductionManifestRegistrationPlan,
    result: Awaited<
      ReturnType<ApplicationDiscoveryPipeline['discoverAndRegister']>
    >
  ): void {
    if (manifestConfig.strict === false) {
      return;
    }

    const registeredTokens = new Set(result.registered);
    const missingTokens = registrationPlan.tokenEntries
      .map((token) => token.token)
      .filter((token) => !registeredTokens.has(token));
    const expectedRoutes =
      manifestConfig.registerFromManifest === true
        ? registrationPlan.routes.length
        : 0;
    const missingRouteCount = Math.max(
      0,
      expectedRoutes - result.routesRegistered
    );

    if (missingTokens.length === 0 && missingRouteCount === 0) {
      return;
    }

    throw new ConfigurationError(
      `Production manifest source mismatch: ${productionManifest.sourceFile}`,
      {
        sourceFile: productionManifest.sourceFile,
        missingTokens,
        expectedRoutes,
        routesRegistered: result.routesRegistered,
        missingRouteCount
      }
    );
  }
}
