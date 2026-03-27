import fs from 'node:fs';
import path from 'node:path';
import { CliError } from '../core/errors.js';

export function ensureDirectory(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function ensureParentDirectory(filePath: string): void {
  ensureDirectory(path.dirname(filePath));
}

export function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
}

export function writeJsonFile(filePath: string, value: unknown): void {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2) + '\n', 'utf8');
}

export function writeTextFile(filePath: string, content: string): void {
  ensureParentDirectory(filePath);
  fs.writeFileSync(filePath, content, 'utf8');
}

export function readTextFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

export function assertPathDoesNotExist(targetPath: string): void {
  if (fs.existsSync(targetPath)) {
    throw new CliError(`Target path already exists: ${targetPath}`);
  }
}

export function assertPathExists(targetPath: string, message?: string): void {
  if (!fs.existsSync(targetPath)) {
    throw new CliError(message || `Required path not found: ${targetPath}`);
  }
}

export function fileExists(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}
