import fs from 'node:fs';
import path from 'node:path';

export interface StratixRunOptions {
  type?: 'web' | 'cli' | 'worker' | 'service' | 'auto';
  configOptions?: string | Record<string, unknown>;
  envOptions?: {
    override?: boolean;
  };
  server?: {
    host?: string;
    port?: number;
  };
}

export interface ConfigValidationOptions {
  strict?: boolean;
  requiredKeys?: string[];
}

const mockState: {
  lastRunOptions: StratixRunOptions | null;
} = {
  lastRunOptions: null
};

export const Stratix = {
  async run(options: StratixRunOptions): Promise<void> {
    mockState.lastRunOptions = options;
  }
};

export function resetMockState(): void {
  mockState.lastRunOptions = null;
}

export function getLastRunOptions(): StratixRunOptions | null {
  return mockState.lastRunOptions;
}

export function generateSecureKey(
  length: number = 32,
  format: 'hex' | 'base64' = 'hex'
): string {
  return `${format}:${length}`;
}

export function loadConfigFromFile(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as Record<string, unknown>;
}

export function saveConfigToFile(
  value: Record<string, unknown>,
  filePath: string,
  format: 'json' | 'env' = 'json'
): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  if (format === 'env') {
    const lines = Object.entries(value).map(([key, entry]) => `${key}=${entry}`);
    fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
    return;
  }

  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export function encryptConfig(
  value: Record<string, unknown>,
  options: { key?: unknown; verbose?: boolean } = {}
): string {
  return Buffer.from(
    JSON.stringify({
      value,
      key: options.key || null
    }),
    'utf8'
  ).toString('base64');
}

export function decryptConfig(
  encryptedString: string,
  _options: { key?: unknown; verbose?: boolean } = {}
): Record<string, unknown> {
  const decoded = JSON.parse(
    Buffer.from(encryptedString, 'base64').toString('utf8')
  ) as {
    value: Record<string, unknown>;
  };

  return decoded.value;
}

export function validateConfig(
  config: Record<string, unknown>,
  options: ConfigValidationOptions = {}
): {
  isValid: boolean;
  errors?: string[];
} {
  const missingKeys = (options.requiredKeys || []).filter(
    (key) => !(key in config)
  );

  if (missingKeys.length > 0) {
    return {
      isValid: false,
      errors: missingKeys.map((key) => `Missing required key: ${key}`)
    };
  }

  return {
    isValid: true,
    errors: []
  };
}
