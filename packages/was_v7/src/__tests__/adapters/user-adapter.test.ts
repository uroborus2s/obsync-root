import { asValue, createContainer } from 'awilix';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWpsUserAdapter } from '../../adapters/user.adapter.js';
import type { CreateUserParams, UserInfo } from '../../types/contact.js';

describe('WpsUserAdapter', () => {
  let mockHttpClient: any;
  let userAdapter: ReturnType<typeof createWpsUserAdapter>;

  beforeEach(() => {
    mockHttpClient = {
      ensureAccessToken: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    };

    const container = createContainer();
    container.register({
      httpClientService: asValue(mockHttpClient)
    });

    userAdapter = createWpsUserAdapter(container);
  });

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

    mockHttpClient.post.mockResolvedValue({ data: expectedResult });

    const result = await userAdapter.createUser(createParams);

    expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
    expect(mockHttpClient.post).toHaveBeenCalledWith(
      '/v7/contacts/users',
      createParams
    );
    expect(result).toEqual(expectedResult);
  });

  it('should get user successfully', async () => {
    const expectedUser: UserInfo = {
      id: 'user123',
      name: '张三',
      mobile: '13800138000',
      status: 1,
      dept_ids: ['dept1']
    };

    mockHttpClient.get.mockResolvedValue({ data: expectedUser });

    const result = await userAdapter.getUser({ user_id: 'user123' });

    expect(mockHttpClient.ensureAccessToken).toHaveBeenCalled();
    expect(mockHttpClient.get).toHaveBeenCalledWith(
      '/v7/contacts/users/user123'
    );
    expect(result).toEqual(expectedUser);
  });
});
