import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

type ShutdownHandler = () => Promise<void>;
type ProcessSignal = 'SIGTERM' | 'SIGINT';

export interface ProcessGracefulShutdownOptions {
  logger?: Logger;
  timeout: number;
  stop: () => Promise<void>;
  processOn?: (signal: ProcessSignal, handler: () => void) => void;
  exit?: (code: number) => void;
}

export function setupProcessGracefulShutdown({
  exit = (code) => process.exit(code),
  logger,
  processOn = (signal, handler) => process.on(signal, handler),
  stop,
  timeout
}: ProcessGracefulShutdownOptions): void {
  const gracefulShutdown = async (signal: string) => {
    logger?.info(`Received ${signal}, starting graceful shutdown...`);

    try {
      await Promise.race([
        stop(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Shutdown timeout')), timeout)
        )
      ]);

      exit(0);
    } catch (error) {
      logger?.error({ err: error }, 'Error during graceful shutdown');
      exit(1);
    }
  };

  processOn('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });
  processOn('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });
}

export async function executeShutdownHandlers(
  handlers: ShutdownHandler[],
  logger?: Logger
): Promise<void> {
  if (handlers.length === 0) {
    return;
  }

  logger?.debug(`Executing ${handlers.length} shutdown handlers...`);

  const results = await Promise.allSettled(
    handlers.map((handler) => handler())
  );

  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger?.error(
        { err: result.reason, handlerIndex: index + 1 },
        `Shutdown handler ${index + 1} failed`
      );
    }
  });
}

export interface RuntimeCleanupOptions {
  fastifyInstance: FastifyInstance | null;
  rootContainer: AwilixContainer | undefined;
  logger?: Logger;
  clearRootContainer: () => void;
}

export async function cleanupRuntimeResources({
  clearRootContainer,
  fastifyInstance,
  logger,
  rootContainer
}: RuntimeCleanupOptions): Promise<void> {
  try {
    if (fastifyInstance) {
      logger?.debug('Closing Fastify instance...');
      await fastifyInstance.close();
      logger?.debug('Fastify instance closed');
    }

    if (rootContainer) {
      logger?.debug('Disposing root container...');
      await rootContainer.dispose();
      clearRootContainer();
      logger?.debug('Root container disposed');
    }

    logger?.debug('Disposing application lifecycle manager...');
    logger?.debug('Application lifecycle manager disposed');
    logger?.debug('✅ Cleanup completed successfully');
  } catch (error) {
    logger?.error({ err: error }, '❌ Error during cleanup');
    throw error;
  }
}
