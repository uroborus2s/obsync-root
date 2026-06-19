/**
 * Base class for all Stratix framework errors.
 * All errors thrown by the framework or application should inherit from this class.
 */
export class StratixError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public override readonly cause?: unknown;

  constructor(
    message: string,
    code: string = 'STRATIX_ERROR',
    details?: unknown,
    cause?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.details = details;
    this.cause = cause;

    // Restore prototype chain for proper instanceof checks
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Returns a JSON representation of the error.
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      cause:
        this.cause instanceof Error
          ? {
              name: this.cause.name,
              message: this.cause.message
            }
          : this.cause
    };
  }
}
