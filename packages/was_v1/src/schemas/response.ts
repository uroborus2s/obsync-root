import { z } from 'zod';

/**
 * 通用分页响应Schema
 */
export const paginationResponseSchema = z.object({
  total_count: z.number(),
  page_size: z.number(),
  page_number: z.number()
});

/**
 * Token响应Schema
 */
export const tokenResponseSchema = z.object({
  company_token: z.string(),
  expires_in: z.number().optional().default(3600)
});

/**
 * 用户Token响应Schema
 */
export const userTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  user_id: z.string().optional()
});

/**
 * 部门信息Schema
 */
export const departmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  parentid: z.string().optional(),
  order: z.number().optional(),
  createtime: z.number().optional(),
  updatetime: z.number().optional()
});

/**
 * 用户信息Schema
 */
export const userSchema = z.object({
  userid: z.string(),
  name: z.string(),
  email: z.string().email().optional(),
  mobile: z.string().optional(),
  departments: z
    .array(
      z.object({
        department_id: z.string(),
        is_leader: z.boolean().optional()
      })
    )
    .optional(),
  status: z.number().optional()
});

/**
 * 文档信息Schema
 */
export const documentSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  size: z.number().optional(),
  create_time: z.number().optional(),
  modify_time: z.number().optional(),
  parent_id: z.string().optional(),
  creator: z
    .object({
      id: z.string(),
      name: z.string()
    })
    .optional()
});

/**
 * 消息信息Schema
 */
export const messageSchema = z.object({
  id: z.string(),
  sender: z.object({
    id: z.string(),
    name: z.string()
  }),
  chat_id: z.string(),
  create_time: z.number(),
  content: z.any() // 消息内容可能有多种类型
});
