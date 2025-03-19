import { StratixApp } from './app.js';

export interface PluginOptions {
  [key: string]: any;
}

export interface StratixPlugin {
  name: string;
  dependencies?: string[];
  register: PluginRegisterFunction;
  options?: PluginOptions;
}

export type PluginRegisterFunction = (
  app: StratixApp,
  options: PluginOptions
) => Promise<void> | void;
