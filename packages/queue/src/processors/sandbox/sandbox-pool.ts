/**
 * 沙箱进程池
 * 管理一组沙箱工作进程
 */

import { ChildProcess, fork } from 'child_process';
import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';

/**
 * 沙箱进程信息
 */
interface SandboxProcess {
  /**
   * 沙箱进程
   */
  process: ChildProcess;

  /**
   * 是否空闲
   */
  idle: boolean;

  /**
   * 当前执行的任务ID
   */
  currentJobId?: string;

  /**
   * 进程创建时间
   */
  createdAt: number;

  /**
   * 进程已处理的任务数量
   */
  processedJobs: number;

  /**
   * 最近一次活跃时间
   */
  lastActive: number;
}

/**
 * 沙箱执行任务参数
 */
export interface SandboxExecuteParams {
  /**
   * 任务ID
   */
  jobId: string;

  /**
   * 任务名称
   */
  name: string;

  /**
   * 任务数据
   */
  data: any;

  /**
   * 任务状态
   */
  state: any;

  /**
   * 处理器文件路径
   */
  processorFile?: string;

  /**
   * 处理器代码（字符串形式）
   */
  processorCode?: string;
}

/**
 * 沙箱池选项
 */
export interface SandboxPoolOptions {
  /**
   * 最大沙箱进程数
   */
  maxSandboxes?: number;

  /**
   * 沙箱进程最大任务数
   */
  maxJobsPerSandbox?: number;

  /**
   * 沙箱进程超时时间（毫秒）
   */
  timeout?: number;

  /**
   * 最大内存使用量（MB）
   */
  maxMemoryUsage?: number;

  /**
   * 沙箱工作进程脚本路径
   */
  workerPath?: string;
}

/**
 * 沙箱进程池
 * 管理一组沙箱工作进程
 */
export class SandboxPool extends EventEmitter {
  /**
   * 所有沙箱进程
   */
  private sandboxes: SandboxProcess[] = [];

  /**
   * 等待执行的任务队列
   */
  private waitingQueue: {
    params: SandboxExecuteParams;
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }[] = [];

  /**
   * 最大沙箱进程数
   */
  private readonly maxSandboxes: number;

  /**
   * 沙箱进程最大任务数
   */
  private readonly maxJobsPerSandbox: number;

  /**
   * 沙箱进程超时时间（毫秒）
   */
  private readonly timeout: number;

  /**
   * 最大内存使用量（MB）
   */
  private readonly maxMemoryUsage: number;

  /**
   * 沙箱工作进程脚本路径
   */
  private readonly workerPath: string;

  /**
   * 清理计时器
   */
  private cleanupTimer?: NodeJS.Timeout;

  /**
   * 构造函数
   * @param options 沙箱池选项
   */
  constructor(options: SandboxPoolOptions = {}) {
    super();

    // 设置默认值
    this.maxSandboxes =
      options.maxSandboxes || Math.max(1, Math.min(os.cpus().length, 4));
    this.maxJobsPerSandbox = options.maxJobsPerSandbox || 10;
    this.timeout = options.timeout || 30000;
    this.maxMemoryUsage = options.maxMemoryUsage || 500; // 500MB

    // 设置工作进程脚本路径
    this.workerPath =
      options.workerPath || path.resolve(__dirname, 'sandbox-worker.js');

    // 启动清理定时任务
    this.startCleanupTimer();
  }

  /**
   * 在沙箱中执行任务
   * @param params 执行参数
   * @returns 执行结果
   */
  public execute(params: SandboxExecuteParams): Promise<any> {
    return new Promise((resolve, reject) => {
      // 创建任务
      const task = { params, resolve, reject };

      // 尝试立即执行
      const sandbox = this.getAvailableSandbox();
      if (sandbox) {
        this.runTaskInSandbox(sandbox, task);
      } else {
        // 如果没有可用沙箱，添加到等待队列
        this.waitingQueue.push(task);

        // 如果可以创建新的沙箱，则创建
        if (this.sandboxes.length < this.maxSandboxes) {
          this.createSandbox();
        }
      }
    });
  }

  /**
   * 关闭所有沙箱进程
   */
  public async shutdown(): Promise<void> {
    // 停止清理定时任务
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    // 拒绝所有等待中的任务
    for (const task of this.waitingQueue) {
      task.reject(new Error('沙箱池已关闭'));
    }
    this.waitingQueue = [];

    // 关闭所有沙箱进程
    for (const sandbox of this.sandboxes) {
      this.killSandbox(sandbox);
    }
    this.sandboxes = [];
  }

