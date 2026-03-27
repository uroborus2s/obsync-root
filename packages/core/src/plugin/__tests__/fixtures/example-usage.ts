/**
 * @stratix/core - Cross Plugin Workflow Usage Example
 * 
 * 演示如何使用跨插件工作流机制的完整示例
 */

import { withRegisterAutoDI } from '../../auto-di-plugin.js';
import type { 
  TaskExecutor, 
  ExecutionContext, 
  TaskResult, 
  WorkflowDefinitionBase 
} from '../../workflow-types.js';

// ============================================================================
// 1. 业务插件示例：@example/user 插件
// ============================================================================

/**
 * 用户服务 - 业务逻辑层
 */
class UserService {
  async createUser(userData: { name: string; email: string }) {
    // 模拟用户创建逻辑
    return {
      id: `user_${Date.now()}`,
      ...userData,
      status: 'pending_verification',
      createdAt: new Date()
    };
  }

  async verifyUser(userId: string) {
    // 模拟用户验证逻辑
    return {
      userId,
      verified: true,
      verifiedAt: new Date()
    };
  }
}

/**
 * 邮件服务 - 通知服务
 */
class EmailService {
  async sendWelcomeEmail(email: string, userName: string) {
    // 模拟发送欢迎邮件
    console.log(`📧 发送欢迎邮件到 ${email} (用户: ${userName})`);
    return {
      messageId: `msg_${Date.now()}`,
      status: 'sent',
      sentAt: new Date()
    };
  }

  async sendVerificationEmail(email: string, verificationCode: string) {
    // 模拟发送验证邮件
    console.log(`📧 发送验证邮件到 ${email} (验证码: ${verificationCode})`);
    return {
      messageId: `msg_${Date.now()}`,
      status: 'sent',
      verificationCode,
      sentAt: new Date()
    };
  }
}

/**
 * 用户创建执行器 - 工作流执行器
 */
class UserCreatorExecutor implements TaskExecutor {
  name = 'user-creator';

  constructor(
    private userService: UserService,
    private emailService: EmailService
  ) {}

  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    const { name, email } = input;

    try {
      context.logger.info(`开始创建用户: ${name} (${email})`);

      // 1. 创建用户
      const user = await this.userService.createUser({ name, email });
      context.reportProgress(50);

      // 2. 发送欢迎邮件
      const emailResult = await this.emailService.sendWelcomeEmail(email, name);
      context.reportProgress(100);

      context.logger.info(`用户创建成功: ${user.id}`);

      return {
        success: true,
        data: {
          user,
          emailResult
        },
        metadata: {
          executionTime: Date.now() - context.startTime
        }
      };

    } catch (error) {
      context.logger.error(`用户创建失败: ${error.message}`);
      
      return {
        success: false,
        error: {
          message: '用户创建失败',
          code: 'USER_CREATION_FAILED',
          retryable: true,
          details: error.message
        }
      };
    }
  }
}

/**
 * 用户验证执行器
 */
class UserVerificationExecutor implements TaskExecutor {
  name = 'user-verifier';

  constructor(
    private userService: UserService,
    private emailService: EmailService
  ) {}

  async execute(input: any, context: ExecutionContext): Promise<TaskResult> {
    const { userId, email } = input;

    try {
      context.logger.info(`开始验证用户: ${userId}`);

      // 1. 生成验证码
      const verificationCode = Math.random().toString(36).substr(2, 8);
      context.reportProgress(25);

      // 2. 发送验证邮件
      await this.emailService.sendVerificationEmail(email, verificationCode);
      context.reportProgress(75);

      // 3. 验证用户
      const verificationResult = await this.userService.verifyUser(userId);
      context.reportProgress(100);

      context.logger.info(`用户验证完成: ${userId}`);

      return {
        success: true,
        data: {
          verificationResult,
          verificationCode
        }
      };

    } catch (error) {
      context.logger.error(`用户验证失败: ${error.message}`);
      
      return {
        success: false,
        error: {
          message: '用户验证失败',
          code: 'USER_VERIFICATION_FAILED',
          retryable: true,
          details: error.message
        }
      };
    }
  }
}

/**
 * 用户注册工作流定义
 */
const userRegistrationWorkflow: WorkflowDefinitionBase = {
  id: 'user-registration-v1',
  name: 'User Registration Workflow',
  version: '1.0.0',
  description: '用户注册流程工作流',
  metadata: {
    sourcePlugin: '@example/user',
    category: 'user-management'
  }
};

/**
 * @example/user 插件定义
 */
