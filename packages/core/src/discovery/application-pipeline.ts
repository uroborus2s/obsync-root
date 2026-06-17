import {
  asClass,
  type AwilixContainer,
  type InjectionModeType,
  type LifetimeType,
  type Resolver,
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
  'executors/**/*.{ts,js,mjs,cjs}'
];

const DEFAULT_EXCLUDE = [
  '**/*.d.ts',
  '**/*.test.ts',
  '**/*.spec.ts',
  '**/__tests__/**'
];

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

function ensureArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
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

    const components = modules.flatMap((module) => {
      const component = this.analyze(module, config);
      if (!component) {
        result.skipped.push({
          name: module.name,
          reason: 'not-a-stratix-component'
        });
        return [];
      }
      return [component];
    });
    result.analyzed = components.length;

    for (const component of components) {
      try {
        const registered = await this.registerComponent(
          component,
          config.container,
          config.fastify,
          config
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
        if (config.lifecycle?.errorHandling !== 'warn' && config.lifecycle?.errorHandling !== 'ignore') {
          throw wrapped;
        }
      }
    }

    return result;
  }

  async scan(config: ApplicationDiscoveryConfig): Promise<LoadedModule[]> {
    const rootDir = config.rootDir || process.cwd();
    const patterns = config.patterns?.length ? config.patterns : DEFAULT_PATTERNS;
    const exclude = config.exclude?.length ? config.exclude : DEFAULT_EXCLUDE;
    const directories = config.directories?.length
      ? config.directories.map((dir) => (isAbsolute(dir) ? dir : resolve(rootDir, dir)))
      : [rootDir];

    const files = new Set<string>();
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

    const modules: LoadedModule[] = [];
    for (const file of files) {
      try {
        const raw = await import(pathToFileURL(file).href);
        const entries = Object.entries(raw).filter(([name]) => name !== 'default');
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
    config: ApplicationDiscoveryConfig
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

    if (MetadataManager.isExecutor(value)) {
      return {
        name: module.name,
        type: 'executor',
        value,
        diOptions: {
          lifetime: 'SINGLETON',
          injectionMode: 'CLASSIC'
        }
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
    config: ApplicationDiscoveryConfig
  ): Promise<{ tokens: string[]; routes: number }> {
    const lifetime = toLifetime(component.diOptions?.lifetime);
    const injectionMode = toInjectionMode(component.diOptions?.injectionMode);
    const resolver = asClass(component.value, {
      lifetime,
      injectionMode
    }) as Resolver<unknown>;

    const tokens = [camelCaseName(component.name)];

    for (const token of tokens) {
      if (container.hasRegistration(token)) {
        throw new ConfigurationError(`Duplicate DI token: ${token}`, {
          token,
          component
        });
      }
      container.register(token, resolver);
    }

    let routes = 0;
    if (
      component.type === 'controller' &&
      config.routing?.enabled !== false &&
      component.routes?.length
    ) {
      routes = await this.registerRoutes(component, fastify, container, config);
    }

    if (component.type === 'executor' && container.hasRegistration('registerTaskExecutor')) {
      const registerTaskExecutor = container.resolve('registerTaskExecutor') as (
        name: string,
        executor: unknown
      ) => void;
      registerTaskExecutor(component.name, container.resolve(tokens[0]));
    }

    return { tokens, routes };
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
}
