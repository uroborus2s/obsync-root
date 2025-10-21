/**
 * 工作流节点可视化示例（合并版本）
 *
 * 展示如何使用合并后的节点查询接口来支持流程图展示
 * 单一接口获取所有节点，包含完整的子节点层次结构
 */

import type { IWorkflowInstanceService } from '../src/interfaces/index.js';

/**
 * 循环节点可视化数据获取示例
 */
export class LoopNodeVisualizationExample {
  constructor(private workflowInstanceService: IWorkflowInstanceService) {}

  /**
   * 获取工作流实例的完整可视化数据
   * 包括所有节点实例和循环节点的详细信息
   */
  async getWorkflowVisualizationData(workflowInstanceId: number) {
    try {
      console.log(`🔍 获取工作流实例 ${workflowInstanceId} 的可视化数据...`);

      // 1. 获取所有节点实例
      const nodeInstancesResult =
        await this.workflowInstanceService.getNodeInstances(workflowInstanceId);

      if (!nodeInstancesResult.success) {
        throw new Error(`获取节点实例失败: ${nodeInstancesResult.error}`);
      }

      const nodeInstances = nodeInstancesResult.data;
      console.log(`📊 找到 ${nodeInstances.length} 个节点实例`);

      // 2. 获取循环节点执行详情
      const loopExecutionsResult =
        await this.workflowInstanceService.getLoopExecutions(
          workflowInstanceId
        );

      if (!loopExecutionsResult.success) {
        throw new Error(`获取循环节点详情失败: ${loopExecutionsResult.error}`);
      }

      const loopExecutions = loopExecutionsResult.data;
      console.log(`🔄 找到 ${loopExecutions.length} 个循环节点`);

      // 3. 组织数据结构以支持前端流程图渲染
      const visualizationData = {
        // 所有节点实例（平铺结构）
        allNodes: nodeInstances,

        // 顶级节点（非子任务节点）
        topLevelNodes: nodeInstances.filter((node) => !node.parentNodeId),

        // 循环节点详情（包含子任务的层次结构）
        loopNodes: loopExecutions,

        // 统计信息
        statistics: {
          totalNodes: nodeInstances.length,
          topLevelNodes: nodeInstances.filter((node) => !node.parentNodeId)
            .length,
          loopNodes: loopExecutions.length,
          completedNodes: nodeInstances.filter(
            (node) => node.status === 'completed'
          ).length,
          runningNodes: nodeInstances.filter(
            (node) => node.status === 'running'
          ).length,
          failedNodes: nodeInstances.filter((node) => node.status === 'failed')
            .length
        }
      };

      // 4. 打印循环节点详情
      loopExecutions.forEach((loopExecution) => {
        console.log(`\n🔄 循环节点: ${loopExecution.loopNodeName}`);
        console.log(`   状态: ${loopExecution.loopNodeStatus}`);
        console.log(
          `   进度: ${loopExecution.completedCount}/${loopExecution.totalCount}`
        );
        console.log(`   失败数: ${loopExecution.failedCount}`);
        console.log(`   子任务数: ${loopExecution.childTasks.length}`);

        // 显示子任务状态分布
        const childTaskStats = loopExecution.childTasks.reduce(
          (stats, task) => {
            stats[task.status] = (stats[task.status] || 0) + 1;
            return stats;
          },
          {} as Record<string, number>
        );

        console.log(`   子任务状态分布:`, childTaskStats);
      });

      return visualizationData;
    } catch (error) {
      console.error('❌ 获取可视化数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取特定循环节点的详细执行信息
   */
  async getLoopNodeDetails(workflowInstanceId: number, loopNodeId: string) {
    try {
      console.log(`🔍 获取循环节点 ${loopNodeId} 的详细信息...`);

      const loopExecutionsResult =
        await this.workflowInstanceService.getLoopExecutions(
          workflowInstanceId
        );

      if (!loopExecutionsResult.success) {
        throw new Error(`获取循环节点详情失败: ${loopExecutionsResult.error}`);
      }

      const loopExecution = loopExecutionsResult.data.find(
        (loop) => loop.loopNodeId === loopNodeId
      );

      if (!loopExecution) {
        throw new Error(`未找到循环节点: ${loopNodeId}`);
      }

      // 分析子任务执行情况
      const childTaskAnalysis = {
        total: loopExecution.childTasks.length,
        byStatus: loopExecution.childTasks.reduce(
          (stats, task) => {
            stats[task.status] = (stats[task.status] || 0) + 1;
            return stats;
          },
          {} as Record<string, number>
        ),

        // 按创建时间排序的子任务列表
        sortedTasks: loopExecution.childTasks.sort(
          (a, b) => (a.childIndex || 0) - (b.childIndex || 0)
        ),

        // 执行时间分析
        executionTimes: loopExecution.childTasks
          .filter((task) => task.startedAt && task.completedAt)
          .map((task) => ({
            taskId: task.nodeId,
            duration: task.durationMs || 0,
            startedAt: task.startedAt,
            completedAt: task.completedAt
          }))
      };

      console.log(`📊 循环节点 ${loopNodeId} 分析结果:`);
      console.log(`   总子任务数: ${childTaskAnalysis.total}`);
      console.log(`   状态分布:`, childTaskAnalysis.byStatus);
      console.log(
        `   平均执行时间: ${
          childTaskAnalysis.executionTimes.length > 0
            ? Math.round(
                childTaskAnalysis.executionTimes.reduce(
                  (sum, t) => sum + t.duration,
                  0
                ) / childTaskAnalysis.executionTimes.length
              )
            : 0
        }ms`
      );

      return {
        loopExecution,
        analysis: childTaskAnalysis
      };
    } catch (error) {
      console.error('❌ 获取循环节点详情失败:', error);
      throw error;
    }
  }

  /**
   * 生成前端流程图所需的数据格式
   */
  async generateFlowChartData(workflowInstanceId: number) {
    const visualizationData =
      await this.getWorkflowVisualizationData(workflowInstanceId);

    // 转换为前端流程图组件所需的格式
    const flowChartData = {
      // 节点数据
      nodes: visualizationData.topLevelNodes.map((node) => ({
        id: node.nodeId,
        type: node.nodeType,
        data: {
          label: node.nodeName,
          status: node.status,
          nodeType: node.nodeType,
          // 循环节点的特殊数据
          ...(node.nodeType === 'loop' && {
            loopProgress: node.loopProgress,
            totalCount: node.loopTotalCount,
            completedCount: node.loopCompletedCount
          })
        },
        position: { x: 0, y: 0 } // 位置需要根据工作流定义计算
      })),

      // 循环节点的子任务数据
      loopNodeDetails: visualizationData.loopNodes.reduce(
        (details, loopExecution) => {
          details[loopExecution.loopNodeId] = {
            childTasks: loopExecution.childTasks.map((task) => ({
              id: task.nodeId,
              name: task.nodeName,
              status: task.status,
              index: task.childIndex,
              startedAt: task.startedAt,
              completedAt: task.completedAt,
              duration: task.durationMs,
              errorMessage: task.errorMessage
            }))
          };
          return details;
        },
        {} as Record<string, any>
      ),

      // 统计信息
      statistics: visualizationData.statistics
    };

    console.log('🎨 生成流程图数据完成');
    return flowChartData;
  }
}

/**
 * 使用示例
 */
export async function demonstrateLoopNodeVisualization(
  workflowInstanceService: IWorkflowInstanceService,
  workflowInstanceId: number
) {
  const example = new LoopNodeVisualizationExample(workflowInstanceService);

  try {
    // 1. 获取完整的可视化数据
    console.log('=== 获取工作流可视化数据 ===');
    const visualizationData =
      await example.getWorkflowVisualizationData(workflowInstanceId);

    // 2. 如果有循环节点，获取详细信息
    if (visualizationData.loopNodes.length > 0) {
      console.log('\n=== 循环节点详细分析 ===');
      for (const loopNode of visualizationData.loopNodes) {
        await example.getLoopNodeDetails(
          workflowInstanceId,
          loopNode.loopNodeId
        );
      }
    }

    // 3. 生成前端流程图数据
    console.log('\n=== 生成流程图数据 ===');
    const flowChartData =
      await example.generateFlowChartData(workflowInstanceId);

    return {
      visualizationData,
      flowChartData
    };
  } catch (error) {
    console.error('❌ 演示失败:', error);
    throw error;
  }
}
