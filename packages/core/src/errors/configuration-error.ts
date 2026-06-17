import { StratixError } from './stratix-error.js';

export class ConfigurationError extends StratixError {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super(message, 'CONFIGURATION_ERROR', details, cause);
  }
}