export const userPlugin = withRegisterAutoDI(
  async (fastify, options) => {
    // 注册业务服务
    fastify.diContainer.register('userService', {
      resolve: () => new UserService()
    });

    fastify.diContainer.register('emailService', {
      resolve: () => new EmailService()
    });

    // 注册工作流执行器（自动依赖注入）
    fastify.diContainer.register('userCreatorExecutor', {
      resolve: (container) => new UserCreatorExecutor(
        container.resolve('userService'),
        container.resolve('emailService')
      )
    });

    fastify.diContainer.register('userVerificationExecutor', {
      resolve: (container) => new UserVerificationExecutor(
        container.resolve('userService'),
        container.resolve('emailService')
      )
    });

    // 注册工作流定义
    fastify.diContainer.register('userRegistrationWorkflow', {
      resolve: () => userRegistrationWorkflow
    });

    fastify.log.info('📦 @example/user 插件加载完成');
  },
  {
    // 插件配置
    discovery: {
      patterns: [
        'services/**/*.{ts,js}',
        'repositories/**/*.{ts,js}'
      ]
    },
    
    // 🔥 关键：工作流配置
    workflows: {
      enabled: true,
      patterns: [
        'workflows/definitions/**/*.{ts,js}',
        'workflows/executors/**/*.{ts,js}',
        'workflows/services/**/*.{ts,js}'
      ],
      metadata: {
        category: 'user-management',
        provides: {
          definitions: ['user-registration-v1'],
          executors: ['user-creator', 'user-verifier'],
          services: ['user-workflow-service']
        }
      }
    },

    routing: {
      enabled: true,
      prefix: '/api/users'
    }
  }
);

// ============================================================================
// 2. @stratix/tasks 插件示例
// ============================================================================

/**
 * 模拟的工作流引擎
 */
class MockWorkflowEngine {
  async startWorkflow(definitionId: string, input: any) {
    console.log(`🚀 启动工作流: ${definitionId}`, input);
    return {
      instanceId: `wf_${Date.now()}`,
      status: 'running',
      startedAt: new Date()
    };
  }

  async getExecutor(executorName: string) {
    console.log(`🔍 查找执行器: ${executorName}`);
    // 这里会通过 ExecutorRegistry 从跨插件容器中获取执行器
    return null;
  }
}

/**
 * @stratix/tasks 插件定义
 */
export const tasksPlugin = withRegisterAutoDI(
  async (fastify, options) => {
    // 注册工作流引擎
    fastify.diContainer.register('workflowEngine', {
      resolve: () => new MockWorkflowEngine()
    });

    // 注册执行器注册表
    fastify.diContainer.register('executorRegistry', {
      resolve: () => ({
        getExecutor: async (name: string) => {
          console.log(`🔍 ExecutorRegistry 查找执行器: ${name}`);
          return null;
        }
      })
    });

    fastify.log.info('🚀 @stratix/tasks 插件加载完成');
  },
  {
    discovery: {
      patterns: [
        'engine/**/*.{ts,js}',
        'services/**/*.{ts,js}',
        'repositories/**/*.{ts,js}',
        'controllers/**/*.{ts,js}'
      ]
    },

    routing: {
      enabled: true,
      prefix: '/api/workflows'
    }
  }
);

// ============================================================================
// 3. 应用配置示例
// ============================================================================

/**
 * 完整的应用配置示例
 */
export async function createExampleApp() {
  const fastify = require('fastify')({ logger: true });

  try {
    // 1. 注册业务插件
    await fastify.register(userPlugin);

    // 2. 注册工作流插件
    await fastify.register(tasksPlugin);

    // 3. 启动应用
    await fastify.listen({ port: 3000 });

    console.log('🎉 应用启动成功！');
    console.log('📋 可用的工作流组件：');
    
    // 显示注册的组件
    const { pluginContainerRegistry } = await import('../../container-registry.js');
    const stats = pluginContainerRegistry.getStats();
    
    console.log(`  - 总插件数: ${stats.totalPlugins}`);
    console.log(`  - 工作流插件数: ${stats.workflowEnabledPlugins}`);
    console.log(`  - Tasks 插件已加载: ${stats.tasksPluginLoaded}`);

    return fastify;

  } catch (error) {
    console.error('❌ 应用启动失败:', error);
    throw error;
  }
}

// ============================================================================
// 4. 使用示例
// ============================================================================

/**
 * 演示如何使用跨插件工作流
 */
export async function demonstrateWorkflowUsage() {
  const app = await createExampleApp();

  try {
    // 模拟启动用户注册工作流
    const workflowEngine = app.diContainer.resolve('workflowEngine');
    
    const workflowInstance = await workflowEngine.startWorkflow(
      'user-registration-v1',
      {
        name: 'John Doe',
        email: 'john.doe@example.com'
      }
    );

    console.log('✅ 工作流启动成功:', workflowInstance);

    // 模拟获取跨插件执行器
    const executorRegistry = app.diContainer.resolve('executorRegistry');
    const userCreator = await executorRegistry.getExecutor('user-creator');
    
    if (userCreator) {
      console.log('✅ 跨插件执行器获取成功:', userCreator.name);
    }

  } finally {
    await app.close();
  }
}

// 如果直接运行此文件，执行演示
if (require.main === module) {
  demonstrateWorkflowUsage().catch(console.error);
}
