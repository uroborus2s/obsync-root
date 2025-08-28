# 工作流可视化功能实现文档

## 概述

本文档描述了在 AgendaEdu 项目中实现的工作流可视化展示功能。该功能支持从外部API获取工作流定义数据，并提供了丰富的可视化展示和交互功能。

## 功能特性

### 1. 数据源支持
- ✅ 支持从外部API获取工作流定义数据
- ✅ API端点：`https://kwps.jlufe.edu.cn/api/workflows/definitions/1`
- ✅ 自动降级到本地API（如果外部API不可用）
- ✅ 实时数据刷新和缓存管理

### 2. 节点类型支持
- ✅ **简单节点 (simple)**: 基础执行节点
- ✅ **任务节点 (task)**: 执行具体业务逻辑的节点
- ✅ **循环节点 (loop)**: 支持循环执行的控制节点
- ✅ **并行节点 (parallel)**: 同时执行多个子节点
- ✅ **子流程节点 (subprocess)**: 嵌套调用其他工作流

### 3. 可视化功能
- ✅ 清晰的流程图展示
- ✅ 节点间连接关系可视化
- ✅ 不同节点类型的视觉区分
- ✅ 实时状态更新（运行中、已完成、失败等）
- ✅ 响应式设计，支持移动端
- ✅ 全屏模式支持

### 4. 交互功能
- ✅ 节点详情查看
- ✅ 工作流实例管理
- ✅ 缩放和导出功能
- ✅ 实时状态监控

## 技术架构

### 核心技术栈
- **前端框架**: React 19 + TypeScript
- **状态管理**: TanStack Query (React Query)
- **UI组件库**: shadcn/ui + Tailwind CSS
- **路由**: TanStack Router
- **图表渲染**: 自定义CSS + SVG（可选Mermaid）

### 项目结构
```
apps/agendaedu-web/src/features/workflows/
├── components/
│   ├── enhanced-workflow-visualizer.tsx      # 增强版可视化组件（Mermaid）
│   ├── simplified-workflow-visualizer.tsx    # 简化版可视化组件（推荐）
│   ├── workflow-instances-table.tsx          # 工作流实例表格
│   ├── workflow-node-detail.tsx              # 节点详情组件
│   └── workflow-definitions-table.tsx        # 工作流定义表格
├── pages/
│   ├── workflow-visualization-demo.tsx       # 功能演示页面
│   ├── workflow-test.tsx                     # 测试页面
│   └── workflow-detail-page.tsx              # 工作流详情页面
└── ...

src/components/
└── mermaid-renderer.tsx                      # Mermaid渲染组件

src/lib/
└── workflow-api.ts                           # 工作流API服务
```

## API集成

### 外部API接口
```typescript
// 获取工作流定义
GET https://kwps.jlufe.edu.cn/api/workflows/definitions/1

// 响应格式
{
  "id": 1,
  "name": "工作流名称",
  "version": "1.0.0", 
  "description": "工作流描述",
  "definition": {
    "nodes": [
      {
        "nodeId": "start",
        "nodeName": "开始",
        "nodeType": "simple",
        "maxRetries": 0,
        "dependsOn": []
      }
      // ... 更多节点
    ],
    "connections": [
      {
        "id": "conn1",
        "source": "start", 
        "target": "task1",
        "label": "连接标签"
      }
      // ... 更多连接
    ]
  }
}
```

### API服务实现
```typescript
// 支持外部API获取
async getWorkflowDefinitionById(id: number): Promise<WorkflowDefinition> {
  // 优先尝试外部API
  if (id === 1) {
    try {
      const externalResponse = await fetch(
        'https://kwps.jlufe.edu.cn/api/workflows/definitions/1'
      )
      if (externalResponse.ok) {
        return await externalResponse.json()
      }
    } catch (error) {
      console.warn('External API failed, falling back to local API')
    }
  }
  
  // 降级到本地API
  return await this.localApiCall(id)
}
```

## 组件使用

### 1. 简化工作流可视化组件
```tsx
import { SimplifiedWorkflowVisualizer } from '@/features/workflows/components/simplified-workflow-visualizer'

<SimplifiedWorkflowVisualizer 
  workflowDefinitionId={1}
  instanceId={123}  // 可选，用于显示实例状态
  showControls={true}
  className="custom-class"
/>
```

### 2. 工作流实例表格
```tsx
import { WorkflowInstancesTable } from '@/features/workflows/components/workflow-instances-table'

<WorkflowInstancesTable 
  workflowDefinitionId={1}
  showActions={true}
  pageSize={10}
/>
```

### 3. 节点详情组件
```tsx
import { WorkflowNodeDetail } from '@/features/workflows/components/workflow-node-detail'

<WorkflowNodeDetail 
  node={nodeData}
  instance={instanceData}
  executionDetails={executionData}
/>
```

## 页面路由

### 可用页面
- `/workflows/test` - 功能测试页面
- `/workflows/visualization-demo` - 完整演示页面
- `/workflows/definitions` - 工作流定义管理
- `/workflows/instances` - 工作流实例管理

## 开发指南

### 1. 添加新的节点类型
```typescript
// 1. 更新类型定义
type NodeType = 'simple' | 'task' | 'loop' | 'parallel' | 'subprocess' | 'new-type'

// 2. 添加图标映射
const getNodeIcon = (nodeType: string): string => {
  switch (nodeType) {
    case 'new-type':
      return '🆕'
    // ... 其他类型
  }
}

// 3. 添加样式映射
const getNodeStyle = (nodeType: string, status?: string) => {
  // 添加新类型的样式逻辑
}
```

### 2. 扩展API支持
```typescript
// 在 workflow-api.ts 中添加新的API方法
async getWorkflowExecutionLogs(instanceId: number) {
  // 实现获取执行日志的逻辑
}
```

### 3. 自定义可视化样式
```css
/* 在组件中添加自定义样式 */
.workflow-node-custom {
  @apply bg-purple-100 border-purple-500 text-purple-800;
}
```

## 测试和验证

### 1. 功能测试
访问 `/workflows/test` 页面进行功能测试：
- 测试外部API数据获取
- 验证不同节点类型的显示
- 检查响应式设计
- 测试交互功能

### 2. API测试
```bash
# 测试外部API
curl -X GET "https://kwps.jlufe.edu.cn/api/workflows/definitions/1"

# 验证响应格式
{
  "id": 1,
  "name": "...",
  "definition": {
    "nodes": [...],
    "connections": [...]
  }
}
```

## 部署注意事项

### 1. 环境配置
- 确保外部API的网络访问权限
- 配置CORS策略（如果需要）
- 设置适当的API超时时间

### 2. 性能优化
- 启用React Query缓存
- 实现适当的数据刷新策略
- 优化大型工作流的渲染性能

### 3. 错误处理
- 外部API失败时的降级策略
- 网络错误的用户友好提示
- 数据格式验证和错误恢复

## 未来扩展

### 计划中的功能
- [ ] 支持更多图表渲染库（D3.js、Cytoscape等）
- [ ] 工作流编辑器功能
- [ ] 实时协作和评论功能
- [ ] 性能监控和分析
- [ ] 移动端原生应用支持

### 技术改进
- [ ] 使用Web Workers进行大数据处理
- [ ] 实现虚拟滚动优化性能
- [ ] 添加单元测试和E2E测试
- [ ] 支持主题定制和国际化

## 联系和支持

如有问题或建议，请联系开发团队或在项目仓库中提交Issue。
