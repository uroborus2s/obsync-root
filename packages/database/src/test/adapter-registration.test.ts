// @stratix/database 适配器注册测试
// 验证 databaseManager 适配器是否正确注册

import { registerServiceAdapters } from '@stratix/core';
import { createContainer, type AwilixContainer } from 'awilix';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import ManagerAdapter from '../adapters/database-api.adapter.js';

describe('Database Adapter Registration', () => {
  let rootContainer: AwilixContainer;
  let pluginContainer: AwilixContainer;

  beforeEach(() => {
    rootContainer = createContainer();
    pluginContainer = createContainer();

    // 模拟 DatabaseManager 注册
    pluginContainer.register('databaseManager', {
      resolve: () => ({
        getConnection: () => ({}),
        getReadConnection: () => ({}),
        getWriteConnection: () => ({}),
        hasConnection: () => true
      })
    });
  });

  afterEach(() => {
    rootContainer.dispose();
    pluginContainer.dispose();
  });

  it('should have correct adapter name', () => {
    expect(ManagerAdapter.adapterName).toBe('manager');
  });

  it('should register adapter with correct namespace', async () => {
    const pluginContext = {
      internalContainer: pluginContainer,
      rootContainer: rootContainer
    };

    const serviceConfig = {
      enabled: true,
      patterns: ['adapters/*.{ts,js}']
    };

    // 模拟适配器注册
    await registerServiceAdapters(
      pluginContext,
      serviceConfig,
      __dirname + '/../',
      'database',
      true
    );

    // 验证适配器是否以正确的名称注册
    expect(rootContainer.hasRegistration('databaseManager')).toBe(true);
  });

  it('should create functional adapter instance', () => {
    const adapter = new ManagerAdapter(pluginContainer);

    expect(adapter).toBeDefined();
    expect(typeof adapter.executeQuery).toBe('function');
    expect(typeof adapter.transaction).toBe('function');
    expect(typeof adapter.getConnection).toBe('function');
    expect(typeof adapter.healthCheck).toBe('function');
  });

  it('should implement DatabaseAPI interface', () => {
    const adapter = new ManagerAdapter(pluginContainer);

    // 验证所有必需的方法都存在
    const requiredMethods = [
      'executeQuery',
      'executeBatch',
      'executeParallel',
      'transaction',
      'getConnection',
      'getReadConnection',
      'getWriteConnection',
      'getReadConnectionSync',
      'getWriteConnectionSync',
      'healthCheck'
    ];

    for (const method of requiredMethods) {
      expect(typeof (adapter as any)[method]).toBe('function');
    }
  });
});
