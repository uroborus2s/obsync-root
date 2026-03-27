import { AwilixContainer } from 'awilix';
import fastify, { FastifyInstance } from 'fastify';

export class TestingModule {
  constructor(private readonly container: AwilixContainer) {}

  get<T>(token: any): T {
    const tokenName = typeof token === 'function' ? token.name : token;
    return this.container.resolve<T>(tokenName);
  }

  resolve<T>(token: any): T {
    return this.get<T>(token);
  }

  createNestApplication(options: any = {}): FastifyInstance {
    const app = fastify(options);
    
    // Attach container to app
    app.decorate('diContainer', this.container);
    
    // Register controllers manually if needed, or rely on the fact that they are in the container
    // and the route registration logic (which we might need to simulate or import from core)
    // For unit testing, we often just want the app instance with the container attached.
    
    return app as unknown as FastifyInstance;
  }
}
