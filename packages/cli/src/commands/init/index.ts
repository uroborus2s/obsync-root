import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import {
  createConsolePrompter,
  type CliPrompter,
  type PromptChoice
} from '../../core/prompt.js';
import {
  createProjectManifestObject,
  createManagedFiles,
  type GeneratedProjectContext,
  mergePackageJsonContent
} from '../../template/generated-files.js';
import {
  loadPresetManifest,
  loadTemplateManifest,
  listTemplateManifests,
  readTemplateSource,
  readTemplateSourceEntries
} from '../../template/load-template.js';
import { mergeContributions } from '../../template/merge-contributions.js';
import { renderManifestFile } from '../../template/render-files.js';
import { installDependencies, type SupportedPackageManager } from '../../package-manager/index.js';
import { validatePresetSet } from '../../preset/validate-presets.js';
import {
  ensureDirectory,
  readTextFile,
  writeTextFile,
  assertPathDoesNotExist,
  fileExists
} from '../../utils/fs.js';
import { toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from '../../utils/case.js';

interface InitCommandContext {
  prompter?: CliPrompter;
}

function parsePresetList(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => String(item).split(',').map((part) => part.trim()).filter(Boolean));
  }

  return String(value)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function templateVariables(projectName: string, projectType: string): Record<string, string> {
  const baseName = projectName.replace(/^@[^/]+\//, '');
  return {
    projectName,
    packageName: projectName,
    baseName,
    pascalName: toPascalCase(baseName),
    camelName: toCamelCase(baseName),
    kebabName: toKebabCase(baseName),
    snakeName: toSnakeCase(baseName),
    typeName: toPascalCase(projectType)
  };
}

async function createFromManifest(
  rootDir: string,
  templateBucket: 'apps' | 'plugins',
  templateType: string,
  projectName: string,
  packageManager: SupportedPackageManager,
  selectedPresets: string[],
  shouldInstall: boolean,
  output: CliOutput
): Promise<void> {
  const templateManifest = loadTemplateManifest(templateBucket, templateType);
  const baseManifest =
    templateManifest.useBaseTemplate === false
      ? null
      : loadTemplateManifest(templateBucket, 'base');
  const presetIds = Array.from(
    new Set([...(templateManifest.defaultPresets || []), ...selectedPresets])
  );
  const presetManifests = presetIds.map((presetId) => loadPresetManifest(presetId));
  validatePresetSet({
    kind: templateBucket === 'apps' ? 'app' : 'plugin',
    type: templateType,
    templateManifest,
    presetIds,
    presetManifests
  });
  const merged = mergeContributions([
    ...(baseManifest ? [baseManifest] : []),
    templateManifest,
    ...presetManifests
  ]);
  const runtime = templateManifest.runtime || 'web';

  const context: GeneratedProjectContext = {
    projectName,
    packageName: projectName,
    runtime,
    kind: templateBucket === 'apps' ? 'app' : 'plugin',
    type: templateType,
    presets: presetIds,
    contribution: merged
  };

  const projectManifest = createProjectManifestObject(context, packageManager);
  const variables = templateVariables(projectName, templateType);

  assertPathDoesNotExist(rootDir);
  ensureDirectory(rootDir);

  for (const dir of merged.directories || []) {
    ensureDirectory(path.join(rootDir, dir));
  }

  for (const file of createManagedFiles(
    context,
    projectManifest,
    templateManifest.managedFilesMode || 'full'
  )) {
    writeTextFile(path.join(rootDir, file.destination), file.content);
  }

  for (const group of [
    ...(baseManifest
      ? [
          {
            templateName: 'base',
            files: baseManifest.contributes.files || []
          }
        ]
      : []),
    {
      templateName: templateType,
      files: templateManifest.contributes.files || []
    }
  ]) {
    for (const file of group.files) {
      writeTemplateFileSet(
        rootDir,
        templateBucket,
        group.templateName,
        file,
        variables,
        merged
      );
    }
  }

  for (const presetId of presetIds) {
    const presetManifest = loadPresetManifest(presetId);
    for (const file of presetManifest.contributes.files || []) {
      writeTemplateFileSet(rootDir, 'presets', presetId, file, variables, merged);
    }
  }

  output.success(`Created Stratix ${context.kind}: ${projectName}`);

  if (shouldInstall) {
    output.info(`Installing dependencies with ${packageManager}...`);
    await installDependencies(rootDir, packageManager);
  }
}

interface ResolvedInitOptions {
  kind: 'app' | 'plugin';
  packageManager: SupportedPackageManager;
  projectName: string;
  selectedPresets: string[];
  shouldInstall: boolean;
  templateType: string;
}

function supportedPackageManagers(): PromptChoice[] {
  return [
    { label: 'pnpm', value: 'pnpm' },
    { label: 'npm', value: 'npm' },
    { label: 'yarn', value: 'yarn' }
  ];
}

function promptChoicesForKind(): PromptChoice[] {
  return [
    { label: 'Application', value: 'app' },
    { label: 'Plugin', value: 'plugin' }
  ];
}

function availableTemplateChoices(
  kind: 'app' | 'plugin'
): PromptChoice[] {
  return listTemplateManifests(kind === 'app' ? 'apps' : 'plugins')
    .filter((manifest) => manifest.type !== 'base')
    .map((manifest) => ({
      label: `${manifest.displayName} (${manifest.type})`,
      value: manifest.type
    }));
}

async function resolveInitOptions(
  argv: ParsedArgs,
  output: CliOutput,
  context: InitCommandContext
): Promise<ResolvedInitOptions> {
  const providedKind = argv._[1];
  const providedTemplateType = argv._[2];
  const providedProjectName = argv._[3];
  const packageManager = (argv.pm || 'pnpm') as SupportedPackageManager;
  const selectedPresets = parsePresetList(argv.preset);
  const installWasSpecified = argv.install === true || argv['no-install'] === true;
  const shouldInstall = argv.install === true || argv['no-install'] !== true;

  if (providedKind && providedTemplateType && providedProjectName) {
    if (providedKind !== 'app' && providedKind !== 'plugin') {
      throw new CliError(`Unsupported init target: ${providedKind}`);
    }

    return {
      kind: providedKind,
      packageManager,
      projectName: providedProjectName,
      selectedPresets,
      shouldInstall,
      templateType: providedTemplateType
    };
  }

  if (argv.yes === true) {
    throw new CliError(
      'Missing required init arguments. Provide kind, type and name, or run without --yes to use interactive prompts.'
    );
  }

  output.info('Starting interactive project creation...');

  const prompter = context.prompter || createConsolePrompter();
  const shouldClosePrompter = context.prompter === undefined;

  try {
    const kindValue =
      providedKind && (providedKind === 'app' || providedKind === 'plugin')
        ? providedKind
        : await prompter.select('Select project kind', promptChoicesForKind(), {
            defaultValue: 'app'
          });
    const kind = kindValue as 'app' | 'plugin';

    const templateChoices = availableTemplateChoices(kind);
    const templateType =
      providedTemplateType ||
      (await prompter.select('Select template type', templateChoices, {
        defaultValue: templateChoices[0]?.value
      }));

    const templateManifest = loadTemplateManifest(
      kind === 'app' ? 'apps' : 'plugins',
      templateType
    );

    const projectName =
      providedProjectName ||
      (await prompter.text('Enter project name'));

    const interactivePresets =
      selectedPresets.length > 0
        ? selectedPresets
        : parsePresetList(
            await prompter.text(
              `Optional presets (comma-separated). Available: ${
                templateManifest.allowedPresets?.join(', ') || 'none'
              }`,
              { allowEmpty: true }
            )
          );

    const interactivePackageManager = argv.pm
      ? packageManager
      : ((await prompter.select(
          'Select package manager',
          supportedPackageManagers(),
          { defaultValue: 'pnpm' }
        )) as SupportedPackageManager);

    const interactiveShouldInstall = installWasSpecified
      ? shouldInstall
      : await prompter.confirm('Install dependencies after scaffolding?', {
          defaultValue: true
        });

    return {
      kind,
      packageManager: interactivePackageManager,
      projectName,
      selectedPresets: interactivePresets,
      shouldInstall: interactiveShouldInstall,
      templateType
    };
  } finally {
    if (shouldClosePrompter) {
      await prompter.close?.();
    }
  }
}

function writeTemplateFileSet(
  rootDir: string,
  bucket: 'apps' | 'plugins' | 'presets',
  templateName: string,
  file: { source: string; destination: string; template?: boolean; directory?: boolean },
  variables: Record<string, string>,
  merged: GeneratedProjectContext['contribution']
): void {
  const entries = file.directory
    ? readTemplateSourceEntries(bucket, templateName, file.source)
    : [
        {
          relativePath: '',
          content: readTemplateSource(bucket, templateName, file.source)
        }
      ];

  for (const entry of entries) {
    const rendered = renderManifestFile(file, entry.content, variables);
    const destination = path.join(rootDir, file.destination, entry.relativePath);

    if (
      file.destination === 'package.json' &&
      entry.relativePath === ''
    ) {
      const current = fileExists(destination) ? readTextFile(destination) : rendered;
      writeTextFile(destination, mergePackageJsonContent(current, merged));
      continue;
    }

    writeTextFile(destination, rendered);
  }
}

export async function initCommand(
  argv: ParsedArgs,
  output: CliOutput,
  context: InitCommandContext = {}
): Promise<void> {
  const {
    kind,
    packageManager,
    projectName,
    selectedPresets,
    shouldInstall,
    templateType
  } = await resolveInitOptions(argv, output, context);

  if (templateType === 'base') {
    throw new CliError('The base template is internal and cannot be initialized directly.');
  }

  const rootDir = path.resolve(process.cwd(), projectName.replace(/^@[^/]+\//, '').split('/').pop() || projectName);

  await createFromManifest(
    rootDir,
    kind === 'app' ? 'apps' : 'plugins',
    templateType,
    projectName,
    packageManager,
    selectedPresets,
    shouldInstall,
    output
  );
}
