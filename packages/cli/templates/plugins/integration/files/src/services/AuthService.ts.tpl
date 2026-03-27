import type ClientAdapter from '../adapters/ClientAdapter.js';

export default class AuthService {
  constructor(private readonly clientAdapter: ClientAdapter) {}

  async authenticate(): Promise<boolean> {
    const result = await this.clientAdapter.request();
    return result.connected;
  }
}
