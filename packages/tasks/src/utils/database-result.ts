import { eitherLeft, eitherRight } from '@stratix/core/functional';
import type { DatabaseError, DatabaseResult } from '@stratix/database';
import { QueryError } from '@stratix/database';

export const toDatabaseError = (error: unknown): DatabaseError => {
  if (
    error &&
    typeof error === 'object' &&
    'type' in error &&
    'message' in error &&
    'timestamp' in error &&
    'retryable' in error
  ) {
    return error as DatabaseError;
  }

  if (error instanceof QueryError) {
    return error;
  }

  return QueryError.create(
    error instanceof Error ? error.message : String(error)
  );
};

export const dbSuccess = <T>(data: T): DatabaseResult<T> => eitherRight(data);

export const dbFailure = <T = never>(error: unknown): DatabaseResult<T> =>
  eitherLeft(toDatabaseError(error));
