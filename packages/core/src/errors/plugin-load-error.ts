import { StratixError } from './stratix-error.js';

export class PluginLoadError extends StratixError {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super(message, 'PLUGIN_LOAD_ERROR', details, cause);
  }
}
