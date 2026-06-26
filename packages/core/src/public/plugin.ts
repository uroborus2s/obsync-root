// Public plugin-author API for @stratix/core/plugin.
// Keep root exports focused on application developers; plugin and DI helpers
// live behind this explicit subpath.

export { default as fp } from 'fastify-plugin';

export { Lifetime, RESOLVER, asFunction, asValue } from 'awilix';
export type { AwilixContainer, InjectorFunction } from 'awilix';

export type {
  FastifyInstance,
  FastifyPluginAsync,
  FastifyPluginCallback,
  FastifyPluginOptions,
  FastifyReply,
  FastifyRequest
} from 'fastify';

export type { Logger } from '../logger/index.js';
export type { LoggerOptions } from 'pino';

export { withRegisterAutoDI } from '../plugin/auto-di-plugin.js';
export {
  getPluginName,
  processPluginParameters,
  resolveBasePath,
  type AutoDIConfig
} from '../plugin/utils.js';
export type {
  FastifyCompatiblePlugin,
  PluginConfig,
  PluginMetadata,
  PluginRegistrationOptions,
  StratixPlugin,
  StratixPluginOptions,
  UniversalPlugin
} from '../types/plugin.js';
