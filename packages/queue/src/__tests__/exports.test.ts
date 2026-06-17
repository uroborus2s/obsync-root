import { describe, expect, it } from 'vitest';
import queuePlugin from '../index.js';
import QueueClientAdapter from '../adapters/queue.adapter.js';

describe('@stratix/queue exports', () => {
  it('exports plugin and queue adapter constructor', () => {
    expect(typeof queuePlugin).toBe('function');
    expect(typeof QueueClientAdapter).toBe('function');
  });
});
