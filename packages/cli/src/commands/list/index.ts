import type { ParsedArgs } from '../../core/args.js';
import { CliError } from '../../core/errors.js';
import type { CliOutput } from '../../core/output.js';
import { listPresetManifests, listTemplateManifests } from '../../template/load-template.js';

export async function listCommand(argv: ParsedArgs, output: CliOutput): Promise<void> {
  const target = argv._[1];

  switch (target) {
    case 'templates': {
      for (const manifest of [
        ...listTemplateManifests('apps'),
        ...listTemplateManifests('plugins'),
        ...listTemplateManifests('resources')
      ].filter((manifest) => manifest.type !== 'base')) {
        output.log(`${manifest.kind}:${manifest.type} - ${manifest.description}`);
      }
      return;
    }
    case 'presets': {
      for (const manifest of listPresetManifests()) {
        output.log(`${manifest.id} - ${manifest.description}`);
      }
      return;
    }
    default:
      throw new CliError('Usage: stratix list <templates|presets>');
  }
}
