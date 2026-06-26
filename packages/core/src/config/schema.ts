import { z } from 'zod';

const UnknownRecordSchema = z.record(z.string(), z.unknown());
const FunctionSchema = z.custom<(...args: unknown[]) => unknown>(
  (value) => typeof value === 'function',
  { message: 'Expected function' }
);

const AutoLoadRegistrationOptionsSchema = z
  .object({
    lifetime: z.enum(['SINGLETON', 'SCOPED', 'TRANSIENT']).optional(),
    injectionMode: z.enum(['PROXY', 'CLASSIC']).optional(),
    asyncInit: z.union([z.boolean(), z.string()]).optional(),
    asyncDispose: z.union([z.boolean(), z.string()]).optional(),
    eagerInject: z.boolean().optional(),
    enabled: z.boolean().optional()
  })
  .strict();

const AutoLoadOptionsSchema = z
  .object({
    pattern: z.string(),
    registrationOptions: AutoLoadRegistrationOptionsSchema.optional(),
    formatName: z.union([z.string(), FunctionSchema]).optional(),
    filter: FunctionSchema.optional(),
    cwd: z.string().optional(),
    recursive: z.boolean().optional(),
    exclude: z.array(z.string()).optional(),
    injector: FunctionSchema.optional()
  })
  .strict();

function optionalFunctionProperty(
  value: Record<string, unknown>,
  property: string
): boolean {
  return value[property] === undefined || typeof value[property] === 'function';
}

const MetricsProviderSchema = z.custom<Record<string, unknown>>(
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    optionalFunctionProperty(
      value as Record<string, unknown>,
      'recordRequest'
    ) &&
    optionalFunctionProperty(value as Record<string, unknown>, 'snapshot'),
  { message: 'Expected metrics provider' }
);

const TracingProviderSchema = z.custom<Record<string, unknown>>(
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    optionalFunctionProperty(value as Record<string, unknown>, 'recordTrace'),
  { message: 'Expected tracing provider' }
);

const RateLimitProviderSchema = z.custom<Record<string, unknown>>(
  (value) =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>).consume === 'function',
  { message: 'Expected rate limit provider' }
);

// Logger Configuration Schema
export const LoggerConfigSchema = z
  .object({
    level: z
      .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
      .optional(),
    pretty: z.boolean().optional(),
    file: z
      .object({
        enabled: z.boolean().optional(),
        path: z.string().optional(),
        maxSize: z.string().optional(),
        maxFiles: z.number().optional()
      })
      .strict()
      .optional(),
    transport: z.unknown().optional(),
    enableRequestLogging: z.boolean().optional(),
    enablePerformanceLogging: z.boolean().optional(),
    enableErrorTracking: z.boolean().optional(),
    enableAuditLogging: z.boolean().optional(),
    sensitiveFields: z.array(z.string()).optional(),
    performanceThreshold: z.number().optional(),
    sampleRate: z.number().optional()
  })
  .strict()
  .optional();

// Cache Configuration Schema
export const CacheConfigSchema = z
  .object({
    type: z.enum(['memory', 'redis']).optional(),
    options: z
      .object({
        host: z.string().optional(),
        port: z.number().optional(),
        password: z.string().optional(),
        db: z.number().optional(),
        ttl: z.number().optional()
      })
      .strict()
      .optional()
  })
  .strict()
  .optional();

// Application discovery configuration schema
export const ApplicationDiscoveryConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    rootDir: z.string().optional(),
    files: z.array(z.string()).optional(),
    patterns: z.array(z.string()).optional(),
    directories: z.array(z.string()).optional(),
    exclude: z.array(z.string()).optional(),
    productionManifest: z
      .object({
        enabled: z.boolean().optional(),
        path: z.string().optional(),
        skipRuntimeDiscovery: z.boolean().optional(),
        registerFromManifest: z.boolean().optional(),
        compiledOnly: z.boolean().optional(),
        strict: z.boolean().optional()
      })
      .strict()
      .optional(),
    routing: z
      .object({
        enabled: z.boolean().optional(),
        prefix: z.string().optional(),
        validation: z.boolean().optional()
      })
      .strict()
      .optional(),
    lifecycle: z
      .object({
        enabled: z.boolean().optional(),
        errorHandling: z.enum(['throw', 'warn', 'ignore']).optional()
      })
      .strict()
      .optional(),
    debug: z.boolean().optional(),
    options: z.record(z.string(), z.unknown()).optional()
  })
  .strict()
  .optional();

