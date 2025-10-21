# 工作流实例可视化功能（合并版本）

本文档介绍了合并后的工作流实例查询功能，通过单一接口获取所有节点实例，包含完整的子节点层次结构，特别支持循环节点的子任务展示。

## 功能概述

### 核心功能
1. **统一节点数据获取** - 通过单一接口获取工作流实例的所有节点，包含完整层次结构
2. **子节点自动包含** - 如果节点有子节点（如循环节点的子任务），会自动包含在节点的children字段中
3. **层次关系支持** - 基于`parent_node_id`字段构建完整的节点层次关系
4. **统计信息计算** - 自动计算子节点的状态统计信息
5. **流程图数据格式** - 返回支持前端流程图渲染的完整数据结构
6. **SQL层面优化** - 特定节点查询使用两步SQL查询，避免内存层面的大量数据处理

### 支持的节点类型
- **单任务节点** (`simple`/`task`) - 基本的执行节点
- **循环节点** (`loop`) - 包含多个子任务的循环执行节点
- **子流程节点** (`subprocess`) - 调用其他工作流的节点
- **并行节点** (`parallel`) - 并行执行多个子任务的节点

## API接口

### 获取节点实例（包含子节点层次结构）

```http
GET /api/workflows/instances/:id/nodes?nodeId=xxx
```

**功能**:
- 如果提供 `nodeId` 查询参数，返回指定节点及其所有子节点
- 如果不提供 `nodeId`，返回所有顶级节点实例
- 如果节点有子节点（如循环节点的子任务），会在节点的children字段中包含完整的子节点信息

**查询参数**:
- `nodeId` (可选): 指定要获取的节点ID

**响应示例（获取所有顶级节点）**:
```http
GET /api/workflows/instances/123/nodes
```
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "workflowInstanceId": 123,
      "nodeId": "start_node",
      "nodeName": "开始节点",
      "nodeType": "simple",
      "status": "completed",
      "startedAt": "2024-01-01T10:00:00Z",
      "completedAt": "2024-01-01T10:00:05Z",
      "durationMs": 5000,
      "retryCount": 0,
      "parentNodeId": null,
      "childIndex": null
    },
    {
      "id": 2,
      "workflowInstanceId": 123,
      "nodeId": "data_loop",
      "nodeName": "数据处理循环",
      "nodeType": "loop",
      "status": "running",
      "loopProgress": {"status": "executing"},
      "loopTotalCount": 10,
      "loopCompletedCount": 5,
      "retryCount": 0,
      "parentNodeId": null,
      "childIndex": null,
      "children": [
        {
          "id": 3,
          "nodeId": "task_1_0",
          "nodeName": "处理任务 #0",
          "nodeType": "simple",
          "status": "completed",
          "parentNodeId": 2,
          "childIndex": 0,
          "startedAt": "2024-01-01T10:01:00Z",
          "completedAt": "2024-01-01T10:01:30Z",
          "durationMs": 30000,
          "retryCount": 0
        },
        {
          "id": 4,
          "nodeId": "task_1_1",
          "nodeName": "处理任务 #1",
          "nodeType": "simple",
          "status": "running",
          "parentNodeId": 2,
          "childIndex": 1,
          "startedAt": "2024-01-01T10:01:35Z",
          "retryCount": 0
        }
      ],
      "childrenStats": {
        "total": 2,
        "completed": 1,
        "running": 1,
        "failed": 0,
        "pending": 0
      }
    }
  ]
}
```

**响应示例（获取特定节点及其子节点）**:
```http
GET /api/workflows/instances/123/nodes?nodeId=data_loop
```

```json
{
  "success": true,
  "data": [
    {
      "id": 2,
      "workflowInstanceId": 123,
      "nodeId": "data_loop",
      "nodeName": "数据处理循环",
      "nodeType": "loop",
      "status": "running",
      "loopProgress": {"status": "executing"},
      "loopTotalCount": 10,
      "loopCompletedCount": 5,
      "retryCount": 0,
      "parentNodeId": null,
      "childIndex": null,
      "children": [
        {
          "id": 3,
          "nodeId": "task_1_0",
          "nodeName": "处理任务 #0",
          "nodeType": "simple",
          "status": "completed",
          "parentNodeId": 2,
          "childIndex": 0,
          "startedAt": "2024-01-01T10:01:00Z",
          "completedAt": "2024-01-01T10:01:30Z",
          "durationMs": 30000,
          "retryCount": 0
        },
        {
          "id": 4,
          "nodeId": "task_1_1",
          "nodeName": "处理任务 #1",
          "nodeType": "simple",
          "status": "running",
          "parentNodeId": 2,
          "childIndex": 1,
          "startedAt": "2024-01-01T10:01:35Z",
          "retryCount": 0
        }
      ],
      "childrenStats": {
        "total": 2,
        "completed": 1,
        "running": 1,
        "failed": 0,
        "pending": 0
      }
    }
  ]
}
```

## 使用方法

### 后端服务层使用

```typescript
import type { IWorkflowInstanceService } from '@stratix/tasks';

// 获取所有顶级节点实例（包含子节点层次结构）
const allNodesResult = await workflowInstanceService.getNodeInstances(workflowInstanceId);
if (allNodesResult.success) {
  const topLevelNodes = allNodesResult.data;
  console.log(`找到 ${topLevelNodes.length} 个顶级节点`);

  // 遍历节点和子节点
  topLevelNodes.forEach(node => {
    console.log(`节点: ${node.nodeName} (${node.status})`);

    if (node.children && node.children.length > 0) {
      console.log(`  包含 ${node.children.length} 个子节点`);
      console.log(`  子节点统计: ${node.childrenStats?.completed}/${node.childrenStats?.total} 已完成`);

      node.children.forEach(child => {
        console.log(`    子节点: ${child.nodeName} (${child.status})`);
      });
    }
  });
}

