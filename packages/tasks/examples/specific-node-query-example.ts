/**
 * 特定节点查询示例
 *
 * 展示如何使用增强后的getNodeInstances接口来查询特定节点及其子节点
 * 重点演示SQL层面优化的两步查询策略
 */

import type { IWorkflowInstanceService } from '../src/interfaces/index.js';
import type { NodeInstanceWithChildren } from '../src/types/unified-node.js';

/**
 * 特定节点查询示例类
 */
export class SpecificNodeQueryExample {
  constructor(private workflowInstanceService: IWorkflowInstanceService) {}

  /**
   * 获取所有顶级节点
   */
  async getAllTopLevelNodes(workflowInstanceId: number) {
    console.log(`🔍 获取工作流实例 ${workflowInstanceId} 的所有顶级节点...`);

    const result =
      await this.workflowInstanceService.getNodeInstances(workflowInstanceId);

    if (!result.success) {
      throw new Error(`获取顶级节点失败: ${result.error}`);
    }

    const topLevelNodes = result.data;
    console.log(`📊 找到 ${topLevelNodes.length} 个顶级节点`);

    topLevelNodes.forEach((node) => {
      console.log(`  - ${node.nodeName} (${node.nodeType}) - ${node.status}`);
      if (node.children && node.children.length > 0) {
        console.log(`    └─ 包含 ${node.children.length} 个子节点`);
      }
    });

    return topLevelNodes;
  }

  /**
   * 获取特定节点及其所有子节点
   */
  async getSpecificNodeWithChildren(
    workflowInstanceId: number,
    nodeId: string
  ) {
    console.log(
      `🎯 获取工作流实例 ${workflowInstanceId} 中节点 ${nodeId} 及其子节点...`
    );

    const result = await this.workflowInstanceService.getNodeInstances(
      workflowInstanceId,
      nodeId
    );

    if (!result.success) {
      throw new Error(`获取节点 ${nodeId} 失败: ${result.error}`);
    }

    const [targetNode] = result.data;
    if (!targetNode) {
      throw new Error(`节点 ${nodeId} 未找到`);
    }

    console.log(`📋 节点信息:`);
    console.log(`  名称: ${targetNode.nodeName}`);
    console.log(`  类型: ${targetNode.nodeType}`);
    console.log(`  状态: ${targetNode.status}`);

    if (targetNode.children && targetNode.children.length > 0) {
      console.log(`  子节点数量: ${targetNode.children.length}`);

      if (targetNode.childrenStats) {
        const stats = targetNode.childrenStats;
        console.log(`  子节点统计:`);
        console.log(`    - 总数: ${stats.total}`);
        console.log(`    - 已完成: ${stats.completed}`);
        console.log(`    - 运行中: ${stats.running}`);
        console.log(`    - 失败: ${stats.failed}`);
        console.log(`    - 待处理: ${stats.pending}`);
      }

      console.log(`  子节点详情:`);
      this.printNodeHierarchy(targetNode.children, 2);
    } else {
      console.log(`  无子节点`);
    }

    return targetNode;
  }

  /**
   * 查找循环节点并分析其执行情况
   */
  async analyzeLoopNodes(workflowInstanceId: number) {
    console.log(`🔄 分析工作流实例 ${workflowInstanceId} 中的循环节点...`);

    // 先获取所有顶级节点
    const allNodesResult =
      await this.workflowInstanceService.getNodeInstances(workflowInstanceId);

    if (!allNodesResult.success) {
      throw new Error(`获取节点失败: ${allNodesResult.error}`);
    }

    // 查找循环节点
    const loopNodes = this.findLoopNodes(allNodesResult.data);

    if (loopNodes.length === 0) {
      console.log(`❌ 未找到循环节点`);
      return [];
    }

    console.log(`🔄 找到 ${loopNodes.length} 个循环节点`);

    const loopAnalysis = [];

    for (const loopNode of loopNodes) {
      console.log(`\n📊 分析循环节点: ${loopNode.nodeName}`);

      // 获取该循环节点的详细信息
      const detailResult = await this.workflowInstanceService.getNodeInstances(
        workflowInstanceId,
        loopNode.nodeId
      );

      if (detailResult.success && detailResult.data[0]) {
        const detailedLoopNode = detailResult.data[0];

        const analysis = {
          nodeId: detailedLoopNode.nodeId,
          nodeName: detailedLoopNode.nodeName,
          status: detailedLoopNode.status,
          totalTasks: detailedLoopNode.children?.length || 0,
          completedTasks: detailedLoopNode.childrenStats?.completed || 0,
          runningTasks: detailedLoopNode.childrenStats?.running || 0,
          failedTasks: detailedLoopNode.childrenStats?.failed || 0,
          pendingTasks: detailedLoopNode.childrenStats?.pending || 0,
          progressPercentage: detailedLoopNode.childrenStats
            ? Math.round(
                (detailedLoopNode.childrenStats.completed /
                  detailedLoopNode.childrenStats.total) *
                  100
              )
            : 0
        };

        console.log(`  状态: ${analysis.status}`);
        console.log(
          `  进度: ${analysis.completedTasks}/${analysis.totalTasks} (${analysis.progressPercentage}%)`
        );
        console.log(`  运行中: ${analysis.runningTasks}`);
        console.log(`  失败: ${analysis.failedTasks}`);
        console.log(`  待处理: ${analysis.pendingTasks}`);

        loopAnalysis.push(analysis);
      }
    }

    return loopAnalysis;
  }

