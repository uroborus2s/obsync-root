import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { CliError } from '../src/core/errors.js';
import type { CliOutput } from '../src/core/output.js';
import { runCli } from '../src/run-cli.js';
import { runCreate } from '../../create/src/run-create.ts';

interface MemoryOutput extends CliOutput {
  messages: Array<{ level: string; message: string }>;
}

interface PromptChoice {
  label: string;
  value: string;
}

interface TestPrompter {
  select(
    message: string,
    choices: PromptChoice[],
    options?: { defaultValue?: string }
  ): Promise<string>;
  text(
    message: string,
    options?: { defaultValue?: string; allowEmpty?: boolean }
  ): Promise<string>;
  confirm(
    message: string,
    options?: { defaultValue?: boolean }
  ): Promise<boolean>;
  close?(): void | Promise<void>;
}

function createMemoryOutput(): MemoryOutput {
  const messages: Array<{ level: string; message: string }> = [];

  const push = (level: string, message: string) => {
    messages.push({ level, message });
  };

  return {
    messages,
    info(message: string) {
      push('info', message);
    },
    warn(message: string) {
      push('warn', message);
    },
    error(message: string) {
      push('error', message);
    },
    success(message: string) {
      push('success', message);
    },
    log(message: string) {
      push('log', message);
    }
  };
}

function createScriptedPrompter(
  answers: string[],
  prompts: string[] = []
): TestPrompter {
  let index = 0;

  const nextAnswer = (fallback = '') => {
    const answer = answers[index];
    index += 1;
    return answer ?? fallback;
  };

  return {
    async select(message, choices, options) {
      prompts.push(message);
      const answer = nextAnswer(
        options?.defaultValue ?? choices[0]?.value ?? ''
      );
      return answer;
    },
    async text(message, options) {
      prompts.push(message);
      const answer = nextAnswer(options?.defaultValue ?? '');
      if (!answer && options?.allowEmpty !== true) {
        return options?.defaultValue ?? '';
      }
      return answer;
    },
    async confirm(message, options) {
      prompts.push(message);
      const answer = nextAnswer(options?.defaultValue ? 'yes' : 'no')
        .trim()
        .toLowerCase();
      return ['y', 'yes', 'true', '1'].includes(answer);
    }
  };
}

const tempRoots: string[] = [];
const testRequire = createRequire(import.meta.url);

function createTempRoot(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stratix-cli-'));
  tempRoots.push(root);
  return root;
}

function readJson(filePath: string): any {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

function seedProjectTypescript(projectDir: string): void {
  const typescriptRoot = path.dirname(
    testRequire.resolve('typescript/package.json')
  );
  const target = path.join(projectDir, 'node_modules', 'typescript');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) {
    fs.symlinkSync(typescriptRoot, target, 'dir');
  }
}

function seedWorkspacePackage(
  rootDir: string,
  packageDir: string,
  packageJson: Record<string, unknown>
): void {
  const targetDir = path.join(rootDir, 'packages', packageDir);
  fs.mkdirSync(targetDir, { recursive: true });
  fs.writeFileSync(
    path.join(targetDir, 'package.json'),
    JSON.stringify(packageJson, null, 2),
    'utf8'
  );
}

function seedWorkspaceRoot(rootDir: string): void {
  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify(
      {
        name: '@stratix/workspace-fixture',
        private: true,
        scripts: {
          'build:supported': 'echo build',
          'test:supported': 'echo test',
          'security:audit': 'echo security'
        }
      },
      null,
      2
    ),
    'utf8'
  );
}

function seedReleaseWorkspacePackage(
  rootDir: string,
  packageDir: string,
  overrides: Record<string, unknown> = {}
): void {
  seedWorkspacePackage(rootDir, packageDir, {
    name: '@stratix/core',
    version: '1.1.0',
    description: 'Core runtime package for Stratix framework applications',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    files: ['dist'],
    keywords: ['stratix', 'framework'],
    license: 'MIT',
    publishConfig: {
      access: 'public'
    },
    ...overrides
  });
}

function seedFakeReleaseGateBins(rootDir: string): string {
  const binDir = path.join(rootDir, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  fs.writeFileSync(
    path.join(binDir, 'pnpm'),
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      "if (args.includes('pack')) {",
      "  const filterIndex = args.indexOf('--filter');",
      "  const name = filterIndex >= 0 ? args[filterIndex + 1] : '@stratix/core';",
      "  const files = JSON.parse(process.env.STRATIX_FAKE_PACK_FILES || '[]');",
      "  console.log(JSON.stringify({ name, version: '1.1.0', filename: `/tmp/${name.replace('@stratix/', 'stratix-')}.tgz`, files: files.map((file) => ({ path: file })) }));",
      '  process.exit(0);',
      '}',
      'process.exit(0);'
    ].join('\n'),
    'utf8'
  );
  fs.chmodSync(path.join(binDir, 'pnpm'), 0o755);

  fs.writeFileSync(
    path.join(binDir, 'git'),
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      "const currentSha = '1111111111111111111111111111111111111111';",
      "const oldSha = '0000000000000000000000000000000000000000';",
      "if (args[0] === 'rev-parse' && args[1] === '--verify') {",
      "  if (args[2] === 'HEAD') {",
      '    console.log(currentSha);',
      '    process.exit(0);',
      '  }',
      "  if (process.env.STRATIX_FAKE_GIT_TAGS === 'present') {",
      "    console.log(process.env.STRATIX_FAKE_GIT_TAG_SHA === 'old' ? oldSha : currentSha);",
      '    process.exit(0);',
      '  }',
      '  process.exit(1);',
      '}',
      'process.exit(1);'
    ].join('\n'),
    'utf8'
  );
  fs.chmodSync(path.join(binDir, 'git'), 0o755);

  fs.writeFileSync(
    path.join(binDir, 'npm'),
    [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2);',
      "if (args[0] === 'view') {",
      "  if (process.env.STRATIX_FAKE_NPM_VIEW === 'published') {",
      "    console.log(JSON.stringify(process.env.STRATIX_FAKE_NPM_VERSION || '1.1.0'));",
      '    process.exit(0);',
      '  }',
      "  console.error('npm error code E404');",
      "  console.error('npm error 404 Not Found');",
      '  process.exit(1);',
      '}',
      'process.exit(1);'
    ].join('\n'),
    'utf8'
  );
  fs.chmodSync(path.join(binDir, 'npm'), 0o755);

  return binDir;
}

