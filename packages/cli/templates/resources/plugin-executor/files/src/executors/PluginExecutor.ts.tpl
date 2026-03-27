import { Executor } from '@stratix/core';

@Executor({
  name: '{{camelName}}',
  description: 'Plugin executor for {{kebabName}}'
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
