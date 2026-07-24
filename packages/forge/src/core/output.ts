export interface CliOutput {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  success(message: string): void;
  log(message: string): void;
}

export function createConsoleOutput(): CliOutput {
  return {
    info(message: string) {
      console.log(message);
    },
    warn(message: string) {
      console.warn(message);
    },
    error(message: string) {
      console.error(message);
    },
    success(message: string) {
      console.log(message);
    },
    log(message: string) {
      console.log(message);
    }
  };
}
