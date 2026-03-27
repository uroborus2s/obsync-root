import { spawn } from 'node:child_process';
import { CliError } from '../core/errors.js';

export type SupportedPackageManager = 'pnpm' | 'npm' | 'yarn';

export async function installDependencies(
  rootDir: string,
  packageManager: SupportedPackageManager
): Promise<void> {
  const args = packageManager === 'npm' ? ['install'] : ['install'];

  await new Promise<void>((resolve, reject) => {
    const child = spawn(packageManager, args, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: process.platform === 'win32'
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new CliError(`${packageManager} install failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}
