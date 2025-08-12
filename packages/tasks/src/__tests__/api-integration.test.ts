/**
 * 工作流API集成测试
 * 测试前后端接口的连通性和一致性
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Stratix } from '@stratix/core';
import type { FastifyInstance } from '@stratix/core';

describe('工作流API集成测试', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // 启动测试应用
    app = await Stratix.run({
      type: 'web',
      server: { port: 0 }, // 使用随机端口
      debug: false,
      config: {
        plugins: [
          {
            name: '@stratix/tasks',
            plugin: (await import('../index.js')).default,
            options: {
              api: {
                enabled: true,
                prefix: '/api/workflows'
              }
            }
          }
        ]
      }
    });
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('工作流定义API', () => {
    it('应该能够获取工作流定义列表', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workflows/definitions'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    });

    it('应该能够创建工作流定义', async () => {
      const workflowDefinition = {
        name: '测试工作流',
        description: '这是一个测试工作流',
        version: 1,
        definition: {
          nodes: [
            {
              id: 'start',
              type: 'start',
              name: '开始'
            },
            {
              id: 'end',
              type: 'end',
              name: '结束'
            }
          ],
          edges: [
            {
              source: 'start',
              target: 'end'
            }
          ]
        }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/workflows/definitions',
        payload: workflowDefinition
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
    });
  });

  describe('工作流实例API', () => {
    it('应该能够获取工作流实例列表', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workflows/instances'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    });

    it('应该能够创建工作流实例', async () => {
      // 首先创建一个工作流定义
      const definitionResponse = await app.inject({
        method: 'POST',
        url: '/api/workflows/definitions',
        payload: {
          name: '实例测试工作流',
          description: '用于测试实例创建的工作流',
          version: 1,
          definition: {
            nodes: [{ id: 'start', type: 'start', name: '开始' }],
            edges: []
          }
        }
      });

      const definitionData = JSON.parse(definitionResponse.payload);
      const workflowDefinitionId = definitionData.data.id;

      // 创建工作流实例
      const instanceData = {
        workflowDefinitionId,
        name: '测试实例',
        inputData: { test: 'data' }
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/workflows/instances',
        payload: instanceData
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
    });
  });

  describe('工作流执行日志API', () => {
    it('应该能够获取执行日志列表', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workflows/logs'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    });

    it('应该能够获取日志统计信息', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workflows/logs/statistics'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    });
  });

  describe('工作流定时任务API', () => {
    it('应该能够获取定时任务列表', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workflows/schedules'
      });

      expect(response.statusCode).toBe(200);
      const data = JSON.parse(response.payload);
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    });

    it('应该能够创建定时任务', async () => {
      // 首先创建一个工作流定义
      const definitionResponse = await app.inject({
        method: 'POST',
        url: '/api/workflows/definitions',
        payload: {
          name: '定时任务测试工作流',
          description: '用于测试定时任务的工作流',
          version: 1,
          definition: {
            nodes: [{ id: 'start', type: 'start', name: '开始' }],
            edges: []
          }
        }
      });

      const definitionData = JSON.parse(definitionResponse.payload);
      const workflowDefinitionId = definitionData.data.id;

      // 创建定时任务
      const scheduleData = {
        workflowDefinitionId,
        name: '测试定时任务',
        cronExpression: '0 0 * * *', // 每天午夜执行
        timezone: 'Asia/Shanghai',
        enabled: true
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/workflows/schedules',
        payload: scheduleData
      });

      expect(response.statusCode).toBe(201);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('id');
    });
  });

  describe('API响应格式一致性', () => {
    it('所有API应该返回统一的响应格式', async () => {
      const endpoints = [
        '/api/workflows/definitions',
        '/api/workflows/instances',
        '/api/workflows/logs',
        '/api/workflows/schedules'
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: 'GET',
          url: endpoint
        });

        expect(response.statusCode).toBe(200);
        const data = JSON.parse(response.payload);
        
        // 检查统一的响应格式
        expect(data).toHaveProperty('success');
        expect(data).toHaveProperty('data');
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.success).toBe('boolean');
        expect(typeof data.timestamp).toBe('string');
      }
    });
  });

  describe('错误处理', () => {
    it('应该正确处理404错误', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/workflows/nonexistent'
      });

      expect(response.statusCode).toBe(404);
    });

    it('应该正确处理无效的请求数据', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/workflows/definitions',
        payload: {
          // 缺少必需字段
          description: '无效的工作流定义'
        }
      });

      expect(response.statusCode).toBe(400);
      const data = JSON.parse(response.payload);
      expect(data.success).toBe(false);
      expect(data).toHaveProperty('error');
    });
  });
});
