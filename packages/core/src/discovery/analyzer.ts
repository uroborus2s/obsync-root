import { isClass } from 'awilix';
import { MetadataManager } from '../decorators/metadata.js';
import type { ComponentMetadata, IModuleAnalyzer, LoadedModule } from './interfaces.js';

export class MetadataAnalyzer implements IModuleAnalyzer {
  analyze(module: LoadedModule): ComponentMetadata | null {
    const { value, name } = module;

    // We only support classes for now (Controllers, Services, etc.)
    if (!isClass(value)) {
      return null;
    }

    // Check for Controller metadata
    if (MetadataManager.isController(value)) {
      const controllerMetadata = MetadataManager.getControllerMetadata(value);
      const routes = MetadataManager.getRouteMetadata(value);

      return {
        name,
        type: 'controller',
        value,
        routes: routes.map(route => ({
          method: route.method,
          path: route.path,
          handlerName: route.propertyKey,
          options: route.options
        })),
        diOptions: {
          lifetime: 'SINGLETON', // Controllers are usually singletons in Fastify
          injectionMode: 'CLASSIC'
        }
      };
    }

    // Check for Service/Repository/Component metadata
    // Assuming we have a generic way to identify them or specific decorators
    // For now, let's rely on the fact that if it's not a controller but has @Injectable or similar, it's a service.
    // Since Stratix uses Awilix, any class *can* be a service.
    // But we want to be explicit.
    
    // Let's check if it has any DI metadata or if it's just a plain class we want to register?
    // In the previous implementation, `module-discovery.ts` treated almost any class as a potential module.
    // Let's refine this:
    
    // 1. Check if it is an Executor
    if (MetadataManager.isExecutor(value)) {
       return {
         name,
         type: 'executor',
         value,
         diOptions: {
           lifetime: 'SINGLETON'
         }
       };
    }

    // 2. Check for generic Service/Repository (if we had specific decorators for them)
    // For now, let's assume any other class found in the scanned directories is a service
    // UNLESS we want to enforce @Service decorator.
    // The previous implementation `module-discovery.ts` line 493 just checked `instance.constructor`.
    
    // Let's be permissive for backward compatibility but prioritize explicit metadata if available.
    
    return {
      name,
      type: 'service', // Default to service
      value,
      diOptions: {
        lifetime: 'SINGLETON',
        injectionMode: 'CLASSIC'
      }
    };
  }
}
