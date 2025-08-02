import { z } from 'zod';
declare const baseTaskSchema: z.ZodObject<{
    id: z.ZodString;
    parent_id: z.ZodNullable<z.ZodString>;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    task_type: z.ZodString;
    status: z.ZodNativeEnum<any>;
    priority: z.ZodNumber;
    progress: z.ZodNumber;
    executor_name: z.ZodNullable<z.ZodString>;
    metadata: z.ZodNullable<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    created_at: z.ZodString;
    updated_at: z.ZodString;
    started_at: z.ZodNullable<z.ZodString>;
    completed_at: z.ZodNullable<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    [x: string]: any;
    id?: unknown;
    parent_id?: unknown;
    name?: unknown;
    description?: unknown;
    task_type?: unknown;
    status?: unknown;
    priority?: unknown;
    progress?: unknown;
    executor_name?: unknown;
    metadata?: unknown;
    created_at?: unknown;
    updated_at?: unknown;
    started_at?: unknown;
    completed_at?: unknown;
}, {
    [x: string]: any;
    id?: unknown;
    parent_id?: unknown;
    name?: unknown;
    description?: unknown;
    task_type?: unknown;
    status?: unknown;
    priority?: unknown;
    progress?: unknown;
    executor_name?: unknown;
    metadata?: unknown;
    created_at?: unknown;
    updated_at?: unknown;
    started_at?: unknown;
    completed_at?: unknown;
}>;
export type Task = z.infer<typeof baseTaskSchema> & {
    children?: Task[];
};
export declare const taskSchema: z.ZodType<Task>;
export {};
//# sourceMappingURL=schema.d.ts.map