// Auto Load Configuration Schema (Simplified)
export const AutoLoadConfigSchema = z
  .object({
    services: AutoLoadOptionsSchema.optional(),
    repositories: AutoLoadOptionsSchema.optional(),
    controllers: AutoLoadOptionsSchema.optional(),
    routes: AutoLoadOptionsSchema.optional(),
    middlewares: AutoLoadOptionsSchema.optional(),
    custom: z.record(z.string(), AutoLoadOptionsSchema).optional()
  })
  .strict();

// Plugin Configuration Schema
export const PluginConfigSchema = z
  .object({
    name: z.string(),
    plugin: FunctionSchema,
    options: UnknownRecordSchema.optional(),
    enabled: z.boolean().optional(),
    scope: z.enum(['global', 'scoped']).optional(),
    encapsulate: z.boolean().optional(),
    prefix: z.string().optional(),
    dependencies: z.array(z.string()).optional(),
    order: z.number().optional()
  })
  .strict();

// Server Configuration Schema
export const ServerConfigSchema = z
  .object({
    port: z.number().optional(),
    host: z.string().optional(),
    prefix: z.string().optional()
  })
  .catchall(z.unknown()); // Allow other Fastify options

export const ObservabilityConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    requestIdHeader: z.string().optional(),
    traceIdHeader: z.string().optional(),
    health: z
      .object({
        enabled: z.boolean().optional(),
        basePath: z.string().optional(),
        contributors: z
          .array(
            z
              .object({
                name: z.string(),
                check: z.function()
              })
              .strict()
          )
          .optional()
      })
      .strict()
      .optional(),
    metrics: z
      .object({
        enabled: z.boolean().optional(),
        path: z.string().optional(),
        provider: MetricsProviderSchema.optional()
      })
      .strict()
      .optional(),
    traces: z
      .object({
        enabled: z.boolean().optional(),
        maxEntries: z.number().optional(),
        provider: TracingProviderSchema.optional()
      })
      .strict()
      .optional()
  })
  .strict()
  .optional();

export const SecurityConfigSchema = z
  .object({
    enabled: z.boolean().optional(),
    bodyLimit: z.number().optional(),
    cors: z
      .object({
        enabled: z.boolean().optional(),
        origins: z.union([z.string(), z.array(z.string())]).optional(),
        credentials: z.boolean().optional(),
        methods: z.array(z.string()).optional()
      })
      .strict()
      .optional(),
    headers: z
      .union([
        z.boolean(),
        z
          .object({
            enabled: z.boolean().optional(),
            contentSecurityPolicy: z
              .union([z.string(), z.boolean()])
              .optional(),
            frameOptions: z.string().optional(),
            referrerPolicy: z.string().optional()
          })
          .strict()
      ])
      .optional(),
    rateLimit: z
      .object({
        enabled: z.boolean().optional(),
        max: z.number().optional(),
        windowMs: z.number().optional(),
        trustProxy: z.boolean().optional(),
        provider: RateLimitProviderSchema.optional()
      })
      .strict()
      .optional()
  })
  .strict()
  .optional();

// Main Stratix Config Schema
export const StratixConfigSchema = z
  .object({
    server: ServerConfigSchema,
    plugins: z.array(PluginConfigSchema).default([]),
    autoLoad: AutoLoadConfigSchema.optional(), // Make optional as it might be populated with defaults later
    discovery: ApplicationDiscoveryConfigSchema,
    cache: CacheConfigSchema,
    logger: LoggerConfigSchema,
    observability: ObservabilityConfigSchema,
    security: SecurityConfigSchema,
    hooks: z
      .object({
        beforeStart: z.function().optional(),
        afterStart: z.function().optional(),
        afterFastifyCreated: z.function().optional(),
        beforeClose: z.function().optional(),
        afterClose: z.function().optional()
      })
      .strict()
      .optional()
  })
  .strict();

export type StratixConfigInput = z.input<typeof StratixConfigSchema>;
