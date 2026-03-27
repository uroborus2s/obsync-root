import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import { installDependencies, type SupportedPackageManager } from '../../package-manager/index.js';
import { validatePresetSet } from '../../preset/validate-presets.js';
import { loadProjectManifest, writeProjectManifest } from '../../project/load-project-manifest.js';
import { createManagedFiles, createProjectManifestObject, mergePackageJsonContent, type GeneratedProjectContext } from '../../template/generated-files.js';
import {
  loadPresetManifest,
  loadTemplateManifest,
  readTemplateSource,
  readTemplateSourceEntries
} from '../../template/load-template.js';
import { mergeContributions } from '../../template/merge-contributions.js';
import { renderManifestFile } from '../../template/render-files.js';
import { ensureDirectory, readTextFile, writeTextFile } from '../../utils/fs.js';
import { toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from '../../utils/case.js';

export async function addCommand(argv: ParsedArgs, output: CliOutput): Promise<void> {
  const target = argv._[1];
  const presetId = argv._[2];

  if (target !== 'preset' || !presetId) {
    throw new CliError('Usage: stratix add preset <preset-id> [--install|--no-install]');
  }

  const { rootDir, manifest } = loadProjectManifest(process.cwd());
  if (manifest.presets.includes(presetId)) {
    output.info(`Preset already enabled: ${presetId}`);
    return;
  }

  const templateManifest = loadTemplateManifest(
    manifest.kind === 'app' ? 'apps' : 'plugins',
    manifest.type
  );
  const baseManifest =
    templateManifest.useBaseTemplate === false
      ? null
      : loadTemplateManifest(manifest.kind === 'app' ? 'apps' : 'plugins', 'base');
  const nextPresets = [...manifest.presets, presetId];
  const presetManifests = nextPresets.map((id) => loadPresetManifest(id));
  validatePresetSet({
    kind: manifest.kind,
    type: manifest.type,
    templateManifest,
    presetIds: nextPresets,
    presetManifests
  });
  const merged = mergeContributions([
    ...(baseManifest ? [baseManifest] : []),
    templateManifest,
    ...presetManifests
  ]);
  const packageName = JSON.parse(readTextFile(path.join(rootDir, 'package.json'))).name;
  const variables = templateVariables(packageName, manifest.type);

  const context: GeneratedProjectContext = {
    projectName: packageName,
    packageName,
    runtime: manifest.runtime,
    kind: manifest.kind,
    type: manifest.type,
    presets: nextPresets,
    contribution: merged
  };

  const nextManifest = createProjectManifestObject(context, manifest.packageManager);
  writeProjectManifest(rootDir, nextManifest);

  const packageJsonPath = path.join(rootDir, 'package.json');
  writeTextFile(packageJsonPath, mergePackageJsonContent(readTextFile(packageJsonPath), merged));

  for (const dir of merged.directories || []) {
    ensureDirectory(path.join(rootDir, dir));
  }

  for (const file of createManagedFiles(
    context,
    nextManifest,
    templateManifest.managedFilesMode || 'full'
  )) {
    if (file.destination === 'package.json') continue;
    writeTextFile(path.join(rootDir, file.destination), file.content);
  }

  const presetManifest = loadPresetManifest(presetId);
  for (const file of presetManifest.contributes.files || []) {
    writeTemplateFileSet(rootDir, presetId, file, variables);
  }

  output.success(`Added preset: ${presetId}`);

  const shouldInstall = argv.install === true || argv['no-install'] !== true;
  if (shouldInstall) {
    await installDependencies(rootDir, manifest.packageManager as SupportedPackageManager);
  }
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

function writeTemplateFileSet(
  rootDir: string,
  presetId: string,
  file: { source: string; destination: string; template?: boolean; directory?: boolean },
  variables: Record<string, string>
): void {
  const entries = file.directory
    ? readTemplateSourceEntries('presets', presetId, file.source)
    : [
        {
          relativePath: '',
          content: readTemplateSource('presets', presetId, file.source)
        }
      ];

  for (const entry of entries) {
    const rendered = renderManifestFile(file, entry.content, variables);
    writeTextFile(
      path.join(rootDir, file.destination, entry.relativePath),
      rendered
    );
  }
}
