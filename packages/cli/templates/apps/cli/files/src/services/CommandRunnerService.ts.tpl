import type { CommandResult } from '../types/cli.js';

export default class CommandRunnerService {
  async run(argv: string[] = []): Promise<CommandResult> {
    return {
      argv,
      executedAt: new Date().toISOString()
    };
  }
}
