import { z } from 'zod';

/**
 * 通用分页参数Schema
 */
export const paginationSchema = z.object({
  page_size: z.number().positive().optional(),
  page_number: z.number().positive().optional()
});

/**
 * 创建部门请求Schema
 */
export const createDepartmentSchema = z.object({
  name: z.string().min(1, '部门名称不能为空'),
  parentid: z.string().optional(),
  order: z.number().optional(),
  id: z.string().optional()
});

/**
 * 更新部门请求Schema
 */
export const updateDepartmentSchema = z
  .object({
    name: z.string().optional(),
    parentid: z.string().optional(),
    order: z.number().optional()
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: '至少需要更新一个字段'
  });

/**
 * 查询用户请求Schema
 */
export const queryUserSchema = z
  .object({
    userid: z.string().optional(),
    email: z.string().email().optional(),
    mobile: z.string().optional()
  })
  .refine((data) => data.userid || data.email || data.mobile, {
    message: '用户ID、邮箱或手机号至少提供一个'
  });

/**
 * 创建用户请求Schema
 */
export const createUserSchema = z.object({
  name: z.string().min(1, '用户名称不能为空'),
  email: z.string().email().optional(),
  mobile: z.string().optional(),
  departments: z
    .array(
      z.object({
        department_id: z.string(),
        is_leader: z.boolean().optional()
      })
    )
    .min(1, '至少需要一个部门')
});

/**
 * 创建文件夹请求Schema
 */
export const createFolderSchema = z.object({
  name: z.string().min(1, '文件夹名称不能为空'),
  parent_id: z.string().optional()
});

/**
 * 发送消息请求Schema
 */
export const sendTextMessageSchema = z.object({
  chat_id: z.string().min(1, '会话ID不能为空'),
  content: z.string().min(1, '消息内容不能为空')
});

/**
 * 发送图片消息请求Schema
 */
export const sendImageMessageSchema = z.object({
  chat_id: z.string().min(1, '会话ID不能为空'),
  image_url: z.string().url('图片URL无效')
});

/**
 * 创建会话请求Schema
 */
export const createChatSchema = z.object({
  name: z.string().optional(),
  user_ids: z.array(z.string()).min(1, '至少需要一个用户'),
  chat_type: z.enum(['single', 'group'])
});
