import { asValue, createContainer } from 'awilix';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { runDIDiagnostics } from '../../diagnostics/index.js';
import {
  buildServiceAdapterToken,
  diagnoseServiceAdapterTokens,
  registerServiceAdapters
} from '../adapter-registration.js';
import type { PluginContainerContext } from '../service-discovery.js';

describe('service adapter token naming', () => {
  it('keeps existing plugin-prefixed adapter names stable', () => {
    expect(buildServiceAdapterToken('redis', 'redisClient')).toBe(
      'redisClient'
    );
  });

  it('adds the plugin prefix to generic adapter names', () => {
    expect(buildServiceAdapterToken('queue', 'client')).toBe('queueClient');
    expect(buildServiceAdapterToken('ossp', 'client')).toBe('osspClient');
    expect(buildServiceAdapterToken('wasV7Api', 'userAuth')).toBe(
      'wasV7ApiUserAuth'
    );
  });

  it('uses the adapter name directly when no plugin name is available', () => {
    expect(buildServiceAdapterToken(undefined, 'client')).toBe('client');
  });

  it('diagnoses duplicate adapter names before registration', () => {
    const diagnostics = diagnoseServiceAdapterTokens('queue', [
      { adapterName: 'client', factory: () => ({}) },
      { adapterName: 'client', factory: () => ({}) }
    ]);

    expect(diagnostics).toEqual([
      {
        code: 'ADAPTER_DUPLICATE_NAME',
        adapterName: 'client',
        token: 'queueClient',
        message: 'Duplicate service adapter name: client'
      }
    ]);
  });

  it('diagnoses adapter token conflicts with existing root registrations', () => {
    const diagnostics = diagnoseServiceAdapterTokens(
      'queue',
      [{ adapterName: 'client', factory: () => ({}) }],
      ['queueClient']
    );

    expect(diagnostics).toEqual([
      {
        code: 'ADAPTER_TOKEN_CONFLICT',
        adapterName: 'client',
        token: 'queueClient',
        message:
          'Service adapter token already exists in root container: queueClient'
      }
    ]);
  });

  it('fails fast on adapter token conflicts before registering any discovered adapters', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-adapter-conflict-'));
    await writeFile(
      join(root, 'client-adapter.mjs'),
      [
        'export default {',
        "  adapterName: 'client',",
        "  factory: () => ({ name: 'new-client' })",
        '};'
      ].join('\n')
    );
    await writeFile(
      join(root, 'metrics-adapter.mjs'),
      [
        'export default {',
        "  adapterName: 'metrics',",
        "  factory: () => ({ name: 'metrics' })",
        '};'
      ].join('\n')
    );

    const rootContainer = createContainer();
    rootContainer.register('queueClient', asValue({ name: 'existing-client' }));
    const context: PluginContainerContext<Record<string, never>> = {
      internalContainer: rootContainer.createScope(),
      rootContainer,
      options: {},
      patterns: [],
      basePath: root,
      autoDIConfig: {
        discovery: { patterns: [] },
        routing: { enabled: false, prefix: '', validation: false },
        services: {
          enabled: true,
          patterns: ['*.mjs']
        },
        lifecycle: { enabled: false },
        debug: false
      },
      debugEnabled: false,
      pluginName: 'queue'
    };

    await expect(registerServiceAdapters(context)).rejects.toThrow(
      'Service adapter token already exists in root container: queueClient'
    );
    expect(rootContainer.hasRegistration('queueMetrics')).toBe(false);
  });

  it('records plugin adapter registrations as RegistrationPlan metadata', async () => {
    const root = await mkdtemp(join(tmpdir(), 'stratix-adapter-plan-'));
    await writeFile(
      join(root, 'client-adapter.mjs'),
      [
        'export default {',
        "  adapterName: 'client',",
        "  factory: () => ({ name: 'queue-client' })",
        '};'
      ].join('\n')
    );

    const rootContainer = createContainer();
    const context: PluginContainerContext<Record<string, never>> = {
      internalContainer: rootContainer.createScope(),
      rootContainer,
      options: {},
      patterns: [],
      basePath: root,
      autoDIConfig: {
        discovery: { patterns: [] },
        routing: { enabled: false, prefix: '', validation: false },
        services: {
          enabled: true,
          patterns: ['*.mjs']
        },
        lifecycle: { enabled: false },
        debug: false
      },
      debugEnabled: false,
      pluginName: 'queue'
    };

    await registerServiceAdapters(context);

    expect(rootContainer.hasRegistration('queueClient')).toBe(true);
    expect(context.registrationPlan).toEqual(
      expect.objectContaining({
        source: 'plugin-autodi',
        owner: {
          type: 'plugin',
          name: 'queue'
        },
        adapters: [
          expect.objectContaining({
            adapterName: 'client',
            token: 'queueClient'
          })
        ]
      })
    );

    const diagnostics = runDIDiagnostics(rootContainer);
    expect(diagnostics.graph.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          token: 'queueClient',
          registrationType: 'function',
          plan: expect.objectContaining({
            source: 'plugin-autodi',
            ownerType: 'plugin',
            ownerName: 'queue',
            tokenKind: 'adapter',
            scope: 'root',
            visibility: 'public'
          })
        })
      ])
    );
  });
});
