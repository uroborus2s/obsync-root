import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createContainer, asFunction, asValue, Lifetime } from 'awilix';
import { createWpsUserAdapter } from '../../adapters/user-adapter.js';
import type { Logger } from '@stratix/core';
import type { AuthManager } from '../../auth/auth-manager.js';
import type { HttpClient } from '../../core/http-client.js';
import type { CreateUserParams, UserInfo } from '../../types/contact.js';

// Mock dependencies
const mockLogger: Logger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
} as any;

const mockAuthManager: AuthManager = {
  isTokenValid: vi.fn(),
  getAppAccessToken: vi.fn()
} as any;

const mockHttpClient: HttpClient = {
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
} as any;

describe('WpsUserAdapter', () => {
  let container: any;
  let userAdapter: ReturnType<typeof createWpsUserAdapter>;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // 创建模拟容器
    container = createContainer();
    container.register({
      logger: asValue(mockLogger),
      wasV7AuthManager: asValue(mockAuthManager),
      wasV7HttpClient: asValue(mockHttpClient)
    });

    userAdapter = createWpsUserAdapter(container);
  });

  describe('createUser', () => {
    it('should create user successfully', async () => {
      const createParams: CreateUserParams = {
        name: '张三',
        mobile: '13800138000',
        email: 'zhangsan@example.com',
        dept_ids: ['dept1']
      };

      const expectedResult = {
        user_id: 'user123',
        name: '张三'
      };

      // Mock token validation
      vi.mocked(mockAuthManager.isTokenValid).mockReturnValue(true);
      
      // Mock HTTP response
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        data: expectedResult
      });

      const result = await userAdapter.createUser(createParams);

      expect(mockHttpClient.post).toHaveBeenCalledWith('/v7/contacts/users', createParams);
      expect(result).toEqual(expectedResult);
    });

    it('should refresh token when expired', async () => {
      const createParams: CreateUserParams = {
        name: '张三',
        mobile: '13800138000',
        dept_ids: ['dept1']
      };

      // Mock token expired
      vi.mocked(mockAuthManager.isTokenValid).mockReturnValue(false);
      vi.mocked(mockAuthManager.getAppAccessToken).mockResolvedValue(undefined);
      
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        data: { user_id: 'user123' }
      });

      await userAdapter.createUser(createParams);

      expect(mockAuthManager.getAppAccessToken).toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith('Token expired, refreshing...');
      expect(mockLogger.debug).toHaveBeenCalledWith('Token refreshed successfully');
    });
  });

  describe('getUser', () => {
    it('should get user successfully', async () => {
      const userId = 'user123';
      const expectedUser: UserInfo = {
        id: userId,
        name: '张三',
        mobile: '13800138000',
        status: 1,
        dept_ids: ['dept1']
      };

      vi.mocked(mockAuthManager.isTokenValid).mockReturnValue(true);
      vi.mocked(mockHttpClient.get).mockResolvedValue({
        data: expectedUser
      });

      const result = await userAdapter.getUser({ user_id: userId });

      expect(mockHttpClient.get).toHaveBeenCalledWith(`/v7/contacts/users/${userId}`);
      expect(result).toEqual(expectedUser);
    });
  });

  describe('getAllUserList', () => {
    it('should get all users with pagination', async () => {
      const mockUsers1: UserInfo[] = [
        { id: 'user1', name: '张三', mobile: '13800138000', status: 1, dept_ids: ['dept1'] },
        { id: 'user2', name: '李四', mobile: '13800138001', status: 1, dept_ids: ['dept1'] }
      ];

      const mockUsers2: UserInfo[] = [
        { id: 'user3', name: '王五', mobile: '13800138002', status: 1, dept_ids: ['dept2'] }
      ];

      vi.mocked(mockAuthManager.isTokenValid).mockReturnValue(true);
      
      // Mock first page
      vi.mocked(mockHttpClient.get)
        .mockResolvedValueOnce({
          data: {
            users: mockUsers1,
            next_page_token: 'token123'
          }
        })
        // Mock second page
        .mockResolvedValueOnce({
          data: {
            users: mockUsers2,
            next_page_token: undefined
          }
        });

      const result = await userAdapter.getAllUserList();

      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('张三');
      expect(result[1].name).toBe('李四');
      expect(result[2].name).toBe('王五');
      expect(mockHttpClient.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('batchGetUserInfo', () => {
    it('should batch get user info successfully', async () => {
      const userIds = ['user1', 'user2'];
      const expectedResponse = {
        users: [
          { id: 'user1', name: '张三', mobile: '13800138000', status: 1, dept_ids: ['dept1'] },
          { id: 'user2', name: '李四', mobile: '13800138001', status: 1, dept_ids: ['dept1'] }
        ]
      };

      vi.mocked(mockAuthManager.isTokenValid).mockReturnValue(true);
      vi.mocked(mockHttpClient.post).mockResolvedValue({
        data: expectedResponse
      });

      const result = await userAdapter.batchGetUserInfo({ user_ids: userIds });

      expect(mockHttpClient.post).toHaveBeenCalledWith(
        '/v7/contacts/users/batch/get',
        { user_ids: userIds }
      );
      expect(result).toEqual(expectedResponse);
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const updateParams = {
        user_id: 'user123',
        name: '张三更新',
        email: 'zhangsan_new@example.com'
      };

      vi.mocked(mockAuthManager.isTokenValid).mockReturnValue(true);
      vi.mocked(mockHttpClient.put).mockResolvedValue(undefined);

      await userAdapter.updateUser(updateParams);

      expect(mockHttpClient.put).toHaveBeenCalledWith('/v7/contacts/users', updateParams);
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const deleteParams = { user_id: 'user123' };

      vi.mocked(mockAuthManager.isTokenValid).mockReturnValue(true);
      vi.mocked(mockHttpClient.delete).mockResolvedValue(undefined);

      await userAdapter.deleteUser(deleteParams);

      expect(mockHttpClient.delete).toHaveBeenCalledWith('/v7/contacts/users', deleteParams);
    });
  });
});
