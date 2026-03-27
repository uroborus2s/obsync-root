import { glob } from 'glob';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import { getLogger } from '../logger/index.js';
import type { IModuleScanner, LoadedModule } from './interfaces.js';

export class ModuleScanner implements IModuleScanner {
  private logger = getLogger();

  constructor(
    private readonly options: {
      extensions?: string[];
      exclude?: string[];
    } = {}
  ) {}

  async scan(directories: string[]): Promise<LoadedModule[]> {
    const loadedModules: LoadedModule[] = [];
    const extensions = this.options.extensions || ['.ts', '.js', '.mjs', '.cjs'];
    const exclude = this.options.exclude || ['**/*.d.ts', '**/*.test.ts', '**/*.spec.ts'];

    // Construct glob pattern
    // We want to match files with specific extensions in the given directories
    // Example: /path/to/dir/**/*.{ts,js}
    const extPattern = extensions.map(ext => ext.replace('.', '')).join(',');
    const patternSuffix = `**/*.{${extPattern}}`;

    for (const dir of directories) {
      const pattern = resolve(dir, patternSuffix).replace(/\\/g, '/'); // Ensure forward slashes for glob

      try {
        this.logger.debug(`Scanning directory: ${dir} with pattern: ${pattern}`);
        
        const files = await glob(pattern, {
          ignore: exclude,
          absolute: true,
          windowsPathsNoEscape: true
        });

        this.logger.debug(`Found ${files.length} files in ${dir}`);

        for (const file of files) {
          try {
            const module = await this.loadModule(file);
            if (module) {
              loadedModules.push(module);
            }
          } catch (error) {
            this.logger.warn(`Failed to load module from file: ${file}`, error);
          }
        }
      } catch (error) {
        this.logger.error(`Failed to scan directory: ${dir}`, error);
      }
    }

    return loadedModules;
  }

  private async loadModule(filePath: string): Promise<LoadedModule | null> {
    // Convert path to file URL for dynamic import (ESM support)
    const fileUrl = pathToFileURL(filePath).href;
    
    const rawModule = await import(fileUrl);
    
    // We primarily look for the default export, but we can also handle named exports if needed.
    // For now, let's assume the component is the default export or the whole module if no default.
    // Stratix convention usually expects default export for classes, but let's be flexible.
    
    const value = rawModule.default || rawModule;

    if (!value) {
      return null;
    }

    // Use the class name or file name as the module name
    let name = 'unknown';
    if (value.name) {
      name = value.name;
    } else {
      // Fallback to filename without extension
      const parts = filePath.split(/[/\\]/);
      const filename = parts[parts.length - 1];
      name = filename.split('.')[0];
    }

    return {
      name,
      path: filePath,
      value
    };
  }
}
