import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  InjectionMode,
  Lifetime,
  type AwilixContainer,
  type Resolver
} from 'awilix';
import type { FastifyInstance, RouteOptions } from 'fastify';
import {
  fp,
  registerControllerRoutes,
  Stratix,
  type ApplicationDiscoveryConfig,
  type PluginConfig,
  type StratixApplication,
  type StratixConfig,
  type StratixRunOptions
} from '@stratix/core';
import { readFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

export type TestToken<T = unknown> = string | (new (...args: any[]) => T);

export interface ValueProvider<T = unknown> {
  provide: TestToken<T>;
  useValue: T;
}

export interface ClassProvider<T = unknown> {
  provide: TestToken<T>;
  useClass: new (...args: any[]) => T;
}

export interface FactoryProvider<T = unknown> {
  provide: TestToken<T>;
  useFactory: (...args: any[]) => T | Promise<T>;
}

export type TestProvider<T = unknown> =
  | (new (...args: any[]) => T)
  | ValueProvider<T>
  | ClassProvider<T>
  | FactoryProvider<T>;

export interface TokenOverride<T = unknown> {
  token: TestToken<T>;
  useValue: T;
}

export interface CreateTestContainerOptions {
  providers?: TestProvider[];
  overrides?: TokenOverride[];
}

export interface MockPluginOptions {
  options?: Record<string, unknown>;
  decorators?: Record<string, unknown>;
  tokens?: Record<string, unknown>;
  routes?: Array<Omit<RouteOptions, 'handler'> & { handler: RouteOptions['handler'] }>;
  setup?: (
    fastify: FastifyInstance,
    options: Record<string, unknown>
  ) => void | Promise<void>;
  prefix?: string;
}

export interface CreateTestAppOptions {
  config?: Partial<StratixConfig>;
  providers?: TestProvider[];
  controllers?: Array<new (...args: any[]) => unknown>;
  overrides?: TokenOverride[];
  plugins?: PluginConfig[];
  mockPlugins?: PluginConfig[];
  disablePlugins?: string[];
  discovery?: ApplicationDiscoveryConfig | false;
  routing?: {
    enabled?: boolean;
    prefix?: string;
    validation?: boolean;
  };
  server?: StratixRunOptions['server'];
  logger?: StratixRunOptions['logger'];
}

export interface DiscoveryFixtureOptions extends ApplicationDiscoveryConfig {
  rootDir: string;
}

export interface ModuleFixtureOptions {
  rootDir: string;
  module: string;
  routing?: ApplicationDiscoveryConfig['routing'];
}

export interface ModuleFixtureManifest {
  name: string;
  title?: string;
  root: string;
  owner?: string;
  tags: string[];
  layers: Record<string, string>;
  contracts: {
    openapiTag?: string;
  };
  boundaries: {
    owns: string[];
    allows: {
      imports: string[];
    };
  };
  sourceFile: string;
}

export interface ModuleFixture {
  manifest: ModuleFixtureManifest;
  moduleRoot: string;
  discovery: ApplicationDiscoveryConfig & { rootDir: string };
  owns(token: string): boolean;
  allowsImport(moduleName: string): boolean;
}

export interface RepositoryTransactionFixture<TTransaction> {
  begin(): TTransaction | Promise<TTransaction>;
  rollback(transaction: TTransaction): void | Promise<void>;
  commit?(transaction: TTransaction): void | Promise<void>;
}

export interface CreateRepositoryFixtureOptions<TRepository, TTransaction> {
  repository: TRepository | (() => TRepository | Promise<TRepository>);
  transaction?: RepositoryTransactionFixture<TTransaction>;
  bindTransaction?: (
    repository: TRepository,
    transaction: TTransaction
  ) => TRepository | Promise<TRepository>;
}

export interface RepositoryFixture<TRepository, TTransaction> {
  repository: TRepository;
  transaction: TTransaction | undefined;
  teardown(): Promise<void>;
  runInTransaction<TResult>(
    fn: (
      repository: TRepository,
      transaction: TTransaction | undefined
    ) => TResult | Promise<TResult>
  ): Promise<TResult>;
}

function lowerCamel(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

export function resolveTestToken(token: TestToken): string {
  if (typeof token === 'string') {
    return token;
  }

  if (typeof token === 'function' && token.name) {
    return lowerCamel(token.name);
  }

  throw new Error(`Invalid test token: ${String(token)}`);
}

function registerResolver(
  container: AwilixContainer,
  token: TestToken,
  resolver: Resolver<unknown>
): void {
  container.register({
    [resolveTestToken(token)]: resolver
  });
}

function registerProvider(
  container: AwilixContainer,
  provider: TestProvider
): void {
  if (typeof provider === 'function') {
    registerResolver(
      container,
      provider,
      asClass(provider, {
        lifetime: Lifetime.SINGLETON,
        injectionMode: InjectionMode.CLASSIC
      })
    );
    return;
  }

  if ('useValue' in provider) {
    registerResolver(container, provider.provide, asValue(provider.useValue));
    return;
  }

  if ('useClass' in provider) {
    registerResolver(
      container,
      provider.provide,
      asClass(provider.useClass, {
        lifetime: Lifetime.SINGLETON,
        injectionMode: InjectionMode.CLASSIC
      })
    );
    return;
  }

  if ('useFactory' in provider) {
    registerResolver(container, provider.provide, asFunction(provider.useFactory));
  }
}

function applyOverrides(
  container: AwilixContainer,
  overrides: TokenOverride[] = []
): void {
  for (const override of overrides) {
    registerResolver(container, override.token, asValue(override.useValue));
  }
}

export function overrideToken<T>(
  token: TestToken<T>,
  useValue: T
): TokenOverride<T> {
  return {
    token,
    useValue
  };
}

export function createTestContainer(
  options: CreateTestContainerOptions = {}
): AwilixContainer {
  const container = createContainer({
    injectionMode: InjectionMode.CLASSIC,
    strict: false
  });

  for (const provider of options.providers || []) {
    registerProvider(container, provider);
  }

  applyOverrides(container, options.overrides);

  return container;
}

function composePlugins(options: CreateTestAppOptions): PluginConfig[] {
  const basePlugins = [
    ...(options.config?.plugins || []),
    ...(options.plugins || [])
  ];
  const disabled = new Set(options.disablePlugins || []);
  const mocks = new Map((options.mockPlugins || []).map((plugin) => [plugin.name, plugin]));
  const result: PluginConfig[] = [];
  const seen = new Set<string>();

  for (const plugin of basePlugins) {
    if (disabled.has(plugin.name) || plugin.enabled === false) {
      continue;
    }

    const replacement = mocks.get(plugin.name) || plugin;
    result.push(replacement);
    seen.add(plugin.name);
  }

  for (const plugin of options.mockPlugins || []) {
    if (!seen.has(plugin.name) && !disabled.has(plugin.name)) {
      result.push(plugin);
    }
  }

  return result;
}

function discoveryConfigFor(
  options: CreateTestAppOptions
): ApplicationDiscoveryConfig {
  if (options.discovery === false) {
    return { enabled: false };
  }

  return (
    options.discovery ||
    options.config?.discovery || {
      enabled: false
    }
  );
}

function mergeConfig(options: CreateTestAppOptions): StratixConfig {
  return {
    server: {
      ...(options.config?.server || {})
    },
    plugins: composePlugins(options),
    autoLoad: {
      ...(options.config?.autoLoad || {})
    },
    discovery: discoveryConfigFor(options),
    cache: options.config?.cache,
    logger: options.config?.logger,
    hooks: {
      ...(options.config?.hooks || {})
    }
  };
}

function registerManualTestingObjects(
  container: AwilixContainer,
  options: CreateTestAppOptions
): void {
  for (const provider of options.providers || []) {
    registerProvider(container, provider);
  }

  for (const controller of options.controllers || []) {
    registerProvider(container, controller);
  }

  applyOverrides(container, options.overrides);
}

export async function createTestApp(
  options: CreateTestAppOptions = {}
): Promise<StratixApplication> {
  const config = mergeConfig(options);
  const userAfterFastifyCreated = config.hooks?.afterFastifyCreated;

  config.hooks = {
    ...config.hooks,
    afterFastifyCreated: async (fastify) => {
      await userAfterFastifyCreated?.(fastify);

      const container = (fastify as any).diContainer as AwilixContainer;
      registerManualTestingObjects(container, options);

      if (options.controllers?.length) {
        await registerControllerRoutes(fastify, container, {
          enabled: options.routing?.enabled,
          prefix: options.routing?.prefix,
          validation: options.routing?.validation
        });
      }
    }
  };

  return Stratix.run({
    type: 'cli',
    gracefulShutdown: false,
    logger: options.logger || { level: 'fatal' },
    server: {
      listen: false,
      ...(options.server || {})
    },
    config
  });
}

export function mockPlugin(
  name: string,
  fixture: MockPluginOptions = {}
): PluginConfig {
  return {
    name,
    prefix: fixture.prefix,
    options: fixture.options,
    plugin: fp(async (
      fastify: FastifyInstance,
      pluginOptions: Record<string, unknown>
    ) => {
      for (const [decoratorName, value] of Object.entries(
        fixture.decorators || {}
      )) {
        if (fastify.hasDecorator(decoratorName)) {
          (fastify as any)[decoratorName] = value;
        } else {
          fastify.decorate(decoratorName, value);
        }
      }

      const container = (fastify as any).diContainer as
        | AwilixContainer
        | undefined;
      if (container) {
        for (const [token, value] of Object.entries(fixture.tokens || {})) {
          registerResolver(container, token, asValue(value));
        }
      }

      for (const route of fixture.routes || []) {
        fastify.route(route);
      }

      await fixture.setup?.(
        fastify,
        (pluginOptions || {}) as Record<string, unknown>
      );
    })
  };
}

export function disablePlugin(name: string): string {
  return name;
}

export function createDiscoveryFixture(
  options: DiscoveryFixtureOptions
): ApplicationDiscoveryConfig {
  return {
    ...options,
    enabled: options.enabled ?? true
  };
}

function stripComment(line: string): string {
  const hashIndex = line.indexOf('#');
  return hashIndex === -1 ? line : line.slice(0, hashIndex);
}

function indentation(line: string): number {
  return line.match(/^ */)?.[0].length ?? 0;
}

function findSection(lines: string[], key: string, indent: number): string[] {
  const headerPattern = new RegExp(`^ {${indent}}${key}:\\s*$`);
  const startIndex = lines.findIndex((line) =>
    headerPattern.test(stripComment(line))
  );

  if (startIndex === -1) {
    return [];
  }

  const section: string[] = [];
  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = stripComment(line).trim();

    if (!trimmed) {
      continue;
    }

    if (indentation(line) <= indent) {
      break;
    }

    section.push(line);
  }

  return section;
}

function readScalar(lines: string[], key: string): string | undefined {
  const pattern = new RegExp(`^${key}:\\s*(.+?)\\s*$`);
  const line = lines.find((candidate) => pattern.test(stripComment(candidate)));
  const match = line ? stripComment(line).match(pattern) : null;
  return match?.[1]?.trim();
}

function readList(lines: string[], sectionKey: string, indent: number): string[] {
  return findSection(lines, sectionKey, indent)
    .map(
      (line) =>
        stripComment(line).match(new RegExp(`^ {${indent + 2}}-\\s*(.+?)\\s*$`))?.[1]
    )
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim());
}

