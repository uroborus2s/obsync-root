export interface ManifestFile {
  source: string;
  destination: string;
  template?: boolean;
  directory?: boolean;
}

export interface DependencyBlock {
  runtime?: Record<string, string>;
  dev?: Record<string, string>;
}

export interface EnvDefinition {
  key: string;
  required?: boolean;
  default?: string;
  description?: string;
}

export interface ProjectPolicies {
  layering: string[];
  forbidServiceDatabasePlugin: boolean;
  forbidControllerDatabaseAccess: boolean;
  controllerDecoratorPrefix: boolean;
  pluginTokenFromFunctionName: boolean;
}

export interface Contribution {
  directories?: string[];
  files?: ManifestFile[];
  dependencies?: DependencyBlock;
  scripts?: Record<string, string>;
  env?: EnvDefinition[];
  policies?: ProjectPolicies;
}

export interface TemplateManifest {
  id: string;
  kind: 'app' | 'plugin' | 'resource';
  type: string;
  version: string;
  displayName: string;
  description: string;
  runtime?: 'web' | 'cli' | 'worker' | 'service';
  useBaseTemplate?: boolean;
  managedFilesMode?: 'full' | 'project-only';
  defaultPresets?: string[];
  allowedPresets?: string[];
  contributes: Contribution;
}

export interface PresetManifest {
  id: string;
  version: string;
  displayName: string;
  description: string;
  appliesTo: Array<{
    kind: 'app' | 'plugin';
    types?: string[];
  }>;
  requires?: string[];
  conflicts?: string[];
  contributes: Contribution;
}

const DEFAULT_POLICIES: ProjectPolicies = {
  layering: [],
  forbidServiceDatabasePlugin: false,
  forbidControllerDatabaseAccess: false,
  controllerDecoratorPrefix: false,
  pluginTokenFromFunctionName: false
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function expectString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid string field: ${field}`);
  }
  return value;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((item): item is string => typeof item === 'string');
}

function stringRecord(value: unknown): Record<string, string> {
  if (!isRecord(value)) {
    return {};
  }

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry === 'string') {
      result[key] = entry;
    }
  }
  return result;
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeManifestFile(value: unknown): ManifestFile {
  if (!isRecord(value)) {
    throw new Error('Invalid manifest file entry');
  }

  return {
    source: expectString(value.source, 'source'),
    destination: expectString(value.destination, 'destination'),
    template: booleanValue(value.template, true),
    directory: booleanValue(value.directory, false)
  };
}

function normalizeEnvDefinition(value: unknown): EnvDefinition {
  if (!isRecord(value)) {
    throw new Error('Invalid env definition entry');
  }

  return {
    key: expectString(value.key, 'env.key'),
    required: booleanValue(value.required, false),
    ...(optionalString(value.default) && { default: optionalString(value.default) }),
    ...(optionalString(value.description) && {
      description: optionalString(value.description)
    })
  };
}

export function normalizeProjectPolicies(value: unknown): ProjectPolicies {
  if (!isRecord(value)) {
    return { ...DEFAULT_POLICIES };
  }

  return {
    layering: stringArray(value.layering),
    forbidServiceDatabasePlugin: booleanValue(
      value.forbidServiceDatabasePlugin,
      false
    ),
    forbidControllerDatabaseAccess: booleanValue(
      value.forbidControllerDatabaseAccess,
      false
    ),
    controllerDecoratorPrefix: booleanValue(value.controllerDecoratorPrefix, false),
    pluginTokenFromFunctionName: booleanValue(
      value.pluginTokenFromFunctionName,
      false
    )
  };
}

function normalizeContribution(value: unknown): Contribution {
  if (!isRecord(value)) {
    return {
      directories: [],
      files: [],
      dependencies: { runtime: {}, dev: {} },
      scripts: {},
      env: [],
      policies: { ...DEFAULT_POLICIES }
    };
  }

  return {
    directories: stringArray(value.directories),
    files: Array.isArray(value.files) ? value.files.map(normalizeManifestFile) : [],
    dependencies: {
      runtime: stringRecord(isRecord(value.dependencies) ? value.dependencies.runtime : {}),
      dev: stringRecord(isRecord(value.dependencies) ? value.dependencies.dev : {})
    },
    scripts: stringRecord(value.scripts),
    env: Array.isArray(value.env) ? value.env.map(normalizeEnvDefinition) : [],
    policies: normalizeProjectPolicies(value.policies)
  };
}

function parseRuntime(
  value: unknown
): 'web' | 'cli' | 'worker' | 'service' | undefined {
  if (
    value === 'web' ||
    value === 'cli' ||
    value === 'worker' ||
    value === 'service'
  ) {
    return value;
  }
  return undefined;
}

function parseManagedFilesMode(
  value: unknown
): 'full' | 'project-only' | undefined {
  if (value === 'full' || value === 'project-only') {
    return value;
  }

  return undefined;
}

export function parseTemplateManifest(value: unknown): TemplateManifest {
  if (!isRecord(value)) {
    throw new Error('Invalid template manifest');
  }

  const kind = value.kind;
  if (kind !== 'app' && kind !== 'plugin' && kind !== 'resource') {
    throw new Error('Invalid template kind');
  }

  return {
    id: expectString(value.id, 'id'),
    kind,
    type: expectString(value.type, 'type'),
    version: expectString(value.version, 'version'),
    displayName: expectString(value.displayName, 'displayName'),
    description: expectString(value.description, 'description'),
    runtime: parseRuntime(value.runtime),
    useBaseTemplate: booleanValue(value.useBaseTemplate, true),
    managedFilesMode: parseManagedFilesMode(value.managedFilesMode) || 'full',
    defaultPresets: stringArray(value.defaultPresets),
    allowedPresets: stringArray(value.allowedPresets),
    contributes: normalizeContribution(value.contributes)
  };
}

export function parsePresetManifest(value: unknown): PresetManifest {
  if (!isRecord(value)) {
    throw new Error('Invalid preset manifest');
  }

  const appliesTo = Array.isArray(value.appliesTo)
    ? value.appliesTo
        .filter(isRecord)
        .map((target) => {
          if (target.kind !== 'app' && target.kind !== 'plugin') {
            throw new Error('Invalid preset target kind');
          }

          const kind: 'app' | 'plugin' = target.kind;

          return {
            kind,
            ...(Array.isArray(target.types) ? { types: stringArray(target.types) } : {})
          };
        })
    : [];

  return {
    id: expectString(value.id, 'id'),
    version: expectString(value.version, 'version'),
    displayName: expectString(value.displayName, 'displayName'),
    description: expectString(value.description, 'description'),
    appliesTo,
    requires: stringArray(value.requires),
    conflicts: stringArray(value.conflicts),
    contributes: normalizeContribution(value.contributes)
  };
}
