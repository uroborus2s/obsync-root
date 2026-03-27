import type SyncCheckpointRepository from '../repositories/SyncCheckpointRepository.js';

export default class SyncOrchestratorService {
  constructor(
    private readonly syncCheckpointRepository: SyncCheckpointRepository
  ) {}

  async getOverview(): Promise<{
    checkpoints: string[];
  }> {
    const checkpoints = await this.syncCheckpointRepository.listCheckpointIds();

    return {
      checkpoints
    };
  }
}
