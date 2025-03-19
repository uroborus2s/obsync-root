import {
  asClass,
  asFunction,
  asValue,
  AwilixContainer,
  createContainer
} from 'awilix';

export class DIContainer {
  private container: AwilixContainer;

  constructor() {
    this.container = createContainer();
  }

  /**
   * 注册工厂函数
   */
  inject(name: string, factory: (container: any) => any): void {
    this.container.register({
      [name]: asFunction((container) => factory(container)).singleton()
    });
  }

  /**
   * 注册值
   */
  injectValue(name: string, value: any): void {
    this.container.register({
      [name]: asValue(value)
    });
  }

  /**
   * 注册类
   */
  injectClass(name: string, constructor: any, options: any = {}): void {
    this.container.register({
      [name]: asClass(constructor).singleton()
    });
  }

  /**
   * 解析依赖
   */
  async resolve<T>(name: string): Promise<T> {
    try {
      return this.container.resolve(name);
    } catch (err: any) {
      throw new Error(`Cannot resolve dependency '${name}': ${err.message}`);
    }
  }

  /**
   * 获取原始容器
   */
  getContainer(): AwilixContainer {
    return this.container;
  }
}
