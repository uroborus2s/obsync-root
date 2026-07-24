import { asFunction, createContainer } from 'awilix';
import { describe, expect, it, vi } from 'vitest';

import { executeEagerInitialization } from '../eager-initialization.js';

function loggerMock() {
  return {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn()
  } as any;
}

function eagerResolver(factory: () => unknown) {
  const resolver = asFunction(factory).singleton() as any;
  resolver.eagerInit = true;
  return resolver;
}

describe('executeEagerInitialization', () => {
  it('resolves and initializes eager services', async () => {
    const container = createContainer();
    const logger = loggerMock();
    const initialize = vi.fn();

    container.register(
      'readyService',
      eagerResolver(() => ({ initialize }))
    );

    await executeEagerInitialization(container, logger);

    expect(initialize).toHaveBeenCalledTimes(1);
    expect(logger.info).toHaveBeenCalledWith(
      'Found 1 services marked for eager initialization'
    );
  });

  it('continues startup when an eager service fails', async () => {
    const container = createContainer();
    const logger = loggerMock();

    container.register(
      'brokenService',
      eagerResolver(() => ({
        initialize() {
          throw new Error('boom');
        }
      }))
    );

    await executeEagerInitialization(container, logger);

    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceName: 'brokenService'
      }),
      '❌ Failed to eager initialize: brokenService'
    );
  });

  it('does nothing when no container or eager registrations are present', async () => {
    const container = createContainer();
    const logger = loggerMock();

    await executeEagerInitialization(undefined, logger);
    await executeEagerInitialization(container, logger);

    expect(logger.debug).toHaveBeenCalledWith(
      'No services marked for eager initialization'
    );
  });
});
