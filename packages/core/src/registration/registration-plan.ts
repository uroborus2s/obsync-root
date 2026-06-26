import {
  asClass,
  asFunction,
  asValue,
  InjectionMode,
  Lifetime,
  type AwilixContainer,
  type InjectionModeType,
  type LifetimeType,
  type Resolver
} from 'awilix';
import {
  recordDIRegistration,
  type DIRegistrationType
} from '../diagnostics/di.js';

export type RegistrationPlanSource =
  | 'application-discovery'
  | 'plugin-autodi'
  | 'production-manifest';

export type RegistrationPlanOwnerType = 'application' | 'plugin' | 'manifest';

export type RegistrationPlanTokenKind =
  | 'controller'
  | 'service'
  | 'repository'
  | 'component'
  | 'adapter'
  | 'config'
  | 'unknown';

export type RegistrationPlanScope = 'root' | 'request' | 'plugin';

export type RegistrationPlanVisibility = 'public' | 'internal';

export interface RegistrationPlanOwner {
  type: RegistrationPlanOwnerType;
  name?: string;
}

export interface RegistrationPlanToken {
  token: string;
  kind: RegistrationPlanTokenKind;
  registrationType: DIRegistrationType;
  scope: RegistrationPlanScope;
  visibility: RegistrationPlanVisibility;
  lifetime?: string;
  injectionMode?: string;
  dependencies?: string[];
  target?: unknown;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface RegistrationPlanRoute {
  method: string;
  path: string;
  controllerName: string;
  handlerName: string;
  token?: string;
  scope: RegistrationPlanScope;
  prefix?: string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface RegistrationPlanAdapter {
  adapterName: string;
  token: string;
  pluginName?: string;
  scope: 'root';
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface RegistrationPlanLifecycle {
  serviceName: string;
  hook: string;
  token?: string;
  scope: RegistrationPlanScope;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface RegistrationPlanDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  token?: string;
  metadata?: Record<string, unknown>;
}

export interface RegistrationPlan {
  id: string;
  source: RegistrationPlanSource;
  owner: RegistrationPlanOwner;
  tokens: RegistrationPlanToken[];
  routes: RegistrationPlanRoute[];
  adapters: RegistrationPlanAdapter[];
  lifecycle: RegistrationPlanLifecycle[];
  diagnostics: RegistrationPlanDiagnostic[];
  metadata?: Record<string, unknown>;
}

export interface CreateRegistrationPlanInput {
  id: string;
  source: RegistrationPlanSource;
  owner: RegistrationPlanOwner;
  tokens?: RegistrationPlanToken[];
  routes?: RegistrationPlanRoute[];
  adapters?: RegistrationPlanAdapter[];
  lifecycle?: RegistrationPlanLifecycle[];
  diagnostics?: RegistrationPlanDiagnostic[];
  metadata?: Record<string, unknown>;
}

export interface RegistrationPlanRecordMetadata {
  id: string;
  source: RegistrationPlanSource;
  ownerType: RegistrationPlanOwnerType;
  ownerName?: string;
  tokenKind: RegistrationPlanTokenKind;
  scope: RegistrationPlanScope;
  visibility: RegistrationPlanVisibility;
  adapterName?: string;
}

export interface RegistrationPlanRegistrarOptions {
  duplicate?: 'throw' | 'skip';
  record?: boolean;
}

export function createRegistrationPlan(
  input: CreateRegistrationPlanInput
): RegistrationPlan {
  return {
    id: input.id,
    source: input.source,
    owner: input.owner,
    tokens: input.tokens || [],
    routes: input.routes || [],
    adapters: input.adapters || [],
    lifecycle: input.lifecycle || [],
    diagnostics: input.diagnostics || [],
    metadata: input.metadata
  };
}

export function mergeRegistrationPlans(
  ...plans: Array<RegistrationPlan | undefined>
): RegistrationPlan | undefined {
  const presentPlans = plans.filter(
    (plan): plan is RegistrationPlan => plan !== undefined
  );
  const [first] = presentPlans;
  if (!first) {
    return undefined;
  }

  return createRegistrationPlan({
    id: first.id,
    source: first.source,
    owner: first.owner,
    tokens: presentPlans.flatMap((plan) => plan.tokens),
    routes: presentPlans.flatMap((plan) => plan.routes),
    adapters: presentPlans.flatMap((plan) => plan.adapters),
    lifecycle: presentPlans.flatMap((plan) => plan.lifecycle),
    diagnostics: presentPlans.flatMap((plan) => plan.diagnostics),
    metadata: {
      ...first.metadata,
      mergedPlanIds: presentPlans.map((plan) => plan.id)
    }
  });
}

export function createRegistrationPlanRecordMetadata(
  plan: RegistrationPlan,
  token: RegistrationPlanToken
): RegistrationPlanRecordMetadata {
  return {
    id: plan.id,
    source: plan.source,
    ownerType: plan.owner.type,
    ownerName: plan.owner.name,
    tokenKind: token.kind,
    scope: token.scope,
    visibility: token.visibility,
    adapterName:
      typeof token.metadata?.adapterName === 'string'
        ? token.metadata.adapterName
        : undefined
  };
}

export function recordRegistrationPlanToken(
  container: AwilixContainer,
  plan: RegistrationPlan,
  token: RegistrationPlanToken
): void {
  recordDIRegistration(container, {
    token: token.token,
    registrationType: token.registrationType,
    lifetime: token.lifetime,
    injectionMode: token.injectionMode,
    dependencies: token.dependencies,
    target: token.target,
    source: token.source,
    plan: createRegistrationPlanRecordMetadata(plan, token)
  });
}

export function recordRegistrationPlan(
  container: AwilixContainer,
  plan: RegistrationPlan
): void {
  for (const token of plan.tokens) {
    recordRegistrationPlanToken(container, plan, token);
  }
}

function toLifetime(lifetime?: string): LifetimeType {
  if (lifetime === 'SCOPED') return Lifetime.SCOPED;
  if (lifetime === 'TRANSIENT') return Lifetime.TRANSIENT;
  return Lifetime.SINGLETON;
}

function toInjectionMode(injectionMode?: string): InjectionModeType {
  return injectionMode === 'PROXY'
    ? InjectionMode.PROXY
    : InjectionMode.CLASSIC;
}

function createResolverFromPlanToken(
  token: RegistrationPlanToken
): Resolver<unknown> {
  if (token.registrationType === 'value') {
    return asValue(token.target);
  }

  if (typeof token.target !== 'function') {
    throw new Error(
      `RegistrationPlan token ${token.token} requires a function target for ${token.registrationType} registration`
    );
  }

  const resolverOptions = {
    lifetime: toLifetime(token.lifetime),
    injectionMode: toInjectionMode(token.injectionMode)
  };

  if (token.registrationType === 'class') {
    return asClass(
      token.target as new (...args: any[]) => unknown,
      resolverOptions
    );
  }

  if (token.registrationType === 'function') {
    return asFunction(
      token.target as (...args: any[]) => unknown,
      resolverOptions
    );
  }

  throw new Error(
    `RegistrationPlan token ${token.token} uses unsupported registration type: ${token.registrationType}`
  );
}

export function registerRegistrationPlanToken(
  container: AwilixContainer,
  plan: RegistrationPlan,
  token: RegistrationPlanToken,
  options: RegistrationPlanRegistrarOptions = {}
): boolean {
  if (container.hasRegistration(token.token)) {
    if (options.duplicate === 'skip') {
      return false;
    }
    throw new Error(`Duplicate DI token: ${token.token}`);
  }

  container.register(token.token, createResolverFromPlanToken(token));

  if (options.record !== false) {
    recordRegistrationPlanToken(container, plan, token);
  }

  return true;
}
