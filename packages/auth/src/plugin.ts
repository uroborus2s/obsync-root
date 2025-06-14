/**
 * 认证插件主文件
 */

import type { StratixPlugin } from '@stratix/core';
import type { AuthConfig } from './types/config.js';

/**
 * 认证插件
 */
export const authPlugin: StratixPlugin<AuthConfig> = {
  name: '@stratix/auth',
  version: '0.1.0',
  description: 'Authentication and authorization plugin for Stratix framework',

  skipOverride: {
    fastify: '>=5.0.0',
    dependencies: ['@stratix/database']
  },

  // DI容器注册
  diRegisters: {
    // 认证服务
    authService: {
      value: null, // 将在阶段二实现
      lifetime: 'SINGLETON',
      asyncInit: true
    },

    // 用户服务
    userService: {
      value: null, // 将在阶段二实现
      lifetime: 'SINGLETON',
      asyncInit: true
    },

    // 权限服务
    permissionService: {
      value: null, // 将在阶段二实现
      lifetime: 'SINGLETON',
      asyncInit: true
    },

    // 令牌服务
    tokenService: {
      value: null, // 将在阶段二实现
      lifetime: 'SINGLETON'
    },

    // 会话服务
    sessionService: {
      value: null, // 将在阶段二实现
      lifetime: 'SINGLETON'
    },

    // 用户仓储
    userRepository: {
      value: null, // 将在阶段三实现
      lifetime: 'SINGLETON'
    },

    // 角色仓储
    roleRepository: {
      value: null, // 将在阶段三实现
      lifetime: 'SINGLETON'
    },

    // 权限仓储
    permissionRepository: {
      value: null, // 将在阶段三实现
      lifetime: 'SINGLETON'
    },

    // 会话仓储
    sessionRepository: {
      value: null, // 将在阶段三实现
      lifetime: 'SINGLETON'
    },

    // 认证管理器
    authManager: {
      value: null, // 将在阶段三实现
      lifetime: 'SINGLETON',
      asyncInit: true
    },

    // 提供者管理器
    providerManager: {
      value: null, // 将在阶段二实现
      lifetime: 'SINGLETON',
      asyncInit: true
    },

    // 策略管理器
    strategyManager: {
      value: null, // 将在阶段三实现
      lifetime: 'SINGLETON'
    },

    // 权限管理器
    permissionManager: {
      value: null, // 将在阶段三实现
      lifetime: 'SINGLETON',
      asyncInit: true
    }
  },

  // 注册子插件（将在后续阶段实现）
  registers: []
};

/**
 * 导出插件配置类型
 */
export type { AuthConfig } from './types/config.js';
