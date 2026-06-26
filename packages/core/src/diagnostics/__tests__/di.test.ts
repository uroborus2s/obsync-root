import { asClass, asValue, createContainer } from 'awilix';
import { describe, expect, it } from 'vitest';
import {
  createDIGraph,
  recordDIRegistration,
  type DIGraphNode
} from '../di.js';

describe('DI diagnostics', () => {
  it('marks graph node confidence for explicit, inferred and unknown registrations', () => {
    class ExplicitService {}
    class InferredService {
      constructor(_logger: unknown) {}
    }

    const container = createContainer();
    container.register({
      explicitService: asClass(ExplicitService),
      inferredService: asClass(InferredService),
      nativeValue: asValue('native')
    });

    recordDIRegistration(container, {
      token: 'explicitService',
      registrationType: 'class',
      dependencies: ['logger'],
      target: ExplicitService
    });
    recordDIRegistration(container, {
      token: 'inferredService',
      registrationType: 'class',
      target: InferredService
    });

    const graph = createDIGraph(container);
    const nodes = Object.fromEntries(
      graph.nodes.map((node: DIGraphNode) => [node.token, node])
    );

    expect(nodes.explicitService.confidence).toBe('explicit');
    expect(nodes.explicitService.dependencies).toEqual(['logger']);
    expect(nodes.inferredService.confidence).toBe('inferred');
    expect(nodes.inferredService.dependencies).toEqual(['_logger']);
    expect(nodes.nativeValue.confidence).toBe('unknown');
  });
});
