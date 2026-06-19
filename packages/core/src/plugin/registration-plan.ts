import { isClass, isFunction } from 'awilix';
import { MetadataManager } from '../decorators/index.js';
import { extractConstructorDependencies } from '../diagnostics/index.js';
import {
  createRegistrationPlan,
  type RegistrationPlan,
  type RegistrationPlanLifecycle,
  type RegistrationPlanRoute,
  type RegistrationPlanToken
} from '../registration/index.js';
import type {
  LifecycleConfig,
  ModuleProcessingResult,
  RouteConfig
} from './module-discovery.js';
import type { PluginContainerContext } from './service-discovery.js';

function registrationTarget(registration: any): unknown {
  return registration?.resolver?.fn;
}

function registrationType(
  registration: any
): RegistrationPlanToken['registrationType'] {
  const target = registrationTarget(registration);
  if (typeof target === 'function') {
    return isClass(target) ? 'class' : 'function';
  }
  if (registration?.resolver) {
    return 'value';
  }
  return 'unknown';
}

function inferTokenKind(
  token: string,
  routeConfigs: RouteConfig[],
  lifecycleConfigs: LifecycleConfig[]
): RegistrationPlanToken['kind'] {
  if (token === 'config') {
    return 'config';
  }
  if (routeConfigs.some((route) => route.controllerName === token)) {
    return 'controller';
  }
  if (lifecycleConfigs.some((lifecycle) => lifecycle.serviceName === token)) {
    return 'service';
  }
  return 'component';
}

function createPluginPlanRoutes(
  routeConfigs: RouteConfig[],
  prefix?: string
): RegistrationPlanRoute[] {
  return routeConfigs.flatMap((routeConfig) => {
    const routeMetadata = MetadataManager.getRouteMetadata(
      routeConfig.controllerConstructor
    );

    return routeMetadata.map((route) => ({
      method: route.method.toUpperCase(),
      path: route.path,
      controllerName: routeConfig.controllerName,
      handlerName: route.propertyKey,
      token: routeConfig.controllerName,
      scope: 'plugin',
      prefix,
      source: routeConfig.controllerConstructor.name,
      metadata: {
        hasOptions: Boolean(route.options)
      }
    }));
  });
}

function createPluginPlanLifecycle(
  lifecycleConfigs: LifecycleConfig[]
): RegistrationPlanLifecycle[] {
  return lifecycleConfigs.flatMap((lifecycle) =>
    lifecycle.lifecycleMethods.map((hook) => ({
      serviceName: lifecycle.serviceName,
      hook,
      token: lifecycle.serviceName,
      scope: 'plugin',
      source: lifecycle.serviceInstance?.constructor?.name
    }))
  );
}

export function createPluginAutoDIRegistrationPlan<T>(
  pluginContext: PluginContainerContext<T>,
  processingResult: ModuleProcessingResult
): RegistrationPlan {
  const tokens: RegistrationPlanToken[] = Object.entries(
    pluginContext.internalContainer.registrations
  ).map(([token, registration]) => {
    const rawRegistration = registration as any;
    const target = registrationTarget(registration);
    return {
      token,
      kind: inferTokenKind(
        token,
        processingResult.routeConfigs,
        processingResult.lifecycleConfigs
      ),
      registrationType: registrationType(registration),
      lifetime: rawRegistration?.lifetime,
      injectionMode: rawRegistration?.injectionMode,
      scope: 'plugin',
      visibility: 'internal',
      dependencies:
        typeof target === 'function'
          ? extractConstructorDependencies(target)
          : undefined,
      target: isFunction(target) ? target : undefined,
      source:
        typeof target === 'function'
          ? target.name || token
          : token === 'config'
            ? 'plugin-options'
            : token,
      metadata: {
        pluginName: pluginContext.pluginName
      }
    };
  });

  return createRegistrationPlan({
    id: `plugin-autodi:${pluginContext.pluginName}`,
    source: 'plugin-autodi',
    owner: {
      type: 'plugin',
      name: pluginContext.pluginName
    },
    tokens,
    routes: createPluginPlanRoutes(
      processingResult.routeConfigs,
      pluginContext.autoDIConfig.routing?.prefix
    ),
    lifecycle: createPluginPlanLifecycle(processingResult.lifecycleConfigs),
    metadata: {
      basePath: pluginContext.basePath,
      patterns: pluginContext.patterns
    }
  });
}
