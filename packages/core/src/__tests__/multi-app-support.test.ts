import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Stratix } from '../stratix.js';
import type { StratixApplication, StratixRunOptions } from '../types/index.js';

function runOptions(instanceId?: string): StratixRunOptions {
  return {
    type: 'cli',
    gracefulShutdown: false,
    instanceId,
    config: {
      server: {},
      plugins: [],
      autoLoad: {},
      discovery: { enabled: false }
    }
  };
}

describe('Stratix application instance management', () => {
  let stratix: Stratix;
  const staticApps: StratixApplication[] = [];

  beforeEach(() => {
    stratix = new Stratix(runOptions());
  });

  afterEach(async () => {
    if (stratix.isRunning()) {
      await stratix.stop();
    }
    await Promise.all(staticApps.map((app) => app.stop()));
    staticApps.length = 0;
  });

  it('creates and exposes one running application instance', async () => {
    const app = await stratix.start(runOptions());

    expect(app.instanceId).toBe('default');
    expect(app.type).toBe('cli');
    expect(stratix.isRunning()).toBe(true);
    expect(stratix.getApplication()).toBe(app);
  });

  it('stops the current application and clears instance state', async () => {
    await stratix.start(runOptions());

    await stratix.stop();

    expect(stratix.isRunning()).toBe(false);
    expect(stratix.getApplication()).toBeNull();
  });

  it('rejects duplicate starts on the same Stratix instance', async () => {
    await stratix.start(runOptions());

    await expect(stratix.start(runOptions())).rejects.toThrow(
      'Application is already running'
    );
  });

  it('restarts with a fresh application object', async () => {
    const first = await stratix.start(runOptions());
    const second = await stratix.restart(runOptions('restarted'));

    expect(second).not.toBe(first);
    expect(second.instanceId).toBe('restarted');
    expect(stratix.getApplication()).toBe(second);
  });

  it('supports the static run helper', async () => {
    const app = await Stratix.run(runOptions('static'));
    staticApps.push(app);

    expect(app.instanceId).toBe('static');
    expect(app.type).toBe('cli');
    expect(app.isRunning()).toBe(false);
  });
});
