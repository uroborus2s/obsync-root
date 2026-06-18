import type {
  Contribution,
  ManifestFile,
  PresetManifest,
  ProjectPolicies,
  TemplateManifest
} from '../schemas/template.js';

export interface MergedContribution extends Contribution {}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function mergeFiles(values: ManifestFile[]): ManifestFile[] {
  const byDestination = new Map<string, ManifestFile>();
  for (const file of values) {
    byDestination.set(file.destination, file);
  }
  return Array.from(byDestination.values());
}

function mergePolicies(values: ProjectPolicies[]): ProjectPolicies {
  return values.reduce<ProjectPolicies>(
    (acc, current) => ({
      layering: uniqueStrings([...acc.layering, ...current.layering]),
      forbidServiceDatabasePlugin:
        acc.forbidServiceDatabasePlugin || current.forbidServiceDatabasePlugin,
      forbidControllerDatabaseAccess:
        acc.forbidControllerDatabaseAccess || current.forbidControllerDatabaseAccess,
      controllerDecoratorPrefix:
        acc.controllerDecoratorPrefix || current.controllerDecoratorPrefix,
      pluginTokenFromFunctionName:
        acc.pluginTokenFromFunctionName || current.pluginTokenFromFunctionName
    }),
    {
      layering: [],
      forbidServiceDatabasePlugin: false,
      forbidControllerDatabaseAccess: false,
      controllerDecoratorPrefix: false,
      pluginTokenFromFunctionName: false
    }
  );
}

export function mergeContributions(
  manifests: Array<TemplateManifest | PresetManifest>
): MergedContribution {
  const directories: string[] = [];
  const files: ManifestFile[] = [];
  const runtimeDependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const scripts: Record<string, string> = {};
  const env: Contribution['env'] = [];
  const policies: ProjectPolicies[] = [];

  for (const manifest of manifests) {
    directories.push(...(manifest.contributes.directories || []));
    files.push(...(manifest.contributes.files || []));
    Object.assign(runtimeDependencies, manifest.contributes.dependencies?.runtime || {});
    Object.assign(devDependencies, manifest.contributes.dependencies?.dev || {});
    Object.assign(scripts, manifest.contributes.scripts || {});
    env.push(...(manifest.contributes.env || []));
    policies.push(
      manifest.contributes.policies || {
        layering: [],
        forbidServiceDatabasePlugin: false,
        forbidControllerDatabaseAccess: false,
        controllerDecoratorPrefix: false,
        pluginTokenFromFunctionName: false
      }
    );
  }

  return {
    directories: uniqueStrings(directories),
    files: mergeFiles(files),
    dependencies: {
      runtime: runtimeDependencies,
      dev: devDependencies
    },
    scripts,
    env,
    policies: mergePolicies(policies)
  };
}
