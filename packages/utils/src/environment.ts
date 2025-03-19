declare global {
  namespace NodeJS {
    interface ProcessEnv {
      ZORA_ENV_KEY?: string;
      ZORA_CONFIG_VALUE?: string;
    }
  }
}

export const isProduction: boolean = process.env.NODE_ENV === 'production';

export function generateEnvKey(): string {
  return Buffer.from(Math.random().toString(36).substring(2, 15))
    .toString('base64')
    .slice(0, 24);
}
