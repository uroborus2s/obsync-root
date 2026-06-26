import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';

import { ConfigurationError, PluginLoadError } from '../errors/index.js';
import type { StratixConfig } from '../types/index.js';

type PluginConfigs = StratixConfig['plugins'];
type PluginConfig = PluginConfigs[number];

export interface PluginLoaderOptions {
  logger?: Logger;
  executeEagerInitialization: () => Promise<void>;
}

export async function loadConfiguredPlugins(
  config: StratixConfig,
  fastify: FastifyInstance,
  options: PluginLoaderOptions
): Promise<void> {
  const { executeEagerInitialization, logger } = options;
  const pluginConfigs = resolvePluginLoadOrder(config.plugins || []);

  if (pluginConfigs.length === 0) {
    logger?.debug('No plugins to load');
    return;
  }

  logger?.info(`Loading ${pluginConfigs.length} plugins...`);

  for (const pluginConfig of pluginConfigs) {
    try {
      if (pluginConfig.plugin) {
        await fastify.register(pluginConfig.plugin, {
          ...pluginConfig.options,
          prefix: pluginConfig.prefix
        });
      }

      logger?.debug(`Plugin "${pluginConfig.name}" loaded successfully`);
    } catch (error) {
      logger?.error(
        { err: error, pluginName: pluginConfig.name },
        `Failed to load plugin "${pluginConfig.name}"`
      );
      throw new PluginLoadError(
        `Plugin loading failed: ${pluginConfig.name}`,
        { pluginName: pluginConfig.name },
        error
      );
    }
  }

  logger?.info('All plugins loaded successfully');
  await executeEagerInitialization();
}

export function resolvePluginLoadOrder(
  pluginConfigs: PluginConfigs
): PluginConfigs {
  const enabledPlugins = pluginConfigs.filter(
    (pluginConfig) => pluginConfig.enabled !== false
  );
  const pluginsByName = new Map<string, PluginConfig>();

  for (const pluginConfig of enabledPlugins) {
    if (pluginsByName.has(pluginConfig.name)) {
      throw new ConfigurationError(
        `Duplicate plugin name: ${pluginConfig.name}`,
        {
          pluginName: pluginConfig.name
        }
      );
    }
    pluginsByName.set(pluginConfig.name, pluginConfig);
  }

  for (const pluginConfig of enabledPlugins) {
    for (const dependency of pluginConfig.dependencies || []) {
      if (!pluginsByName.has(dependency)) {
        throw new ConfigurationError(
          `Plugin dependency not found: ${pluginConfig.name} -> ${dependency}`,
          {
            pluginName: pluginConfig.name,
            dependency
          }
        );
      }
    }
  }

  const ordered: PluginConfigs = [];
  const loaded = new Set<string>();
  const remaining = new Map(pluginsByName);

  while (remaining.size > 0) {
    const ready = [...remaining.values()]
      .filter((pluginConfig) =>
        (pluginConfig.dependencies || []).every((dependency) =>
          loaded.has(dependency)
        )
      )
      .sort((left, right) => {
        const leftOrder = left.order ?? 0;
        const rightOrder = right.order ?? 0;
        if (leftOrder !== rightOrder) {
          return leftOrder - rightOrder;
        }
        return left.name.localeCompare(right.name);
      });

    if (ready.length === 0) {
      throw new ConfigurationError('Plugin dependency cycle detected', {
        remaining: [...remaining.keys()]
      });
    }

    for (const pluginConfig of ready) {
      ordered.push(pluginConfig);
      loaded.add(pluginConfig.name);
      remaining.delete(pluginConfig.name);
    }
  }

  return ordered;
}
