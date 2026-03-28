import path from 'node:path';
import type { Contribution } from '../schemas/template.js';
import type { ProjectManifest } from '../schemas/project.js';
import { toPascalCase } from '../utils/case.js';

export interface GeneratedProjectContext {
  projectName: string;
  packageName: string;
  runtime: ProjectManifest['runtime'];
  kind: ProjectManifest['kind'];
  type: string;
  presets: string[];
  contribution: Contribution;
}

export interface GeneratedFile {
  destination: string;
  content: string;
}

export type ManagedFilesMode = 'full' | 'project-only';

function stringifyTsObject(value: unknown): string {
  return JSON.stringify(value, null, 2)
    .replace(/"([^"]+)":/g, '$1:')
    .replace(/"/g, '\'');
}

function createIndexTs(context: GeneratedProjectContext): string {
  const invocation =
    context.runtime === 'web'
      ? '()'
      : `({ type: '${context.runtime}' })`;

  return `import { Stratix } from '@stratix/core';

await Stratix.run${invocation};
`;
}

function createPluginIndexTs(context: GeneratedProjectContext): string {
  const pluginFunctionName = context.projectName
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
  const optionsTypeName = `${toPascalCase(context.type)}PluginOptions`;

  return `import type { FastifyInstance } from '@stratix/core';
import { withRegisterAutoDI } from '@stratix/core';
import type { ${optionsTypeName} } from './config/plugin-config.js';

async function ${pluginFunctionName}(
  fastify: FastifyInstance,
  _options: ${optionsTypeName}
): Promise<void> {
  fastify.log.info('Initializing ${context.projectName} plugin...');
}

export default withRegisterAutoDI<${optionsTypeName}>(${pluginFunctionName}, {
  discovery: {
    patterns: [
      'controllers/*.{ts,js}',
      'services/*.{ts,js}',
      'repositories/*.{ts,js}',
      'executors/*.{ts,js}'
    ]
  },
  services: {
    enabled: true,
    patterns: ['adapters/*.{ts,js}']
  }
});
`;
}

function createPluginConfigTs(context: GeneratedProjectContext): string {
  const typeName = `${toPascalCase(context.type)}PluginOptions`;
  const defaultsFactory = `define${toPascalCase(context.type)}PluginDefaults`;

  return `export interface ${typeName} {
  debug?: boolean;
}

export function ${defaultsFactory}(): ${typeName} {
  return {
    debug: false
  };
}
`;
}

function presetImports(presets: string[]): string[] {
  const imports: string[] = [];
  if (presets.includes('database')) {
    imports.push(`import databasePlugin from '@stratix/database';`);
  }
  if (presets.includes('redis')) {
    imports.push(`import redisPlugin from '@stratix/redis';`);
  }
  if (presets.includes('queue')) {
    imports.push(`import queuePlugin from '@stratix/queue';`);
  }
  if (presets.includes('tasks')) {
    imports.push(`import tasksPlugin from '@stratix/tasks';`);
  }
  if (presets.includes('ossp')) {
    imports.push(`import osspPlugin from '@stratix/ossp';`);
  }
  if (presets.includes('was-v7')) {
    imports.push(`import wasV7Plugin from '@stratix/was-v7';`);
  }
  if (presets.includes('devtools')) {
    imports.push(`import devtoolsPlugin from '@stratix/devtools';`);
  }
  return imports;
}

function presetPluginEntries(presets: string[]): string[] {
  const entries: string[] = [];
  if (presets.includes('database')) {
    entries.push(`    {
      name: '@stratix/database',
      plugin: databasePlugin,
      options: {
        connections: {
          default: {
            type: 'mysql' as const,
            host: databaseConfig.host || 'localhost',
            port: Number(databaseConfig.port || 3306),
            database: databaseConfig.database || 'app',
            username: databaseConfig.username || 'root',
            password: databaseConfig.password || ''
          }
        }
      }
    }`);
  }
  if (presets.includes('redis')) {
    entries.push(`    {
      name: '@stratix/redis',
      plugin: redisPlugin,
      options: {
        single: {
          host: redisConfig.host || 'localhost',
          port: Number(redisConfig.port || 6379),
          password: redisConfig.password || undefined,
          db: Number(redisConfig.db || 0)
        }
      }
    }`);
  }
  if (presets.includes('queue')) {
    entries.push(`    {
      name: '@stratix/queue',
      plugin: queuePlugin,
      options: {}
    }`);
  }
  if (presets.includes('tasks')) {
    entries.push(`    {
      name: '@stratix/tasks',
      plugin: tasksPlugin,
      options: {}
    }`);
  }
  if (presets.includes('ossp')) {
    entries.push(`    {
      name: '@stratix/ossp',
      plugin: osspPlugin,
      options: {
        endPoint: osspConfig.endPoint || 'localhost',
        accessKey: osspConfig.accessKey || 'minioadmin',
        secretKey: osspConfig.secretKey || 'minioadmin'
      }
    }`);
  }
  if (presets.includes('was-v7')) {
    entries.push(`    {
      name: '@stratix/was-v7',
      plugin: wasV7Plugin,
      options: {
        appId: wasV7Config.appId || 'your-app-id',
        appSecret: wasV7Config.appSecret || 'your-app-secret',
        baseUrl: wasV7Config.baseUrl || 'https://openapi.wps.cn'
      }
    }`);
  }
  if (presets.includes('devtools')) {
    entries.push(`    {
      name: '@stratix/devtools',
      plugin: devtoolsPlugin,
      options: {}
    }`);
  }
  return entries;
}

