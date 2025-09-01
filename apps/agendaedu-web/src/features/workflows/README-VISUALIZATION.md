# 工作流实例可视化功能

## 📋 功能概述

基于工作流定义(workflow definition)来展示工作流实例(workflow instances)的执行状态和进度的可视化功能。

## 🎯 核心特性

### 1. 工作流定义展示层
- ✅ 渲染工作流定义的完整流程图
- ✅ 显示所有定义的节点(nodes)和连接线(edges)
- ✅ 支持多种节点类型：
  - 开始节点 (start)
  - 任务节点 (task)
  - 决策节点 (decision)
  - 循环节点 (loop)
  - 并行节点 (parallel)
  - 子流程节点 (subprocess)
  - 结束节点 (end)

### 2. 工作流实例状态叠加层
- ✅ 在工作流定义节点上叠加显示对应的工作流实例执行状态
- ✅ 支持多种执行状态：
  - 运行中 (running) - 蓝色动态效果
  - 成功 (success) - 绿色成功图标
  - 失败 (failed) - 红色错误图标
  - 等待中 (pending) - 灰色等待图标
  - 跳过 (skipped) - 黄色警告图标
  - 已取消 (cancelled) - 灰色取消图标

### 3. 循环节点特殊处理
- ✅ 循环节点显示循环执行的汇总状态
- ✅ 显示循环进度 (如：第3次/共5次)
- ✅ 点击循环节点弹出详细信息：
  - 循环任务的完整列表
  - 每个循环迭代的执行状态
  - 循环次数统计
  - 每次迭代的开始时间、结束时间、执行结果

### 4. 交互功能
- ✅ 节点悬停显示状态信息
- ✅ 点击节点显示详细执行信息
- ✅ 支持缩放和拖拽操作
- ✅ 实时刷新显示最新执行状态
- ✅ 全屏模式支持
- ✅ 小地图导航
- ✅ 状态图例显示

### 5. 数据源集成
- ✅ 从 workflow_definitions 表获取工作流定义结构
- ✅ 从 workflow_instances 表获取工作流实例执行数据
- ✅ 从 workflow_executions 表获取节点级别的执行状态
- ✅ 支持自动轮询更新 (默认5秒间隔)

## 🏗️ 技术架构

### 前端组件结构
```
src/features/workflows/
├── components/
│   ├── react-flow-workflow-visualizer.tsx    # 基于React Flow的可视化组件
│   ├── workflow-instance-visualizer.tsx      # 基础SVG可视化组件
│   └── workflow-instances-table.tsx          # 实例列表表格
├── pages/
│   ├── workflow-instance-detail.tsx          # 实例详情页面
│   └── workflow-instances-page.tsx           # 实例列表页面
└── README-VISUALIZATION.md                   # 本文档
```

### 核心技术栈
- **React Flow**: 流程图可视化库，提供拖拽、缩放、小地图等功能
- **React Query**: 数据获取和缓存管理
- **Tailwind CSS**: 样式系统
- **Lucide React**: 图标库
- **Sonner**: 消息提示

### API接口
```typescript
// 获取工作流实例详情
GET /api/workflows/instances/{instanceId}

// 获取工作流定义
GET /api/workflows/definitions/{definitionId}

// 获取节点执行状态
GET /api/workflows/instances/{instanceId}/executions

// 获取循环节点详情
GET /api/workflows/instances/{instanceId}/loops

// 获取节点执行日志
GET /api/workflows/instances/{instanceId}/nodes/{nodeId}/logs
```

## 🚀 使用方法

### 1. 访问工作流实例列表
```
/workflows/instances
```

### 2. 查看实例详情和可视化
```
/workflows/instances/{instanceId}
```

### 3. 组件使用示例
```tsx
import { ReactFlowWorkflowVisualizer } from '@/features/workflows/components/react-flow-workflow-visualizer'

<ReactFlowWorkflowVisualizer
  instanceId={123}
  showControls={true}
  autoRefresh={true}
  refreshInterval={5000}
/>
```

## 🎨 视觉设计

### 节点状态颜色
- **运行中**: 蓝色边框 + 蓝色背景 + 动画效果
- **成功**: 绿色边框 + 绿色背景
- **失败**: 红色边框 + 红色背景
- **等待**: 灰色边框 + 灰色背景
- **跳过**: 黄色边框 + 黄色背景

### 节点类型图标
- **开始节点**: 播放图标 (Play)
- **结束节点**: 完成图标 (CheckCircle)
- **循环节点**: 循环图标 (RotateCcw)
- **决策节点**: 菱形图标
- **并行节点**: 圆形图标
- **任务节点**: 方形图标

### 布局特性
- **自动布局**: 网格布局算法
- **响应式设计**: 支持不同屏幕尺寸
- **可拖拽**: 节点可以自由拖拽调整位置
- **缩放控制**: 支持放大缩小操作

## 📊 性能优化

### 数据更新策略
- **增量更新**: 只更新变化的节点状态
- **智能轮询**: 根据实例状态调整轮询频率
- **缓存机制**: React Query提供数据缓存

### 渲染优化
- **虚拟化**: 大型工作流的节点虚拟化渲染
- **懒加载**: 详情信息按需加载
- **防抖处理**: 用户交互的防抖处理

## 🔧 配置选项

### 组件属性
```typescript
interface ReactFlowWorkflowVisualizerProps {
  instanceId: number              // 工作流实例ID
  className?: string              // 自定义样式类
  showControls?: boolean          // 是否显示控制按钮
  autoRefresh?: boolean           // 是否自动刷新
  refreshInterval?: number        // 刷新间隔(毫秒)
}
```

### 自定义主题
支持通过CSS变量自定义颜色主题：
```css
:root {
  --workflow-node-running: #3b82f6;
  --workflow-node-success: #10b981;
  --workflow-node-failed: #ef4444;
  --workflow-node-pending: #6b7280;
}
```

## 🐛 故障排除

### 常见问题
1. **节点不显示状态**: 检查API接口是否正常返回执行状态数据
2. **布局混乱**: 确保工作流定义中包含节点位置信息
3. **性能问题**: 对于大型工作流，考虑启用虚拟化渲染

### 调试方法
- 打开浏览器开发者工具查看网络请求
- 检查React Query的缓存状态
- 查看控制台错误信息

## 🔮 未来规划

### 待实现功能
- [ ] WebSocket实时更新
- [ ] 工作流执行历史回放
- [ ] 自定义节点样式
- [ ] 导出为图片功能
- [ ] 工作流性能分析
- [ ] 多实例对比视图

### 性能改进
- [ ] 大型工作流的虚拟化渲染
- [ ] 更智能的布局算法
- [ ] 更细粒度的状态更新

## 📝 更新日志

### v1.0.0 (2025-09-01)
- ✅ 实现基础工作流可视化功能
- ✅ 支持多种节点类型和状态
- ✅ 集成React Flow交互功能
- ✅ 实现循环节点特殊处理
- ✅ 添加实时状态更新
- ✅ 完成详情页面集成
