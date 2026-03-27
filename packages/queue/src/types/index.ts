import type { QueueOptions, WorkerOptions } from 'bullmq';
/**
 * @stratix/queue Type Definitions
 */
export type { Job, Processor, QueueOptions, WorkerOptions } from 'bullmq';

export interface QueuePluginOptions {
  defaultQueueOptions?: QueueOptions;
  defaultWorkerOptions?: WorkerOptions;
}