// 获取特定节点及其子节点
const specificNodeResult = await workflowInstanceService.getNodeInstances(workflowInstanceId, 'data_loop');
if (specificNodeResult.success) {
  const [loopNode] = specificNodeResult.data;
  console.log(`循环节点: ${loopNode.nodeName}`);
  console.log(`子任务数量: ${loopNode.children?.length || 0}`);
  console.log(`完成进度: ${loopNode.childrenStats?.completed}/${loopNode.childrenStats?.total}`);
}
```

### 前端API调用

```typescript
import { workflowApi } from '@/lib/workflow-api';

// 获取所有顶级节点实例列表（包含完整层次结构）
const allNodes = await workflowApi.getNodeInstances(instanceId);

// 获取特定节点及其子节点
const specificNode = await workflowApi.getNodeInstances(instanceId, 'data_loop');
```

### React组件中使用

```tsx
import { useQuery } from '@tanstack/react-query';
import { workflowApi } from '@/lib/workflow-api';

function WorkflowVisualizer({ instanceId }: { instanceId: number }) {
  // 获取节点实例（包含完整层次结构）
  const { data: nodeInstances } = useQuery({
    queryKey: ['workflow-nodes', instanceId],
    queryFn: () => workflowApi.getNodeInstances(instanceId),
    enabled: !!instanceId,
  });

  // 渲染流程图
  const renderNode = (node: any) => {
    return (
      <div key={node.id} className="workflow-node">
        <div className="node-header">
          {node.nodeName} ({node.status})
        </div>

        {/* 如果有子节点，渲染子节点 */}
        {node.children && node.children.length > 0 && (
          <div className="child-nodes">
            <div className="stats">
              子任务: {node.childrenStats?.completed}/{node.childrenStats?.total} 已完成
            </div>
            {node.children.map(renderNode)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="workflow-visualizer">
      {nodeInstances?.map(renderNode)}
    </div>
  );
}
```

## 数据结构说明

### 节点层次关系

- **顶级节点**: `parentNodeId` 为 `null` 的节点
- **子任务节点**: 具有 `parentNodeId` 的节点，通常是循环或并行节点的子任务
- **子任务索引**: `childIndex` 字段表示子任务在父节点中的顺序

### 循环节点特殊字段

- `loopProgress`: 循环执行的进度状态对象
- `loopTotalCount`: 循环总次数
- `loopCompletedCount`: 已完成的循环次数
- `childTasks`: 循环节点下的所有子任务实例

### 节点状态

- `pending`: 待执行
- `running`: 执行中
- `completed`: 已完成
- `failed`: 执行失败
- `failed_retry`: 失败待重试

## 架构设计

### 分层架构

1. **Repository层** (`NodeInstanceRepository`)
   - `findByWorkflowInstanceId()`: 查询工作流实例的所有节点（全量查询时使用）
   - `findSpecificNodeByWorkflowAndNodeId()`: **第一步SQL查询** - 根据实例ID和节点ID获取特定节点
   - `findAllChildNodesByParentInstanceId()`: **第二步SQL查询** - 递归获取指定父节点的所有子节点
   - `findChildNodes()`: 查询父节点的直接子任务节点

2. **Service层** (`WorkflowInstanceService`)
   - `getNodeInstances()`: 统一节点实例获取逻辑
     - **无nodeId参数**：调用`findByWorkflowInstanceId()`获取所有节点，返回顶级节点（内存层面处理）
     - **有nodeId参数**：使用两步SQL查询优化，**不会**调用`findByWorkflowInstanceId()`（纯SQL层面处理）
   - `buildNodeWithChildren()`: 内存层面构建层次结构（全量查询时使用）
   - `buildNodeWithChildrenFromSqlResult()`: SQL查询结果构建层次结构（特定节点查询时使用）

3. **Controller层** (`WorkflowInstanceController`)
   - `GET /nodes`: 统一节点实例查询接口，支持可选nodeId参数

### 数据库设计

基于 `workflow_node_instances` 表：
- `parent_node_id`: 父节点实例ID，用于构建层次关系
- `child_index`: 子节点索引，用于排序
- `node_type`: 节点类型，支持循环节点识别
- `loop_*` 字段: 循环节点的专用字段

### SQL层面优化

当查询特定节点时，采用两步SQL查询策略：

**第一步：获取根节点**
```sql
SELECT * FROM workflow_node_instances
WHERE workflow_instance_id = ? AND node_id = ?
```

**第二步：递归获取所有子节点**
```sql
-- 递归查询所有层级的子节点
-- 使用队列方式避免复杂的CTE递归查询
SELECT * FROM workflow_node_instances
WHERE parent_node_id = ?
ORDER BY child_index, id
```

**优势**：
- **完全避免**获取无关节点数据（不调用`findByWorkflowInstanceId()`）
- 减少网络传输和内存占用
- 提高大型工作流的查询性能
- 保持数据库层面的查询优化
- 真正的按需查询，只获取目标节点及其子节点

## 最佳实践

1. **性能优化**
   - 使用数据库索引优化查询性能
   - 前端使用React Query进行数据缓存
   - 大量子任务时考虑分页加载

2. **错误处理**
   - 服务层统一错误处理和日志记录
   - 前端优雅降级，显示部分可用数据

3. **扩展性**
   - 支持新的节点类型扩展
   - 数据格式向前兼容
   - 支持自定义可视化组件

## 示例代码

完整的使用示例请参考：
- `packages/tasks/examples/loop-node-visualization-example.ts`
- `packages/tasks/src/controllers/__tests__/WorkflowInstanceController.nodeInstances.test.ts`
