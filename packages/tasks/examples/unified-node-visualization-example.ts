/**
 * 统一节点可视化示例
 * 
 * 展示如何使用合并后的单一接口获取所有节点实例，包含完整的子节点层次结构
 */

import type { IWorkflowInstanceService } from '../src/interfaces/index.js';
import type { NodeInstanceWithChildren } from '../src/types/unified-node.js';

/**
 * 统一节点可视化数据获取示例
 */
export class UnifiedNodeVisualizationExample {
  constructor(private workflowInstanceService: IWorkflowInstanceService) {}

  /**
   * 获取工作流实例的完整可视化数据
   * 使用单一接口获取所有节点，包含完整的子节点层次结构
   */
  async getWorkflowVisualizationData(workflowInstanceId: number) {
    try {
      console.log(`🔍 获取工作流实例 ${workflowInstanceId} 的可视化数据...`);

      // 使用合并后的接口获取所有节点实例（包含子节点层次结构）
      const nodeInstancesResult = await this.workflowInstanceService.getNodeInstances(
        workflowInstanceId
      );

      if (!nodeInstancesResult.success) {
        throw new Error(`获取节点实例失败: ${nodeInstancesResult.error}`);
      }

      const topLevelNodes = nodeInstancesResult.data;
      console.log(`📊 找到 ${topLevelNodes.length} 个顶级节点`);

      // 统计所有节点（包括子节点）
      const allNodesCount = this.countAllNodes(topLevelNodes);
      const loopNodesCount = this.countLoopNodes(topLevelNodes);
      
      console.log(`📊 总节点数: ${allNodesCount}`);
      console.log(`🔄 循环节点数: ${loopNodesCount}`);

      // 分析节点层次结构
      this.analyzeNodeHierarchy(topLevelNodes);

      return {
        topLevelNodes,
        statistics: {
          totalNodes: allNodesCount,
          topLevelNodes: topLevelNodes.length,
          loopNodes: loopNodesCount,
        },
        hierarchyData: this.buildHierarchyData(topLevelNodes)
      };
    } catch (error) {
      console.error('❌ 获取工作流可视化数据失败:', error);
      throw error;
    }
  }

  /**
   * 递归统计所有节点数量（包括子节点）
   */
  private countAllNodes(nodes: NodeInstanceWithChildren[]): number {
    let count = nodes.length;
    
    for (const node of nodes) {
      if (node.children && node.children.length > 0) {
        count += this.countAllNodes(node.children);
      }
    }
    
    return count;
  }

  /**
   * 统计循环节点数量
   */
  private countLoopNodes(nodes: NodeInstanceWithChildren[]): number {
    let count = 0;
    
    for (const node of nodes) {
      if (node.nodeType === 'loop') {
        count++;
      }
      
      if (node.children && node.children.length > 0) {
        count += this.countLoopNodes(node.children);
      }
    }
    
    return count;
  }

  /**
   * 分析节点层次结构
   */
  private analyzeNodeHierarchy(nodes: NodeInstanceWithChildren[], level: number = 0) {
    const indent = '  '.repeat(level);
    
    for (const node of nodes) {
      console.log(`${indent}📋 ${node.nodeName} (${node.nodeType}) - ${node.status}`);
      
      if (node.children && node.children.length > 0) {
        console.log(`${indent}  └─ 包含 ${node.children.length} 个子节点`);
        
        if (node.childrenStats) {
          const stats = node.childrenStats;
          console.log(`${indent}     统计: ${stats.completed}完成 ${stats.running}运行中 ${stats.failed}失败 ${stats.pending}待处理`);
        }
        
        // 递归分析子节点
        this.analyzeNodeHierarchy(node.children, level + 1);
      }
    }
  }

  /**
   * 构建层次数据用于前端渲染
   */
  private buildHierarchyData(nodes: NodeInstanceWithChildren[]) {
    return nodes.map(node => ({
      id: node.id,
      nodeId: node.nodeId,
      name: node.nodeName,
      type: node.nodeType,
      status: node.status,
      hasChildren: !!(node.children && node.children.length > 0),
      childrenCount: node.children?.length || 0,
      childrenStats: node.childrenStats,
      children: node.children ? this.buildHierarchyData(node.children) : undefined
    }));
  }

  /**
   * 查找特定类型的节点
   */
  async findNodesByType(workflowInstanceId: number, nodeType: string) {
    const result = await this.getWorkflowVisualizationData(workflowInstanceId);
    const foundNodes: NodeInstanceWithChildren[] = [];
    
    const searchNodes = (nodes: NodeInstanceWithChildren[]) => {
      for (const node of nodes) {
        if (node.nodeType === nodeType) {
          foundNodes.push(node);
        }
        
        if (node.children && node.children.length > 0) {
          searchNodes(node.children);
        }
      }
    };
    
    searchNodes(result.topLevelNodes);
    
    console.log(`🔍 找到 ${foundNodes.length} 个 ${nodeType} 类型的节点`);
    return foundNodes;
  }

  /**
   * 获取循环节点的执行进度
   */
  async getLoopProgress(workflowInstanceId: number) {
    const loopNodes = await this.findNodesByType(workflowInstanceId, 'loop');
    
    return loopNodes.map(loop => ({
      nodeId: loop.nodeId,
      nodeName: loop.nodeName,
      status: loop.status,
      totalTasks: loop.children?.length || 0,
      completedTasks: loop.childrenStats?.completed || 0,
      runningTasks: loop.childrenStats?.running || 0,
      failedTasks: loop.childrenStats?.failed || 0,
      pendingTasks: loop.childrenStats?.pending || 0,
      progressPercentage: loop.childrenStats ? 
        Math.round((loop.childrenStats.completed / loop.childrenStats.total) * 100) : 0
    }));
  }
}

/**
 * 使用示例
 */
export async function exampleUsage(workflowInstanceService: IWorkflowInstanceService) {
  const visualizer = new UnifiedNodeVisualizationExample(workflowInstanceService);
  
  try {
    // 获取完整的可视化数据
    const visualizationData = await visualizer.getWorkflowVisualizationData(123);
    
    console.log('📊 可视化数据:', visualizationData);
    
    // 查找所有循环节点
    const loopNodes = await visualizer.findNodesByType(123, 'loop');
    console.log('🔄 循环节点:', loopNodes);
    
    // 获取循环进度
    const loopProgress = await visualizer.getLoopProgress(123);
    console.log('📈 循环进度:', loopProgress);
    
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}
