import { describe, expect, it } from 'vitest';
import devToolsPlugin from '../index.js';

describe('@stratix/devtools exports', () => {
  it('exports a Fastify plugin function', () => {
    expect(typeof devToolsPlugin).toBe('function');
  });
});
