import type CommandRunnerService from '../services/CommandRunnerService.js';

export default class MainCommand {
  constructor(private readonly commandRunnerService: CommandRunnerService) {}

  async run(argv: string[] = []): Promise<void> {
    await this.commandRunnerService.run(argv);
  }
}
