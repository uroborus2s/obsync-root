import type { AwilixContainer } from 'awilix';
import { asClass, Lifetime } from 'awilix';
import type { FastifyInstance } from 'fastify';
import { getLogger } from '../logger/index.js';
import type { ComponentMetadata, IComponentRegistrar } from './interfaces.js';

export class StandardRegistrar implements IComponentRegistrar {
  private logger = getLogger();

  async register(
    component: ComponentMetadata,
    container: AwilixContainer,
    app: FastifyInstance
  ): Promise<void> {
    const { name, type, value, diOptions, routes } = component;

    this.logger.debug(`Registering component: ${name} (${type})`);

    // 1. Register in DI Container
    if (value) {
      const lifetime = diOptions?.lifetime === 'SCOPED' 
        ? Lifetime.SCOPED 
        : diOptions?.lifetime === 'TRANSIENT' 
          ? Lifetime.TRANSIENT 
          : Lifetime.SINGLETON;

      container.register({
        [name]: asClass(value, { lifetime })
      });
      
      // Also register with camelCase name if different, for convenience
      const camelName = name.charAt(0).toLowerCase() + name.slice(1);
      if (camelName !== name) {
         container.register({
          [camelName]: asClass(value, { lifetime })
        });
      }
    }

    // 2. Register Routes (if Controller)
    if (type === 'controller' && routes && routes.length > 0) {
      await this.registerRoutes(component, app, container);
    }

    // 3. Register Executor (if Executor)
    if (type === 'executor') {
      await this.registerExecutor(component, container);
    }
  }

  private async registerRoutes(
    component: ComponentMetadata,
    app: FastifyInstance,
    container: AwilixContainer
  ): Promise<void> {
    const { name, routes, value } = component;
    
    // Resolve the controller instance from the container to ensure dependencies are injected
    // However, Fastify routes usually need a handler function.
    // Stratix pattern: We resolve the controller inside the handler wrapper.
    
    for (const route of routes!) {
      const { method, path, handlerName, options } = route;

      this.logger.debug(`Mapping route: ${method} ${path} -> ${name}.${handlerName}`);

      app.route({
        method: method as any,
        url: path,
        ...options,
        handler: async (request, reply) => {
          // Resolve controller from the request-scoped container (if available) or root container
          const scopedContainer = (request as any).diScope || container;
          const controllerInstance = scopedContainer.resolve(name);
          
          if (!controllerInstance[handlerName]) {
             throw new Error(`Handler ${handlerName} not found in controller ${name}`);
          }

          return controllerInstance[handlerName](request, reply);
        }
      });
    }
  }

  private async registerExecutor(
    component: ComponentMetadata,
    container: AwilixContainer
  ): Promise<void> {
    // Check if the task executor registry is available
    if (container.hasRegistration('registerTaskExecutor')) {
      const registerTaskExecutor = container.resolve(
        'registerTaskExecutor'
      ) as (name: string, instance: unknown) => void;
      const instance = container.resolve(component.name);
      registerTaskExecutor(component.name, instance);
      this.logger.debug(`Registered executor: ${component.name}`);
    }
  }
}
