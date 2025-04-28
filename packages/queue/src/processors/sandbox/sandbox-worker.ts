/**
 * 沙箱工作进程
 * 在单独的进程中执行任务处理函数
 */

/**
 * 任务消息类型
 */
interface TaskMessage {
  /**
   * 消息类型
   */
  type: 'execute';

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
 * 响应消息类型
 */
interface ResponseMessage {
  /**
   * 消息类型
   */
  type: 'result' | 'error' | 'progress';

  /**
   * 任务ID
   */
  jobId: string;

  /**
   * 结果数据
   */
  data?: any;

  /**
   * 错误信息
   */
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * 处理进程间消息
 * @param message 接收到的消息
 */
async function handleMessage(message: TaskMessage): Promise<void> {
  if (message.type !== 'execute') {
    return;
  }

  try {
    // 任务执行上下文信息
    const { jobId, name, data, state } = message;

    // 创建模拟任务对象
    const job = {
      id: jobId,
      name,
      data,
      attemptsMade: state.attemptsMade || 0,
      progress: state.progress || 0,
      returnvalue: state.returnvalue,

      // 进度更新方法
      async updateProgress(progress: number | object): Promise<void> {
        this.progress = progress;

        // 向父进程发送进度消息
        if (process.send) {
          process.send({
            type: 'progress',
            jobId,
            data: { progress }
          });
        }
      }
    };

    // 加载处理器函数
    let processorFn;

    if (message.processorFile) {
      // 从文件加载处理器
      processorFn = require(message.processorFile);
      // 如果导出是对象，尝试获取默认导出或匹配任务名称的处理器
      if (typeof processorFn === 'object') {
        processorFn = processorFn.default || processorFn[name];
      }
    } else if (message.processorCode) {
      // 从代码字符串加载处理器
      // 使用eval非常危险，这里只是示例，实际应使用更安全的方式
      // 例如使用vm模块或Function构造函数
      processorFn = eval(`(${message.processorCode})`);
    } else {
      throw new Error('没有提供处理器函数');
    }

    if (typeof processorFn !== 'function') {
      throw new Error('无效的处理器函数');
    }

    // 执行处理器函数
    const result = await processorFn(job);

    // 向父进程发送结果
    if (process.send) {
      process.send({
        type: 'result',
        jobId,
        data: result
      });
    }
  } catch (error) {
    // 向父进程发送错误
    if (process.send) {
      process.send({
        type: 'error',
        jobId: message.jobId,
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  }
}

// 监听来自父进程的消息
process.on('message', (message: TaskMessage) => {
  handleMessage(message).catch((error) => {
    console.error('沙箱处理消息出错:', error);

    // 向父进程发送错误
    if (process.send) {
      process.send({
        type: 'error',
        jobId: message.jobId || 'unknown',
        error: {
          message: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      });
    }
  });
});

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('沙箱处理器未捕获异常:', error);

  // 通知父进程发生了错误，但无法关联到特定任务
  if (process.send) {
    process.send({
      type: 'error',
      jobId: 'unknown',
      error: {
        message: error.message,
        stack: error.stack
      }
    });
  }

  // 给父进程发送消息的时间
  setTimeout(() => {
    process.exit(1);
  }, 100);
});

// 通知父进程沙箱已准备好
if (process.send) {
  process.send({ type: 'ready' });
}
