import 'reflect-metadata';
import {
  type ComponentMetadata,
  type ComponentOptions,
  MetadataManager
} from './metadata.js';

function createComponentDecorator(defaults: ComponentMetadata) {
  return (options: ComponentOptions = {}) =>
    function <T extends { new (...args: any[]): object }>(constructor: T) {
      MetadataManager.setComponentMetadata(constructor, {
        ...defaults,
        ...options,
        type: options.type || defaults.type,
        lifetime: options.lifetime || defaults.lifetime,
        injectionMode: options.injectionMode || defaults.injectionMode
      });

      return constructor;
    };
}

export const Service = createComponentDecorator({
  type: 'service',
  lifetime: 'SINGLETON',
  injectionMode: 'CLASSIC'
});

export const Repository = createComponentDecorator({
  type: 'repository',
  lifetime: 'SCOPED',
  injectionMode: 'CLASSIC'
});

export const Component = createComponentDecorator({
  type: 'component',
  lifetime: 'SINGLETON',
  injectionMode: 'CLASSIC'
});
