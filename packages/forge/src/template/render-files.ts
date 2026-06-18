import type { ManifestFile } from '../schemas/template.js';

export function renderStringTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
    return variables[key] ?? '';
  });
}

export function renderManifestFile(
  file: ManifestFile,
  source: string,
  variables: Record<string, string>
): string {
  if (file.template === false) {
    return source;
  }

  return renderStringTemplate(source, variables);
}
