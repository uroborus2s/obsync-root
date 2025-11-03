/**
 * @stratix/queue - BullMQ Queue Plugin for Stratix
 *
 * Provides a standardized interface for message queues using BullMQ.
 * Follows the Stratix framework's Adapter layer specification.
 */

import type { FastifyInstance } from '@stratix/core';
import { withRegisterAutoDI } from '@stratix/core';
import { deepMerge } from '@stratix/utils/data';
import type { QueuePluginOptions } from './types/index.js';

/**
 * Stratix Queue Plugin
 *
 * @param fastify - Fastify instance
 * @param options - Plugin options
 */
async function queue(
  fastify: FastifyInstance,
  options: QueuePluginOptions
): Promise<void> {
  fastify.log.info('🚀 @stratix/queue plugin initializing...');

  // The adapter is registered via withRegisterAutoDI
}

export default withRegisterAutoDI<QueuePluginOptions>(queue, {
  discovery: {
    patterns: ['adapters/*.{ts,js}']
  },
  lifecycle: {
    enabled: true,
    errorHandling: 'throw',
    debug: process.env.NODE_ENV === 'development'
  },
  debug: process.env.NODE_ENV === 'development',
  parameterProcessor: <T>(options: T): T =>
    deepMerge(
      {
        defaultQueueOptions: {},
        defaultWorkerOptions: {
          removeOnComplete: { age: 3600, count: 1000 }, // 一小时后或保留1000条
          removeOnFail: { age: 86400 }
        }
      },
      options || {}
    ) as T
});

// Export types and interfaces
export * from './adapters/queue.adapter.js';
export * from './types/index.js';
