import type ApiAdapter from '../adapters/ApiAdapter.js';

export default class DataRepository {
  constructor(private readonly apiAdapter: ApiAdapter) {}

  async findAll(): Promise<Array<Record<string, unknown>>> {
    return this.apiAdapter.fetchItems();
  }
}
