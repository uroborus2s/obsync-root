import type AuthService from './AuthService.js';

export default class IntegrationService {
  constructor(private readonly authService: AuthService) {}

  async connect(): Promise<{ authenticated: boolean }> {
    return {
      authenticated: await this.authService.authenticate()
    };
  }
}
