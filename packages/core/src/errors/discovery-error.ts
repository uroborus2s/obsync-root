import { StratixError } from './stratix-error.js';

export class DiscoveryError extends StratixError {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super(message, 'DISCOVERY_ERROR', details, cause);
  }
}
