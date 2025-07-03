export interface ITaskService {
  retryTask(taskId: string): Promise<void>;
}
