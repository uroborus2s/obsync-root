# Changelog

## [0.0.2] - 2024-01-XX

### ✨ 新增功能

- **任务重试机制**: 为失败的任务添加了完整的重试功能
  - 支持配置最大重试次数和重试间隔
  - 自动跟踪重试计数和重试历史
  - 新增 `TaskStatusUtils.canRetry()` 方法检查任务是否可重试
  - 新增 `TaskNode.retry()` 方法重试失败的任务
  - 新增 `TaskTreeService.retryTask()` 服务层重试方法
  - 支持重试时可选的进度重置
  - 在任务元数据中记录重试历史和统计信息

### 🔧 改进

- 扩展了 `TaskMetadata` 接口，添加重试相关字段
- 添加了 `TaskStatusChangeEvent.RETRIED` 事件类型
- 更新了 `TaskData` 接口，添加 `executorConfig` 字段
- 改进了任务执行器配置的存储和访问方式

### 📚 文档

- 在 README.md 中添加了详细的任务重试功能文档
- 新增 `examples/retry-example.ts` 示例文件
- 提供了完整的 API 参考和使用指南

### 🏗️ 内部改进

- 优化了 TaskNode 的类型定义，支持可选的 executorConfig
- 改进了状态变更处理逻辑，支持重试事件

## [0.0.1] - 2024-01-01

# @stratix/tasks

## 0.0.1

### Patch Changes

- 68fc729: 修改测试版本
- 494005d: 发布测试版本
- Updated dependencies [5950d4b]
- Updated dependencies [3264d70]
- Updated dependencies [68fc729]
- Updated dependencies [494005d]
  - @stratix/utils@0.0.1
  - @stratix/database@0.0.1
  - @stratix/core@0.0.1

## 0.0.1-beta.2

### Patch Changes

- Updated dependencies
  - @stratix/utils@0.0.1-beta.5
  - @stratix/core@0.0.1-beta.3
  - @stratix/database@0.0.1-beta.2

## 0.0.1-beta.1

### Patch Changes

- 修改测试版本
- Updated dependencies
  - @stratix/database@0.0.1-beta.1
  - @stratix/utils@0.0.1-beta.4
  - @stratix/core@0.0.1-beta.2

## 0.0.1-beta.0

### Patch Changes

- 发布测试版本
- Updated dependencies
  - @stratix/database@0.0.1-beta.0
  - @stratix/utils@0.0.1-beta.0
  - @stratix/core@0.0.1-beta.0