  /**
   * 递归查找循环节点
   */
  private findLoopNodes(
    nodes: NodeInstanceWithChildren[]
  ): NodeInstanceWithChildren[] {
    const loopNodes: NodeInstanceWithChildren[] = [];

    for (const node of nodes) {
      if (node.nodeType === 'loop') {
        loopNodes.push(node);
      }

      if (node.children && node.children.length > 0) {
        loopNodes.push(...this.findLoopNodes(node.children));
      }
    }

    return loopNodes;
  }

  /**
   * 打印节点层次结构
   */
  private printNodeHierarchy(
    nodes: NodeInstanceWithChildren[],
    indentLevel: number = 0
  ) {
    const indent = '  '.repeat(indentLevel);

    for (const node of nodes) {
      console.log(
        `${indent}- ${node.nodeName} (${node.nodeType}) - ${node.status}`
      );

      if (node.children && node.children.length > 0) {
        this.printNodeHierarchy(node.children, indentLevel + 1);
      }
    }
  }

  /**
   * 比较两种查询方式的性能
   * 演示SQL层面优化的效果
   */
  async performanceComparison(workflowInstanceId: number, nodeId: string) {
    console.log(`⚡ 性能比较: 全量查询 vs SQL层面优化查询`);
    console.log(
      `📊 测试场景: 工作流实例 ${workflowInstanceId}, 目标节点 ${nodeId}`
    );

    // 方式1: 获取所有节点然后在内存中筛选（原有方式）
    console.log(`\n🔍 方式1: 全量查询 + 内存筛选`);
    const start1 = Date.now();
    const allNodesResult =
      await this.workflowInstanceService.getNodeInstances(workflowInstanceId);
    const end1 = Date.now();

    let targetFromAll = null;
    let allNodesCount = 0;
    if (allNodesResult.success) {
      allNodesCount = this.countAllNodes(allNodesResult.data);
      targetFromAll = this.findNodeInHierarchy(allNodesResult.data, nodeId);
    }

    console.log(`  ⏱️  查询时间: ${end1 - start1}ms`);
    console.log(`  📦 获取节点总数: ${allNodesCount}`);
    console.log(`  🎯 目标节点找到: ${targetFromAll ? '是' : '否'}`);

    // 方式2: SQL层面优化 - 两步查询
    console.log(`\n🚀 方式2: SQL层面优化 (两步查询)`);
    console.log(`  第一步: 根据实例ID和节点ID查询特定节点`);
    console.log(`  第二步: 根据父节点实例ID递归查询所有子节点`);

    const start2 = Date.now();
    const specificResult = await this.workflowInstanceService.getNodeInstances(
      workflowInstanceId,
      nodeId
    );
    const end2 = Date.now();

    let specificNodesCount = 0;
    if (specificResult.success && specificResult.data[0]) {
      specificNodesCount = this.countAllNodes(specificResult.data);
    }

    console.log(`  ⏱️  查询时间: ${end2 - start2}ms`);
    console.log(`  📦 获取节点总数: ${specificNodesCount}`);
    console.log(
      `  🎯 目标节点找到: ${specificResult.success && specificResult.data[0] ? '是' : '否'}`
    );

    // 性能分析
    const timeDiff = end1 - start1 - (end2 - start2);
    const improvement = timeDiff > 0 ? (timeDiff / (end1 - start1)) * 100 : 0;
    const dataReduction =
      allNodesCount > 0
        ? ((allNodesCount - specificNodesCount) / allNodesCount) * 100
        : 0;

    console.log(`\n📈 性能分析:`);
    console.log(
      `  ⚡ 时间优化: ${improvement.toFixed(1)}% (节省 ${timeDiff}ms)`
    );
    console.log(
      `  💾 数据减少: ${dataReduction.toFixed(1)}% (减少 ${allNodesCount - specificNodesCount} 个节点)`
    );
    console.log(
      `  🎯 查询精度: ${specificResult.success ? '精确命中' : '查询失败'}`
    );

    return {
      allNodesTime: end1 - start1,
      specificNodeTime: end2 - start2,
      timeImprovement: improvement,
      allNodesCount,
      specificNodesCount,
      dataReduction,
      targetFromAll,
      targetFromSpecific: specificResult.success ? specificResult.data[0] : null
    };
  }

  /**
   * 在节点层次结构中查找特定节点
   */
  private findNodeInHierarchy(
    nodes: NodeInstanceWithChildren[],
    nodeId: string
  ): NodeInstanceWithChildren | null {
    for (const node of nodes) {
      if (node.nodeId === nodeId) {
        return node;
      }

      if (node.children && node.children.length > 0) {
        const found = this.findNodeInHierarchy(node.children, nodeId);
        if (found) {
          return found;
        }
      }
    }

    return null;
  }

  /**
   * 递归计算节点总数（包括所有子节点）
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
}

/**
 * 使用示例
 */
export async function exampleUsage(
  workflowInstanceService: IWorkflowInstanceService
) {
  const queryExample = new SpecificNodeQueryExample(workflowInstanceService);

  try {
    const workflowInstanceId = 123;

    // 1. 获取所有顶级节点
    console.log('=== 获取所有顶级节点 ===');
    await queryExample.getAllTopLevelNodes(workflowInstanceId);

    // 2. 获取特定循环节点
    console.log('\n=== 获取特定循环节点 ===');
    await queryExample.getSpecificNodeWithChildren(
      workflowInstanceId,
      'data_loop'
    );

    // 3. 分析所有循环节点
    console.log('\n=== 分析循环节点 ===');
    await queryExample.analyzeLoopNodes(workflowInstanceId);

    // 4. 性能比较
    console.log('\n=== 性能比较 ===');
    await queryExample.performanceComparison(workflowInstanceId, 'data_loop');
  } catch (error) {
    console.error('示例执行失败:', error);
  }
}
