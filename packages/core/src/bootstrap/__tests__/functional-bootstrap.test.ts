// 函数式启动模块测试
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  bootstrap,
  processOptions,
  loadEnvironment,
  loadConfiguration,
  setupContainer,
  initializeFastify,
  createApplication
} from '../functional-bootstrap.js';
import { E, TE } from '../../fp/index.js';
import type { StratixRunOptions } from '../../types/index.js';

describe('Functional Bootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('processOptions', () => {
    it('should process options with defaults', () => {
      const options: StratixRunOptions = { type: 'web' };
      const result = processOptions(options);
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.type).toBe('web');
        expect(result.right.gracefulShutdown).toBe(true);
        expect(result.right.shutdownTimeout).toBe(10000);
      }
    });

    it('should merge custom options with defaults', () => {
      const options: StratixRunOptions = {
        type: 'cli',
        debug: true,
        shutdownTimeout: 5000
      };
      const result = processOptions(options);
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.type).toBe('cli');
        expect(result.right.debug).toBe(true);
        expect(result.right.shutdownTimeout).toBe(5000);
        expect(result.right.gracefulShutdown).toBe(true); // 默认值
      }
    });

    it('should handle empty options', () => {
      const result = processOptions();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.type).toBe('web');
        expect(result.right.gracefulShutdown).toBe(true);
      }
    });
  });

  describe('loadEnvironment', () => {
    it('should load environment variables', async () => {
      const options: StratixRunOptions = { type: 'web' };
      const result = await loadEnvironment(options)();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.env).toBeDefined();
        expect(result.right.env?.NODE_ENV).toBeDefined();
        expect(result.right.env?.PORT).toBeDefined();
        expect(result.right.env?.HOST).toBeDefined();
      }
    });

    it('should merge custom env with defaults', async () => {
      const options: StratixRunOptions = {
        type: 'web',
        env: { CUSTOM_VAR: 'test' }
      };
      const result = await loadEnvironment(options)();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.env?.CUSTOM_VAR).toBe('test');
        expect(result.right.env?.NODE_ENV).toBeDefined();
      }
    });
  });

  describe('loadConfiguration', () => {
    it('should load configuration with defaults', async () => {
      const options: StratixRunOptions = {
        type: 'web',
        env: { PORT: '8080', HOST: 'localhost' }
      };
      const result = await loadConfiguration(options)();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.config.server?.port).toBe(8080);
        expect(result.right.config.server?.host).toBe('localhost');
        expect(result.right.config.plugins).toEqual([]);
      }
    });

    it('should merge custom config', async () => {
      const customConfig = {
        server: { port: 9000 },
        plugins: [{ name: 'test', plugin: vi.fn() }]
      };
      const options: StratixRunOptions = {
        type: 'web',
        config: customConfig
      };
      const result = await loadConfiguration(options)();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.config.server?.port).toBe(9000);
        expect(result.right.config.plugins).toHaveLength(1);
      }
    });
  });

  describe('setupContainer', () => {
    it('should create and setup container', async () => {
      const context = {
        options: { type: 'web' as const },
        config: {
          server: { port: 3000, host: '0.0.0.0' },
          plugins: []
        }
      };
      
      const result = await setupContainer(context)();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.container).toBeDefined();
        expect(result.right.container.registrations).toBeDefined();
        
        // 验证基础服务已注册
        expect(result.right.container.hasRegistration('config')).toBe(true);
        expect(result.right.container.hasRegistration('options')).toBe(true);
      }
    });
  });

  describe('initializeFastify', () => {
    it('should initialize Fastify instance', async () => {
      // 首先设置容器
      const containerContext = {
        options: { type: 'web' as const },
        config: {
          server: { port: 3000, host: '0.0.0.0' },
          plugins: [],
          logger: { level: 'info' }
        }
      };
      
      const containerResult = await setupContainer(containerContext)();
      expect(E.isRight(containerResult)).toBe(true);
      
      if (E.isRight(containerResult)) {
        const result = await initializeFastify(containerResult.right)();
        
        expect(E.isRight(result)).toBe(true);
        if (E.isRight(result)) {
          expect(result.right.fastify).toBeDefined();
          expect(result.right.logger).toBeDefined();
          expect(result.right.fastify.hasDecorator('diContainer')).toBe(true);
        }
      }
    });
  });

  describe('createApplication', () => {
    it('should create StratixApplication instance', async () => {
      // 模拟完整的上下文
      const mockFastify = {
        close: vi.fn().mockResolvedValue(undefined)
      } as any;
      
      const mockContainer = {
        registrations: {},
        hasRegistration: vi.fn().mockReturnValue(true),
        resolve: vi.fn()
      } as any;
      
      const mockLogger = {
        info: vi.fn(),
        debug: vi.fn(),
        error: vi.fn()
      } as any;
      
      const context = {
        options: { type: 'web' as const, instanceId: 'test' },
        config: {
          server: { port: 3000, host: '0.0.0.0' },
          plugins: []
        },
        container: mockContainer,
        fastify: mockFastify,
        logger: mockLogger
      };
      
      const result = createApplication(context);
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const app = result.right;
        expect(app.fastify).toBe(mockFastify);
        expect(app.diContainer).toBe(mockContainer);
        expect(app.logger).toBe(mockLogger);
        expect(app.type).toBe('web');
        expect(app.instanceId).toBe('test');
        expect(app.status.phase).toBe('READY');
        
        // 测试stop方法
        await app.stop();
        expect(mockFastify.close).toHaveBeenCalled();
      }
    });
  });

  describe('bootstrap pipeline', () => {
    it('should execute complete bootstrap pipeline', async () => {
      const options: StratixRunOptions = {
        type: 'service', // 使用service类型避免启动HTTP服务器
        debug: true
      };
      
      const result = await bootstrap(options)();
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        const app = result.right;
        expect(app.type).toBe('service');
        expect(app.fastify).toBeDefined();
        expect(app.diContainer).toBeDefined();
        expect(app.logger).toBeDefined();
        expect(app.config).toBeDefined();
        
        // 清理
        await app.stop();
      }
    });

    it('should handle bootstrap errors gracefully', async () => {
      const options: StratixRunOptions = {
        type: 'web',
        config: null as any // 故意传入无效配置
      };
      
      const result = await bootstrap(options)();
      
      // 应该返回错误而不是抛出异常
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left).toBeInstanceOf(Error);
      }
    });
  });

  describe('error handling', () => {
    it('should handle configuration errors', async () => {
      const options: StratixRunOptions = {
        configPath: '/nonexistent/path/config.ts'
      };
      
      const result = await loadConfiguration(options)();
      
      // 配置加载可能成功（使用默认值），但如果失败应该返回错误
      if (E.isLeft(result)) {
        expect(result.left.code).toBe('CONFIGURATION_ERROR');
      }
    });

    it('should handle container setup errors', async () => {
      // 模拟容器创建失败的情况
      const originalImport = global.import;
      global.import = vi.fn().mockRejectedValue(new Error('Awilix not found'));
      
      const context = {
        options: { type: 'web' as const },
        config: { server: { port: 3000 }, plugins: [] }
      };
      
      const result = await setupContainer(context)();
      
      expect(E.isLeft(result)).toBe(true);
      if (E.isLeft(result)) {
        expect(result.left.code).toBe('CONTAINER_ERROR');
      }
      
      // 恢复原始import
      global.import = originalImport;
    });
  });

  describe('functional composition', () => {
    it('should compose bootstrap steps correctly', async () => {
      const steps = [
        processOptions,
        loadEnvironment,
        loadConfiguration,
        setupContainer
      ];
      
      const options: StratixRunOptions = { type: 'service' };
      
      // 手动组合步骤
      let result: any = E.right(options);
      
      for (const step of steps) {
        if (E.isRight(result)) {
          if (step === processOptions) {
            result = step(result.right);
          } else {
            result = await (step as any)(result.right)();
          }
        }
      }
      
      expect(E.isRight(result)).toBe(true);
      if (E.isRight(result)) {
        expect(result.right.container).toBeDefined();
      }
    });
  });
});
