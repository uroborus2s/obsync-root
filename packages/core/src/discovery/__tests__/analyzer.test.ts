import { describe, expect, it } from 'vitest';
import { Controller } from '../../decorators/controller.js';
import { Get } from '../../decorators/route.js';
import { MetadataAnalyzer } from '../analyzer.js';

describe('MetadataAnalyzer', () => {
  const analyzer = new MetadataAnalyzer();

  it('should return null for non-class modules', () => {
    const module = { name: 'test', path: '/test.js', value: { foo: 'bar' } };
    expect(analyzer.analyze(module)).toBeNull();
  });

  it('should analyze a Controller class', () => {
    @Controller()
    class TestController {
      @Get('/test')
      test() {}
    }

    const module = { name: 'TestController', path: '/test.ts', value: TestController };
    const metadata = analyzer.analyze(module);

    expect(metadata).not.toBeNull();
    expect(metadata?.type).toBe('controller');
    expect(metadata?.name).toBe('TestController');
    expect(metadata?.routes).toHaveLength(1);
    expect(metadata?.routes?.[0]).toMatchObject({
      method: 'GET',
      path: '/test',
      handlerName: 'test'
    });
  });

  it('should analyze a Service class (implicit)', () => {
    class TestService {}

    const module = { name: 'TestService', path: '/service.ts', value: TestService };
    const metadata = analyzer.analyze(module);

    expect(metadata).not.toBeNull();
    expect(metadata?.type).toBe('service');
    expect(metadata?.name).toBe('TestService');
    expect(metadata?.diOptions?.lifetime).toBe('SINGLETON');
  });
});
