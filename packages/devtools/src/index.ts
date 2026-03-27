import { AwilixContainer } from 'awilix';
import { FastifyInstance } from 'fastify';
// @ts-ignore
import fastifyStatic from 'fastify-static';
// @ts-ignore
import fastifyWebsocket from '@fastify/websocket';
import path from 'path';
import { fileURLToPath } from 'url';

// Shim for __dirname in ESM
// @ts-ignore
const __filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
// @ts-ignore
const __dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(__filename);

export interface DevToolsOptions {
  path?: string;
  enable?: boolean;
}

// Global clients set for logs
const logClients = new Set<any>();
let isStdoutHooked = false;

function hookStdout() {
  if (isStdoutHooked) return;
  isStdoutHooked = true;

  const originalStdoutWrite = process.stdout.write.bind(process.stdout);
  const originalStderrWrite = process.stderr.write.bind(process.stderr);

  function broadcast(chunk: any) {
    const msg = chunk.toString();
    for (const client of logClients) {
      if (client.readyState === 1) {
        client.send(msg);
      }
    }
  }

  // @ts-ignore
  process.stdout.write = (chunk, ...args) => {
    broadcast(chunk);
    // @ts-ignore
    return originalStdoutWrite(chunk, ...args);
  };

  // @ts-ignore
  process.stderr.write = (chunk, ...args) => {
    broadcast(chunk);
    // @ts-ignore
    return originalStderrWrite(chunk, ...args);
  };
}

export default async function devToolsPlugin(
  fastify: FastifyInstance, 
  options: DevToolsOptions
) {
  const basePath = options.path || '/_stratix';
  
  fastify.log.info(`🛠️  DevTools enabled at ${basePath}`);

  // Register WebSocket support
  await fastify.register(fastifyWebsocket);

  // Hook stdout/stderr for logs
  hookStdout();

  // 1. Serve Static Files (Frontend)
  const clientDistPath = path.join(__dirname, 'client');

  // Collect routes
  const collectedRoutes: any[] = [];
  fastify.addHook('onRoute', (routeOptions) => {
    collectedRoutes.push({
      method: routeOptions.method,
      url: routeOptions.url,
    });
  });

  fastify.register(fastifyStatic, {
    root: clientDistPath,
    prefix: basePath,
    wildcard: false, // Do not handle all requests, only static files
  });

  // Serve index.html for SPA routing
  fastify.get(basePath, (req, reply) => {
    (reply as any).sendFile('index.html');
  });
  
  // Handle client-side routing fallback
  fastify.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith(basePath) && !req.url.startsWith(`${basePath}/api`)) {
      (reply as any).sendFile('index.html');
    } else {
      reply.status(404).send({ error: 'Not Found' });
    }
  });

  // 2. API Routes
  const apiPrefix = `${basePath}/api`;

  // 2.1 System Stats
  fastify.get(`${apiPrefix}/stats`, async () => {
    return {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch
    };
  });

  // 2.2 Routes Explorer
  fastify.get(`${apiPrefix}/routes`, async () => {
    return { routes: collectedRoutes };
  });

  // 2.3 Container Inspector
  fastify.get(`${apiPrefix}/container`, async (req) => {
    const container = (fastify as any).diContainer as AwilixContainer;
    
    if (!container) {
      return { services: [] };
    }

    const registrations = container.registrations;
    const services = Object.keys(registrations).map(key => {
      const reg = registrations[key];
      // @ts-ignore
      const lifetime = reg.lifetime;
      // @ts-ignore
      const injectionMode = reg.injectionMode;
      
      return {
        name: key,
        lifetime,
        injectionMode,
      };
    });

    return { services };
  });

  // 2.4 Live Logs (WebSocket)
  fastify.get(`${apiPrefix}/logs`, { websocket: true }, (connection: any, req) => {
    logClients.add(connection.socket);
    
    connection.socket.on('close', () => {
      logClients.delete(connection.socket);
    });
  });
}

// Collect routes
const collectedRoutes: any[] = [];

// We need to export a function that can be used to hook into onRoute
// But `devToolsPlugin` is an async plugin.
// We can add the hook inside the plugin function.
// Note: This will only collect routes registered AFTER this plugin is registered.
// If Stratix registers this plugin last, we might miss routes.
// Stratix should register this plugin EARLY.
