import type { Logger } from '@stratix/core';
import type {{pascalName}}Repository from '../repositories/{{pascalName}}Repository.js';
import type { I{{pascalName}}Record } from '../repositories/interfaces/I{{pascalName}}Repository.js';

export default class {{pascalName}}Service {
  constructor(
    private readonly logger: Logger,
    private readonly {{camelName}}Repository: {{pascalName}}Repository
  ) {}

  async list(): Promise<I{{pascalName}}Record[]> {
    this.logger.debug('Listing {{kebabName}} records.');
    return this.{{camelName}}Repository.findAll();
  }
}
