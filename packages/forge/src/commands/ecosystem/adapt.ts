import path from 'node:path';
import { CliError } from '../../core/errors.js';
import { toCamelCase, toPascalCase } from '../../utils/case.js';
import { fileExists, writeJsonFile, writeTextFile } from '../../utils/fs.js';

export interface AdaptFile {
  path: string;
  content: string;
}

export interface AdaptPlan {
  packageName: string;
  adapterName: string;
  targetDir: string;
  files: AdaptFile[];
}

function pluginFunctionName(adapterName: string): string {
  const base = toCamelCase(adapterName);
  return base.endsWith('Plugin') ? base : `${base}Plugin`;
}

function optionsTypeName(adapterName: string): string {
  return `${toPascalCase(adapterName)}AdapterOptions`;
}

function defaultsFactoryName(adapterName: string): string {
  return `define${toPascalCase(adapterName)}AdapterDefaults`;
}

function manifestName(adapterName: string): string {
  return `${toCamelCase(adapterName)}-adapter`;
}

function buildIndexTs(packageName: string, adapterName: string): string {
  const functionName = pluginFunctionName(adapterName);
  const typeName = optionsTypeName(adapterName);

  return `import type { FastifyInstance } from '@stratix/core/plugin';
import { withRegisterAutoDI } from '@stratix/core/plugin';
import fastifyPlugin from '${packageName}';
import type { ${typeName} } from './config/plugin-config.js';

async function ${functionName}(
  fastify: FastifyInstance,
  options: ${typeName}
): Promise<void> {
  await fastify.register(fastifyPlugin, options);
}

export default withRegisterAutoDI<${typeName}>(${functionName}, {
  discovery: {
    patterns: []
  },
  services: {
    enabled: false,
    patterns: []
  }
});
`;
}

function buildPluginConfigTs(adapterName: string): string {
  const typeName = optionsTypeName(adapterName);
  const factoryName = defaultsFactoryName(adapterName);

  return `export interface ${typeName} {
  [key: string]: unknown;
}

export function ${factoryName}(): ${typeName} {
  return {};
}
`;
}

function buildSmokeTest(adapterName: string): string {
  return `import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import plugin from '../src/index.js';

describe('${adapterName} adapter', () => {
  it('exports a Stratix plugin wrapper', () => {
    assert.equal(typeof plugin, 'function');
  });
});
`;
}

export function buildAdaptPlan(options: {
  packageName: string;
  adapterName: string;
  targetDir: string;
}): AdaptPlan {
  const targetDir = path.resolve(options.targetDir);
  const pluginName = manifestName(options.adapterName);

  return {
    packageName: options.packageName,
    adapterName: options.adapterName,
    targetDir,
    files: [
      {
        path: 'src/index.ts',
        content: buildIndexTs(options.packageName, options.adapterName)
      },
      {
        path: 'src/config/plugin-config.ts',
        content: buildPluginConfigTs(options.adapterName)
      },
      {
        path: '.stratix/plugin.json',
        content:
          JSON.stringify(
            {
              schemaVersion: 1,
              name: pluginName,
              version: '0.1.0',
              capabilities: ['adapter'],
              provides: [],
              requires: [],
              health: true,
              externalPackage: options.packageName
            },
            null,
            2
          ) + '\n'
      },
      {
        path: 'tests/smoke.test.ts',
        content: buildSmokeTest(options.adapterName)
      }
    ]
  };
}

export function writeAdaptPlan(plan: AdaptPlan, force = false): void {
  for (const file of plan.files) {
    const destination = path.join(plan.targetDir, file.path);
    if (fileExists(destination) && !force) {
      throw new CliError(
        `Target file already exists: ${destination}. Use --force to overwrite.`
      );
    }
  }

  for (const file of plan.files) {
    const destination = path.join(plan.targetDir, file.path);
    if (file.path.endsWith('.json')) {
      writeJsonFile(destination, JSON.parse(file.content));
    } else {
      writeTextFile(destination, file.content);
    }
  }
}
