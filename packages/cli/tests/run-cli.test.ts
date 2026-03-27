import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';
import { CliError } from '../src/core/errors.js';
import type { CliOutput } from '../src/core/output.js';
import { runCli } from '../src/run-cli.js';

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
      const answer = nextAnswer(options?.defaultValue ?? choices[0]?.value ?? '');
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
      const answer = nextAnswer(options?.defaultValue ? 'yes' : 'no').trim().toLowerCase();
      return ['y', 'yes', 'true', '1'].includes(answer);
    }
  };
}

const tempRoots: string[] = [];

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

describe('@stratix/cli', () => {
  it('initializes an api application scaffold', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['init', 'app', 'api', 'demo-api', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'demo-api');
    const manifest = readJson(path.join(projectDir, '.stratix', 'project.json'));
    const packageJson = readJson(path.join(projectDir, 'package.json'));

    assert.equal(manifest.kind, 'app');
    assert.equal(manifest.type, 'api');
    assert.ok(manifest.presets.includes('testing'));
    assert.equal(packageJson.dependencies['@stratix/core'], '^1.1.0');
    assert.equal(packageJson.devDependencies['@stratix/cli'], '^1.1.0');
    assert.match(
      readText(path.join(projectDir, 'src', 'index.ts')),
      /await Stratix\.run\(\)/
    );
    assert.match(
      readText(path.join(projectDir, 'src', 'controllers', 'HealthController.ts')),
      /@Get\('\/health'\)/
    );
    assert.ok(output.messages.some((message) => message.level === 'success'));
  });

  it('initializes a web-admin application scaffold', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['init', 'app', 'web-admin', 'demo-admin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'demo-admin');
    const manifest = readJson(path.join(projectDir, '.stratix', 'project.json'));
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
      readText(
        path.join(projectDir, 'src', 'layouts', 'admin-layout.tsx')
      ),
      /AppWorkbench/
    );
    assert.match(readText(path.join(projectDir, '.gitignore')), /\.vscode\//);
    assert.match(readText(path.join(projectDir, '.gitignore')), /node_modules/);
    assert.match(readText(path.join(projectDir, '.gitignore')), /!\.env\.example/);
    assert.equal(
      fs.existsSync(path.join(projectDir, 'src', 'stratix.config.ts')),
      false
    );
  });

  it('prompts for missing init arguments and creates a project interactively', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();
    const prompts: string[] = [];

    await runCli(['init'], {
      cwd,
      output,
      prompter: createScriptedPrompter(
        ['app', 'web-admin', 'interactive-admin', 'admin-mock', 'pnpm', 'no'],
        prompts
      )
    });

    const projectDir = path.join(cwd, 'interactive-admin');
    const manifest = readJson(path.join(projectDir, '.stratix', 'project.json'));
    const packageJson = readJson(path.join(projectDir, 'package.json'));

    assert.equal(manifest.kind, 'app');
    assert.equal(manifest.type, 'web-admin');
    assert.ok(manifest.presets.includes('admin-mock'));
    assert.equal(packageJson.dependencies.msw, '^2.11.3');
    assert.match(readText(path.join(projectDir, '.gitignore')), /\.turbo/);
    assert.ok(prompts.some((prompt) => /project name/i.test(prompt)));
  });

  it('initializes a web-admin scaffold with the admin-mock preset', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(
      ['init', 'app', 'web-admin', 'mock-admin', '--preset', 'admin-mock', '--no-install'],
      {
        cwd,
        output
      }
    );

    const projectDir = path.join(cwd, 'mock-admin');
    const manifest = readJson(path.join(projectDir, '.stratix', 'project.json'));
    const packageJson = readJson(path.join(projectDir, 'package.json'));
    const mainSource = readText(path.join(projectDir, 'src', 'main.tsx'));

    assert.ok(manifest.presets.includes('admin-mock'));
    assert.equal(packageJson.dependencies.msw, '^2.11.3');
    assert.match(mainSource, /enableMocking/);
    assert.equal(
      fs.existsSync(path.join(projectDir, 'src', 'mocks', 'index.ts')),
      true
    );
  });

  it('initializes a data plugin scaffold', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['init', 'plugin', 'data', '@demo/data-plugin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'data-plugin');
    const manifest = readJson(path.join(projectDir, '.stratix', 'project.json'));
    const packageJson = readJson(path.join(projectDir, 'package.json'));
    const pluginIndex = readText(path.join(projectDir, 'src', 'index.ts'));

    assert.equal(manifest.kind, 'plugin');
    assert.equal(manifest.type, 'data');
    assert.deepEqual(manifest.presets, ['database', 'testing']);
    assert.equal(packageJson.name, '@demo/data-plugin');
    assert.equal(packageJson.dependencies['@stratix/core'], '^1.1.0');
    assert.equal(packageJson.dependencies['@stratix/database'], '^1.1.0');
    assert.equal(packageJson.devDependencies['@stratix/cli'], '^1.1.0');
    assert.match(pluginIndex, /withRegisterAutoDI<DataPluginOptions>/);
    assert.match(pluginIndex, /async function dataPlugin/);
  });

  it('generates controller-service-repository resources for app projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['init', 'app', 'api', 'resource-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'resource-app');

    await runCli(['generate', 'resource', 'order-item'], {
      cwd: projectDir,
      output
    });

    assert.match(
      readText(path.join(projectDir, 'src', 'controllers', 'OrderItemController.ts')),
      /OrderItemService/
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

  it('generates an admin page resource for web-admin projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['init', 'app', 'web-admin', 'page-admin', '--no-install'], {
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
        path.join(projectDir, 'src', 'routes', '_authenticated', 'notice-center.tsx')
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

    await runCli(['init', 'app', 'api', 'non-admin-app', '--no-install'], {
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

    await runCli(['init', 'app', 'web-admin', 'crud-admin', '--no-install'], {
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

    await runCli(['init', 'app', 'api', 'non-admin-crud-app', '--no-install'], {
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

    await runCli(['init', 'plugin', 'data', '@demo/business-plugin', '--no-install'], {
      cwd,
      output
    });

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

    assert.match(source, /extends BaseRepository/);
    assert.match(source, /claimById/);
    assert.match(source, /compareAndSet/);
    assert.match(source, /workflow_execution_outbox/);
  });

  it('rejects business repository generation without the database preset', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['init', 'app', 'api', 'no-db-app', '--no-install'], {
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

    await runCli(['init', 'app', 'api', 'preset-app', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'preset-app');

    await runCli(['add', 'preset', 'redis', '--no-install'], {
      cwd: projectDir,
      output
    });

    const manifest = readJson(path.join(projectDir, '.stratix', 'project.json'));
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

    await runCli(['init', 'app', 'web-admin', 'preset-admin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'preset-admin');

    await runCli(['add', 'preset', 'testing', '--no-install'], {
      cwd: projectDir,
      output
    });

    const manifest = readJson(path.join(projectDir, '.stratix', 'project.json'));

    assert.deepEqual(manifest.presets, ['testing']);
    assert.equal(
      fs.existsSync(path.join(projectDir, 'src', 'stratix.config.ts')),
      false
    );
    assert.equal(
      fs.existsSync(path.join(projectDir, 'src', '__tests__', 'project.smoke.test.ts')),
      true
    );
  });

  it('adds admin-mock preset to a web-admin project', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['init', 'app', 'web-admin', 'mock-preset-admin', '--no-install'], {
      cwd,
      output
    });

    const projectDir = path.join(cwd, 'mock-preset-admin');

    await runCli(['add', 'preset', 'admin-mock', '--no-install'], {
      cwd: projectDir,
      output
    });

    const manifest = readJson(path.join(projectDir, '.stratix', 'project.json'));
    const packageJson = readJson(path.join(projectDir, 'package.json'));

    assert.ok(manifest.presets.includes('admin-mock'));
    assert.equal(packageJson.dependencies.msw, '^2.11.3');
    assert.match(
      readText(path.join(projectDir, 'src', 'main.tsx')),
      /enableMocking/
    );
  });

  it('doctor reports service-layer database access violations', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['init', 'app', 'api', 'doctor-app', '--no-install'], {
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
        message.message.includes('Service layer must not access database plugin directly')
      )
    );
  });

  it('doctor reports removed database public APIs in new projects', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['init', 'plugin', 'data', '@demo/doctor-data-plugin', '--no-install'], {
      cwd,
      output
    });

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
        message.message.includes('DatabaseAPI was removed in @stratix/database 1.1.0')
      )
    );
    assert.ok(
      output.messages.some((message) =>
        message.message.includes('Public database transaction helpers were removed in @stratix/database 1.1.0')
      )
    );
  });

  it('lists public templates and presets', async () => {
    const cwd = createTempRoot();
    const output = createMemoryOutput();

    await runCli(['list', 'templates'], { cwd, output });
    await runCli(['list', 'presets'], { cwd, output });

    const allMessages = output.messages.map((message) => message.message);

    assert.ok(
      allMessages.includes(
        'app:api - HTTP API application with controller-service-repository layering'
      )
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
      ['config', 'decrypt', encryptedString, '--key', 'secret-key', '--output', decryptedFile],
      {
        cwd,
        output: decryptOutput
      }
    );

    assert.equal(
      readJson(decryptedFile).database.host,
      '127.0.0.1'
    );
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

    assert.match(keyOutput.messages.at(-1)?.message || '', /^[A-Za-z0-9+/]+={0,2}$/);
  });

  it('keeps config command decoupled from @stratix/core utility exports', () => {
    const source = readText(
      path.join(
        process.cwd(),
        'src',
        'commands',
        'config',
        'index.ts'
      )
    );

    assert.doesNotMatch(source, /from '@stratix\/core'/);
  });
});
