import fs from 'node:fs';
import path from 'node:path';
import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import { loadProjectManifest } from '../../project/load-project-manifest.js';
import { loadPresetManifest, loadTemplateManifest } from '../../template/load-template.js';
import { mergeContributions } from '../../template/merge-contributions.js';
import { fileExists, readJsonFile } from '../../utils/fs.js';

function collectTypeScriptFiles(rootDir: string): string[] {
  if (!fileExists(rootDir)) {
    return [];
  }

  const collected: string[] = [];

  for (const entry of fs.readdirSync(rootDir, { withFileTypes: true })) {
    const nextPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      collected.push(...collectTypeScriptFiles(nextPath));
      continue;
    }

    if (entry.isFile() && nextPath.endsWith('.ts')) {
      collected.push(nextPath);
    }
  }

  return collected;
}

function checkLayeringPolicies(rootDir: string, issues: string[]): void {
  for (const sourceFile of collectTypeScriptFiles(path.join(rootDir, 'src'))) {
    const relativePath = path.relative(rootDir, sourceFile);
    const normalizedPath = relativePath.split(path.sep).join('/');
    const source = fs.readFileSync(sourceFile, 'utf8');
    const importsDatabaseApi =
      /import\s+type\s*{[^}]*\bDatabaseAPI\b[^}]*}\s+from\s+['"]@stratix\/database['"]/m.test(
        source
      ) ||
      /import\s*{[^}]*\bDatabaseAPI\b[^}]*}\s+from\s+['"]@stratix\/database['"]/m.test(
        source
      );
    const importsRemovedTransactionHelper =
      /import\s*{[^}]*\bwithTransaction\b[^}]*}\s+from\s+['"]@stratix\/database['"]/m.test(
        source
      ) ||
      /import\s*{[^}]*\bwithMultiTransaction\b[^}]*}\s+from\s+['"]@stratix\/database['"]/m.test(
        source
      ) ||
      /import\s*{[^}]*\bwithParallelTransaction\b[^}]*}\s+from\s+['"]@stratix\/database['"]/m.test(
        source
      ) ||
      /import\s*{[^}]*\bwithBatchTransaction\b[^}]*}\s+from\s+['"]@stratix\/database['"]/m.test(
        source
      );

    if (importsDatabaseApi) {
      issues.push(
        `DatabaseAPI was removed in @stratix/database 1.1.0, use repositories extending BaseRepository instead: ${relativePath}`
      );
    }

    if (importsRemovedTransactionHelper) {
      issues.push(
        `Public database transaction helpers were removed in @stratix/database 1.1.0, open transactions through a repository instead: ${relativePath}`
      );
    }

    if (
      normalizedPath.includes('/services/') &&
      (/^src\/services\//.test(normalizedPath) || /\/services\//.test(normalizedPath)) &&
      (/@stratix\/database/.test(source) ||
        /\bdatabaseApi\b/.test(source) ||
        /\bBaseRepository\b/.test(source))
    ) {
      issues.push(
        `Service layer must not access database plugin directly: ${relativePath}`
      );
    }

    if (
      normalizedPath.includes('/controllers/') &&
      (/^src\/controllers\//.test(normalizedPath) || /\/controllers\//.test(normalizedPath))
    ) {
      if (
        /@stratix\/database/.test(source) ||
        /\bdatabaseApi\b/.test(source) ||
        /repositories\//.test(source)
      ) {
        issues.push(
          `Controller layer must not access repository or database layer directly: ${relativePath}`
        );
      }

      if (/@Controller\(\s*[^)\s]/.test(source)) {
        issues.push(
          `Controller decorator should not declare a prefix argument: ${relativePath}`
        );
      }
    }
  }
}

export async function doctorCommand(_argv: ParsedArgs, output: CliOutput): Promise<void> {
  const { rootDir, manifest } = loadProjectManifest(process.cwd());
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = readJsonFile<Record<string, any>>(packageJsonPath);

  const baseManifest = loadTemplateManifest(manifest.kind === 'app' ? 'apps' : 'plugins', 'base');
  const templateManifest = loadTemplateManifest(manifest.kind === 'app' ? 'apps' : 'plugins', manifest.type);
  const presetManifests = manifest.presets.map((id) => loadPresetManifest(id));
  const merged = mergeContributions([baseManifest, templateManifest, ...presetManifests]);
  const issues: string[] = [];

  for (const dir of merged.directories || []) {
    if (!fileExists(path.join(rootDir, dir))) {
      issues.push(`Missing directory: ${dir}`);
    }
  }

  if (manifest.kind === 'app') {
    for (const requiredFile of ['src/index.ts', 'src/stratix.config.ts', 'src/config/stratix.generated.ts']) {
      if (!fileExists(path.join(rootDir, requiredFile))) {
        issues.push(`Missing managed file: ${requiredFile}`);
      }
    }
  } else {
    for (const requiredFile of ['src/index.ts', 'src/config/plugin-config.ts']) {
      if (!fileExists(path.join(rootDir, requiredFile))) {
        issues.push(`Missing managed file: ${requiredFile}`);
      }
    }
  }

  for (const [dep, version] of Object.entries(merged.dependencies?.runtime || {})) {
    if (packageJson.dependencies?.[dep] !== version) {
      issues.push(`Dependency mismatch: ${dep} expected ${version}`);
    }
  }

  for (const [dep, version] of Object.entries(merged.dependencies?.dev || {})) {
    if (packageJson.devDependencies?.[dep] !== version) {
      issues.push(`Dev dependency mismatch: ${dep} expected ${version}`);
    }
  }

  checkLayeringPolicies(rootDir, issues);

  if (issues.length > 0) {
    for (const issue of issues) {
      output.error(`- ${issue}`);
    }
    throw new CliError(`Doctor found ${issues.length} issue(s).`);
  }

  output.success('Doctor checks passed.');
}
