import type { AwilixContainer } from 'awilix';
import type { FastifyInstance } from 'fastify';

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
  type: 'controller' | 'service' | 'repository' | 'executor' | 'unknown';
  /** The class constructor or function */
  value: any;
  /** Dependency injection options */
  diOptions?: {
    lifetime?: 'SINGLETON' | 'TRANSIENT' | 'SCOPED';
    injectionMode?: 'CLASSIC' | 'PROXY';
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

/**
 * Scanner: Responsible for traversing directories and loading modules.
 */
export interface IModuleScanner {
  /**
   * Scans the given directories for modules.
   * @param directories List of absolute paths to scan.
   * @returns A promise that resolves to a list of loaded modules.
   */
  scan(directories: string[]): Promise<LoadedModule[]>;
}

/**
 * Analyzer: Responsible for analyzing loaded modules and extracting metadata.
 */
export interface IModuleAnalyzer {
  /**
   * Analyzes a loaded module to determine its type and metadata.
   * @param module The loaded module to analyze.
   * @returns The component metadata, or null if the module is not a Stratix component.
   */
  analyze(module: LoadedModule): ComponentMetadata | null;
}

/**
 * Registrar: Responsible for registering components into the DI container and Framework.
 */
export interface IComponentRegistrar {
  /**
   * Registers a component.
   * @param component The component metadata.
   * @param container The Awilix DI container.
   * @param app The Fastify application instance.
   */
  register(component: ComponentMetadata, container: AwilixContainer, app: FastifyInstance): Promise<void>;
}
