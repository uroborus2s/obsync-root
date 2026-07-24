import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(
  rootDir,
  'src',
  'commands',
  'ecosystem',
  'catalog',
  'stratix.json'
);
const target = path.join(
  rootDir,
  'dist',
  'commands',
  'ecosystem',
  'catalog',
  'stratix.json'
);

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.copyFileSync(source, target);
