import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  readJsonFile,
  readTextFile
} from '../utils/fs.js';
import {
  parsePresetManifest,
  parseTemplateManifest,
  type PresetManifest,
  type TemplateManifest
} from '../schemas/template.js';

const templatesRoot = fileURLToPath(new URL('../../templates/', import.meta.url));

export function getTemplatesRoot(): string {
  return templatesRoot;
}

export function loadTemplateManifest(
  bucket: 'apps' | 'plugins' | 'resources',
  name: string
): TemplateManifest {
  const manifestPath = path.join(templatesRoot, bucket, name, 'manifest.json');
  return parseTemplateManifest(readJsonFile(manifestPath));
}

export function loadPresetManifest(name: string): PresetManifest {
  const manifestPath = path.join(templatesRoot, 'presets', name, 'manifest.json');
  return parsePresetManifest(readJsonFile(manifestPath));
}

export function readTemplateSource(
  bucket: string,
  templateName: string,
  sourcePath: string
): string {
  return readTextFile(
    path.join(templatesRoot, bucket, templateName, 'files', sourcePath)
  );
}

export interface TemplateSourceEntry {
  relativePath: string;
  content: string;
}

export function readTemplateSourceEntries(
  bucket: string,
  templateName: string,
  sourcePath: string
): TemplateSourceEntry[] {
  const absolutePath = path.join(
    templatesRoot,
    bucket,
    templateName,
    'files',
    sourcePath
  );

  if (!fs.statSync(absolutePath).isDirectory()) {
    return [{ relativePath: '', content: readTextFile(absolutePath) }];
  }

  return readTemplateDirectoryEntries(absolutePath);
}

export function listTemplateManifests(bucket: 'apps' | 'plugins' | 'resources'): TemplateManifest[] {
  const bucketDir = path.join(templatesRoot, bucket);
  return readTemplateDirectories(bucketDir).map((name) =>
    loadTemplateManifest(bucket, name)
  );
}

export function listPresetManifests(): PresetManifest[] {
  const presetDir = path.join(templatesRoot, 'presets');
  return readTemplateDirectories(presetDir).map((name) => loadPresetManifest(name));
}

function readTemplateDirectories(bucketDir: string): string[] {
  return fs
    .readdirSync(bucketDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right));
}

function readTemplateDirectoryEntries(rootDir: string): TemplateSourceEntry[] {
  return fs
    .readdirSync(rootDir, { withFileTypes: true })
    .flatMap((entry) => {
      const absolutePath = path.join(rootDir, entry.name);

      if (entry.isDirectory()) {
        return readTemplateDirectoryEntries(absolutePath).map((child) => ({
          relativePath: path.join(entry.name, child.relativePath),
          content: child.content
        }));
      }

      return [
        {
          relativePath: entry.name,
          content: readTextFile(absolutePath)
        }
      ];
    });
}
