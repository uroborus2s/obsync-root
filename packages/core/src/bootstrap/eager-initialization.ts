import type { AwilixContainer } from 'awilix';
import type { Logger } from 'pino';

type EagerInitializable = {
  initialize?: () => unknown | Promise<unknown>;
};

export async function executeEagerInitialization(
  container: AwilixContainer | undefined,
  logger?: Logger
): Promise<void> {
  try {
    logger?.debug('Starting eager initialization...');

    if (!container) {
      return;
    }

    const registrations = container.registrations;
    const eagerInitServices: string[] = [];

    for (const [name, registration] of Object.entries(registrations)) {
      try {
        const resolver =
          (registration as any).resolver ??
          (registration as unknown as Record<string, unknown>);
        if (resolver && resolver.eagerInit) {
          eagerInitServices.push(name);
        }
      } catch {
        // Ignore malformed custom resolver metadata so one registration does
        // not block application startup.
      }
    }

    if (eagerInitServices.length === 0) {
      logger?.debug('No services marked for eager initialization');
      return;
    }

    logger?.info(
      `Found ${eagerInitServices.length} services marked for eager initialization`
    );

    for (const serviceName of eagerInitServices) {
      try {
        const startTime = Date.now();
        const instance = container.resolve(serviceName) as
          | EagerInitializable
          | undefined;

        if (instance && typeof instance.initialize === 'function') {
          await Promise.resolve(instance.initialize());
        }

        const duration = Date.now() - startTime;
        logger?.debug(`✅ Eager initialized: ${serviceName} in ${duration}ms`);
      } catch (error) {
        logger?.error(
          { err: error, serviceName },
          `❌ Failed to eager initialize: ${serviceName}`
        );
      }
    }
  } catch (error) {
    logger?.error({ err: error }, 'Error during eager initialization');
  }
}