function readMap(lines: string[], sectionKey: string): Record<string, string> {
  const values: Record<string, string> = {};

  for (const line of findSection(lines, sectionKey, 0)) {
    const match = stripComment(line).match(/^  ([A-Za-z0-9_-]+):\s*(.+?)\s*$/);
    if (match) {
      values[match[1]] = match[2].trim();
    }
  }

  return values;
}

async function readModuleManifest(
  sourceFile: string,
  rootDir: string
): Promise<ModuleFixtureManifest> {
  const source = await readFile(sourceFile, 'utf8');
  const lines = source.split(/\r?\n/);

  return {
    name: readScalar(lines, 'name') || '',
    title: readScalar(lines, 'title'),
    root: readScalar(lines, 'root') || '',
    owner: readScalar(lines, 'owner'),
    tags: readList(lines, 'tags', 0),
    layers: readMap(lines, 'layers'),
    contracts: {
      openapiTag: readMap(lines, 'contracts').openapiTag
    },
    boundaries: {
      owns: readList(lines, 'owns', 2),
      allows: {
        imports: readList(lines, 'imports', 4)
      }
    },
    sourceFile: relative(resolve(rootDir), sourceFile)
  };
}

export async function createModuleFixture(
  options: ModuleFixtureOptions
): Promise<ModuleFixture> {
  const rootDir = resolve(options.rootDir);
  const moduleRoot = isAbsolute(options.module)
    ? options.module
    : join(rootDir, 'src', 'modules', options.module);
  const sourceFile = join(moduleRoot, 'module.yaml');
  const manifest = await readModuleManifest(sourceFile, rootDir);
  const layerPatterns = Object.values(manifest.layers);

  const discovery: ApplicationDiscoveryConfig & { rootDir: string } = {
    enabled: true,
    rootDir: moduleRoot,
    patterns: layerPatterns.length
      ? layerPatterns
      : [
          'controllers/**/*.{ts,js,mjs,cjs}',
          'services/**/*.{ts,js,mjs,cjs}',
          'repositories/**/*.{ts,js,mjs,cjs}',
          'components/**/*.{ts,js,mjs,cjs}'
        ],
    routing: options.routing
  };

  return {
    manifest,
    moduleRoot,
    discovery,
    owns: (token) => manifest.boundaries.owns.includes(token),
    allowsImport: (moduleName) =>
      manifest.boundaries.allows.imports.includes(moduleName)
  };
}

export async function createRepositoryFixture<
  TRepository,
  TTransaction = unknown
>(
  options: CreateRepositoryFixtureOptions<TRepository, TTransaction>
): Promise<RepositoryFixture<TRepository, TTransaction>> {
  const baseRepository =
    typeof options.repository === 'function'
      ? await (options.repository as () => TRepository | Promise<TRepository>)()
      : options.repository;
  const transaction = options.transaction
    ? await options.transaction.begin()
    : undefined;
  const repository =
    options.bindTransaction && transaction !== undefined
      ? await options.bindTransaction(baseRepository, transaction)
      : baseRepository;
  let closed = false;

  const teardown = async () => {
    if (closed) {
      return;
    }

    closed = true;
    if (options.transaction && transaction !== undefined) {
      await options.transaction.rollback(transaction);
    }
  };

  return {
    repository,
    transaction,
    teardown,
    runInTransaction: async (fn) => {
      try {
        return await fn(repository, transaction);
      } finally {
        await teardown();
      }
    }
  };
}
