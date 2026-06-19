import { asClass, createContainer } from 'awilix';
import { describe, expect, it } from 'vitest';
import { runDIDiagnostics } from '../../diagnostics/index.js';
import {
  createRegistrationPlan,
  recordRegistrationPlan
} from '../registration-plan.js';

class PlanRepository {}

class PlanService {
  constructor(readonly planRepository: PlanRepository) {}
}

describe('RegistrationPlan', () => {
  it('records plan-first DI metadata into the diagnostics graph', () => {
    const container = createContainer();
    container.register('planRepository', asClass(PlanRepository));
    container.register('planService', asClass(PlanService));

    const plan = createRegistrationPlan({
      id: 'application:test-plan',
      source: 'application-discovery',
      owner: {
        type: 'application'
      },
      tokens: [
        {
          token: 'planRepository',
          kind: 'repository',
          registrationType: 'class',
          lifetime: 'SCOPED',
          injectionMode: 'CLASSIC',
          scope: 'root',
          visibility: 'internal',
          target: PlanRepository,
          source: 'PlanRepository'
        },
        {
          token: 'planService',
          kind: 'service',
          registrationType: 'class',
          lifetime: 'SCOPED',
          injectionMode: 'CLASSIC',
          scope: 'root',
          visibility: 'internal',
          dependencies: ['planRepository'],
          target: PlanService,
          source: 'PlanService'
        }
      ]
    });

    recordRegistrationPlan(container, plan);

    const diagnostics = runDIDiagnostics(container);

    expect(diagnostics.graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          token: 'planService',
          dependencies: ['planRepository'],
          plan: {
            id: 'application:test-plan',
            source: 'application-discovery',
            ownerType: 'application',
            tokenKind: 'service',
            scope: 'root',
            visibility: 'internal'
          }
        })
      ])
    );
    expect(diagnostics.diagnostics).toEqual([]);
  });

  it('attaches plan metadata to missing dependency diagnostics', () => {
    const container = createContainer();
    container.register('planService', asClass(PlanService));

    const plan = createRegistrationPlan({
      id: 'application:missing-dependency',
      source: 'application-discovery',
      owner: {
        type: 'application'
      },
      tokens: [
        {
          token: 'planService',
          kind: 'service',
          registrationType: 'class',
          lifetime: 'SCOPED',
          injectionMode: 'CLASSIC',
          scope: 'root',
          visibility: 'internal',
          dependencies: ['missingRepository'],
          target: PlanService,
          source: 'PlanService'
        }
      ]
    });

    recordRegistrationPlan(container, plan);

    expect(runDIDiagnostics(container).diagnostics).toEqual([
      expect.objectContaining({
        code: 'DI_MISSING_DEPENDENCY',
        token: 'planService',
        dependency: 'missingRepository',
        plan: expect.objectContaining({
          id: 'application:missing-dependency',
          tokenKind: 'service'
        })
      })
    ]);
  });
});
