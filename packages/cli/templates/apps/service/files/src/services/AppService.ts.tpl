import type { Logger } from '@stratix/core';

export default class AppService {
  constructor(private readonly logger: Logger) {}

  async start(): Promise<void> {
    this.logger.info('Service application is ready.');
  }
}
