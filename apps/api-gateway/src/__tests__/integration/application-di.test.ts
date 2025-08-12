/**
 * 应用级自动依赖注入集成测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Stratix } from '@stratix/core';
import type { FastifyInstance } from '@stratix/core';

describe('应用级自动依赖注入', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // 启动应用
    app = await Stratix.run({
      type: 'web',
      server: {
        port: 0, // 使用随机端口
        host: '127.0.0.1'
      },
      debug: true,
      gracefulShutdown: false
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  it('应该自动注册JWT服务', async () => {
    // 检查JWT服务是否已注册到DI容器
    const jwtService = app.diContainer.resolve('jWTService');
    expect(jwtService).toBeDefined();
    expect(typeof jwtService.generateToken).toBe('function');
    expect(typeof jwtService.verifyToken).toBe('function');
  });

  it('应该自动注册认证控制器路由', async () => {
    // 测试认证验证端点
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/verify'
    });

    expect(response.statusCode).toBe(401); // 未认证应该返回401
    const body = JSON.parse(response.body);
    expect(body.success).toBe(false);
    expect(body.error).toBe('NO_TOKEN');
  });

  it('应该自动注册网关控制器路由', async () => {
    // 测试网关状态端点
    const response = await app.inject({
      method: 'GET',
      url: '/api/gateway/status'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.gateway.status).toBe('healthy');
  });

  it('应该注册健康检查端点', async () => {
    // 测试健康检查端点
    const response = await app.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('healthy');
    expect(body.service).toBe('api-gateway');
  });

  it('应该注册就绪检查端点', async () => {
    // 测试就绪检查端点
    const response = await app.inject({
      method: 'GET',
      url: '/ready'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('ready');
    expect(body.service).toBe('api-gateway');
  });

  it('应该注册存活检查端点', async () => {
    // 测试存活检查端点
    const response = await app.inject({
      method: 'GET',
      url: '/live'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.status).toBe('alive');
    expect(body.service).toBe('api-gateway');
  });

  it('JWT服务应该能够生成和验证token', async () => {
    const jwtService = app.diContainer.resolve('jWTService');
    
    // 生成token
    const payload = {
      userId: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com'
    };
    
    const token = jwtService.generateToken(payload);
    expect(token).toBeDefined();
    expect(typeof token).toBe('string');

    // 验证token
    const result = jwtService.verifyToken(token);
    expect(result.valid).toBe(true);
    expect(result.payload?.userId).toBe('test-user-123');
    expect(result.payload?.username).toBe('testuser');
  });

  it('应该正确处理认证流程', async () => {
    const jwtService = app.diContainer.resolve('jWTService');
    
    // 生成有效token
    const payload = {
      userId: 'test-user-456',
      username: 'authuser',
      email: 'auth@example.com'
    };
    
    const token = jwtService.generateToken(payload);

    // 使用token访问需要认证的端点
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/verify',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.user.userId).toBe('test-user-456');
  });

  it('应该正确处理登出流程', async () => {
    // 测试登出端点
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/logout'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.message).toBe('登出成功');
  });

  it('应该正确处理网关配置查询', async () => {
    // 测试网关配置端点
    const response = await app.inject({
      method: 'GET',
      url: '/api/gateway/config'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.auth).toBeDefined();
    expect(body.data.proxy).toBeDefined();
  });

  it('应该正确处理网关指标查询', async () => {
    // 测试网关指标端点
    const response = await app.inject({
      method: 'GET',
      url: '/api/gateway/metrics'
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.success).toBe(true);
    expect(body.data.system).toBeDefined();
    expect(body.data.system.uptime).toBeGreaterThan(0);
  });
});
