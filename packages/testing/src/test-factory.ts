import { asClass, asValue, AwilixContainer, createContainer, InjectionMode, Lifetime } from 'awilix';
import { TestingModule } from './testing-module.js';

export interface ModuleMetadata {
  providers?: any[];
  controllers?: any[];
  imports?: any[];
}

export class Test {
  static createTestingModule(metadata: ModuleMetadata): TestingModuleBuilder {
    return new TestingModuleBuilder(metadata);
  }
}

export class TestingModuleBuilder {
  private metadata: ModuleMetadata;
  private overrides: Array<{ token: any; value: any }> = [];

  constructor(metadata: ModuleMetadata) {
    this.metadata = metadata;
  }

  overrideProvider(token: any): { useValue: (value: any) => TestingModuleBuilder } {
    return {
      useValue: (value: any) => {
        this.overrides.push({ token, value });
        return this;
      }
    };
  }

  async compile(): Promise<TestingModule> {
    const container = createContainer({
      injectionMode: InjectionMode.CLASSIC
    });

    // Register providers
    if (this.metadata.providers) {
      for (const provider of this.metadata.providers) {
        this.registerProvider(container, provider);
      }
    }

    // Register controllers
    if (this.metadata.controllers) {
      for (const controller of this.metadata.controllers) {
        container.register({
          [controller.name]: asClass(controller, { lifetime: Lifetime.SINGLETON })
        });
      }
    }

    // Apply overrides
    for (const override of this.overrides) {
      const tokenName = typeof override.token === 'function' ? override.token.name : override.token;
      container.register({
        [tokenName]: asValue(override.value)
      });
    }

    return new TestingModule(container);
  }

  private registerProvider(container: AwilixContainer, provider: any) {
    if (typeof provider === 'function') {
      // Class provider
      container.register({
        [provider.name]: asClass(provider, { lifetime: Lifetime.SINGLETON })
      });
    } else if (provider.provide && provider.useValue) {
      // Value provider
      const tokenName = typeof provider.provide === 'function' ? provider.provide.name : provider.provide;
      container.register({
        [tokenName]: asValue(provider.useValue)
      });
    } else if (provider.provide && provider.useClass) {
      // Class provider with token
      const tokenName = typeof provider.provide === 'function' ? provider.provide.name : provider.provide;
      container.register({
        [tokenName]: asClass(provider.useClass, { lifetime: Lifetime.SINGLETON })
      });
    }
  }
}
