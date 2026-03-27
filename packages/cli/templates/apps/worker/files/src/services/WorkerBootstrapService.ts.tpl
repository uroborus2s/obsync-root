import type { Logger } from '@stratix/core';

export default class WorkerBootstrapService {
  constructor(private readonly logger: Logger) {}

  async warmup(): Promise<void> {
    this.logger.info('Worker bootstrap completed.');
  }
}
