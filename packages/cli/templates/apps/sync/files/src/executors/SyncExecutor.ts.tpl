import { Executor } from '@stratix/core';

@Executor({
  name: 'runSync',
  description: 'Run one synchronization cycle'
})
export default class SyncExecutor {
  async execute(): Promise<{ success: boolean }> {
    return { success: true };
  }
}
