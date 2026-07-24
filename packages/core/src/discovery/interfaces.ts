import type {
  ComponentInjectionMode,
  ComponentLifetime
} from '../decorators/index.js';
import type { RegistrationPlan } from '../registration/index.js';
import type { ProductionManifestDiscoveryConfig } from './production-manifest.js';

/**
 * Represents a raw module loaded from the file system.
 */
export interface LoadedModule {
  /** The name of the module (usually the class name or file name) */
  name: string;
  /** The absolute path to the file */
  path: string;
  /** The exported value (Class, function, or object) */
  value: any;
}

/**
 * Represents the metadata extracted from a module.
 */
export interface ComponentMetadata {
  /** The name of the component */
  name: string;
  /** The type of the component */
  type: 'controller' | 'service' | 'repository' | 'component' | 'unknown';
  /** The class constructor or function */
  value: any;
  /** Dependency injection options */
  diOptions?: {
    lifetime?: ComponentLifetime;
    injectionMode?: ComponentInjectionMode;
  };
  /** Route metadata (only for controllers) */
  routes?: RouteMetadata[];
  /** Lifecycle hooks detected */
  lifecycleHooks?: string[];
}

/**
 * Metadata for a single route.
 */
export interface RouteMetadata {
  method: string;
  path: string;
  handlerName: string;
  options?: any;
}

export interface ApplicationDiscoveryConfig {
  enabled?: boolean;
  rootDir?: string;
  files?: string[];
  directories?: string[];
  patterns?: string[];
  exclude?: string[];
  productionManifest?: ProductionManifestDiscoveryConfig;
  routing?: {
    enabled?: boolean;
    prefix?: string;
    validation?: boolean;
  };
  lifecycle?: {
    enabled?: boolean;
    errorHandling?: 'throw' | 'warn' | 'ignore';
  };
  manifestRegistration?: {
    tokens?: Array<
      | string
      | {
          token: string;
          className?: string;
          sourceFile?: string;
        }
    >;
    routes?: Array<{
      method?: string;
      path?: string;
      controllerName?: string;
      handlerName?: string;
      sourceFile?: string;
    }>;
  };
  debug?: boolean;
  options?: Record<string, unknown>;
}

export interface ApplicationDiscoveryResult {
  scanned: number;
  analyzed: number;
  registered: string[];
  routesRegistered: number;
  registrationPlan?: RegistrationPlan;
  skipped: Array<{ name: string; reason: string }>;
  errors: Array<{ name: string; error: Error }>;
}
