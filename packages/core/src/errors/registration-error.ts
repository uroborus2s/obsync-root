import { StratixError } from './stratix-error.js';

export class RegistrationError extends StratixError {
  constructor(message: string, details?: unknown, cause?: unknown) {
    super(message, 'REGISTRATION_ERROR', details, cause);
  }
}
