export type HookHandler = (payload?: any) => Promise<void> | void;

export interface Hooks {
  beforeRegister: HookHandler[];
  afterRegister: HookHandler[];
  beforeStart: HookHandler[];
  afterStart: HookHandler[];
  beforeClose: HookHandler[];
  afterClose: HookHandler[];
  [key: string]: HookHandler[];
}
