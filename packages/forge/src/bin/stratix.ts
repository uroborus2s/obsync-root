#!/usr/bin/env node

import { toCliError } from '../core/errors.js';
import { runCli } from '../run-cli.js';

try {
  await runCli(process.argv.slice(2));
} catch (error) {
  process.exitCode = toCliError(error).exitCode;
}
