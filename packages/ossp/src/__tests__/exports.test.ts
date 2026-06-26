import { describe, expect, it } from 'vitest';
import osspPlugin, {
  AliyunOSSAdapter,
  MinioAdapter,
  OsspClientAdapter
} from '../index.js';

describe('@stratix/ossp exports', () => {
  it('exports plugin and adapter constructors', () => {
    expect(typeof osspPlugin).toBe('function');
    expect(typeof AliyunOSSAdapter).toBe('function');
    expect(typeof MinioAdapter).toBe('function');
    expect(typeof OsspClientAdapter).toBe('function');
  });
});
