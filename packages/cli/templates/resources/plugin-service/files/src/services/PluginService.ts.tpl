import type {{pascalName}}Adapter from '../adapters/{{pascalName}}Adapter.js';

export default class {{pascalName}}Service {
  constructor(private readonly {{camelName}}Adapter: {{pascalName}}Adapter) {}

  async run(): Promise<{ ok: boolean }> {
    return this.{{camelName}}Adapter.execute();
  }
}
