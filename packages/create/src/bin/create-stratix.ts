#!/usr/bin/env node

import { toCliError } from '../core/errors.js';
import { runCreate } from '../run-create.js';

try {
  await runCreate(process.argv.slice(2));
} catch (error) {
  process.exitCode = toCliError(error).exitCode;
}
