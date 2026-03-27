export interface HealthStatus {
  name: string;
  status: 'ok';
  timestamp: string;
}

export default class HealthService {
  async getHealth(): Promise<HealthStatus> {
    return {
      name: '{{projectName}}',
      status: 'ok',
      timestamp: new Date().toISOString()
    };
  }
}
