import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import { loadProjectManifest } from '../../project/load-project-manifest.js';
import type { ProjectManifest } from '../../schemas/project.js';
import { loadTemplateManifest, readTemplateSource } from '../../template/load-template.js';
import { renderManifestFile, renderStringTemplate } from '../../template/render-files.js';
import { ensureDirectory, writeTextFile } from '../../utils/fs.js';
import { pluralize, routePathFromName, toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from '../../utils/case.js';

function generationVariables(name: string): Record<string, string> {
  return {
    name,
    pascalName: toPascalCase(name),
    camelName: toCamelCase(name),
    kebabName: toKebabCase(name),
    snakeName: toSnakeCase(name),
    pluralKebabName: toKebabCase(pluralize(name)),
    routePath: routePathFromName(name)
  };
}

function resourceTemplateName(resource: string, projectKind: 'app' | 'plugin'): string {
  switch (resource) {
    case 'controller':
    case 'service':
    case 'repository':
    case 'business-repository':
    case 'executor':
    case 'module':
    case 'admin-page':
    case 'admin-crud':
      return resource;
    case 'plugin-adapter':
      if (projectKind !== 'plugin') throw new CliError('plugin-adapter can only be generated inside plugin projects.');
      return 'plugin-adapter';
    case 'plugin-service':
      if (projectKind !== 'plugin') throw new CliError('plugin-service can only be generated inside plugin projects.');
      return 'plugin-service';
    case 'plugin-controller':
      if (projectKind !== 'plugin') throw new CliError('plugin-controller can only be generated inside plugin projects.');
      return 'plugin-controller';
    case 'plugin-executor':
      if (projectKind !== 'plugin') throw new CliError('plugin-executor can only be generated inside plugin projects.');
      return 'plugin-executor';
    default:
      throw new CliError(`Unsupported resource type: ${resource}`);
  }
}

function ensureSupportedProject(
  resourceType: string,
  manifest: Pick<ProjectManifest, 'kind' | 'type'>
): void {
  if (
    (resourceType === 'admin-page' || resourceType === 'admin-crud') &&
    (manifest.kind !== 'app' || manifest.type !== 'web-admin')
  ) {
    throw new CliError(
      `${resourceType} generation is only available for app:web-admin projects.`
    );
  }
}

function compositeResourceTypes(resourceType: string, projectKind: 'app' | 'plugin'): string[] {
  if (resourceType === 'resource') {
    if (projectKind !== 'app') {
      throw new CliError('resource generation is only available for app projects.');
    }
    return ['controller', 'service', 'repository'];
  }
  return [resourceTemplateName(resourceType, projectKind)];
}

export async function generateCommand(argv: ParsedArgs, output: CliOutput): Promise<void> {
  const resourceType = argv._[1];
  const resourceName = argv._[2];

  if (!resourceType || !resourceName) {
    throw new CliError('Usage: stratix generate <resource> <name>');
  }

  const { rootDir, manifest } = loadProjectManifest(process.cwd());
  ensureSupportedProject(resourceType, manifest);

  if (
    resourceType === 'business-repository' &&
    !manifest.presets.includes('database')
  ) {
    throw new CliError(
      'business-repository generation requires a project with the database preset.'
    );
  }

  const variables = generationVariables(resourceName);

  for (const templateName of compositeResourceTypes(resourceType, manifest.kind)) {
    const manifestFile = loadTemplateManifest('resources', templateName);

    for (const file of manifestFile.contributes.files || []) {
      const source = readTemplateSource('resources', templateName, file.source);
      const rendered = renderManifestFile(file, source, variables);
      const destination = path.join(
        rootDir,
        renderStringTemplate(file.destination, variables)
      );
      ensureDirectory(path.dirname(destination));
      writeTextFile(destination, rendered);
      output.success(`Generated ${path.relative(rootDir, destination)}`);
    }

    for (const dir of manifestFile.contributes.directories || []) {
      ensureDirectory(path.join(rootDir, renderStringTemplate(dir, variables)));
    }
  }
}
