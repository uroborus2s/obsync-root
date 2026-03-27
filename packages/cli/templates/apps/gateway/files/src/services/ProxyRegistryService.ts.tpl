import type { GatewayUpstream } from '../types/gateway.js';

export default class ProxyRegistryService {
  private readonly upstreams: GatewayUpstream[] = [
    {
      name: 'default',
      target: process.env.UPSTREAM_URL || 'http://127.0.0.1:3001'
    }
  ];

  list(): GatewayUpstream[] {
    return this.upstreams;
  }
}
