import { Service } from '@stratix/core';
import type SyncCheckpointRepository from '../repositories/SyncCheckpointRepository.js';

@Service()
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
