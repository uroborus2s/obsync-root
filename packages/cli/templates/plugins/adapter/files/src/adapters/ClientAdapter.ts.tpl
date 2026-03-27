export default class ClientAdapter {
  async ping(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}