  /**
   * 获取沙箱池状态
   */
  public getStatus(): any {
    return {
      total: this.sandboxes.length,
      idle: this.sandboxes.filter((s) => s.idle).length,
      waiting: this.waitingQueue.length,
      maxSandboxes: this.maxSandboxes
    };
  }

  /**
   * 在沙箱中执行任务
   * @param sandbox 沙箱进程
   * @param task 任务
   */
  private runTaskInSandbox(
    sandbox: SandboxProcess,
    task: {
      params: SandboxExecuteParams;
      resolve: (result: any) => void;
      reject: (error: Error) => void;
    }
  ): void {
    const { params, resolve, reject } = task;
    const { jobId } = params;

    // 标记沙箱为忙碌状态
    sandbox.idle = false;
    sandbox.currentJobId = jobId;
    sandbox.lastActive = Date.now();

    // 设置超时
    const timeoutId = setTimeout(() => {
      // 如果任务超时，杀死沙箱并创建新沙箱
      this.emit('timeout', { jobId, sandbox });

      // 拒绝任务
      reject(new Error(`任务执行超时（${this.timeout}ms）`));

      // 杀死并替换沙箱
      this.replaceSandbox(sandbox);
    }, this.timeout);

    // 监听一次性消息处理
    const messageHandler = (message: any) => {
      if (message.jobId !== jobId) {
        return; // 忽略其他任务的消息
      }

      switch (message.type) {
        case 'result':
          // 清除超时
          clearTimeout(timeoutId);

          // 恢复沙箱为空闲状态
          sandbox.idle = true;
          sandbox.currentJobId = undefined;
          sandbox.processedJobs++;
          sandbox.lastActive = Date.now();

          // 处理任务结果
          resolve(message.data);

          // 处理下一个任务
          this.processNextTask();
          break;

        case 'error':
          // 清除超时
          clearTimeout(timeoutId);

          // 恢复沙箱为空闲状态
          sandbox.idle = true;
          sandbox.currentJobId = undefined;
          sandbox.processedJobs++;
          sandbox.lastActive = Date.now();

          // 处理任务错误
          const error = new Error(message.error.message);
          if (message.error.stack) {
            error.stack = message.error.stack;
          }
          reject(error);

          // 处理下一个任务
          this.processNextTask();
          break;

        case 'progress':
          // 任务进度事件
          this.emit('progress', {
            jobId,
            progress: message.data.progress
          });
          break;
      }
    };

    // 注册消息处理器
    sandbox.process.on('message', messageHandler);

    // 发送执行消息到沙箱
    sandbox.process.send({
      type: 'execute',
      ...params
    });

    // 一次性监听进程错误
    const errorHandler = (error: Error) => {
      clearTimeout(timeoutId);
      reject(error);
      this.replaceSandbox(sandbox);
    };

    // 一次性监听进程退出
    const exitHandler = (code: number) => {
      if (code !== 0) {
        clearTimeout(timeoutId);
        reject(new Error(`沙箱进程异常退出，退出码：${code}`));
        this.replaceSandbox(sandbox);
      }
    };

    // 注册错误和退出处理器
    sandbox.process.once('error', errorHandler);
    sandbox.process.once('exit', exitHandler);

    // 任务完成后移除监听器
    const cleanup = () => {
      sandbox.process.removeListener('message', messageHandler);
      sandbox.process.removeListener('error', errorHandler);
      sandbox.process.removeListener('exit', exitHandler);
    };

    // 在任务完成后清理
    const originalResolve = resolve;
    const originalReject = reject;

    task.resolve = (result) => {
      cleanup();
      originalResolve(result);
    };

    task.reject = (error) => {
      cleanup();
      originalReject(error);
    };
  }

