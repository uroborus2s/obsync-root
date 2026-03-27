import { Executor } from '@stratix/core';

@Executor({
  name: '{{camelName}}',
  description: 'Executor for {{kebabName}} workflows'
})
export default class {{pascalName}}Executor {
  async execute(payload: Record<string, unknown> = {}): Promise<{
    success: boolean;
    data: Record<string, unknown>;
  }> {
    return {
      success: true,
      data: payload
    };
  }
}
