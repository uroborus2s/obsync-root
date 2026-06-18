export default class ClientAdapter {
  async request(): Promise<{ connected: boolean }> {
    return { connected: true };
  }
}
