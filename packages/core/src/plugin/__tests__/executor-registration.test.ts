// 执行器注册测试
// 测试执行器注册功能

import 'reflect-metadata';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Executor } from '../../decorators/executor.js';
import {
  processExecutorRegistration,
  registerExecutorDomain
} from '../executor-registration.js';
import type { ModuleInfo } from '../module-discovery.js';

// 测试用的执行器类
@Executor('userCreator')
class UserCreatorExecutor {
  name = 'userCreator';
  description = '用户创建执行器';

  async execute() {
    return { success: true, data: { userId: 123 } };
  }
}

@Executor({
  name: 'emailSender',
  description: '邮件发送执行器',
  version: '1.0.0'
})
class EmailSenderExecutor {
  name = 'emailSender';

  async execute() {
    return { success: true, data: { messageId: 'msg-123' } };
  }

  validateConfig(config: any) {
    return { valid: true };
  }
}

class InvalidExecutor {
  // 缺少 name 属性和 execute 方法
}

class NonExecutorService {
  name = 'service';

  doSomething() {
    return 'done';
  }
}

describe('Executor Registration', () => {
  let mockFastify: any;

  beforeEach(() => {
    mockFastify = {
      hasDecorator: vi.fn(),
      registerTaskExecutor: vi.fn(),
      registerExecutorDomain: vi.fn()
    };
  });

  describe('processExecutorRegistration', () => {
    it('should register valid executors successfully', async () => {
      mockFastify.hasDecorator.mockReturnValue(true);

      const executorModules: ModuleInfo[] = [
        {
          name: 'userCreator',
          instance: new UserCreatorExecutor(),
          constructor: UserCreatorExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        },
        {
          name: 'emailSender',
          instance: new EmailSenderExecutor(),
          constructor: EmailSenderExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await processExecutorRegistration(
        mockFastify,
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(2);
      expect(result.skippedCount).toBe(0);
      expect(result.failedCount).toBe(0);
      expect(result.registeredExecutors).toEqual([
        'userCreator',
        'emailSender'
      ]);

      expect(mockFastify.registerTaskExecutor).toHaveBeenCalledTimes(2);
      expect(mockFastify.registerTaskExecutor).toHaveBeenCalledWith(
        'userCreator',
        expect.any(UserCreatorExecutor)
      );
      expect(mockFastify.registerTaskExecutor).toHaveBeenCalledWith(
        'emailSender',
        expect.any(EmailSenderExecutor)
      );
    });

    it('should skip registration when tasks plugin not available', async () => {
      mockFastify.hasDecorator.mockReturnValue(false);

      const executorModules: ModuleInfo[] = [
        {
          name: 'userCreator',
          instance: new UserCreatorExecutor(),
          constructor: UserCreatorExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await processExecutorRegistration(
        mockFastify,
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.failedCount).toBe(0);
      expect(mockFastify.registerTaskExecutor).not.toHaveBeenCalled();
    });

    it('should skip modules without constructor', async () => {
      mockFastify.hasDecorator.mockReturnValue(true);

      const executorModules: ModuleInfo[] = [
        {
          name: 'invalidModule',
          instance: {},
          constructor: undefined,
          isClass: false,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await processExecutorRegistration(
        mockFastify,
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should skip modules without executor metadata', async () => {
      mockFastify.hasDecorator.mockReturnValue(true);

      const executorModules: ModuleInfo[] = [
        {
          name: 'nonExecutor',
          instance: new NonExecutorService(),
          constructor: NonExecutorService,
          isClass: true,
          isController: false,
          isExecutor: false, // 没有执行器装饰器
          hasRoutes: false
        }
      ];

      const result = await processExecutorRegistration(
        mockFastify,
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should skip modules that do not implement TaskExecutor interface', async () => {
      mockFastify.hasDecorator.mockReturnValue(true);

      const executorModules: ModuleInfo[] = [
        {
          name: 'invalidExecutor',
          instance: new InvalidExecutor(),
          constructor: InvalidExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await processExecutorRegistration(
        mockFastify,
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(0);
      expect(result.skippedCount).toBe(1);
      expect(result.failedCount).toBe(0);
    });

    it('should handle registration failures', async () => {
      mockFastify.hasDecorator.mockReturnValue(true);
      mockFastify.registerTaskExecutor.mockImplementation(() => {
        throw new Error('Registration failed');
      });

      const executorModules: ModuleInfo[] = [
        {
          name: 'userCreator',
          instance: new UserCreatorExecutor(),
          constructor: UserCreatorExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await processExecutorRegistration(
        mockFastify,
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(0);
      expect(result.skippedCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.failedExecutors).toHaveLength(1);
      expect(result.failedExecutors[0].name).toBe('userCreator');
      expect(result.failedExecutors[0].error).toBe('Registration failed');
    });

    it('should work with debug mode', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      mockFastify.hasDecorator.mockReturnValue(true);

      const executorModules: ModuleInfo[] = [
        {
          name: 'userCreator',
          instance: new UserCreatorExecutor(),
          constructor: UserCreatorExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await processExecutorRegistration(
        mockFastify,
        executorModules,
        true
      );

      expect(result.registeredCount).toBe(1);
      // 在调试模式下应该有日志输出
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('registerExecutorDomain', () => {
    it('should register executor domain when decorator available', async () => {
      mockFastify.hasDecorator.mockReturnValue(true);

      const executorModules: ModuleInfo[] = [
        {
          name: 'userCreator',
          instance: new UserCreatorExecutor(),
          constructor: UserCreatorExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        },
        {
          name: 'emailSender',
          instance: new EmailSenderExecutor(),
          constructor: EmailSenderExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await registerExecutorDomain(
        mockFastify,
        'business',
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(2);
      expect(result.registeredExecutors).toEqual([
        'business.userCreator',
        'business.emailSender'
      ]);

      expect(mockFastify.registerExecutorDomain).toHaveBeenCalledWith(
        'business',
        expect.objectContaining({
          userCreator: expect.any(UserCreatorExecutor),
          emailSender: expect.any(EmailSenderExecutor)
        })
      );
    });

    it('should fallback to individual registration when domain decorator not available', async () => {
      mockFastify.hasDecorator.mockImplementation((name: string) => {
        return name === 'registerTaskExecutor'; // 只有单个注册方法可用
      });

      const executorModules: ModuleInfo[] = [
        {
          name: 'userCreator',
          instance: new UserCreatorExecutor(),
          constructor: UserCreatorExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await registerExecutorDomain(
        mockFastify,
        'business',
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(1);
      expect(mockFastify.registerTaskExecutor).toHaveBeenCalledWith(
        'userCreator',
        expect.any(UserCreatorExecutor)
      );
    });

    it('should handle domain registration failure', async () => {
      mockFastify.hasDecorator.mockReturnValue(true);
      mockFastify.registerExecutorDomain.mockImplementation(() => {
        throw new Error('Domain registration failed');
      });

      const executorModules: ModuleInfo[] = [
        {
          name: 'userCreator',
          instance: new UserCreatorExecutor(),
          constructor: UserCreatorExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await registerExecutorDomain(
        mockFastify,
        'business',
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(0);
      expect(result.failedCount).toBe(1);
      expect(result.failedExecutors[0].name).toBe('business');
      expect(result.failedExecutors[0].error).toBe(
        'Domain registration failed'
      );
    });

    it('should skip invalid executors in domain registration', async () => {
      mockFastify.hasDecorator.mockReturnValue(true);

      const executorModules: ModuleInfo[] = [
        {
          name: 'userCreator',
          instance: new UserCreatorExecutor(),
          constructor: UserCreatorExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        },
        {
          name: 'invalidExecutor',
          instance: new InvalidExecutor(),
          constructor: InvalidExecutor,
          isClass: true,
          isController: false,
          isExecutor: true,
          hasRoutes: false
        }
      ];

      const result = await registerExecutorDomain(
        mockFastify,
        'business',
        executorModules,
        false
      );

      expect(result.registeredCount).toBe(1); // 只有有效的执行器被注册
      expect(result.skippedCount).toBe(1);
      expect(result.registeredExecutors).toEqual(['business.userCreator']);
    });
  });
});
