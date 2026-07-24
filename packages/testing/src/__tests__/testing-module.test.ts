import { describe, expect, it } from 'vitest';
import { Test, TestingModule } from '../index.js';

class ExampleService {
  value(): string {
    return 'ok';
  }
}

describe('@stratix/testing exports', () => {
  it('builds a testing module and resolves providers', async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [ExampleService]
    }).compile();

    expect(moduleRef).toBeInstanceOf(TestingModule);
    expect(moduleRef.get<ExampleService>(ExampleService).value()).toBe('ok');
  });
});
