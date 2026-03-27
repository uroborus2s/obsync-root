import axios from 'axios';

// In development (vite), we might need to point to the backend server if running separately.
// But since this is a plugin, usually we run the stratix app which serves the frontend.
// If running `vite dev`, we need to proxy requests to the backend.
// For now, let's assume relative path works if served by stratix, 
// or we configure vite proxy.

export const api = axios.create({
  baseURL: '/_stratix/api',
});

export interface SystemStats {
  uptime: number;
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    arrayBuffers: number;
  };
  cpu: {
    user: number;
    system: number;
  };
  pid: number;
  nodeVersion: string;
  platform: string;
  arch: string;
}

export interface RouteInfo {
  method: string;
  url: string;
}

export interface ServiceInfo {
  name: string;
  lifetime: string;
  injectionMode: string;
}
