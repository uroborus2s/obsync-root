import { Repository } from '@stratix/core';

@Repository()
export default class SyncCheckpointRepository {
  async listCheckpointIds(): Promise<string[]> {
    return [];
  }
}