  /**
   * 创建新的沙箱进程
   * @returns 沙箱进程
   */
  private createSandbox(): SandboxProcess {
    // 创建子进程
    const childProcess = fork(this.workerPath, [], {
      stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
      env: { ...process.env }
    });

    // 创建沙箱对象
    const sandbox: SandboxProcess = {
      process: childProcess,
      idle: false, // 初始状态为非空闲，等待ready消息
      createdAt: Date.now(),
      processedJobs: 0,
      lastActive: Date.now()
    };

    // 监听进程错误
    childProcess.on('error', (error) => {
      this.emit('error', { sandbox, error });
      this.replaceSandbox(sandbox);
    });

    // 监听进程退出
    childProcess.on('exit', (code) => {
      this.emit('exit', { sandbox, code });
      this.removeSandbox(sandbox);
    });

    // 监听ready消息
    const readyHandler = (message: any) => {
      if (message.type === 'ready') {
        // 移除一次性监听器
        childProcess.removeListener('message', readyHandler);

        // 标记沙箱为空闲状态
        sandbox.idle = true;

        // 处理等待中的任务
        this.processNextTask();
      }
    };

    // 注册一次性ready消息监听器
    childProcess.on('message', readyHandler);

    // 设置ready超时
    setTimeout(() => {
      if (!sandbox.idle) {
        // 如果沙箱未在超时时间内准备好，杀死并替换
        this.emit('error', {
          sandbox,
          error: new Error('沙箱进程初始化超时')
        });
        this.replaceSandbox(sandbox);
      }
    }, 5000); // 5秒初始化超时

    // 添加到沙箱列表
    this.sandboxes.push(sandbox);

    // 返回沙箱对象
    return sandbox;
  }

  /**
   * 获取可用的沙箱
   * @returns 可用的沙箱，如果没有则返回undefined
   */
  private getAvailableSandbox(): SandboxProcess | undefined {
    // 查找空闲的沙箱
    return this.sandboxes.find(
      (sandbox) =>
        sandbox.idle && sandbox.processedJobs < this.maxJobsPerSandbox
    );
  }

  /**
   * 处理下一个等待中的任务
   */
  private processNextTask(): void {
    // 如果没有等待中的任务，直接返回
    if (this.waitingQueue.length === 0) {
      return;
    }

    // 获取可用的沙箱
    const sandbox = this.getAvailableSandbox();
    if (!sandbox) {
      // 如果没有可用沙箱并且可以创建新沙箱，则创建
      if (this.sandboxes.length < this.maxSandboxes) {
        this.createSandbox();
      }
      return;
    }

    // 获取等待中的第一个任务并执行
    const task = this.waitingQueue.shift();
    if (task) {
      this.runTaskInSandbox(sandbox, task);
    }
  }

  /**
   * 替换沙箱
   * @param sandbox 要替换的沙箱
   */
  private replaceSandbox(sandbox: SandboxProcess): void {
    // 移除旧沙箱
    this.removeSandbox(sandbox);

    // 杀死旧沙箱进程
    this.killSandbox(sandbox);

    // 创建新沙箱
    if (this.waitingQueue.length > 0) {
      this.createSandbox();
    }
  }

  /**
   * 移除沙箱
   * @param sandbox 要移除的沙箱
   */
  private removeSandbox(sandbox: SandboxProcess): void {
    const index = this.sandboxes.indexOf(sandbox);
    if (index !== -1) {
      this.sandboxes.splice(index, 1);
    }
  }

  /**
   * 杀死沙箱进程
   * @param sandbox 要杀死的沙箱
   */
  private killSandbox(sandbox: SandboxProcess): void {
    try {
      // 尝试正常杀死进程
      if (sandbox.process.connected) {
        sandbox.process.disconnect();
      }

      // 杀死进程
      sandbox.process.kill();
    } catch (error) {
      // 忽略杀死过程中的错误
      console.error('杀死沙箱进程失败:', error);
    }
  }

  /**
   * 启动清理定时任务
   */
  private startCleanupTimer(): void {
    // 每分钟执行一次清理
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * 清理闲置过久或处理过多任务的沙箱
   */
  private cleanup(): void {
    const now = Date.now();

    // 遍历所有沙箱
    for (let i = this.sandboxes.length - 1; i >= 0; i--) {
      const sandbox = this.sandboxes[i];

      // 如果沙箱空闲且闲置时间超过5分钟，或者处理的任务数达到上限，替换沙箱
      if (
        (sandbox.idle && now - sandbox.lastActive > 5 * 60 * 1000) ||
        sandbox.processedJobs >= this.maxJobsPerSandbox
      ) {
        // 仅当有多余的沙箱时才进行清理
        if (this.sandboxes.length > 1 || !sandbox.idle) {
          this.killSandbox(sandbox);
          this.removeSandbox(sandbox);
        }
      }
    }
  }
}
