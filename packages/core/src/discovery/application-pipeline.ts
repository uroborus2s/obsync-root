import {
  asClass,
  type AwilixContainer,
  type InjectionModeType,
  type LifetimeType,
  InjectionMode,
  Lifetime
} from 'awilix';
import type { FastifyInstance } from 'fastify';
import { glob } from 'glob';
import { isAbsolute, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  MetadataManager,
  type ComponentMetadata as DecoratorComponentMetadata
} from '../decorators/index.js';
import {
  ConfigurationError,
  DiscoveryError,
  RegistrationError
} from '../errors/index.js';
import {
  extractConstructorDependencies,
  recordDIRegistration
} from '../diagnostics/index.js';
import {
  createRegistrationPlan,
  registerRegistrationPlanToken,
  type RegistrationPlan,
  type RegistrationPlanRoute,
  type RegistrationPlanToken
} from '../registration/index.js';
import type {
  ApplicationDiscoveryConfig,
  ApplicationDiscoveryResult,
  ComponentMetadata,
  LoadedModule
} from './interfaces.js';

const DEFAULT_PATTERNS = [
  'controllers/**/*.{ts,js,mjs,cjs}',
  'services/**/*.{ts,js,mjs,cjs}',
  'repositories/**/*.{ts,js,mjs,cjs}',
  'components/**/*.{ts,js,mjs,cjs}'
];

