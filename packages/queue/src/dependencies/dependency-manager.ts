/**
 * 任务依赖关系管理器
 * 管理任务之间的依赖关系
 */

import { Job, JobStatus } from '../types/index.js';

/**
 * 依赖处理模式
 */
export enum DependencyMode {
  /**
   * 必须模式：所有依赖任务都必须成功完成
   */
  REQUIRED = 'required',

  /**
   * 可选模式：依赖任务可以成功完成或失败
   */
  OPTIONAL = 'optional'
}

/**
 * 依赖项检查结果
 */
export enum DependencyCheckResult {
  /**
   * 满足：所有依赖都已满足
   */
  SATISFIED = 'satisfied',

  /**
   * 等待：部分依赖尚未完成
   */
  WAITING = 'waiting',

  /**
   * 失败：至少一个必需依赖失败
   */
  FAILED = 'failed'
}

/**
 * 依赖关系管理器
 * 管理任务之间的依赖关系
 */
export class DependencyManager {
  /**
   * 添加依赖关系
   * @param job 子任务
   * @param dependencyId 依赖任务ID
   */
  public static async addDependency(
    job: Job,
    dependencyId: string
  ): Promise<void> {
    try {
      // 从任务状态获取当前依赖列表
      const state = await job.getState();
      const dependencies = (state as any).dependencies || [];

      // 检查依赖是否已存在
      if (dependencies.includes(dependencyId)) {
        return; // 依赖已存在，无需添加
      }

      // 添加新的依赖并更新任务
      dependencies.push(dependencyId);

      // 更新任务依赖（这里需要通过队列实现更新，这里简化处理）
      // 实际实现中可能需要访问队列实例进行更新
      console.log(`为任务 ${job.id} 添加依赖: ${dependencyId}`);
    } catch (error: any) {
      throw new Error(`添加依赖关系失败: ${error.message}`);
    }
  }

  /**
   * 移除依赖关系
   * @param job 子任务
   * @param dependencyId 依赖任务ID
   */
  public static async removeDependency(
    job: Job,
    dependencyId: string
  ): Promise<void> {
    try {
      // 从任务状态获取当前依赖列表
      const state = await job.getState();
      const dependencies = (state as any).dependencies || [];

      // 在依赖列表中查找并移除
      const index = dependencies.indexOf(dependencyId);
      if (index === -1) {
        return; // 依赖不存在，无需移除
      }

      // 移除依赖
      dependencies.splice(index, 1);

      // 更新任务依赖（这里需要通过队列实现更新，这里简化处理）
      // 实际实现中可能需要访问队列实例进行更新
      console.log(`从任务 ${job.id} 移除依赖: ${dependencyId}`);
    } catch (error: any) {
      throw new Error(`移除依赖关系失败: ${error.message}`);
    }
  }

  /**
   * 获取任务的依赖列表
   * @param job 任务
   * @returns 依赖任务ID列表
   */
  public static async getDependencies(job: Job): Promise<string[]> {
    try {
      const state = await job.getState();
      return (state as any).dependencies || [];
    } catch (error: any) {
      throw new Error(`获取依赖列表失败: ${error.message}`);
    }
  }

  /**
   * 检查任务的依赖状态
   * @param job 任务
   * @param getJobById 根据ID获取任务的函数
   * @param mode 依赖处理模式
   * @returns 依赖检查结果
   */
  public static async checkDependencies(
    job: Job,
    getJobById: (id: string) => Promise<Job | null>,
    mode: DependencyMode = DependencyMode.REQUIRED
  ): Promise<DependencyCheckResult> {
    try {
      // 获取任务的依赖列表
      const dependencies = await this.getDependencies(job);

      // 如果没有依赖，直接返回满足
      if (dependencies.length === 0) {
        return DependencyCheckResult.SATISFIED;
      }

      // 标记是否有失败的依赖
      let hasFailed = false;

      // 检查每一个依赖
      for (const dependencyId of dependencies) {
        const dependency = await getJobById(dependencyId);

        // 如果依赖任务不存在
        if (!dependency) {
          if (mode === DependencyMode.REQUIRED) {
            return DependencyCheckResult.FAILED;
          }
          // 可选模式下，依赖不存在视为已满足
          continue;
        }

        // 检查依赖任务状态
        const status = dependency.status;

        if (status === JobStatus.COMPLETED) {
          // 依赖已完成，继续检查下一个
          continue;
        } else if (status === JobStatus.FAILED) {
          // 依赖失败
          if (mode === DependencyMode.REQUIRED) {
            return DependencyCheckResult.FAILED;
          }
          hasFailed = true;
        } else {
          // 依赖尚未完成（等待中、活跃中、延迟中等）
          return DependencyCheckResult.WAITING;
        }
      }

      // 如果执行到这里，说明所有依赖都已处理完成
      // 在必需模式下，所有依赖都成功完成，返回满足
      // 在可选模式下，只要不是所有依赖都失败，返回满足
      return DependencyCheckResult.SATISFIED;
    } catch (error: any) {
      throw new Error(`检查依赖状态失败: ${error.message}`);
    }
  }

  /**
   * 当任务完成时，处理依赖关系
   * @param job 完成的任务
   * @param getDependentJobs 获取依赖此任务的所有子任务
   * @param getJobById 根据ID获取任务的函数
   * @param processJob 处理任务的函数
   */
  public static async handleJobCompletion(
    job: Job,
    getDependentJobs: (jobId: string) => Promise<Job[]>,
    getJobById: (id: string) => Promise<Job | null>,
    processJob: (job: Job) => Promise<void>
  ): Promise<void> {
    try {
      // 获取所有依赖此任务的子任务
      const dependents = await getDependentJobs(job.id);

      // 如果没有依赖此任务的子任务，直接返回
      if (dependents.length === 0) {
        return;
      }

      // 处理每一个依赖此任务的子任务
      for (const dependent of dependents) {
        // 检查子任务的所有依赖是否都已满足
        const dependencyMode =
          (dependent as any).dependenciesMode || DependencyMode.REQUIRED;
        const result = await this.checkDependencies(
          dependent,
          getJobById,
          dependencyMode
        );

        // 如果所有依赖都已满足，可以处理此子任务
        if (result === DependencyCheckResult.SATISFIED) {
          await processJob(dependent);
        }
        // 如果依赖失败，可以选择标记子任务为失败
        else if (result === DependencyCheckResult.FAILED) {
          console.log(`任务 ${dependent.id} 的依赖失败，标记为失败`);
          await dependent.moveToFailed(new Error('依赖任务失败'));
        }
        // 如果仍在等待其他依赖，不做任何处理
      }
    } catch (error: any) {
      console.error(`处理任务完成的依赖关系失败: ${error.message}`);
    }
  }
}
