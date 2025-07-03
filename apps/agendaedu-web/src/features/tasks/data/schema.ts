import { z } from 'zod'
import { TaskStatus } from '@/types/task.types'

// 先定义基础任务 schema（不包含 children）
const baseTaskSchema = z.object({
  id: z.string(),
  parent_id: z.string().nullable(),
  name: z.string(),
  description: z.string().nullable(),
  task_type: z.string(),
  status: z.nativeEnum(TaskStatus),
  priority: z.number(),
  progress: z.number().min(0).max(100),
  executor_name: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  started_at: z.string().nullable(),
  completed_at: z.string().nullable(),
})

// 定义递归任务类型
export type Task = z.infer<typeof baseTaskSchema> & {
  children?: Task[]
}

// 然后定义包含 children 的完整任务 schema
export const taskSchema: z.ZodType<Task> = baseTaskSchema.extend({
  children: z.array(z.lazy(() => taskSchema)).optional(),
})
