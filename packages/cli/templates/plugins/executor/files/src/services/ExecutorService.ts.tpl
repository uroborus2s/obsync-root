import type ClientAdapter from '../adapters/ClientAdapter.js';

export default class ExecutorService {
  constructor(private readonly clientAdapter: ClientAdapter) {}

  async loadPayload(): Promise<Record<string, unknown>> {
    return this.clientAdapter.fetchContext();
  }
}
