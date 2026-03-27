import { asClass, createContainer } from 'awilix';
import fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { StandardRegistrar } from '../registrar.js';

describe('StandardRegistrar', () => {
  const registrar = new StandardRegistrar();

  it('should register a service into the container', async () => {
    const container = createContainer();
    class TestService {}
    
    const metadata = {
      name: 'TestService',
      type: 'service' as const,
      value: TestService,
      diOptions: { lifetime: 'SINGLETON' as const }
    };

    await registrar.register(metadata, container, fastify());

    expect(container.hasRegistration('TestService')).toBe(true);
    expect(container.hasRegistration('testService')).toBe(true); // CamelCase check
  });

  it('should register routes for a controller', async () => {
    const container = createContainer();
    const app = fastify();
    
    class TestController {
      hello(req: any, reply: any) {
        return { hello: 'world' };
      }
    }

    const metadata = {
      name: 'TestController',
      type: 'controller' as const,
      value: TestController,
      routes: [
        { method: 'GET', path: '/hello', handlerName: 'hello' }
      ]
    };

    // Mock container resolution for the route handler
    container.register('TestController', asClass(TestController));

    await registrar.register(metadata, container, app);

    // Verify route registration by making a request
    const response = await app.inject({
      method: 'GET',
      url: '/hello'
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ hello: 'world' });
  });
});
