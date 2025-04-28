/**
 * 测试框架类型声明文件
 */

declare function describe(description: string, spec: () => void): void;
declare function describe(
  description: string,
  spec: (done: Mocha.Done) => void
): void;

declare function it(expectation: string, assertion: () => void): Mocha.Test;
declare function it(
  expectation: string,
  assertion: (done: Mocha.Done) => void
): Mocha.Test;
declare function it(
  expectation: string,
  assertion: () => Promise<any>
): Mocha.Test;

declare function beforeEach(action: () => void): void;
declare function beforeEach(action: (done: Mocha.Done) => void): void;
declare function beforeEach(action: () => Promise<any>): void;

declare function afterEach(action: () => void): void;
declare function afterEach(action: (done: Mocha.Done) => void): void;
declare function afterEach(action: () => Promise<any>): void;

declare function before(action: () => void): void;
declare function before(action: (done: Mocha.Done) => void): void;
declare function before(action: () => Promise<any>): void;

declare function after(action: () => void): void;
declare function after(action: (done: Mocha.Done) => void): void;
declare function after(action: () => Promise<any>): void;
