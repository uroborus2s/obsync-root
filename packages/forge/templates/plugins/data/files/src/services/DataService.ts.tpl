import type DataRepository from '../repositories/DataRepository.js';

export default class DataService {
  constructor(private readonly dataRepository: DataRepository) {}

  async list(): Promise<Array<Record<string, unknown>>> {
    return this.dataRepository.findAll();
  }
}