function createGeneratedConfigTs(context: GeneratedProjectContext): string {
  const imports = presetImports(context.presets).join('\n');
  const databaseConfig =
    context.presets.includes('database')
      ? `  const databaseConfig = sensitiveConfig.database || {};\n`
      : '';
  const redisConfig =
    context.presets.includes('redis')
      ? `  const redisConfig = sensitiveConfig.redis || {};\n`
      : '';
  const osspConfig =
    context.presets.includes('ossp')
      ? `  const osspConfig = sensitiveConfig.ossp || {};\n`
      : '';
  const wasV7Config =
    context.presets.includes('was-v7')
      ? `  const wasV7Config = sensitiveConfig.wasV7 || {};\n`
      : '';
  const pluginEntries = presetPluginEntries(context.presets).join(',\n');

  return `import type { StratixConfig } from '@stratix/core';
${imports}

export function createGeneratedConfig(
  sensitiveConfig: Record<string, any> = {}
): StratixConfig {
${databaseConfig}${redisConfig}${osspConfig}${wasV7Config}  return {
    server: {
      host: '0.0.0.0',
      port: Number(process.env.PORT || 3000)
    },
    plugins: [
${pluginEntries}
    ],
    autoLoad: {},
    applicationAutoDI: {
      enabled: true
    }
  };
}
`;
}

function createStratixConfigTs(): string {
  return `import type { StratixConfig } from '@stratix/core';
import { createGeneratedConfig } from './config/stratix.generated.js';

export default (sensitiveConfig: Record<string, any> = {}): StratixConfig => {
  const config = createGeneratedConfig(sensitiveConfig);

  return {
    ...config
  };
};
`;
}

function createPackageJson(context: GeneratedProjectContext): string {
  const packageJson = {
    name: context.packageName,
    version: '0.1.0',
    private: true,
    type: 'module',
    main: 'dist/index.js',
    scripts: context.contribution.scripts || {},
    dependencies: context.contribution.dependencies?.runtime || {},
    devDependencies: context.contribution.dependencies?.dev || {},
    engines: {
      node: '>=24.0.0'
    }
  };

  return JSON.stringify(packageJson, null, 2) + '\n';
}

function createTsConfig(): string {
  return JSON.stringify(
    {
      extends: '@tsconfig/recommended/tsconfig.json',
      compilerOptions: {
        target: 'ESNext',
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        types: ['node'],
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        sourceMap: true,
        declaration: true,
        declarationMap: true
      },
      include: ['src/**/*']
    },
    null,
    2
  ) + '\n';
}

function createEnvExample(contribution: Contribution): string {
  const lines = (contribution.env || []).map((item) => {
    const suffix = item.description ? ` # ${item.description}` : '';
    const value = item.default || '';
    return `${item.key}=${value}${suffix}`;
  });
  return lines.length > 0 ? lines.join('\n') + '\n' : '';
}

export function createManagedFiles(
  context: GeneratedProjectContext,
  projectManifest: ProjectManifest,
  mode: ManagedFilesMode = 'full'
): GeneratedFile[] {
  const files: GeneratedFile[] = [
    {
      destination: path.join('.stratix', 'project.json'),
      content: JSON.stringify(projectManifest, null, 2) + '\n'
    }
  ];

  if (mode === 'project-only') {
    return files;
  }

  files.unshift(
    {
      destination: 'package.json',
      content: createPackageJson(context)
    },
    {
      destination: 'tsconfig.json',
      content: createTsConfig()
    },
    {
      destination: '.env.example',
      content: createEnvExample(context.contribution)
    }
  );

  if (context.kind === 'app') {
    files.push(
      {
        destination: path.join('src', 'index.ts'),
        content: createIndexTs(context)
      },
      {
        destination: path.join('src', 'stratix.config.ts'),
        content: createStratixConfigTs()
      },
      {
        destination: path.join('src', 'config', 'stratix.generated.ts'),
        content: createGeneratedConfigTs(context)
      }
    );
  } else {
    files.push(
      {
        destination: path.join('src', 'index.ts'),
        content: createPluginIndexTs(context)
      },
      {
        destination: path.join('src', 'config', 'plugin-config.ts'),
        content: createPluginConfigTs(context)
      }
    );
  }

  return files;
}

export function mergePackageJsonContent(
  currentRaw: string,
  contribution: Contribution
): string {
  const parsed = JSON.parse(currentRaw) as Record<string, any>;
  parsed.scripts = {
    ...(parsed.scripts || {}),
    ...(contribution.scripts || {})
  };
  parsed.dependencies = {
    ...(parsed.dependencies || {}),
    ...(contribution.dependencies?.runtime || {})
  };
  parsed.devDependencies = {
    ...(parsed.devDependencies || {}),
    ...(contribution.dependencies?.dev || {})
  };
  return JSON.stringify(parsed, null, 2) + '\n';
}

export function createProjectManifestContent(projectManifest: ProjectManifest): string {
  return JSON.stringify(projectManifest, null, 2) + '\n';
}

export function createProjectManifestObject(
  context: GeneratedProjectContext,
  packageManager: ProjectManifest['packageManager']
): ProjectManifest {
  return {
    schemaVersion: 1,
    kind: context.kind,
    type: context.type,
    runtime: context.runtime,
    templateId: `${context.kind}:${context.type}`,
    templateVersion: '1.0.0',
    packageManager,
    presets: context.presets,
    policies:
      context.contribution.policies || {
        layering: [],
        forbidServiceDatabasePlugin: false,
        forbidControllerDatabaseAccess: false,
        controllerDecoratorPrefix: false,
        pluginTokenFromFunctionName: false
      }
  };
}
