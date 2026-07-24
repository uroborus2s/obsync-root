import { Service } from '@stratix/core';

export interface HealthStatus {
  name: string;
  status: 'ok';
  timestamp: string;
}

@Service()
export default class HealthService {
  async getHealth(): Promise<HealthStatus> {
    return {
      name: '{{projectName}}',
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
