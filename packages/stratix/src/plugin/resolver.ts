/**
 * Stratix插件依赖解析器
 * 负责解析插件之间的依赖关系，确定正确的初始化顺序
 */
import { PluginDependencyError } from '../types/errors.js';
import { PluginInstance, StratixPlugin } from './types.js';

/**
 * 插件节点
 */
interface PluginNode {
  name: string;
  dependencies: string[];
  optionalDependencies: string[];
  plugin: StratixPlugin;
  visited: boolean;
  inPath: boolean;
}

/**
 * 构建插件依赖图
 * @param plugins 插件映射表
 * @returns 插件节点映射
 */
function buildDependencyGraph(
  plugins: Map<string, PluginInstance>
): Map<string, PluginNode> {
  const graph = new Map<string, PluginNode>();

  // 创建节点
  for (const [name, instance] of plugins.entries()) {
    graph.set(name, {
      name,
      dependencies: [...(instance.plugin.dependencies || [])],
      optionalDependencies: [...(instance.plugin.optionalDependencies || [])],
      plugin: instance.plugin,
      visited: false,
      inPath: false
    });
  }

  // 处理可选依赖
  for (const node of graph.values()) {
    // 过滤掉不存在的可选依赖
    node.optionalDependencies = node.optionalDependencies.filter((dep) =>
      graph.has(dep)
    );

    // 将存在的可选依赖添加到依赖列表中
    for (const optDep of node.optionalDependencies) {
      if (!node.dependencies.includes(optDep)) {
        node.dependencies.push(optDep);
      }
    }
  }

  return graph;
}

/**
 * 检测循环依赖
 * @param graph 依赖图
 * @param node 当前节点
 * @param path 当前路径
 * @throws PluginDependencyError 存在循环依赖时抛出
 */
function detectCycles(
  graph: Map<string, PluginNode>,
  nodeName: string,
  path: string[] = []
): void {
  const node = graph.get(nodeName);
  if (!node) return;

  if (node.inPath) {
    // 找到循环依赖
    const cycle = [...path, nodeName].join(' -> ');
    throw new PluginDependencyError(`检测到插件循环依赖: ${cycle}`);
  }

  if (node.visited) {
    return;
  }

  node.inPath = true;
  path.push(nodeName);

  for (const dep of node.dependencies) {
    detectCycles(graph, dep, path);
  }

  node.inPath = false;
  node.visited = true;
  path.pop();
}

/**
 * 拓扑排序
 * @param graph 依赖图
 * @returns 排序后的插件名称数组
 */
function topologicalSort(graph: Map<string, PluginNode>): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const temp = new Set<string>();

  function visit(nodeName: string): void {
    if (visited.has(nodeName)) return;
    if (temp.has(nodeName)) {
      // 这里不应该发生，因为我们已经检测了循环依赖
      throw new PluginDependencyError(`意外的循环依赖: ${nodeName}`);
    }

    temp.add(nodeName);
    const node = graph.get(nodeName);

    if (node) {
      for (const dep of node.dependencies) {
        visit(dep);
      }
    }

    temp.delete(nodeName);
    visited.add(nodeName);
    result.unshift(nodeName);
  }

  for (const nodeName of graph.keys()) {
    if (!visited.has(nodeName)) {
      visit(nodeName);
    }
  }

  return result;
}

/**
 * 解析插件依赖
 * @param plugins 插件映射表
 * @param pluginNames 可选的插件名称数组，只解析这些插件的依赖
 * @returns 按依赖顺序排序的插件名称数组
 * @throws PluginDependencyError 依赖解析失败时抛出
 */
export function resolvePluginDependencies(
  plugins: Map<string, PluginInstance>,
  pluginNames?: string[]
): string[] {
  // 构建依赖图
  const graph = buildDependencyGraph(plugins);

  // 如果指定了插件名称，验证它们都存在
  if (pluginNames) {
    for (const name of pluginNames) {
      if (!graph.has(name)) {
        throw new PluginDependencyError(`插件 ${name} 不存在`);
      }
    }
  }

  // 重置所有节点的访问状态
  for (const node of graph.values()) {
    node.visited = false;
    node.inPath = false;
  }

  // 检测循环依赖
  if (pluginNames) {
    // 只检查指定的插件
    for (const nodeName of pluginNames) {
      const node = graph.get(nodeName);
      if (node && !node.visited) {
        detectCycles(graph, nodeName);
      }
    }
  } else {
    // 检查所有插件
    for (const nodeName of graph.keys()) {
      const node = graph.get(nodeName);
      if (node && !node.visited) {
        detectCycles(graph, nodeName);
      }
    }
  }

  // 执行拓扑排序
  if (pluginNames) {
    // 如果指定了插件名称，先获取这些插件及其依赖
    const includedPlugins = new Set<string>();

    // 辅助函数，递归添加插件及其依赖
    function collectDependencies(name: string) {
      if (includedPlugins.has(name)) return;
      includedPlugins.add(name);

      const node = graph.get(name);
      if (node) {
        for (const dep of node.dependencies) {
          collectDependencies(dep);
        }
      }
    }

    // 收集所有指定插件的依赖
    for (const name of pluginNames) {
      collectDependencies(name);
    }

    // 只对包含的插件执行拓扑排序
    return topologicalSort(graph).filter((name) => includedPlugins.has(name));
  }

  // 对所有插件执行拓扑排序
  return topologicalSort(graph);
}

/**
 * 验证插件依赖
 * @param plugin 要验证的插件
 * @param availablePlugins 可用的插件名称集合
 * @throws PluginDependencyError 依赖无效时抛出
 */
export function validatePluginDependencies(
  plugin: StratixPlugin,
  availablePlugins: Set<string>
): void {
  // 检查必需依赖
  if (plugin.dependencies) {
    for (const dep of plugin.dependencies) {
      if (!availablePlugins.has(dep)) {
        throw new PluginDependencyError(
          `插件 ${plugin.name} 依赖 ${dep}，但它尚未注册`
        );
      }
    }
  }
}
