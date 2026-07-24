import {
  asClass,
  asFunction,
  asValue,
  createContainer,
  type AwilixContainer
} from 'awilix';
import fastify, { type FastifyInstance } from 'fastify';
import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Controller } from '../../decorators/controller.js';
import { Get } from '../../decorators/route.js';
import type { PluginContainerContext } from '../service-discovery.js';
import { discoverAndProcessModules } from '../module-discovery.js';

@Controller()
class TestController {
  @Get('/test')
  testMethod() {
    return { ok: true };
  }
}

class LifecycleService {
  onReady() {
    return 'ready';
  }

  onClose() {
    return 'closed';
  }
}

describe('plugin module discovery', () => {
  let app: FastifyInstance;
  let internalContainer: AwilixContainer;
  let rootContainer: AwilixContainer;

  beforeEach(() => {
    app = fastify();
    internalContainer = createContainer();
    rootContainer = createContainer();
  });

  afterEach(async () => {
    await app.close();
  });

  function context(): PluginContainerContext<unknown> {
    return {
      internalContainer,
      rootContainer,
      debugEnabled: false
    };
  }

  it('discovers controllers and immediately registers routes', async () => {
    internalContainer.register({
      testController: asClass(TestController).singleton()
    });

    const result = await discoverAndProcessModules(context(), app);

    expect(result.statistics).toMatchObject({
      totalModules: 1,
      classModules: 1,
      controllerModules: 1
    });
    expect(result.routeConfigs).toHaveLength(1);

    await app.ready();
    const response = await app.inject('/test');

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });
  });

  it('does not expose executor statistics or task registration results', async () => {
    const result = await discoverAndProcessModules(context(), app);

    expect(result.statistics).not.toHaveProperty('executorModules');
    expect(result).not.toHaveProperty('executorConfigs');
  });

  it('collects lifecycle services without treating them as controllers', async () => {
    const scanAndRegisterService = vi.fn();
    internalContainer.register({
      lifecycleService: asClass(LifecycleService).singleton(),
      configValue: asValue({ key: 'value' })
    });

    const result = await discoverAndProcessModules(
      {
        ...context(),
        lifecycleManager: { scanAndRegisterService } as any
      },
      app
    );

    expect(result.statistics.lifecycleModules).toBe(1);
    expect(result.lifecycleConfigs).toEqual([
      expect.objectContaining({
        serviceName: 'lifecycleService',
        lifecycleMethods: ['onReady', 'onClose']
      })
    ]);
    expect(scanAndRegisterService).toHaveBeenCalledWith(
      'lifecycleService',
      expect.any(LifecycleService)
    );
  });

  it('records processing errors and continues with other modules', async () => {
    internalContainer.register({
      testController: asClass(TestController).singleton(),
      brokenService: asFunction(() => {
        throw new Error('Broken service');
      })
    });

    const result = await discoverAndProcessModules(context(), app);

    expect(result.routeConfigs).toHaveLength(1);
    expect(result.errors).toEqual([
      {
        moduleName: 'brokenService',
        error: 'Broken service'
      }
    ]);
  });
});
