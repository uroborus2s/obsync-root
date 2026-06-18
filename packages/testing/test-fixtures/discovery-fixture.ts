import { Controller, Get, Service } from '@stratix/core';

class FixtureUserService {
  label(): string {
    return 'discovered';
  }
}
Service()(FixtureUserService);

class FixtureUserController {
  constructor(private readonly fixtureUserService: FixtureUserService) {}

  getUser() {
    return { label: this.fixtureUserService.label() };
  }
}
Controller()(FixtureUserController);
Get('/users')(
  FixtureUserController.prototype,
  'getUser',
  Object.getOwnPropertyDescriptor(FixtureUserController.prototype, 'getUser')!
);

export { FixtureUserController, FixtureUserService };
