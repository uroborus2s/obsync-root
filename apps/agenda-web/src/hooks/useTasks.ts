/**
 * 任务管理相关的React hooks
 */

import { useCallback, useEffect, useState } from 'react';
import taskApi from '../api/client';
import type {
  CreateTaskRequest,
  QueryTasksParams,
  Task,
  TaskOperationOptions,
  TaskTreeNode,
  UpdateTaskRequest
} from '../types/task';

interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  createTask: (request: CreateTaskRequest) => Promise<Task>;
  updateTask: (id: string, request: UpdateTaskRequest) => Promise<Task>;
  deleteTask: (
    id: string,
    options?: { cascade?: boolean; force?: boolean }
  ) => Promise<void>;
}

export function useTasks(params: QueryTasksParams = {}): UseTasksReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.queryTasks(params);
      setTasks(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取任务列表失败');
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    void fetchTasks();
  }, [fetchTasks]);

  const createTask = useCallback(
    async (request: CreateTaskRequest): Promise<Task> => {
      try {
        const newTask = await taskApi.createTask(request);
        await fetchTasks(); // 重新获取任务列表
        return newTask;
      } catch (err) {
        const message = err instanceof Error ? err.message : '创建任务失败';
        setError(message);
        throw new Error(message);
      }
    },
    [fetchTasks]
  );

  const updateTask = useCallback(
    async (id: string, request: UpdateTaskRequest): Promise<Task> => {
      try {
        const updatedTask = await taskApi.updateTask(id, request);
        await fetchTasks(); // 重新获取任务列表
        return updatedTask;
      } catch (err) {
        const message = err instanceof Error ? err.message : '更新任务失败';
        setError(message);
        throw new Error(message);
      }
    },
    [fetchTasks]
  );

  const deleteTask = useCallback(
    async (
      id: string,
      options: { cascade?: boolean; force?: boolean } = {}
    ): Promise<void> => {
      try {
        await taskApi.deleteTask(id, options);
        await fetchTasks(); // 重新获取任务列表
      } catch (err) {
        const message = err instanceof Error ? err.message : '删除任务失败';
        setError(message);
        throw new Error(message);
      }
    },
    [fetchTasks]
  );

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    createTask,
    updateTask,
    deleteTask
  };
}

interface UseTaskTreeReturn {
  tree: TaskTreeNode[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useTaskTree(rootId?: string): UseTaskTreeReturn {
  const [tree, setTree] = useState<TaskTreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await taskApi.getTaskTree(rootId);
      setTree(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取任务树失败');
    } finally {
      setLoading(false);
    }
  }, [rootId]);

  useEffect(() => {
    void fetchTree();
  }, [fetchTree]);

  return {
    tree,
    loading,
    error,
    refetch: fetchTree
  };
}

interface UseTaskControlReturn {
  startTask: (id: string, options?: TaskOperationOptions) => Promise<void>;
  pauseTask: (id: string, options?: TaskOperationOptions) => Promise<void>;
  resumeTask: (id: string, options?: TaskOperationOptions) => Promise<void>;
  stopTask: (id: string, options?: TaskOperationOptions) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function useTaskControl(): UseTaskControlReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeOperation = useCallback(
    async (operation: () => Promise<void>, errorMessage: string) => {
      try {
        setLoading(true);
        setError(null);
        await operation();
      } catch (err) {
        const message = err instanceof Error ? err.message : errorMessage;
        setError(message);
        throw new Error(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const startTask = useCallback(
    async (id: string, options: TaskOperationOptions = {}) => {
      await executeOperation(
        () => taskApi.startTask(id, options),
        '启动任务失败'
      );
    },
    [executeOperation]
  );

  const pauseTask = useCallback(
    async (id: string, options: TaskOperationOptions = {}) => {
      await executeOperation(
        () => taskApi.pauseTask(id, options),
        '暂停任务失败'
      );
    },
    [executeOperation]
  );

  const resumeTask = useCallback(
    async (id: string, options: TaskOperationOptions = {}) => {
      await executeOperation(
        () => taskApi.resumeTask(id, options),
        '恢复任务失败'
      );
    },
    [executeOperation]
  );

  const stopTask = useCallback(
    async (id: string, options: TaskOperationOptions = {}) => {
      await executeOperation(
        () => taskApi.stopTask(id, options),
        '停止任务失败'
      );
    },
    [executeOperation]
  );

  return {
    startTask,
    pauseTask,
    resumeTask,
    stopTask,
    loading,
    error
  };
}
