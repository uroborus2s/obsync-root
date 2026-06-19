import { z } from 'zod';

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
      .optional(),
    transport: z.any().optional(),
    enableRequestLogging: z.boolean().optional(),
    enablePerformanceLogging: z.boolean().optional(),
    enableErrorTracking: z.boolean().optional(),
    enableAuditLogging: z.boolean().optional(),
    sensitiveFields: z.array(z.string()).optional(),
    performanceThreshold: z.number().optional(),
    sampleRate: z.number().optional()
  })
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
      .optional()
  })
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
        strict: z.boolean().optional()
      })
      .optional(),
    routing: z
      .object({
        enabled: z.boolean().optional(),
        prefix: z.string().optional(),
        validation: z.boolean().optional()
      })
      .optional(),
    lifecycle: z
      .object({
        enabled: z.boolean().optional(),
        errorHandling: z.enum(['throw', 'warn', 'ignore']).optional()
      })
      .optional(),
    debug: z.boolean().optional(),
    options: z.record(z.string(), z.unknown()).optional()
  })
  .optional();

// Auto Load Configuration Schema (Simplified)
export const AutoLoadConfigSchema = z.object({
  services: z.any().optional(),
  repositories: z.any().optional(),
  controllers: z.any().optional(),
  routes: z.any().optional(),
  middlewares: z.any().optional(),
  custom: z.record(z.string(), z.any()).optional()
});

// Plugin Configuration Schema
export const PluginConfigSchema = z.object({
  name: z.string(),
  plugin: z.any(), // Function or object, hard to validate strictly
  options: z.any().optional(),
  enabled: z.boolean().optional(),
  scope: z.enum(['global', 'scoped']).optional(),
  encapsulate: z.boolean().optional(),
  prefix: z.string().optional(),
  dependencies: z.array(z.string()).optional(),
  order: z.number().optional()
});

// Server Configuration Schema
export const ServerConfigSchema = z
  .object({
    port: z.number().optional(),
    host: z.string().optional(),
    prefix: z.string().optional()
  })
  .catchall(z.any()); // Allow other Fastify options

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
            z.object({
              name: z.string(),
              check: z.function()
            })
          )
          .optional()
      })
      .optional(),
    metrics: z
      .object({
        enabled: z.boolean().optional(),
        path: z.string().optional(),
        provider: z.any().optional()
      })
      .optional(),
    traces: z
      .object({
        enabled: z.boolean().optional(),
        maxEntries: z.number().optional(),
        provider: z.any().optional()
      })
      .optional()
  })
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
      .optional(),
    headers: z
      .union([
        z.boolean(),
        z.object({
          enabled: z.boolean().optional(),
          contentSecurityPolicy: z.union([z.string(), z.boolean()]).optional(),
          frameOptions: z.string().optional(),
          referrerPolicy: z.string().optional()
        })
      ])
      .optional(),
    rateLimit: z
      .object({
        enabled: z.boolean().optional(),
        max: z.number().optional(),
        windowMs: z.number().optional(),
        trustProxy: z.boolean().optional(),
        provider: z.any().optional()
      })
      .optional()
  })
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
      .optional()
  })
  .strict();

export type StratixConfigInput = z.input<typeof StratixConfigSchema>;
