import { AxiosInstance } from 'axios';
import { z } from 'zod';
import {
  departmentSchema,
  paginationResponseSchema,
  userSchema
} from '../../schemas/response.js';
import { WasV1PaginationParams } from '../../types/request.js';
import { sendRequest } from '../request.js';

/**
 * 创建通讯录API
 */
export function createContactApi(client: AxiosInstance) {
  return {
    /**
     * 获取部门列表
     */
    async getDepartments(
      params?: { parentid?: string } & WasV1PaginationParams
    ) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v1/departments',
          params
        },
        z.object({
          departments: z.array(departmentSchema),
          ...paginationResponseSchema.shape
        })
      );
    },

    /**
     * 获取部门详情
     */
    async getDepartment(departmentId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/departments/${departmentId}`
        },
        z.object({
          department: departmentSchema
        })
      );
    },

    /**
     * 创建部门
     */
    async createDepartment(data: {
      name: string;
      parentid?: string;
      order?: number;
      id?: string;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/departments',
          data
        },
        z.object({
          id: z.string()
        })
      );
    },

    /**
     * 更新部门
     */
    async updateDepartment(
      departmentId: string,
      data: {
        name?: string;
        parentid?: string;
        order?: number;
      }
    ) {
      return sendRequest(client, {
        method: 'PUT',
        url: `/api/v1/departments/${departmentId}`,
        data
      });
    },

    /**
     * 删除部门
     */
    async deleteDepartment(departmentId: string) {
      return sendRequest(client, {
        method: 'DELETE',
        url: `/api/v1/departments/${departmentId}`
      });
    },

    /**
     * 获取用户列表
     */
    async getUsers(params?: WasV1PaginationParams) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: '/api/v1/users',
          params
        },
        z.object({
          users: z.array(userSchema),
          ...paginationResponseSchema.shape
        })
      );
    },

    /**
     * 获取部门下的用户列表
     */
    async getDepartmentUsers(
      departmentId: string,
      params?: WasV1PaginationParams
    ) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/departments/${departmentId}/users`,
          params
        },
        z.object({
          users: z.array(userSchema),
          ...paginationResponseSchema.shape
        })
      );
    },

    /**
     * 获取用户详情
     */
    async getUser(userId: string) {
      return sendRequest(
        client,
        {
          method: 'GET',
          url: `/api/v1/users/${userId}`
        },
        z.object({
          user: userSchema
        })
      );
    },

    /**
     * 创建用户
     */
    async createUser(data: {
      name: string;
      email?: string;
      mobile?: string;
      departments: Array<{
        department_id: string;
        is_leader?: boolean;
      }>;
    }) {
      return sendRequest(
        client,
        {
          method: 'POST',
          url: '/api/v1/users',
          data
        },
        z.object({
          userid: z.string()
        })
      );
    },

    /**
     * 更新用户
     */
    async updateUser(
      userId: string,
      data: {
        name?: string;
        email?: string;
        mobile?: string;
        departments?: Array<{
          department_id: string;
          is_leader?: boolean;
        }>;
      }
    ) {
      return sendRequest(client, {
        method: 'PUT',
        url: `/api/v1/users/${userId}`,
        data
      });
    },

    /**
     * 删除用户
     */
    async deleteUser(userId: string) {
      return sendRequest(client, {
        method: 'DELETE',
        url: `/api/v1/users/${userId}`
      });
    }
  };
}
