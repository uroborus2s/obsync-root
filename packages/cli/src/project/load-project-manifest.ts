import path from 'node:path';
import { CliError } from '../core/errors.js';
import { fileExists, readJsonFile, writeJsonFile } from '../utils/fs.js';
import { parseProjectManifest, type ProjectManifest } from '../schemas/project.js';

const PROJECT_MANIFEST_PATH = path.join('.stratix', 'project.json');

export interface LoadedProjectManifest {
  rootDir: string;
  manifestPath: string;
  manifest: ProjectManifest;
}

export function findProjectRoot(startDir: string): string | null {
  let current = path.resolve(startDir);

  while (true) {
    const candidate = path.join(current, PROJECT_MANIFEST_PATH);
    if (fileExists(candidate)) {
      return current;
    }

    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function loadProjectManifest(startDir: string): LoadedProjectManifest {
  const rootDir = findProjectRoot(startDir);

  if (!rootDir) {
    throw new CliError('Current directory is not a Stratix CLI managed project.');
  }

  const manifestPath = path.join(rootDir, PROJECT_MANIFEST_PATH);
  const parsed = parseProjectManifest(readJsonFile(manifestPath));

  return {
    rootDir,
    manifestPath,
    manifest: parsed
  };
}

export function writeProjectManifest(rootDir: string, manifest: ProjectManifest): void {
  writeJsonFile(path.join(rootDir, PROJECT_MANIFEST_PATH), manifest);
}