const DEFAULT_EXCLUDE = [
  '**/*.d.ts',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/__tests__/**'
];

type ManifestTokenSelector =
  | string
  | {
      token: string;
      className?: string;
      sourceFile?: string;
    };

interface ManifestRouteSelector {
  method?: string;
  path?: string;
  controllerName?: string;
  handlerName?: string;
  sourceFile?: string;
}

interface ManifestRegistrationPlan {
  tokens?: ManifestTokenSelector[];
  routes?: ManifestRouteSelector[];
}

interface AnalyzedComponent {
  module: LoadedModule;
  component: ComponentMetadata;
}

function toLifetime(lifetime?: string): LifetimeType {
  if (lifetime === 'SCOPED') return Lifetime.SCOPED;
  if (lifetime === 'TRANSIENT') return Lifetime.TRANSIENT;
  return Lifetime.SINGLETON;
}

function toInjectionMode(mode?: string): InjectionModeType {
  return mode === 'PROXY' ? InjectionMode.PROXY : InjectionMode.CLASSIC;
}

function camelCaseName(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

export class ApplicationDiscoveryPipeline {
  async discoverAndRegister(
    config: ApplicationDiscoveryConfig & {
      container: AwilixContainer;
      fastify: FastifyInstance;
    }
  ): Promise<ApplicationDiscoveryResult> {
    const result: ApplicationDiscoveryResult = {
      scanned: 0,
      analyzed: 0,
      registered: [],
      routesRegistered: 0,
      skipped: [],
      errors: []
    };

    if (config.enabled === false) {
      return result;
    }

    const modules = await this.scan(config);
    result.scanned = modules.length;

    const components = modules.flatMap((module): AnalyzedComponent[] => {
      const component = this.analyze(module, config);
      if (!component) {
        result.skipped.push({
          name: module.name,
          reason: 'not-a-stratix-component'
        });
        return [];
      }
      return [{ module, component }];
    });
    result.analyzed = components.length;
    this.assertManifestPlanMatchesDiscoveredComponents(components, config);
    const selectedComponents = this.filterComponentsByManifestPlan(
      components,
      config,
      result
    );
    const registrationPlan = this.createApplicationRegistrationPlan(
      selectedComponents,
      config
    );
    result.registrationPlan = registrationPlan;

    for (const component of selectedComponents) {
      try {
        const registered = await this.registerComponent(
          component,
          config.container,
          config.fastify,
          config,
          registrationPlan
        );
        result.registered.push(...registered.tokens);
        result.routesRegistered += registered.routes;
      } catch (error) {
        const wrapped = new RegistrationError(
          `Failed to register component ${component.name}`,
          { component },
          error
        );
        result.errors.push({ name: component.name, error: wrapped });
        if (
          config.lifecycle?.errorHandling !== 'warn' &&
          config.lifecycle?.errorHandling !== 'ignore'
        ) {
          throw wrapped;
        }
      }
    }

    return result;
  }

  async scan(config: ApplicationDiscoveryConfig): Promise<LoadedModule[]> {
    const rootDir = config.rootDir || process.cwd();
    const files = new Set<string>();

    if (config.files?.length) {
      for (const file of config.files) {
        files.add(isAbsolute(file) ? file : resolve(rootDir, file));
      }
    } else {
      const patterns = config.patterns?.length
        ? config.patterns
        : DEFAULT_PATTERNS;
      const exclude = config.exclude?.length ? config.exclude : DEFAULT_EXCLUDE;
      const directories = config.directories?.length
        ? config.directories.map((dir) =>
            isAbsolute(dir) ? dir : resolve(rootDir, dir)
          )
        : [rootDir];

      for (const directory of directories) {
        for (const pattern of patterns) {
          const absolutePattern = isAbsolute(pattern)
            ? pattern
            : resolve(directory, pattern).replace(/\\/g, '/');
          const matched = await glob(absolutePattern, {
            absolute: true,
            ignore: exclude,
            windowsPathsNoEscape: true
          });
          matched.forEach((file) => files.add(file));
        }
      }
    }

    const modules: LoadedModule[] = [];
    for (const file of files) {
      try {
        const raw = await import(pathToFileURL(file).href);
        const entries = Object.entries(raw).filter(
          ([name]) => name !== 'default'
        );
        if (raw.default) {
          entries.unshift(['default', raw.default]);
        }

        for (const [exportName, value] of entries) {
          if (!value) continue;
          const inferredName =
            typeof value === 'function' && value.name ? value.name : exportName;
          modules.push({
            name: inferredName,
            path: file,
            value
          });
        }
      } catch (error) {
        throw new DiscoveryError(
          `Failed to load module ${file}`,
          { file },
          error
        );
      }
    }

    return modules;
  }

  analyze(
    module: LoadedModule,
    _config: ApplicationDiscoveryConfig
  ): ComponentMetadata | null {
    const { value } = module;
    if (typeof value !== 'function') {
      return null;
    }

    if (MetadataManager.isController(value)) {
      const routes = MetadataManager.getRouteMetadata(value);
      return {
        name: module.name,
        type: 'controller',
        value,
        diOptions: {
          lifetime: 'SCOPED',
          injectionMode: 'CLASSIC'
        },
        routes: routes.map((route) => ({
          method: route.method,
          path: route.path,
          handlerName: route.propertyKey,
          options: route.options
        }))
      };
    }

    const componentMetadata = MetadataManager.getComponentMetadata(value);
    if (componentMetadata) {
      return this.fromComponentMetadata(module, value, componentMetadata);
    }

    return null;
  }

  private fromComponentMetadata(
    module: LoadedModule,
    value: unknown,
    metadata: DecoratorComponentMetadata
  ): ComponentMetadata {
    return {
      name: metadata.name || module.name,
      type: metadata.type,
      value,
      diOptions: {
        lifetime: metadata.lifetime,
        injectionMode: metadata.injectionMode
      }
    };
  }

  private async registerComponent(
    component: ComponentMetadata,
    container: AwilixContainer,
    fastify: FastifyInstance,
    config: ApplicationDiscoveryConfig,
    registrationPlan: RegistrationPlan
  ): Promise<{ tokens: string[]; routes: number }> {
    const tokens = [camelCaseName(component.name)];

    for (const token of tokens) {
      if (container.hasRegistration(token)) {
        throw new ConfigurationError(`Duplicate DI token: ${token}`, {
          token,
          component
        });
      }
      const planToken = registrationPlan.tokens.find(
        (entry) => entry.token === token
      );
      if (planToken) {
        registerRegistrationPlanToken(container, registrationPlan, planToken);
      } else {
        const lifetime = toLifetime(component.diOptions?.lifetime);
        const injectionMode = toInjectionMode(
          component.diOptions?.injectionMode
        );
        const resolver = asClass(component.value, {
          lifetime,
          injectionMode
        });

        container.register(token, resolver);
        recordDIRegistration(container, {
          token,
          registrationType: 'class',
          lifetime: component.diOptions?.lifetime,
          injectionMode: component.diOptions?.injectionMode,
          target: component.value,
          source: component.name
        });
      }
    }

    let routes = 0;
    if (
      component.type === 'controller' &&
      config.routing?.enabled !== false &&
      component.routes?.length
    ) {
      routes = await this.registerRoutes(component, fastify, container, config);
    }

    return { tokens, routes };
  }

  private createApplicationRegistrationPlan(
    components: ComponentMetadata[],
    config: ApplicationDiscoveryConfig
  ): RegistrationPlan {
    const tokens = components.map((component) =>
      this.createApplicationPlanToken(component)
    );
    const routes = components.flatMap((component) =>
      this.createApplicationPlanRoutes(component, config)
    );

    return createRegistrationPlan({
      id: 'application-discovery:root',
      source: 'application-discovery',
      owner: {
        type: 'application'
      },
      tokens,
      routes,
      metadata: {
        rootDir: config.rootDir || process.cwd(),
        routingPrefix: config.routing?.prefix
      }
    });
  }

  private createApplicationPlanToken(
    component: ComponentMetadata
  ): RegistrationPlanToken {
    return {
      token: camelCaseName(component.name),
      kind: this.toRegistrationPlanTokenKind(component.type),
      registrationType: 'class',
      lifetime: component.diOptions?.lifetime,
      injectionMode: component.diOptions?.injectionMode,
      scope: 'root',
      visibility: 'internal',
      dependencies: extractConstructorDependencies(component.value),
      target: component.value,
      source: component.name,
      metadata: {
        componentName: component.name,
        componentType: component.type
      }
    };
  }

  private createApplicationPlanRoutes(
    component: ComponentMetadata,
    config: ApplicationDiscoveryConfig
  ): RegistrationPlanRoute[] {
    if (component.type !== 'controller') {
      return [];
    }

    const token = camelCaseName(component.name);
    return (component.routes || []).map((route) => ({
      method: route.method.toUpperCase(),
      path: route.path,
      controllerName: component.name,
      handlerName: route.handlerName,
      token,
      scope: 'root',
      prefix: config.routing?.prefix,
      source: component.name,
      metadata: {
        hasOptions: Boolean(route.options)
      }
    }));
  }

  private toRegistrationPlanTokenKind(
    type: ComponentMetadata['type']
  ): RegistrationPlanToken['kind'] {
    if (
      type === 'controller' ||
      type === 'service' ||
      type === 'repository' ||
      type === 'component'
    ) {
      return type;
    }
    return 'unknown';
  }

  private assertManifestPlanMatchesDiscoveredComponents(
    components: AnalyzedComponent[],
    config: ApplicationDiscoveryConfig
  ): void {
    if (config.productionManifest?.strict === false) {
      return;
    }

    const plan = this.getManifestRegistrationPlan(config);
    if (!plan) {
      return;
    }

    for (const token of this.getManifestTokenSelectors(plan)) {
      const matched = components.some(({ component, module }) =>
        this.matchesManifestToken(component, module, token, config)
      );
      if (!matched) {
        throw new ConfigurationError(
          `Production manifest source mismatch: declared DI token was not discovered: ${token.token}`,
          { token }
        );
      }
    }

    for (const route of plan.routes || []) {
      const matched = components.some(({ component, module }) => {
        if (component.type !== 'controller') {
          return false;
        }
        return (component.routes || []).some((candidate) =>
          this.matchesManifestRoute(component, module, candidate, route, config)
        );
      });

      if (!matched) {
        throw new ConfigurationError(
          `Production manifest source mismatch: declared route was not discovered: ${this.describeManifestRoute(route)}`,
          { route }
        );
      }
    }
  }

  private filterComponentsByManifestPlan(
    components: AnalyzedComponent[],
    config: ApplicationDiscoveryConfig,
    result: ApplicationDiscoveryResult
  ): ComponentMetadata[] {
    const plan = this.getManifestRegistrationPlan(config);
    if (!plan) {
      return components.map(({ component }) => component);
    }

    const tokenSelectors = this.getManifestTokenSelectors(plan);
    const routeSelectors = plan.routes || [];

    return components.flatMap(({ component, module }) => {
      const matchedToken = tokenSelectors.some((selector) =>
        this.matchesManifestToken(component, module, selector, config)
      );
      const matchedControllerRoute =
        component.type === 'controller' &&
        routeSelectors.some((selector) =>
          this.matchesManifestController(component, module, selector, config)
        );

      if (!matchedToken && !matchedControllerRoute) {
        result.skipped.push({
          name: component.name,
          reason: 'not-in-production-manifest'
        });
        return [];
      }

      if (component.type !== 'controller') {
        return [component];
      }

      return [
        {
          ...component,
          routes: this.filterRoutesByManifestPlan(
            component,
            module,
            component.routes || [],
            config
          )
        }
      ];
    });
  }

  private async registerRoutes(
    component: ComponentMetadata,
    fastify: FastifyInstance,
    container: AwilixContainer,
    config: ApplicationDiscoveryConfig
  ): Promise<number> {
    const routes = component.routes || [];
    const prefix = config.routing?.prefix;
    const register = async (app: FastifyInstance) => {
      for (const route of routes) {
        app.route({
          method: route.method as any,
          url: route.path,
          ...route.options,
          handler: async (request, reply) => {
            const scope = (request as any).diScope || container;
            const controller = scope.resolve(camelCaseName(component.name));
            const handler = controller?.[route.handlerName];
            if (typeof handler !== 'function') {
              throw new RegistrationError(
                `Route handler ${component.name}.${route.handlerName} is not a function`,
                { component, route }
              );
            }
            return handler.call(controller, request, reply);
          }
        });
      }
    };

    if (prefix) {
      await fastify.register(register, { prefix });
    } else {
      await register(fastify);
    }

    return routes.length;
  }

  private filterRoutesByManifestPlan(
    component: ComponentMetadata,
    module: LoadedModule,
    routes: NonNullable<ComponentMetadata['routes']>,
    config: ApplicationDiscoveryConfig
  ): NonNullable<ComponentMetadata['routes']> {
    const manifestRoutes = this.getManifestRegistrationPlan(config)?.routes;
    if (!manifestRoutes) {
      return routes;
    }

    return routes.filter((route) =>
      manifestRoutes.some((selector) =>
        this.matchesManifestRoute(component, module, route, selector, config)
      )
    );
  }

  private matchesManifestRoute(
    component: ComponentMetadata,
    module: LoadedModule,
    route: NonNullable<ComponentMetadata['routes']>[number],
    selector: ManifestRouteSelector,
    config: ApplicationDiscoveryConfig
  ): boolean {
    if (!this.matchesManifestSourceFile(module, selector.sourceFile, config)) {
      return false;
    }
    if (
      selector.controllerName &&
      !this.getComponentNames(component, module).has(selector.controllerName)
    ) {
      return false;
    }
    if (selector.handlerName && selector.handlerName !== route.handlerName) {
      return false;
    }
    if (
      selector.method &&
      selector.method.toUpperCase() !== route.method.toUpperCase()
    ) {
      return false;
    }
    if (selector.path && selector.path !== route.path) {
      return false;
    }
    return true;
  }

  private matchesManifestController(
    component: ComponentMetadata,
    module: LoadedModule,
    selector: ManifestRouteSelector,
    config: ApplicationDiscoveryConfig
  ): boolean {
    if (!this.matchesManifestSourceFile(module, selector.sourceFile, config)) {
      return false;
    }
    if (!selector.controllerName) {
      return true;
    }
    return this.getComponentNames(component, module).has(
      selector.controllerName
    );
  }

  private matchesManifestToken(
    component: ComponentMetadata,
    module: LoadedModule,
    selector: { token: string; className?: string; sourceFile?: string },
    config: ApplicationDiscoveryConfig
  ): boolean {
    if (!this.matchesManifestSourceFile(module, selector.sourceFile, config)) {
      return false;
    }
    if (selector.token === camelCaseName(component.name)) {
      return true;
    }
    return selector.className
      ? this.getComponentNames(component, module).has(selector.className)
      : false;
  }

  private matchesManifestSourceFile(
    module: LoadedModule,
    sourceFile: string | undefined,
    config: ApplicationDiscoveryConfig
  ): boolean {
    if (!sourceFile) {
      return true;
    }

    const rootDir = config.rootDir || process.cwd();
    const expected = isAbsolute(sourceFile)
      ? resolve(sourceFile)
      : resolve(rootDir, sourceFile);
    return resolve(module.path) === expected;
  }

  private getComponentNames(
    component: ComponentMetadata,
    module: LoadedModule
  ): Set<string> {
    return new Set(
      [component.name, module.name, module.value?.name].filter(
        (name): name is string => typeof name === 'string' && name.length > 0
      )
    );
  }

  private getManifestRegistrationPlan(
    config: ApplicationDiscoveryConfig
  ): ManifestRegistrationPlan | undefined {
    return config.manifestRegistration as ManifestRegistrationPlan | undefined;
  }

  private getManifestTokenSelectors(
    plan: ManifestRegistrationPlan
  ): Array<{ token: string; className?: string; sourceFile?: string }> {
    return (plan.tokens || []).map((token) =>
      typeof token === 'string' ? { token } : token
    );
  }

  private describeManifestRoute(selector: ManifestRouteSelector): string {
    const method = selector.method?.toUpperCase() || '*';
    const path = selector.path || '*';
    const controller = selector.controllerName || '*';
    const handler = selector.handlerName || '*';
    return `${method} ${path} (${controller}.${handler})`;
  }
}
