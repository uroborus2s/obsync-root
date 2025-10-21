import { AwilixContainer, Logger } from '@stratix/core';
import { type RedisAdapter } from '@stratix/redis';
import type { QueueOptions, WorkerOptions } from 'bullmq';
import { Job, Processor, Queue, Worker } from 'bullmq';
import type { QueuePluginOptions } from '../types/index.js';

export interface IQueueAdapter {
  add<T = any>(queueName: string, data: T, opts?: any): Promise<Job<T>>;
  getQueue(queueName: string): Queue;
  process(
    queueName: string,
    processor: Processor,
    opts?: WorkerOptions
  ): Worker;
  getJob(queueName: string, jobId: string): Promise<Job | undefined>;
  close(): Promise<void>;
}

export default class ClientAdapter implements IQueueAdapter {
  private readonly logger: Logger;
  private readonly redisClient: RedisAdapter;
  private readonly queues: Map<string, Queue> = new Map();
  private readonly workers: Map<string, Worker> = new Map();
  private readonly defaultQueueOptions?: QueueOptions;
  private readonly defaultWorkerOptions?: WorkerOptions;

  constructor(container: AwilixContainer) {
    const options = container.resolve<QueuePluginOptions>('config');
    this.logger = container.resolve<Logger>('logger');
    this.redisClient = container.resolve<RedisAdapter>('redisClient');
    this.defaultQueueOptions = options.defaultQueueOptions;
    this.defaultWorkerOptions = options.defaultWorkerOptions;
    this.logger.info('QueueAdapter initialized');
  }

  public getQueue(queueName: string): Queue {
    if (!this.queues.has(queueName)) {
      this.logger.info(`Creating new queue: ${queueName}`);
      const queue = new Queue(queueName, {
        connection: this.redisClient.getClient(),
        ...this.defaultQueueOptions
      });
      this.queues.set(queueName, queue);
    }
    return this.queues.get(queueName)!;
  }

  public async add<T = any>(
    queueName: string,
    data: T,
    opts?: any
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    this.logger.info(`Adding job to queue: ${queueName}`);
    return queue.add(queueName, data, opts);
  }

  public process(
    queueName: string,
    processor: Processor,
    opts?: WorkerOptions
  ): Worker {
    if (this.workers.has(queueName)) {
      this.logger.warn(`Worker for queue ${queueName} already exists.`);
      return this.workers.get(queueName)!;
    }

    this.logger.info(`Creating worker for queue: ${queueName}`);
    const worker = new Worker(queueName, processor, {
      connection: this.redisClient.getClient(),
      ...this.defaultWorkerOptions,
      ...opts
    });

    worker.on('completed', (job: Job, result: any) => {
      this.logger.info(`Job ${job.id} in queue ${queueName} completed.`);
    });

    worker.on('failed', (job: Job | undefined, error: Error) => {
      this.logger.error(
        `Job ${job?.id} in queue ${queueName} failed: ${error.message}`
      );
    });

    this.workers.set(queueName, worker);
    return worker;
  }

  public async getJob(
    queueName: string,
    jobId: string
  ): Promise<Job | undefined> {
    const queue = this.getQueue(queueName);
    return queue.getJob(jobId);
  }

  public async close(): Promise<void> {
    this.logger.info('Closing all queues and workers...');
    await Promise.all([
      ...Array.from(this.queues.values()).map((q) => q.close()),
      ...Array.from(this.workers.values()).map((w) => w.close())
    ]);
    await this.redisClient.getClient().quit();
    this.logger.info('All queues and workers closed.');
  }

  async onClose(): Promise<void> {
    await this.close();
  }
}