afterEach(() => {
  for (const root of tempRoots.splice(0, tempRoots.length)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

function seedProjectCoreModule(rootDir: string): string {
  const packageRoot = path.join(rootDir, 'node_modules', '@stratix', 'core');
  fs.mkdirSync(packageRoot, { recursive: true });

  fs.writeFileSync(
    path.join(packageRoot, 'package.json'),
    JSON.stringify(
      {
        name: '@stratix/core',
        type: 'module',
        exports: './index.js'
      },
      null,
      2
    ),
    'utf8'
  );

  const outputPath = path.join(rootDir, '.mock-last-run.json');
  fs.writeFileSync(
    path.join(packageRoot, 'index.js'),
    [
      "import fs from 'node:fs';",
      `const outputPath = ${JSON.stringify(outputPath)};`,
      'export const Stratix = {',
      '  async run(options) {',
      "    fs.writeFileSync(outputPath, JSON.stringify(options, null, 2), 'utf8');",
      '  }',
      '};'
    ].join('\n'),
    'utf8'
  );

  fs.writeFileSync(
    path.join(rootDir, 'package.json'),
    JSON.stringify(
      {
        name: 'start-fixture',
        private: true,
        type: 'module'
      },
      null,
      2
    ),
    'utf8'
  );

  return outputPath;
}

describe('@stratix/forge', () => {
  it('uses create fixture for an api application scaffold', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'demo-api', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'demo-api');
    const manifest = readJson(
      path.join(projectDir, '.stratix', 'project.json')
    );
    const packageJson = readJson(path.join(projectDir, 'package.json'));
    const generatedConfig = readText(
      path.join(projectDir, 'src', 'config', 'stratix.generated.ts')
    );

    assert.equal(manifest.schemaVersion, 2);
    assert.equal(manifest.kind, 'app');
    assert.equal(manifest.type, 'api');
    assert.ok(manifest.presets.includes('testing'));
    assert.ok(
      manifest.template.contribution.dependencies.dev['@stratix/forge']
    );
    assert.equal(packageJson.dependencies['@stratix/core'], '^1.1.0');
    assert.equal(packageJson.devDependencies['@stratix/forge'], '^1.1.0');
    assert.equal(packageJson.devDependencies['@stratix/cli'], undefined);
    assert.doesNotMatch(generatedConfig, /applicationAutoDI/);
    assert.match(generatedConfig, /discovery:\s*\{/);
    assert.match(
      readText(path.join(projectDir, 'src', 'index.ts')),
      /await Stratix\.run\(\)/
    );
    assert.match(
      readText(
        path.join(projectDir, 'src', 'controllers', 'HealthController.ts')
      ),
      /@Get\('\/health',\s*\{/
    );
    assert.ok(output.messages.some((message) => message.level === 'success'));
  });

  it('uses create fixture for a web-admin application scaffold', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'web-admin', 'demo-admin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'demo-admin');
    const manifest = readJson(
      path.join(projectDir, '.stratix', 'project.json')
    );
    const packageJson = readJson(path.join(projectDir, 'package.json'));

    assert.equal(manifest.kind, 'app');
    assert.equal(manifest.type, 'web-admin');
    assert.equal(manifest.runtime, 'web');
    assert.equal(packageJson.name, 'demo-admin');
    assert.equal(packageJson.dependencies['@stratix/core'], undefined);
    assert.match(packageJson.scripts.dev, /^vite$/);
    assert.match(
      readText(path.join(projectDir, 'src', 'main.tsx')),
      /createRouter/
    );
    assert.match(
      readText(path.join(projectDir, 'src', 'layouts', 'admin-layout.tsx')),
      /AppWorkbench/
    );
    assert.match(readText(path.join(projectDir, '.gitignore')), /\.vscode\//);
    assert.match(readText(path.join(projectDir, '.gitignore')), /node_modules/);
    assert.match(
      readText(path.join(projectDir, '.gitignore')),
      /!\.env\.example/
    );
    assert.equal(
      fs.existsSync(path.join(projectDir, 'src', 'stratix.config.ts')),
      false
    );
  });

  it('uses create fixture prompts for missing project arguments', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();
    const prompts: string[] = [];

    await runCreate([], {
      cwd,
      output,
      prompter: createScriptedPrompter(
        ['app', 'web-admin', 'interactive-admin', 'admin-mock', 'pnpm', 'no'],
        prompts
      )
    });

    const projectDir = path.join(cwd, 'interactive-admin');
    const manifest = readJson(
      path.join(projectDir, '.stratix', 'project.json')
    );
    const packageJson = readJson(path.join(projectDir, 'package.json'));

    assert.equal(manifest.kind, 'app');
    assert.equal(manifest.type, 'web-admin');
    assert.ok(manifest.presets.includes('admin-mock'));
    assert.equal(packageJson.dependencies.msw, '^2.14.6');
    assert.match(readText(path.join(projectDir, '.gitignore')), /\.turbo/);
    assert.ok(prompts.some((prompt) => /project name/i.test(prompt)));
  });

  it('uses create fixture with the admin-mock preset', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      [
        'app',
        'web-admin',
        'mock-admin',
        '--preset',
        'admin-mock',
        '--no-install'
      ],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'mock-admin');
    const manifest = readJson(
      path.join(projectDir, '.stratix', 'project.json')
    );
    const packageJson = readJson(path.join(projectDir, 'package.json'));
    const mainSource = readText(path.join(projectDir, 'src', 'main.tsx'));

    assert.ok(manifest.presets.includes('admin-mock'));
    assert.equal(packageJson.dependencies.msw, '^2.14.6');
    assert.match(mainSource, /enableMocking/);
    assert.equal(
      fs.existsSync(path.join(projectDir, 'src', 'mocks', 'index.ts')),
      true
    );
  });

  it('uses create fixture for a data plugin scaffold', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['plugin', 'data', '@demo/data-plugin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'data-plugin');
    const manifest = readJson(
      path.join(projectDir, '.stratix', 'project.json')
    );
    const packageJson = readJson(path.join(projectDir, 'package.json'));
    const pluginIndex = readText(path.join(projectDir, 'src', 'index.ts'));

    assert.equal(manifest.kind, 'plugin');
    assert.equal(manifest.type, 'data');
    assert.deepEqual(manifest.presets, ['database', 'testing']);
    assert.equal(packageJson.name, '@demo/data-plugin');
    assert.equal(packageJson.dependencies['@stratix/core'], '^1.1.0');
    assert.equal(packageJson.dependencies['@stratix/database'], '^1.1.0');
    assert.equal(packageJson.devDependencies['@stratix/forge'], '^1.1.0');
    assert.equal(packageJson.devDependencies['@stratix/cli'], undefined);
    assert.match(pluginIndex, /withRegisterAutoDI<DataPluginOptions>/);
    assert.match(pluginIndex, /async function dataPlugin/);
  });

  it('generates controller-service-repository resources for app projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'resource-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'resource-app');

    await runCli(['generate', 'resource', 'order-item'], {
      cwd: projectDir,
      output
    });

    assert.match(
      readText(
        path.join(projectDir, 'src', 'controllers', 'OrderItemController.ts')
      ),
      /OrderItemService/
    );
    assert.match(
      readText(
        path.join(projectDir, 'src', 'controllers', 'OrderItemController.ts')
      ),
      /schema:\s*\{/
    );
    assert.match(
      readText(
        path.join(projectDir, 'src', 'controllers', 'OrderItemController.ts')
      ),
      /response:\s*\{/
    );
    assert.match(
      readText(path.join(projectDir, 'src', 'services', 'OrderItemService.ts')),
      /OrderItemRepository/
    );
    assert.match(
      readText(
        path.join(
          projectDir,
          'src',
          'repositories',
          'interfaces',
          'IOrderItemRepository.ts'
        )
      ),
      /IOrderItemRepository/
    );
  });

  it('refuses to overwrite generated resources unless --force is provided', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'overwrite-resource-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'overwrite-resource-app');
    const controllerPath = path.join(
      projectDir,
      'src',
      'controllers',
      'OrderItemController.ts'
    );

    await runCli(['generate', 'resource', 'order-item'], {
      cwd: projectDir,
      output
    });
    fs.appendFileSync(controllerPath, '\n// user edit\n', 'utf8');

    await assert.rejects(
      runCli(['generate', 'resource', 'order-item'], {
        cwd: projectDir,
        output
      }),
      (error) =>
        error instanceof CliError &&
        error.message.includes('already exists') &&
        error.message.includes('--force')
    );
    assert.match(readText(controllerPath), /user edit/);

    await runCli(['generate', 'resource', 'order-item', '--force'], {
      cwd: projectDir,
      output
    });
    assert.doesNotMatch(readText(controllerPath), /user edit/);
  });

  it('generates an admin page resource for web-admin projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'web-admin', 'page-admin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'page-admin');

    await runCli(['generate', 'admin-page', 'notice-center'], {
      cwd: projectDir,
      output
    });

    assert.match(
      readText(
        path.join(
          projectDir,
          'src',
          'routes',
          '_authenticated',
          'notice-center.tsx'
        )
      ),
      /createFileRoute\('\/_authenticated\/notice-center'\)/
    );
    assert.match(
      readText(
        path.join(
          projectDir,
          'src',
          'features',
          'notice-center',
          'pages',
          'notice-center-page.tsx'
        )
      ),
      /export function NoticeCenterPage\(\)/
    );
    assert.match(
      readText(
        path.join(projectDir, 'src', 'features', 'notice-center', 'index.ts')
      ),
      /export \{ NoticeCenterPage \}/
    );
  });

  it('rejects admin-page generation outside web-admin projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'non-admin-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'non-admin-app');

    await assert.rejects(
      runCli(['generate', 'admin-page', 'notice-center'], {
        cwd: projectDir,
        output
      }),
      /admin-page generation is only available for app:web-admin projects/
    );
  });

  it('generates an admin crud resource for web-admin projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'web-admin', 'crud-admin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'crud-admin');

    await runCli(['generate', 'admin-crud', 'project-member'], {
      cwd: projectDir,
      output
    });

    assert.match(
      readText(
        path.join(
          projectDir,
          'src',
          'routes',
          '_authenticated',
          'project-members.tsx'
        )
      ),
      /createFileRoute\('\/_authenticated\/project-members'\)/
    );
    assert.match(
      readText(
        path.join(
          projectDir,
          'src',
          'features',
          'project-members',
          'pages',
          'project-members-page.tsx'
        )
      ),
      /export function ProjectMemberPage\(\)/
    );
    assert.match(
      readText(
        path.join(
          projectDir,
          'src',
          'features',
          'project-members',
          'hooks',
          'use-project-members.ts'
        )
      ),
      /export function useProjectMemberCrud\(\)/
    );
    assert.match(
      readText(
        path.join(
          projectDir,
          'src',
          'features',
          'project-members',
          'components',
          'project-members-form-sheet.tsx'
        )
      ),
      /export function ProjectMemberFormSheet\(/
    );
  });

  it('rejects admin-crud generation outside web-admin projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'non-admin-crud-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'non-admin-crud-app');

    await assert.rejects(
      runCli(['generate', 'admin-crud', 'project-member'], {
        cwd: projectDir,
        output
      }),
      /admin-crud generation is only available for app:web-admin projects/
    );
  });

  it('generates business repository resources for database-enabled projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      ['plugin', 'data', '@demo/business-plugin', '--no-install'],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'business-plugin');

    await runCli(['generate', 'business-repository', 'workflow-execution'], {
      cwd: projectDir,
      output
    });

    const source = readText(
      path.join(
        projectDir,
        'src',
        'repositories',
        'WorkflowExecutionBusinessRepository.ts'
      )
    );

    assert.match(
      source,
      /import \{ BaseRepository, type DatabaseConnectionProvider \} from '@stratix\/database';/
    );
    assert.match(source, /extends BaseRepository/);
    assert.match(
      source,
      /constructor\(database: DatabaseConnectionProvider, logger: Logger\) \{/
    );
    assert.match(source, /super\(\{ database \}\);/);
    assert.doesNotMatch(source, /super\(\);/);
    assert.match(source, /claimById/);
    assert.match(source, /compareAndSet/);
    assert.match(source, /workflow_execution_outbox/);
  });

  it('rejects business repository generation without the database preset', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'no-db-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'no-db-app');

    await assert.rejects(
      runCli(['generate', 'business-repository', 'workflow-execution'], {
        cwd: projectDir,
        output
      }),
      /requires a project with the database preset/
    );
  });

  it('adds presets and regenerates managed files', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'preset-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'preset-app');

    await runCli(['add', 'preset', 'redis', '--no-install'], {
      cwd: projectDir,
      output
    });

    const manifest = readJson(
      path.join(projectDir, '.stratix', 'project.json')
    );
    const packageJson = readJson(path.join(projectDir, 'package.json'));
    const generatedConfig = readText(
      path.join(projectDir, 'src', 'config', 'stratix.generated.ts')
    );
    const envExample = readText(path.join(projectDir, '.env.example'));

    assert.ok(manifest.presets.includes('redis'));
    assert.equal(packageJson.dependencies['@stratix/redis'], '^1.0.0-beta.2');
    assert.match(generatedConfig, /import redisPlugin from '@stratix\/redis';/);
    assert.match(envExample, /REDIS_HOST=localhost/);
  });

  it('adds testing preset to a web-admin project without restoring server scaffold files', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'web-admin', 'preset-admin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'preset-admin');

    await runCli(['add', 'preset', 'testing', '--no-install'], {
      cwd: projectDir,
      output
    });

    const manifest = readJson(
      path.join(projectDir, '.stratix', 'project.json')
    );

    assert.deepEqual(manifest.presets, ['testing']);
    assert.equal(
      fs.existsSync(path.join(projectDir, 'src', 'stratix.config.ts')),
      false
    );
    assert.equal(
      fs.existsSync(
        path.join(projectDir, 'src', '__tests__', 'project.smoke.test.ts')
      ),
      true
    );
  });

  it('adds admin-mock preset to a web-admin project', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'web-admin', 'mock-preset-admin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'mock-preset-admin');

    await runCli(['add', 'preset', 'admin-mock', '--no-install'], {
      cwd: projectDir,
      output
    });

    const manifest = readJson(
      path.join(projectDir, '.stratix', 'project.json')
    );
    const packageJson = readJson(path.join(projectDir, 'package.json'));

    assert.ok(manifest.presets.includes('admin-mock'));
    assert.equal(packageJson.dependencies.msw, '^2.14.6');
    assert.match(
      readText(path.join(projectDir, 'src', 'main.tsx')),
      /enableMocking/
    );
  });

  it('doctor reports service-layer database access violations', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'doctor-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'doctor-app');
    fs.writeFileSync(
      path.join(projectDir, 'src', 'services', 'BrokenService.ts'),
      "import { BaseRepository } from '@stratix/database';\nexport default class BrokenService {}\n",
      'utf8'
    );

    await assert.rejects(
      runCli(['doctor'], {
        cwd: projectDir,
        output
      }),
      CliError
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'Service layer must not access database plugin directly'
        )
      )
    );
  });

  it('doctor reports removed database public APIs in new projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      ['plugin', 'data', '@demo/doctor-data-plugin', '--no-install'],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'doctor-data-plugin');
    fs.writeFileSync(
      path.join(projectDir, 'src', 'repositories', 'LegacyApiRepository.ts'),
      [
        "import type { DatabaseAPI } from '@stratix/database';",
        "import { withTransaction } from '@stratix/database';",
        'export type LegacyDb = DatabaseAPI;',
        'void withTransaction;'
      ].join('\n'),
      'utf8'
    );

    await assert.rejects(
      runCli(['doctor'], {
        cwd: projectDir,
        output
      }),
      CliError
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'DatabaseAPI was removed in @stratix/database 1.1.0'
        )
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'Public database transaction helpers were removed in @stratix/database 1.1.0'
        )
      )
    );
  });

  it('doctor di reports missing constructor dependencies', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'doctor-di-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'doctor-di-app');
    fs.writeFileSync(
      path.join(projectDir, 'src', 'services', 'BrokenService.ts'),
      [
        "import { Service } from '@stratix/core';",
        '@Service()',
        'export class BrokenService {',
        '  constructor(private missingRepository: unknown) {}',
        '}'
      ].join('\n'),
      'utf8'
    );

    await assert.rejects(
      runCli(['doctor', 'di'], {
        cwd: projectDir,
        output
      }),
      CliError
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'DI missing dependency: brokenService -> missingRepository'
        )
      )
    );
  });

  it('doctor di passes for generated projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'doctor-di-ok-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'doctor-di-ok-app');

    await runCli(['doctor', 'di'], {
      cwd: projectDir,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('DI doctor checks passed.')
      )
    );
  });

  it('doctor di passes after generating app resources', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'doctor-di-resource-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'doctor-di-resource-app');
    await runCli(['generate', 'resource', 'order-item'], {
      cwd: projectDir,
      output
    });

    await runCli(['doctor', 'di'], {
      cwd: projectDir,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('DI doctor checks passed.')
      )
    );
  });

  it('prints doctor subcommand help', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['doctor', 'di', '--help'], {
      cwd,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'Usage: stratix doctor [di|modules|plugins] [options]'
        )
      )
    );
    const helpText = output.messages
      .map((message) => message.message)
      .join('\n');
    assert.match(helpText, /doctor di\s+Validate Stratix DI tokens/);
    assert.match(helpText, /doctor modules\s+Validate module\.yaml manifests/);
    assert.match(helpText, /doctor plugins\s+Validate \.stratix\/plugin\.json/);
  });

  it('prints DI graph as JSON and Mermaid', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'di-graph-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'di-graph-app');

    await runCli(['di', 'graph', '--format', 'json'], {
      cwd: projectDir,
      output
    });
    await runCli(['di', 'graph', '--format', 'mermaid'], {
      cwd: projectDir,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('"token": "healthController"')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'healthController["healthController"] --> healthService["healthService"]'
        )
      )
    );
  });

  it('prints DI command help', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['di', 'graph', '--help'], {
      cwd,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Usage: stratix di <graph> [options]')
      )
    );
  });

  it('generates a module manifest and validates module governance', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'module-governance-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'module-governance-app');

    await runCli(['generate', 'module', 'billing-account'], {
      cwd: projectDir,
      output
    });

    const moduleManifest = readText(
      path.join(projectDir, 'src', 'modules', 'billing-account', 'module.yaml')
    );

    assert.match(moduleManifest, /name: billing-account/);
    assert.match(moduleManifest, /root: src\/modules\/billing-account/);
    assert.match(moduleManifest, /billingAccountController/);
    assert.match(moduleManifest, /openapiTag: Billing Account/);

    await runCli(['doctor', 'modules'], {
      cwd: projectDir,
      output
    });
    await runCli(['graph', 'modules', '--format', 'json'], {
      cwd: projectDir,
      output
    });
    await runCli(['graph', 'modules', '--format', 'mermaid'], {
      cwd: projectDir,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Module doctor checks passed.')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes('"name": "billing-account"')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes('"token": "billingAccountController"')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'billingAccount["billing-account"] --> billingAccountController["billingAccountController"]'
        )
      )
    );
  });

  it('doctor modules reports invalid module manifests', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'broken-module-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'broken-module-app');

    await runCli(['generate', 'module', 'payments'], {
      cwd: projectDir,
      output
    });

    fs.writeFileSync(
      path.join(projectDir, 'src', 'modules', 'payments', 'module.yaml'),
      [
        'name: payments',
        'title: Payments',
        'root: src/modules/not-payments',
        'layers:',
        '  controllers: controllers/**/*.ts',
        'boundaries:',
        '  owns:',
        '    - missingPaymentToken'
      ].join('\n'),
      'utf8'
    );

    await assert.rejects(
      runCli(['doctor', 'modules'], {
        cwd: projectDir,
        output
      }),
      CliError
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Module root mismatch: payments')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'Module boundary owns unknown token: payments -> missingPaymentToken'
        )
      )
    );
  });

  it('generates and validates plugin manifests and topology graphs', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['plugin', 'data', '@demo/cache-plugin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'cache-plugin');
    const pluginManifest = readJson(
      path.join(projectDir, '.stratix', 'plugin.json')
    );

    assert.equal(pluginManifest.schemaVersion, 1);
    assert.equal(pluginManifest.name, '@demo/cache-plugin');
    assert.equal(pluginManifest.version, '0.1.0');
    assert.deepEqual(pluginManifest.capabilities, ['data']);
    assert.deepEqual(pluginManifest.provides, ['cachePluginApi']);
    assert.deepEqual(pluginManifest.requires, ['@stratix/database']);
    assert.equal(pluginManifest.health, true);

    await runCli(['doctor', 'plugins'], {
      cwd: projectDir,
      output
    });
    await runCli(['graph', 'plugins', '--format', 'json'], {
      cwd: projectDir,
      output
    });
    await runCli(['graph', 'plugins', '--format', 'mermaid'], {
      cwd: projectDir,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Plugin doctor checks passed.')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes('"capability": "data"')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'cachePlugin["@demo/cache-plugin"] --> cachePluginApi["cachePluginApi"]'
        )
      )
    );
  });

  it('doctor plugins reports invalid plugin manifests', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      ['plugin', 'adapter', '@demo/broken-plugin', '--no-install'],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'broken-plugin');
    fs.writeFileSync(
      path.join(projectDir, '.stratix', 'plugin.json'),
      JSON.stringify(
        {
          schemaVersion: 1,
          name: '@demo/broken-plugin',
          version: '0.1.0',
          provides: ['brokenPluginClient'],
          requires: ['@demo/missing-plugin'],
          health: true
        },
        null,
        2
      ),
      'utf8'
    );

    await assert.rejects(
      runCli(['doctor', 'plugins'], {
        cwd: projectDir,
        output
      }),
      CliError
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'Plugin manifest is missing required field: capabilities'
        )
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'Plugin dependency is not installed: @demo/missing-plugin'
        )
      )
    );
  });

  it('doctor plugins reports provides tokens that are not backed by adapters', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      ['plugin', 'adapter', '@demo/broken-plugin', '--no-install'],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'broken-plugin');
    const manifestPath = path.join(projectDir, '.stratix', 'plugin.json');
    const pluginManifest = readJson(manifestPath);
    pluginManifest.provides = ['brokenPluginGhost'];
    fs.writeFileSync(manifestPath, JSON.stringify(pluginManifest, null, 2));

    await assert.rejects(
      runCli(['doctor', 'plugins'], {
        cwd: projectDir,
        output
      }),
      CliError
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'Plugin manifest provides token is not backed by a discovered adapter: brokenPluginGhost'
        )
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'Discovered adapter tokens: brokenPluginClient'
        )
      )
    );
  });

  it('doctor plugins reports adapters that are missing from provides', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['plugin', 'data', '@demo/cache-plugin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'cache-plugin');
    fs.renameSync(
      path.join(projectDir, 'src', 'index.ts'),
      path.join(projectDir, 'src', 'index.mjs')
    );
    const manifestPath = path.join(projectDir, '.stratix', 'plugin.json');
    const pluginManifest = readJson(manifestPath);
    pluginManifest.provides = [];
    fs.writeFileSync(manifestPath, JSON.stringify(pluginManifest, null, 2));

    await assert.rejects(
      runCli(['doctor', 'plugins'], {
        cwd: projectDir,
        output
      }),
      CliError
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes(
          'Plugin adapter token is missing from manifest provides: cachePluginApi'
        )
      )
    );
  });

  it('builds a production manifest from project source contracts', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      [
        'app',
        'api',
        'production-manifest-app',
        '--preset',
        'redis',
        '--no-install'
      ],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'production-manifest-app');
    seedProjectTypescript(projectDir);
    const outputFile = path.join(
      projectDir,
      '.stratix',
      'production-manifest.json'
    );

    await runCli(['generate', 'module', 'billing-account'], {
      cwd: projectDir,
      output
    });
    await runCli(['build-manifest', '--output', outputFile], {
      cwd: projectDir,
      output
    });

    const manifest = readJson(outputFile);
    assert.equal(manifest.schemaVersion, 2);
    assert.equal(manifest.project.kind, 'app');
    assert.equal(manifest.discovery.routing.enabled, true);
    assert.equal(manifest.generator.name, '@stratix/forge');
    assert.equal(manifest.runtime.packageName, '@stratix/core');
    assert.equal(manifest.registrationPlan.source, 'production-manifest');
    assert.ok(
      manifest.registrationPlan.tokens.some(
        (token: { token: string; metadata: { sourceFile: string } }) =>
          token.token === 'healthController' &&
          token.metadata.sourceFile === 'src/controllers/HealthController.ts'
      )
    );
    assert.ok(
      manifest.registrationPlan.routes.some(
        (route: {
          method: string;
          path: string;
          metadata: { operationId: string };
        }) =>
          route.method === 'GET' &&
          route.path === '/health' &&
          route.metadata.operationId === 'HealthController_check'
      )
    );
    assert.equal(manifest.artifacts.algorithm, 'sha256');
    assert.ok(
      manifest.artifacts.files.some(
        (file: { sourceFile: string; sourceHash: string }) =>
          file.sourceFile === 'src/controllers/HealthController.ts' &&
          file.sourceHash.startsWith('sha256-')
      )
    );
    assert.ok(
      manifest.routes.some(
        (route: { method: string; path: string; operationId: string }) =>
          route.method === 'GET' &&
          route.path === '/health' &&
          route.operationId === 'HealthController_check'
      )
    );
    assert.ok(
      manifest.di.tokens.some(
        (token: { token: string }) => token.token === 'healthController'
      )
    );
    assert.ok(
      manifest.modules.some(
        (module: { name: string }) => module.name === 'billing-account'
      )
    );
    assert.ok(
      manifest.plugins.some(
        (plugin: { name: string; version: string }) =>
          plugin.name === '@stratix/redis' && plugin.version === '^1.0.0-beta.2'
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Production manifest generated')
      )
    );
  });

  it('fails release gate dry-run when production manifest v2 source hashes are stale', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      ['app', 'api', 'release-gate-stale-manifest', '--no-install'],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'release-gate-stale-manifest');
    const packageJsonPath = path.join(projectDir, 'package.json');
    const packageJson = readJson(packageJsonPath);
    packageJson.scripts = {
      ...packageJson.scripts,
      'security:audit': 'echo security'
    };
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf8'
    );
    seedProjectTypescript(projectDir);
    const manifestFile = path.join(
      projectDir,
      '.stratix',
      'production-manifest.json'
    );

    await runCli(['build-manifest', '--output', manifestFile], {
      cwd: projectDir,
      output
    });

    const manifest = readJson(manifestFile);
    assert.equal(manifest.schemaVersion, 2);
    assert.ok(Array.isArray(manifest.artifacts.files));
    assert.ok(manifest.artifacts.files.length > 0);
    manifest.artifacts.files[0].sourceHash = 'sha256-stale';
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

    await assert.rejects(
      runCli(['release', 'gate', '--dry-run', '--manifest', manifestFile], {
        cwd: projectDir,
        output
      }),
      (error) =>
        error instanceof CliError &&
        error.message.includes('source hash mismatch')
    );
  });

  it('runs the release gate in dry-run mode with production checks', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      ['app', 'api', 'release-gate-app', '--preset', 'redis', '--no-install'],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'release-gate-app');
    const packageJsonPath = path.join(projectDir, 'package.json');
    const packageJson = readJson(packageJsonPath);
    packageJson.scripts = {
      ...packageJson.scripts,
      'security:audit': 'echo security'
    };
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf8'
    );
    seedProjectTypescript(projectDir);
    const manifestFile = path.join(
      projectDir,
      '.stratix',
      'production-manifest.json'
    );

    await runCli(['build-manifest', '--output', manifestFile], {
      cwd: projectDir,
      output
    });
    await runCli(['release', 'gate', '--dry-run', '--manifest', manifestFile], {
      cwd: projectDir,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Release gate checks passed.')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes('build/test/docs/security/pack/api/manifest')
      )
    );
  });

  it('fails the release gate when the production manifest is missing', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'release-gate-missing', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'release-gate-missing');

    await assert.rejects(
      runCli(['release', 'gate', '--dry-run'], {
        cwd: projectDir,
        output
      }),
      CliError
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Production manifest not found')
      )
    );
  });

  it('fails release gate dry-run when the security script is missing', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      ['app', 'api', 'release-gate-no-security', '--no-install'],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'release-gate-no-security');
    seedProjectTypescript(projectDir);
    const manifestFile = path.join(
      projectDir,
      '.stratix',
      'production-manifest.json'
    );

    await runCli(['build-manifest', '--output', manifestFile], {
      cwd: projectDir,
      output
    });

    await assert.rejects(
      runCli(['release', 'gate', '--dry-run', '--manifest', manifestFile], {
        cwd: projectDir,
        output
      }),
      (error) =>
        error instanceof CliError &&
        error.message.includes('Release gate security')
    );
  });

  it('fails release gate dry-run when API route contracts are duplicated', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(
      ['app', 'api', 'release-gate-duplicate-api', '--no-install'],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'release-gate-duplicate-api');
    const packageJsonPath = path.join(projectDir, 'package.json');
    const packageJson = readJson(packageJsonPath);
    packageJson.scripts = {
      ...packageJson.scripts,
      'security:audit': 'echo security'
    };
    fs.writeFileSync(
      packageJsonPath,
      JSON.stringify(packageJson, null, 2),
      'utf8'
    );
    seedProjectTypescript(projectDir);
    const manifestFile = path.join(
      projectDir,
      '.stratix',
      'production-manifest.json'
    );

    await runCli(['build-manifest', '--output', manifestFile], {
      cwd: projectDir,
      output
    });

    const manifest = readJson(manifestFile);
    assert.ok(Array.isArray(manifest.routes) && manifest.routes.length > 0);
    manifest.routes.push({ ...manifest.routes[0] });
    fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2), 'utf8');

    await assert.rejects(
      runCli(['release', 'gate', '--dry-run', '--manifest', manifestFile], {
        cwd: projectDir,
        output
      }),
      (error) =>
        error instanceof CliError &&
        error.message.includes('duplicate route contract')
    );
  });

  it('plans workspace release readiness without requiring a production manifest', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core');

    await runCli(['release', 'gate', '--scope', 'workspace', '--dry-run'], {
      cwd,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('workspace release readiness')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes('@stratix/core@1.1.0')
      )
    );
    assert.equal(
      output.messages.some((message) =>
        message.message.includes('Production manifest not found')
      ),
      false
    );
  });

  it('includes offline install and registry reconciliation in the workspace release plan', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core');

    await runCli(
      [
        'release',
        'gate',
        '--scope',
        'workspace',
        '--dry-run',
        '--include-offline-install',
        '--include-registry'
      ],
      {
        cwd,
        output
      }
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('offline-install')
      )
    );
    assert.ok(
      output.messages.some((message) => message.message.includes('registry'))
    );
  });

  it('fails workspace release gate when package publish metadata is incomplete', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core', {
      publishConfig: undefined
    });

    await assert.rejects(
      runCli(['release', 'gate', '--scope', 'workspace', '--dry-run'], {
        cwd,
        output
      }),
      (error) =>
        error instanceof CliError &&
        error.message.includes('Release surface metadata is invalid')
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('publishConfig.access must be public')
      )
    );
  });

  it('fails workspace release plan when exported package subpaths leave dist', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core', {
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts'
        },
        './plugin': {
          import: './src/public/plugin.ts',
          types: './dist/types/public/plugin.d.ts'
        }
      }
    });

    await assert.rejects(
      runCli(['release', 'gate', '--scope', 'workspace', '--dry-run'], {
        cwd,
        output
      }),
      (error) =>
        error instanceof CliError &&
        error.message.includes('Release workspace API surface is invalid')
    );

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('exports must point into dist/')
      )
    );
  });

  it('fails workspace release gate when a package tarball misses entry files', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();
    const binDir = seedFakeReleaseGateBins(cwd);
    const originalPath = process.env.PATH;
    const originalFiles = process.env.STRATIX_FAKE_PACK_FILES;

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core');

    process.env.PATH = `${binDir}${path.delimiter}${originalPath}`;
    process.env.STRATIX_FAKE_PACK_FILES = JSON.stringify(['package.json']);

    try {
      await assert.rejects(
        runCli(['release', 'gate', '--scope', 'workspace'], {
          cwd,
          output
        }),
        CliError
      );
    } finally {
      process.env.PATH = originalPath;
      if (originalFiles === undefined) {
        delete process.env.STRATIX_FAKE_PACK_FILES;
      } else {
        process.env.STRATIX_FAKE_PACK_FILES = originalFiles;
      }
    }

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('missing package entry files')
      )
    );
  });

  it('fails workspace release gate when a package tarball misses exported subpath files', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();
    const binDir = seedFakeReleaseGateBins(cwd);
    const originalPath = process.env.PATH;
    const originalFiles = process.env.STRATIX_FAKE_PACK_FILES;

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core', {
      exports: {
        '.': {
          import: './dist/index.js',
          types: './dist/index.d.ts'
        },
        './plugin': {
          import: './dist/public/plugin.js',
          types: './dist/types/public/plugin.d.ts'
        }
      }
    });

    process.env.PATH = `${binDir}${path.delimiter}${originalPath}`;
    process.env.STRATIX_FAKE_PACK_FILES = JSON.stringify([
      'package.json',
      'dist/index.js',
      'dist/index.d.ts',
      'dist/public/plugin.js'
    ]);

    try {
      await assert.rejects(
        runCli(['release', 'gate', '--scope', 'workspace'], {
          cwd,
          output
        }),
        CliError
      );
    } finally {
      process.env.PATH = originalPath;
      if (originalFiles === undefined) {
        delete process.env.STRATIX_FAKE_PACK_FILES;
      } else {
        process.env.STRATIX_FAKE_PACK_FILES = originalFiles;
      }
    }

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('dist/types/public/plugin.d.ts')
      )
    );
  });

  it('fails workspace release gate when a package tarball contains development files', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();
    const binDir = seedFakeReleaseGateBins(cwd);
    const originalPath = process.env.PATH;
    const originalFiles = process.env.STRATIX_FAKE_PACK_FILES;

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core');

    process.env.PATH = `${binDir}${path.delimiter}${originalPath}`;
    process.env.STRATIX_FAKE_PACK_FILES = JSON.stringify([
      'package.json',
      'dist/index.js',
      'dist/index.d.ts',
      'src/index.ts',
      '.turbo/turbo-build.log'
    ]);

    try {
      await assert.rejects(
        runCli(['release', 'gate', '--scope', 'workspace'], {
          cwd,
          output
        }),
        CliError
      );
    } finally {
      process.env.PATH = originalPath;
      if (originalFiles === undefined) {
        delete process.env.STRATIX_FAKE_PACK_FILES;
      } else {
        process.env.STRATIX_FAKE_PACK_FILES = originalFiles;
      }
    }

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('contains development files')
      )
    );
  });

  it('fails workspace release gate when exact tags do not point at HEAD', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();
    const binDir = seedFakeReleaseGateBins(cwd);
    const originalPath = process.env.PATH;
    const originalFiles = process.env.STRATIX_FAKE_PACK_FILES;
    const originalTags = process.env.STRATIX_FAKE_GIT_TAGS;
    const originalTagSha = process.env.STRATIX_FAKE_GIT_TAG_SHA;

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core');

    process.env.PATH = `${binDir}${path.delimiter}${originalPath}`;
    process.env.STRATIX_FAKE_PACK_FILES = JSON.stringify([
      'package.json',
      'dist/index.js',
      'dist/index.d.ts'
    ]);
    process.env.STRATIX_FAKE_GIT_TAGS = 'present';
    process.env.STRATIX_FAKE_GIT_TAG_SHA = 'old';

    try {
      await assert.rejects(
        runCli(['release', 'gate', '--scope', 'workspace'], {
          cwd,
          output
        }),
        CliError
      );
    } finally {
      process.env.PATH = originalPath;
      if (originalFiles === undefined) {
        delete process.env.STRATIX_FAKE_PACK_FILES;
      } else {
        process.env.STRATIX_FAKE_PACK_FILES = originalFiles;
      }
      if (originalTags === undefined) {
        delete process.env.STRATIX_FAKE_GIT_TAGS;
      } else {
        process.env.STRATIX_FAKE_GIT_TAGS = originalTags;
      }
      if (originalTagSha === undefined) {
        delete process.env.STRATIX_FAKE_GIT_TAG_SHA;
      } else {
        process.env.STRATIX_FAKE_GIT_TAG_SHA = originalTagSha;
      }
    }

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('missing or stale exact git tags')
      )
    );
  });

  it('passes workspace registry reconciliation when the package version is unpublished', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();
    const binDir = seedFakeReleaseGateBins(cwd);
    const originalPath = process.env.PATH;
    const originalFiles = process.env.STRATIX_FAKE_PACK_FILES;
    const originalTags = process.env.STRATIX_FAKE_GIT_TAGS;
    const originalNpmView = process.env.STRATIX_FAKE_NPM_VIEW;

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core');

    process.env.PATH = `${binDir}${path.delimiter}${originalPath}`;
    process.env.STRATIX_FAKE_PACK_FILES = JSON.stringify([
      'package.json',
      'dist/index.js',
      'dist/index.d.ts'
    ]);
    process.env.STRATIX_FAKE_GIT_TAGS = 'present';
    delete process.env.STRATIX_FAKE_NPM_VIEW;

    try {
      await runCli(
        ['release', 'gate', '--scope', 'workspace', '--include-registry'],
        {
          cwd,
          output
        }
      );
    } finally {
      process.env.PATH = originalPath;
      if (originalFiles === undefined) {
        delete process.env.STRATIX_FAKE_PACK_FILES;
      } else {
        process.env.STRATIX_FAKE_PACK_FILES = originalFiles;
      }
      if (originalTags === undefined) {
        delete process.env.STRATIX_FAKE_GIT_TAGS;
      } else {
        process.env.STRATIX_FAKE_GIT_TAGS = originalTags;
      }
      if (originalNpmView === undefined) {
        delete process.env.STRATIX_FAKE_NPM_VIEW;
      } else {
        process.env.STRATIX_FAKE_NPM_VIEW = originalNpmView;
      }
    }

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('@stratix/core@1.1.0 is not published')
      )
    );
  });

  it('fails workspace registry reconciliation when the package version already exists', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();
    const binDir = seedFakeReleaseGateBins(cwd);
    const originalPath = process.env.PATH;
    const originalFiles = process.env.STRATIX_FAKE_PACK_FILES;
    const originalTags = process.env.STRATIX_FAKE_GIT_TAGS;
    const originalNpmView = process.env.STRATIX_FAKE_NPM_VIEW;
    const originalNpmVersion = process.env.STRATIX_FAKE_NPM_VERSION;

    seedWorkspaceRoot(cwd);
    seedReleaseWorkspacePackage(cwd, 'core');

    process.env.PATH = `${binDir}${path.delimiter}${originalPath}`;
    process.env.STRATIX_FAKE_PACK_FILES = JSON.stringify([
      'package.json',
      'dist/index.js',
      'dist/index.d.ts'
    ]);
    process.env.STRATIX_FAKE_GIT_TAGS = 'present';
    process.env.STRATIX_FAKE_NPM_VIEW = 'published';
    process.env.STRATIX_FAKE_NPM_VERSION = '1.1.0';

    try {
      await assert.rejects(
        runCli(
          ['release', 'gate', '--scope', 'workspace', '--include-registry'],
          {
            cwd,
            output
          }
        ),
        CliError
      );
    } finally {
      process.env.PATH = originalPath;
      if (originalFiles === undefined) {
        delete process.env.STRATIX_FAKE_PACK_FILES;
      } else {
        process.env.STRATIX_FAKE_PACK_FILES = originalFiles;
      }
      if (originalTags === undefined) {
        delete process.env.STRATIX_FAKE_GIT_TAGS;
      } else {
        process.env.STRATIX_FAKE_GIT_TAGS = originalTags;
      }
      if (originalNpmView === undefined) {
        delete process.env.STRATIX_FAKE_NPM_VIEW;
      } else {
        process.env.STRATIX_FAKE_NPM_VIEW = originalNpmView;
      }
      if (originalNpmVersion === undefined) {
        delete process.env.STRATIX_FAKE_NPM_VERSION;
      } else {
        process.env.STRATIX_FAKE_NPM_VERSION = originalNpmVersion;
      }
    }

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('@stratix/core@1.1.0 already exists')
      )
    );
  });

  it('generates an OpenAPI document from route schemas', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'openapi-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'openapi-app');
    seedProjectTypescript(projectDir);
    const outputFile = path.join(projectDir, 'openapi.json');

    await runCli(
      [
        'openapi',
        'generate',
        '--title',
        'OpenAPI App',
        '--version',
        '1.2.3',
        '--output',
        outputFile
      ],
      {
        cwd: projectDir,
        output
      }
    );

    const document = readJson(outputFile);
    assert.equal(document.openapi, '3.1.0');
    assert.equal(document.info.title, 'OpenAPI App');
    assert.equal(document.info.version, '1.2.3');
    assert.equal(
      document.paths['/health'].get.responses['200'].content['application/json']
        .schema.properties.success.type,
      'boolean'
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes('OpenAPI document generated')
      )
    );
  });

  it('fails OpenAPI strict generation when a route schema is missing', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'strict-openapi-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'strict-openapi-app');
    seedProjectTypescript(projectDir);
    fs.writeFileSync(
      path.join(projectDir, 'src', 'controllers', 'LooseController.ts'),
      [
        "import { Controller, Get } from '@stratix/core';",
        '@Controller()',
        'export default class LooseController {',
        "  @Get('/loose')",
        '  async loose(): Promise<{ ok: boolean }> {',
        '    return { ok: true };',
        '  }',
        '}'
      ].join('\n'),
      'utf8'
    );

    await assert.rejects(
      runCli(['openapi', 'generate', '--strict'], {
        cwd: projectDir,
        output
      }),
      /missing a schema/
    );
  });

  it('prints OpenAPI command help', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['openapi', 'generate', '--help'], {
      cwd,
      output
    });

    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Usage: stratix openapi generate [options]')
      )
    );
  });

  it('generates a typed client from an OpenAPI document', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'typed-client-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'typed-client-app');
    seedProjectTypescript(projectDir);
    const openApiFile = path.join(projectDir, 'openapi.json');
    const clientFile = path.join(
      projectDir,
      'src',
      'generated',
      'api-client.ts'
    );

    await runCli(
      [
        'openapi',
        'generate',
        '--title',
        'Typed Client App',
        '--version',
        '1.0.0',
        '--output',
        openApiFile
      ],
      {
        cwd: projectDir,
        output
      }
    );

    await runCli(
      ['openapi', 'client', '--input', openApiFile, '--output', clientFile],
      {
        cwd: projectDir,
        output
      }
    );

    const source = readText(clientFile);
    assert.match(source, /export interface HealthControllerCheckResponse/);
    assert.match(source, /success: boolean/);
    assert.match(source, /name: string/);
    assert.match(source, /export async function healthControllerCheck/);
    assert.match(source, /method: 'GET'/);
    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Typed client generated')
      )
    );
  });

  it('lists forge templates and presets', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['list', 'templates'], { cwd, output });
    await runCli(['list', 'presets'], { cwd, output });

    const allMessages = output.messages.map((message) => message.message);

    assert.ok(
      allMessages.some((message) => message.startsWith('resource:controller'))
    );
    assert.ok(
      allMessages.includes(
        'database - Add @stratix/database and default database environment keys'
      )
    );
    assert.equal(
      allMessages.some((message) => message.includes('app:base')),
      false
    );
    assert.equal(
      allMessages.some((message) => message.startsWith('app:api')),
      false
    );
  });

  it('generates an advanced typed client with params body auth and hooks', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCreate(['app', 'api', 'advanced-client-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'advanced-client-app');
    const openApiFile = path.join(projectDir, 'openapi.json');
    const clientFile = path.join(
      projectDir,
      'src',
      'generated',
      'advanced-client.ts'
    );

    fs.writeFileSync(
      openApiFile,
      JSON.stringify(
        {
          openapi: '3.1.0',
          info: { title: 'Advanced API', version: '1.0.0' },
          paths: {
            '/users/{id}': {
              patch: {
                operationId: 'updateUser',
                parameters: [
                  {
                    name: 'id',
                    in: 'path',
                    required: true,
                    schema: { type: 'string' }
                  },
                  {
                    name: 'includeAudit',
                    in: 'query',
                    schema: { type: 'boolean' }
                  },
                  {
                    name: 'x-tenant-id',
                    in: 'header',
                    required: true,
                    schema: { type: 'string' }
                  }
                ],
                requestBody: {
                  required: true,
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        required: ['name'],
                        properties: {
                          name: { type: 'string' }
                        }
                      }
                    }
                  }
                },
                responses: {
                  200: {
                    content: {
                      'application/json': {
                        schema: {
                          type: 'object',
                          required: ['id', 'name'],
                          properties: {
                            id: { type: 'string' },
                            name: { type: 'string' }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        },
        null,
        2
      ),
      'utf8'
    );

    await runCli(
      ['openapi', 'client', '--input', openApiFile, '--output', clientFile],
      {
        cwd: projectDir,
        output
      }
    );

    const source = readText(clientFile);
    assert.match(source, /export interface StratixClientOptions/);
    assert.match(source, /auth\?: StratixClientAuthProvider/);
    assert.match(source, /beforeRequest\?: StratixClientBeforeRequestHook/);
    assert.match(source, /afterResponse\?: StratixClientAfterResponseHook/);
    assert.match(source, /export interface UpdateUserParams/);
    assert.match(source, /id: string/);
    assert.match(source, /includeAudit\?: boolean/);
    assert.match(source, /xTenantId: string/);
    assert.match(source, /export interface UpdateUserBody/);
    assert.match(source, /export async function updateUser\(/);
    assert.match(source, /params: UpdateUserParams/);
    assert.match(source, /body: UpdateUserBody/);
    assert.match(source, /encodeURIComponent\(String\(params\.id\)\)/);
    assert.match(
      source,
      /appendQuery\(url, 'includeAudit', params\.includeAudit\)/
    );
    assert.match(
      source,
      /headers\.set\('x-tenant-id', String\(params\.xTenantId\)\)/
    );
    assert.match(source, /JSON\.stringify\(body\)/);
    assert.match(source, /await resolveAuthHeaders\(options\.auth, request\)/);
    assert.match(source, /await options\.beforeRequest\?\.\(request\)/);
    assert.match(
      source,
      /await options\.afterResponse\?\.\(response, request\)/
    );
  });

  it('maps start command options to Stratix.run', async () => {
    const cwd = createTempRoot();
    const outputPath = seedProjectCoreModule(cwd);

    await runCli(
      [
        'start',
        '--type',
        'worker',
        '--config',
        './config/worker.json',
        '--host',
        '127.0.0.1',
        '--port',
        '4100'
      ],
      { cwd, output: createMemoryOutput() }
    );

    assert.deepEqual(readJson(outputPath), {
      type: 'worker',
      configOptions: './config/worker.json',
      server: {
        host: '127.0.0.1',
        port: 4100
      },
      envOptions: {
        override: true
      }
    });
  });

  it('supports config encrypt decrypt validate and generate-key workflows', async () => {
    const cwd = createTempRoot();
    const configFile = path.join(cwd, 'sensitive.json');
    const decryptedFile = path.join(cwd, 'decrypted.json');
    const encryptOutput = createMemoryOutput();
    const decryptOutput = createMemoryOutput();
    const validateOutput = createMemoryOutput();
    const keyOutput = createMemoryOutput();

    fs.writeFileSync(
      configFile,
      JSON.stringify(
        {
          database: {
            host: '127.0.0.1'
          }
        },
        null,
        2
      ),
      'utf8'
    );

    await runCli(['config', 'encrypt', configFile, '--key', 'secret-key'], {
      cwd,
      output: encryptOutput
    });

    const encryptedString = encryptOutput.messages.at(-1)?.message || '';
    assert.ok(encryptedString.length > 0);

    await runCli(
      [
        'config',
        'decrypt',
        encryptedString,
        '--key',
        'secret-key',
        '--output',
        decryptedFile
      ],
      {
        cwd,
        output: decryptOutput
      }
    );

    assert.equal(readJson(decryptedFile).database.host, '127.0.0.1');
    assert.ok(
      decryptOutput.messages.some((message) =>
        message.message.includes('Decrypted config saved')
      )
    );

    await runCli(
      ['config', 'validate', configFile, '--required', 'database', '--strict'],
      {
        cwd,
        output: validateOutput
      }
    );

    assert.ok(
      validateOutput.messages.some((message) =>
        message.message.includes('Config validation passed.')
      )
    );

    await runCli(
      ['config', 'generate-key', '--length', '16', '--format', 'base64'],
      {
        cwd,
        output: keyOutput
      }
    );

    assert.match(
      keyOutput.messages.at(-1)?.message || '',
      /^[A-Za-z0-9+/]+={0,2}$/
    );
  });

  it('keeps config command decoupled from @stratix/core utility exports', () => {
    const source = readText(
      path.join(process.cwd(), 'src', 'commands', 'config', 'index.ts')
    );

    assert.doesNotMatch(source, /from '@stratix\/core'/);
  });
});
