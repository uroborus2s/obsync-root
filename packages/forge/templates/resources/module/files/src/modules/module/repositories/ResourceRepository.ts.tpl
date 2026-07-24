import { Repository, type Logger } from '@stratix/core';
import type {
  I{{pascalName}}Record,
  I{{pascalName}}Repository
} from '../repositories/interfaces/I{{pascalName}}Repository.js';

@Repository()
export default class {{pascalName}}Repository
  implements I{{pascalName}}Repository
{
  constructor(private readonly logger: Logger) {}

  async findAll(): Promise<I{{pascalName}}Record[]> {
    this.logger.debug('Repository placeholder for module {{kebabName}}.');
    return [];
  }
}
