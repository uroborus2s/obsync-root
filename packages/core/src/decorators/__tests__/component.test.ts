import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { Component, MetadataManager, Repository, Service } from '../index.js';

describe('component decorators', () => {
  it('marks service classes with explicit component metadata', () => {
    @Service()
    class UserService {}

    const metadata = MetadataManager.getComponentMetadata(UserService);

    expect(metadata).toEqual({
      type: 'service',
      lifetime: 'SINGLETON',
      injectionMode: 'CLASSIC',
      name: undefined
    });
  });

  it('marks repository classes as scoped by default', () => {
    @Repository({ name: 'userRepository' })
    class UserRepository {}

    const metadata = MetadataManager.getComponentMetadata(UserRepository);

    expect(metadata).toEqual({
      type: 'repository',
      lifetime: 'SCOPED',
      injectionMode: 'CLASSIC',
      name: 'userRepository'
    });
  });

  it('allows generic components to define lifetime and injection mode', () => {
    @Component({
      type: 'component',
      lifetime: 'TRANSIENT',
      injectionMode: 'PROXY',
      name: 'customComponent'
    })
    class CustomComponent {}

    const metadata = MetadataManager.getComponentMetadata(CustomComponent);

    expect(metadata).toEqual({
      type: 'component',
      lifetime: 'TRANSIENT',
      injectionMode: 'PROXY',
      name: 'customComponent'
    });
  });
});
