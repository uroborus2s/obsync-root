import { z } from 'zod';

// Logger Configuration Schema
export const LoggerConfigSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).optional(),
  pretty: z.boolean().optional(),
  file: z.object({
    enabled: z.boolean().optional(),
    path: z.string().optional(),
    maxSize: z.string().optional(),
    maxFiles: z.number().optional(),
  }).optional(),
  transport: z.any().optional(),
  enableRequestLogging: z.boolean().optional(),
  enablePerformanceLogging: z.boolean().optional(),
  enableErrorTracking: z.boolean().optional(),
  enableAuditLogging: z.boolean().optional(),
  sensitiveFields: z.array(z.string()).optional(),
  performanceThreshold: z.number().optional(),
  sampleRate: z.number().optional(),
}).optional();

// Cache Configuration Schema
export const CacheConfigSchema = z.object({
  type: z.enum(['memory', 'redis']).optional(),
  options: z.object({
    host: z.string().optional(),
    port: z.number().optional(),
    password: z.string().optional(),
    db: z.number().optional(),
    ttl: z.number().optional(),
  }).optional(),
}).optional();

// Application Auto DI Configuration Schema
export const ApplicationAutoDIConfigSchema = z.object({
  enabled: z.boolean().optional(),
  appRootPath: z.string().optional(),
  patterns: z.array(z.string()).optional(),
  directories: z.array(z.string()).optional(),
  routing: z.object({
    enabled: z.boolean().optional(),
    prefix: z.string().optional(),
    validation: z.boolean().optional(),
  }).optional(),
  lifecycle: z.object({
    enabled: z.boolean().optional(),
    errorHandling: z.enum(['throw', 'warn', 'ignore']).optional(),
  }).optional(),
  debug: z.boolean().optional(),
  options: z.record(z.string(), z.unknown()).optional(),
}).optional();

// Auto Load Configuration Schema (Simplified)
export const AutoLoadConfigSchema = z.object({
  services: z.any().optional(),
  repositories: z.any().optional(),
  controllers: z.any().optional(),
  routes: z.any().optional(),
  middlewares: z.any().optional(),
  custom: z.record(z.string(), z.any()).optional(),
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
  order: z.number().optional(),
});

// Server Configuration Schema
export const ServerConfigSchema = z.object({
  port: z.number().optional(),
  host: z.string().optional(),
  prefix: z.string().optional(),
}).catchall(z.any()); // Allow other Fastify options

// Main Stratix Config Schema
export const StratixConfigSchema = z.object({
  server: ServerConfigSchema,
  plugins: z.array(PluginConfigSchema).default([]),
  autoLoad: AutoLoadConfigSchema.optional(), // Make optional as it might be populated with defaults later
  applicationAutoDI: ApplicationAutoDIConfigSchema,
  cache: CacheConfigSchema,
  logger: LoggerConfigSchema,
  hooks: z.object({
    beforeStart: z.function().optional(),
    afterStart: z.function().optional(),
    afterFastifyCreated: z.function().optional(),
    beforeClose: z.function().optional(),
    afterClose: z.function().optional(),
  }).optional(),
});

export type StratixConfigInput = z.input<typeof StratixConfigSchema>;
