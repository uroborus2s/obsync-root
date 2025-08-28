/**
 * Cookie功能测试
 * 验证@fastify/cookie插件的配置和使用
 */

import cookie from '@fastify/cookie';
import Fastify, { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Cookie功能测试', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = Fastify({ logger: false });

    // 注册cookie插件（使用正确的配置）
    await app.register(cookie, {
      secret: 'test-secret-key-for-cookie-signing',
      hook: 'onRequest',
      parseOptions: {}
    });

    // 添加测试路由
    app.get('/test-set-cookie', async (request, reply) => {
      reply.setCookie('test_cookie', 'test_value', {
        httpOnly: true,
        secure: false, // 测试环境使用false
        sameSite: 'lax',
        path: '/',
        maxAge: 3600000 // 1小时
      });
      return { success: true, message: 'Cookie set' };
    });

    app.get('/test-read-cookie', async (request, reply) => {
      const cookieValue = request.cookies?.test_cookie;
      return {
        success: true,
        cookieValue,
        allCookies: request.cookies
      };
    });

    app.get('/test-signed-cookie', async (request, reply) => {
      // 设置签名cookie
      reply.setCookie('signed_cookie', 'signed_value', {
        signed: true,
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/'
      });
      return { success: true, message: 'Signed cookie set' };
    });

    app.get('/test-read-signed-cookie', async (request, reply) => {
      const signedCookieValue = request.cookies?.signed_cookie;
      const unsignedResult = reply.unsignCookie(signedCookieValue || '');
      return {
        success: true,
        signedValue: signedCookieValue,
        unsignedResult
      };
    });

    app.post('/test-clear-cookie', async (request, reply) => {
      reply.clearCookie('test_cookie', {
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
      });
      return { success: true, message: 'Cookie cleared' };
    });

    await app.ready();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  describe('基本Cookie功能', () => {
    it('应该能够设置cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-set-cookie'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();

      const setCookieHeader = response.headers['set-cookie'] as string[];
      expect(setCookieHeader[0]).toContain('test_cookie=test_value');
      expect(setCookieHeader[0]).toContain('HttpOnly');
      expect(setCookieHeader[0]).toContain('SameSite=Lax');
      expect(setCookieHeader[0]).toContain('Path=/');
    });

    it('应该能够读取cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-read-cookie',
        headers: {
          cookie: 'test_cookie=test_value'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.cookieValue).toBe('test_value');
      expect(body.allCookies).toEqual({ test_cookie: 'test_value' });
    });

    it('应该能够处理多个cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-read-cookie',
        headers: {
          cookie: 'test_cookie=test_value; another_cookie=another_value'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.allCookies).toEqual({
        test_cookie: 'test_value',
        another_cookie: 'another_value'
      });
    });
  });

  describe('签名Cookie功能', () => {
    it('应该能够设置签名cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-signed-cookie'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();

      const setCookieHeader = response.headers['set-cookie'] as string[];
      expect(setCookieHeader[0]).toContain('signed_cookie=');
      expect(setCookieHeader[0]).toContain('HttpOnly');
    });

    it('应该能够验证签名cookie', async () => {
      // 首先设置签名cookie
      const setResponse = await app.inject({
        method: 'GET',
        url: '/test-signed-cookie'
      });

      const setCookieHeader = setResponse.headers['set-cookie'] as string[];
      const cookieValue = setCookieHeader[0].split(';')[0].split('=')[1];

      // 然后读取并验证签名cookie
      const readResponse = await app.inject({
        method: 'GET',
        url: '/test-read-signed-cookie',
        headers: {
          cookie: `signed_cookie=${cookieValue}`
        }
      });

      expect(readResponse.statusCode).toBe(200);
      const body = JSON.parse(readResponse.body);
      expect(body.success).toBe(true);
      expect(body.unsignedResult.valid).toBe(true);
      expect(body.unsignedResult.value).toBe('signed_value');
    });
  });

  describe('Cookie清除功能', () => {
    it('应该能够清除cookie', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/test-clear-cookie'
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();

      const setCookieHeader = response.headers['set-cookie'] as string[];
      expect(setCookieHeader[0]).toContain('test_cookie=');
      expect(setCookieHeader[0]).toContain('Expires=');
    });
  });

  describe('错误处理', () => {
    it('应该能够处理无效的签名cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-read-signed-cookie',
        headers: {
          cookie: 'signed_cookie=invalid_signature'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.unsignedResult.valid).toBe(false);
    });

    it('应该能够处理不存在的cookie', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/test-read-cookie'
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.cookieValue).toBeUndefined();
      expect(body.allCookies).toEqual({});
    });
  });
});
