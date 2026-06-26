// Minimal internal API surface.
// This subpath is for Stratix-maintained packages and migration tooling only.
// Keep it explicit so implementation details do not become accidental public
// compatibility commitments.

export {
  ApplicationBootstrap,
  BootstrapPhase,
  type BootstrapStatus
} from '../bootstrap/application-bootstrap.js';
export { ApplicationDiscoveryRegistrar } from '../bootstrap/discovery-registrar.js';
export { ApplicationDiscoveryPipeline } from '../discovery/application-pipeline.js';
export type {
  ApplicationDiscoveryConfig,
  ApplicationDiscoveryResult
} from '../discovery/interfaces.js';
export type {
  LoadedProductionManifest,
  ProductionManifest,
  ProductionManifestV1,
  ProductionManifestV2
} from '../discovery/production-manifest.js';
export { registerControllerRoutes } from '../plugin/controller-registration.js';
export type { RouteConfig } from '../plugin/controller-registration.js';
