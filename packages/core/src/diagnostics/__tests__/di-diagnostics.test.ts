import { asClass, asValue, createContainer, InjectionMode } from 'awilix';
import { describe, expect, it } from 'vitest';
import {
  createDIGraph,
  diagnoseDIGraph,
  recordDIRegistration,
  runDIDiagnostics
} from '../di.js';

describe('DI diagnostics', () => {
  it('builds a token graph from recorded Stratix DI registrations', () => {
    class UserRepository {}
    class UserService {
      constructor(userRepository: UserRepository, logger: unknown) {
        void userRepository;
        void logger;
      }
    }

    const container = createContainer({
      injectionMode: InjectionMode.CLASSIC
    });
    container.register({
      userRepository: asClass(UserRepository).scoped(),
      userService: asClass(UserService).singleton(),
      logger: asValue({ level: 'info' })
    });

    recordDIRegistration(container, {
      token: 'userRepository',
      registrationType: 'class',
      lifetime: 'SCOPED',
      injectionMode: 'CLASSIC',
      target: UserRepository,
      source: 'UserRepository'
    });
    recordDIRegistration(container, {
      token: 'userService',
      registrationType: 'class',
      lifetime: 'SINGLETON',
      injectionMode: 'CLASSIC',
      target: UserService,
      source: 'UserService'
    });

    const graph = createDIGraph(container);

    expect(graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          token: 'userService',
          dependencies: ['userRepository', 'logger'],
          lifetime: 'SINGLETON',
          injectionMode: 'CLASSIC'
        }),
        expect.objectContaining({
          token: 'logger',
          dependencies: [],
          registrationType: 'unknown'
        })
      ])
    );
    expect(diagnoseDIGraph(graph)).toEqual([]);
  });

  it('reports missing dependencies', () => {
    class BrokenService {
      constructor(missingRepository: unknown) {
        void missingRepository;
      }
    }

    const container = createContainer({
      injectionMode: InjectionMode.CLASSIC
    });
    container.register({
      brokenService: asClass(BrokenService).singleton()
    });
    recordDIRegistration(container, {
      token: 'brokenService',
      registrationType: 'class',
      lifetime: 'SINGLETON',
      injectionMode: 'CLASSIC',
      target: BrokenService,
      source: 'BrokenService'
    });

    const result = runDIDiagnostics(container);

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'DI_MISSING_DEPENDENCY',
        severity: 'error',
        token: 'brokenService',
        dependency: 'missingRepository'
      })
    ]);
  });

  it('reports duplicate tokens and dependency cycles from graph input', () => {
    const diagnostics = diagnoseDIGraph({
      nodes: [
        {
          token: 'aService',
          dependencies: ['bService'],
          registrationType: 'class'
        },
        {
          token: 'bService',
          dependencies: ['aService'],
          registrationType: 'class'
        },
        {
          token: 'aService',
          dependencies: [],
          registrationType: 'class'
        }
      ]
    });

    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DI_DUPLICATE_TOKEN',
          token: 'aService'
        }),
        expect.objectContaining({
          code: 'DI_CYCLE',
          cycle: ['aService', 'bService', 'aService']
        })
      ])
    );
  });
});
