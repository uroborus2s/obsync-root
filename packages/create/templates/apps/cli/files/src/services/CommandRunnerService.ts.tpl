import { Service } from '@stratix/core';
import type { CommandResult } from '../types/cli.js';

@Service()
export default class CommandRunnerService {
  async run(argv: string[] = []): Promise<CommandResult> {
    return {
      argv,
      executedAt: new Date().toISOString()
    };
  }
}
