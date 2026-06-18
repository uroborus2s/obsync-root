import { CliError } from '../core/errors.js';
import type { PresetManifest, TemplateManifest } from '../schemas/template.js';

interface ValidatePresetSetOptions {
  kind: 'app' | 'plugin';
  type: string;
  templateManifest: TemplateManifest;
  presetIds: string[];
  presetManifests: PresetManifest[];
}

function appliesToTarget(
  manifest: PresetManifest,
  kind: 'app' | 'plugin',
  type: string
): boolean {
  return manifest.appliesTo.some((target) => {
    if (target.kind !== kind) {
      return false;
    }

    if (!target.types || target.types.length === 0) {
      return true;
    }

    return target.types.includes(type);
  });
}

export function validatePresetSet({
  kind,
  type,
  templateManifest,
  presetIds,
  presetManifests
}: ValidatePresetSetOptions): void {
  const activePresetIds = new Set(presetIds);

  if (templateManifest.allowedPresets && templateManifest.allowedPresets.length > 0) {
    for (const presetId of presetIds) {
      if (!templateManifest.allowedPresets.includes(presetId)) {
        throw new CliError(
          `Preset "${presetId}" is not allowed for template ${kind}:${type}.`
        );
      }
    }
  }

  for (const presetManifest of presetManifests) {
    if (!appliesToTarget(presetManifest, kind, type)) {
      throw new CliError(
        `Preset "${presetManifest.id}" does not apply to ${kind}:${type}.`
      );
    }

    for (const requiredPreset of presetManifest.requires || []) {
      if (!activePresetIds.has(requiredPreset)) {
        throw new CliError(
          `Preset "${presetManifest.id}" requires preset "${requiredPreset}".`
        );
      }
    }

    for (const conflictingPreset of presetManifest.conflicts || []) {
      if (activePresetIds.has(conflictingPreset)) {
        throw new CliError(
          `Preset "${presetManifest.id}" conflicts with preset "${conflictingPreset}".`
        );
      }
    }
  }
}
