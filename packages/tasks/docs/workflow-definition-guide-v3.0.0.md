# 工作流定义指南 v3.0.0

## 概述

本指南基于 Stratix Tasks 插件 v3.0.0 的分布式工作流引擎架构，提供完整的工作流定义 JSON 格式规范和最佳实践。新架构支持分布式执行、断点续传、故障转移等企业级特性。

### 核心特性
- **分布式执行**：支持多引擎实例协同执行工作流
- **断点续传**：工作流可从中断点恢复执行
- **故障转移**：自动检测故障并转移到健康引擎
- **负载均衡**：智能分配任务到最优引擎实例
- **资源管理**：精确控制CPU、内存等资源使用

### 架构优势
- **高可用性**：多引擎实例确保服务连续性
- **水平扩展**：可动态增减引擎实例
- **性能优化**：并行执行和智能调度提升效率
- **监控完善**：全链路监控和指标收集

## 数据库表结构

### workflow_definitions 表字段

```sql
CREATE TABLE workflow_definitions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,                    -- 工作流名称
    version VARCHAR(50) NOT NULL,                  -- 版本号
    display_name VARCHAR(255) NULL,                -- 显示名称
    description TEXT NULL,                         -- 描述
    definition JSON NOT NULL,                      -- 工作流定义JSON
    category VARCHAR(100) NULL,                    -- 分类
    tags JSON NULL,                                -- 标签列表
    status ENUM('draft', 'active', 'deprecated', 'archived') NOT NULL DEFAULT 'draft',
    is_active BOOLEAN NOT NULL DEFAULT FALSE,     -- 是否为活跃版本
    timeout_seconds INT NULL,                      -- 超时时间（秒）
    max_retries INT NOT NULL DEFAULT 3,           -- 最大重试次数
    retry_delay_seconds INT NOT NULL DEFAULT 60,  -- 重试延迟（秒）
    created_by VARCHAR(255) NULL,                 -- 创建者
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## 工作流定义 JSON 格式规范

### 基础结构

```json
{
  "id": "workflow-unique-id",
  "name": "工作流显示名称",
  "description": "工作流描述",
  "version": "1.0.0",
  "metadata": {
    "author": "创建者",
    "category": "分类",
    "tags": ["tag1", "tag2"],
    "documentation": "文档链接"
  },
  "config": {
    "timeout": 3600000,
    "retries": 3,
    "retryDelay": 60000,
    "distributed": {
      "enabled": true,
      "assignmentStrategy": "load-balanced",
      "maxConcurrency": 10
    },
    "monitoring": {
      "enabled": true,
      "metricsInterval": 30000,
      "logLevel": "info"
    },
    "recovery": {
      "enabled": true,
      "checkpointInterval": 60000,
      "maxRecoveryAttempts": 3
    }
  },
  "inputs": {
    "param1": {
      "type": "string",
      "required": true,
      "description": "参数描述",
      "default": "默认值"
    }
  },
  "outputs": {
    "result": {
      "type": "object",
      "description": "输出结果"
    }
  },
  "nodes": [
    // 节点定义数组
  ]
}
```

## 节点类型详解

### 1. Task 节点（任务节点）

```json
{
  "id": "task-node-id",
  "name": "任务节点名称",
  "type": "task",
  "executor": "executorName",
  "config": {
    "param1": "value1",
    "param2": "${input.param2}",
    "timeout": 300000,
    "retries": 3
  },
  "dependsOn": ["previous-node-id"],
  "distributed": {
    "assignmentStrategy": "capability",
    "requiredCapabilities": ["executorName"],
    "preferredEngine": "engine-id"
  },
  "errorHandling": {
    "strategy": "retry",
    "maxRetries": 3,
    "retryDelay": 5000,
    "onFailure": "continue"
  }
}
```

### 2. Loop 节点（循环节点）

#### 动态循环（Dynamic Loop）
```json
{
  "id": "dynamic-loop-id",
  "name": "动态循环处理",
  "type": "loop",
  "loopType": "dynamic",
  "sourceExpression": "nodes.fetch-data.output.items",
  "maxConcurrency": 5,
  "errorHandling": "continue",
  "joinType": "all",
  "dependsOn": ["fetch-data"],
  "distributed": {
    "enabled": true,
    "childTaskDistribution": "auto"
  },
  "nodes": [
    {
      "id": "process-item",
      "name": "处理单个项目",
      "type": "task",
      "executor": "processItem",
      "config": {
        "item": "${$item}",
        "index": "${$index}",
        "total": "${$total}"
      }
    }
  ]
}
```

#### forEach 循环
```json
{
  "id": "foreach-loop-id",
  "name": "遍历处理",
  "type": "loop",
  "loopType": "forEach",
  "sourceExpression": "input.itemList",
  "maxConcurrency": 3,
  "nodes": [
    // 循环体节点
  ]
}
```

#### while 循环
```json
{
  "id": "while-loop-id",
  "name": "条件循环",
  "type": "loop",
  "loopType": "while",
  "conditionExpression": "nodes.check-status.output.hasMore === true",
  "maxIterations": 100,
  "nodes": [
    // 循环体节点
  ]
}
```

#### times 循环
```json
{
  "id": "times-loop-id",
  "name": "固定次数循环",
  "type": "loop",
  "loopType": "times",
  "count": 10,
  "nodes": [
    // 循环体节点
  ]
}
```

### 3. Parallel 节点（并行节点）

```json
{
  "id": "parallel-tasks",
  "name": "并行执行任务",
  "type": "parallel",
  "maxConcurrency": 5,
  "errorHandling": "continue",
  "joinType": "all",
  "distributed": {
    "enabled": true,
    "branchDistribution": "round-robin"
  },
  "branches": [
    {
      "id": "branch-1",
      "name": "分支1",
      "nodes": [
        {
          "id": "task-1",
          "type": "task",
          "executor": "executor1"
        }
      ]
    },
    {
      "id": "branch-2",
      "name": "分支2",
      "nodes": [
        {
          "id": "task-2",
          "type": "task",
          "executor": "executor2"
        }
      ]
    }
  ]
}
```

### 4. Condition 节点（条件节点）

```json
{
  "id": "condition-node",
  "name": "条件判断",
  "type": "condition",
  "condition": "nodes.check-data.output.status === 'success'",
  "distributed": {
    "evaluateOnAssignedEngine": true
  },
  "branches": {
    "true": {
      "id": "success-branch",
      "name": "成功分支",
      "nodes": [
        {
          "id": "success-task",
          "type": "task",
          "executor": "handleSuccess"
        }
      ]
    },
    "false": {
      "id": "failure-branch",
      "name": "失败分支",
      "nodes": [
        {
          "id": "failure-task",
          "type": "task",
          "executor": "handleFailure"
        }
      ]
    }
  }
}
```

### 5. Subprocess 节点（子工作流节点）

子工作流节点允许在当前工作流中嵌套执行另一个完整的工作流，实现工作流的模块化和复用。

#### 基础配置

```json
{
  "id": "subprocess-node",
  "name": "子工作流",
  "type": "subprocess",
  "workflowName": "sub-workflow-name",
  "version": "1.0.0",
  "inputMapping": {
    "subParam1": "nodes.previous-task.output.data",
    "subParam2": "input.globalParam"
  },
  "outputMapping": {
    "result": "output.processedData",
    "status": "output.status"
  },
  "distributed": {
    "inheritParentStrategy": false,
    "assignmentStrategy": "affinity"
  },
  "timeout": 1800000
}
```

#### 工作流定义获取机制详解

**1. 从工作流定义库获取（推荐）**
```json
{
  "type": "subprocess",
  "id": "external_subprocess",
  "workflowSource": {
    "type": "repository",           // repository, inline, url
    "repository": "workflow-registry",
    "workflowName": "data-validation-workflow",
    "version": "2.1.0",            // 具体版本号
    "versionStrategy": "exact",     // exact, latest, compatible
    "cachePolicy": {
      "enabled": true,
      "ttl": 3600000,              // 缓存时间(ms)
      "refreshStrategy": "lazy"     // lazy, eager, background
    }
  }
}
```

**2. 内嵌工作流定义**
```json
{
  "type": "subprocess",
  "id": "inline_subprocess",
  "workflowSource": {
    "type": "inline",
    "definition": {
      "id": "inline-validation",
      "name": "内嵌验证工作流",
      "nodes": [
        {
          "id": "validate-step",
          "type": "task",
          "executor": "validator",
          "config": {
            "data": "${input.data}"
          }
        }
      ]
    }
  }
}
```

**3. 从URL获取**
```json
{
  "type": "subprocess",
  "id": "url_subprocess",
  "workflowSource": {
    "type": "url",
    "url": "https://workflow-registry.example.com/workflows/validation/v2.1.0",
    "authentication": {
      "type": "bearer",
      "token": "${context.apiToken}"
    },
    "retryPolicy": {
      "maxRetries": 3,
      "retryDelay": 5000
    }
  }
}
```

#### 参数传递机制详解

**1. inputMapping 详细配置**
```json
{
  "inputMapping": {
    // 直接值传递
    "staticParam": "fixed-value",

    // 表达式计算
    "calculatedParam": "${nodes.calc.output.result * 2}",

    // 对象映射
    "userInfo": {
      "id": "${input.userId}",
      "name": "${input.userName}",
      "email": "${nodes.fetch-user.output.email}"
    },

    // 数组映射
    "itemList": "${nodes.fetch-items.output.items}",

    // 条件映射
    "processMode": "${input.isProduction ? 'prod' : 'dev'}",

    // 函数调用
    "timestamp": "${Date.now()}",
    "uuid": "${generateUUID()}",

    // 类型转换
    "numericValue": "${parseInt(input.stringValue)}",
    "jsonData": "${JSON.parse(nodes.fetch.output.jsonString)}"
  }
}
```

**2. outputMapping 详细配置**
```json
{
  "outputMapping": {
    // 简单映射
    "result": "output.processedData",

    // 重命名映射
    "finalStatus": "output.status",
    "errorDetails": "output.errors",

    // 嵌套对象提取
    "userId": "output.user.id",
    "userMetrics": "output.user.metrics",

    // 数组元素提取
    "firstItem": "output.items[0]",
    "lastItem": "output.items[-1]",

    // 聚合计算
    "totalCount": "output.items.length",
    "successRate": "output.successCount / output.totalCount",

    // 条件输出
    "status": "${output.errors.length > 0 ? 'failed' : 'success'}",

    // 默认值处理
    "optionalData": "${output.data || null}"
  }
}
```

**3. 数据转换规则**
```json
{
  "dataTransformation": {
    "enabled": true,
    "rules": [
      {
        "field": "timestamp",
        "type": "date",
        "format": "ISO8601",
        "timezone": "UTC"
      },
      {
        "field": "amount",
        "type": "number",
        "precision": 2,
        "currency": "USD"
      },
      {
        "field": "tags",
        "type": "array",
        "elementType": "string",
        "separator": ","
      }
    ],
    "validation": {
      "enabled": true,
      "schema": "json-schema",
      "strictMode": false
    }
  }
}
```

#### 生命周期管理详解

**1. 子工作流创建阶段**
```json
{
  "lifecycle": {
    "creation": {
      "strategy": "lazy",              // lazy, eager, on-demand
      "preValidation": true,           // 预验证工作流定义
      "resourcePreallocation": false,  // 是否预分配资源
      "initializationTimeout": 30000,  // 初始化超时时间
      "dependencyCheck": true          // 检查依赖的执行器是否可用
    }
  }
}
```

**2. 子工作流执行阶段**
```json
{
  "lifecycle": {
    "execution": {
      "isolationLevel": "process",     // thread, process, container
      "resourceLimits": {
        "cpu": "2000m",
        "memory": "4Gi",
        "disk": "10Gi",
        "networkBandwidth": "100MB/s"
      },
      "monitoring": {
        "enabled": true,
        "metricsCollection": true,
        "logAggregation": true,
        "healthChecks": {
          "interval": 30000,
          "timeout": 10000,
          "failureThreshold": 3
        }
      }
    }
  }
}
```

**3. 子工作流监控阶段**
```json
{
  "lifecycle": {
    "monitoring": {
      "parentNotification": {
        "enabled": true,
        "events": ["started", "progress", "completed", "failed"],
        "progressInterval": 10000,
        "includeMetrics": true
      },
      "cascadingAlerts": {
        "enabled": true,
        "alertLevels": ["warning", "error", "critical"],
        "escalationPolicy": "immediate"
      },
      "performanceTracking": {
        "enabled": true,
        "metrics": ["duration", "throughput", "errorRate", "resourceUsage"],
        "sampling": {
          "strategy": "adaptive",
          "rate": 0.1
        }
      }
    }
  }
}
```

**4. 子工作流错误处理阶段**
```json
{
  "lifecycle": {
    "errorHandling": {
      "strategy": "bubble-up",         // bubble-up, contain, transform
      "retryPolicy": {
        "enabled": true,
        "maxRetries": 3,
        "retryDelay": 5000,
        "backoffStrategy": "exponential"
      },
      "fallbackWorkflow": {
        "enabled": true,
        "workflowName": "error-recovery-workflow",
        "inputMapping": {
          "originalInput": "${input}",
          "errorDetails": "${error}",
          "parentContext": "${context}"
        }
      },
      "compensation": {
        "enabled": true,
        "compensationWorkflow": "rollback-workflow",
        "autoTrigger": true
      }
    }
  }
}
```

**5. 子工作流清理阶段**
```json
{
  "lifecycle": {
    "cleanup": {
      "strategy": "automatic",         // automatic, manual, scheduled
      "resourceCleanup": {
        "enabled": true,
        "cleanupDelay": 60000,         // 清理延迟时间
        "forceCleanup": true           // 强制清理
      },
      "dataRetention": {
        "enabled": true,
        "retentionPeriod": 86400000,   // 24小时
        "archiveStrategy": "compress"   // compress, delete, archive
      },
      "logRetention": {
        "enabled": true,
        "retentionPeriod": 604800000,  // 7天
        "logLevel": "info"
      }
    }
  }
}
```

#### 完整的子工作流配置示例

```json
{
  "type": "subprocess",
  "id": "comprehensive_subprocess",
  "name": "综合子工作流示例",
  "workflowSource": {
    "type": "repository",
    "workflowName": "data-processing-pipeline",
    "version": "3.2.1",
    "versionStrategy": "exact"
  },
  "inputMapping": {
    "sourceData": "${nodes.fetch-data.output.data}",
    "processingConfig": {
      "batchSize": "${input.batchSize || 1000}",
      "parallelism": "${input.parallelism || 4}",
      "outputFormat": "json"
    },
    "metadata": {
      "parentWorkflowId": "${context.workflowId}",
      "parentInstanceId": "${context.instanceId}",
      "executionTimestamp": "${Date.now()}"
    }
  },
  "outputMapping": {
    "processedData": "output.result.data",
    "metrics": {
      "processingTime": "output.metrics.duration",
      "itemsProcessed": "output.metrics.itemCount",
      "errorCount": "output.metrics.errors.length"
    },
    "status": "${output.errors.length > 0 ? 'partial_success' : 'success'}"
  },
  "distributed": {
    "inheritParentStrategy": false,
    "assignmentStrategy": "affinity",
    "affinityRules": {
      "dataAffinity": ["${input.dataLocation}"],
      "engineAffinity": ["${context.preferredEngine}"]
    }
  },
  "lifecycle": {
    "creation": {
      "strategy": "lazy",
      "preValidation": true,
      "initializationTimeout": 30000
    },
    "execution": {
      "isolationLevel": "process",
      "resourceLimits": {
        "cpu": "4000m",
        "memory": "8Gi"
      }
    },
    "monitoring": {
      "parentNotification": {
        "enabled": true,
        "progressInterval": 15000
      }
    },
    "errorHandling": {
      "strategy": "bubble-up",
      "retryPolicy": {
        "maxRetries": 2,
        "retryDelay": 10000
      }
    },
    "cleanup": {
      "strategy": "automatic",
      "resourceCleanup": {
        "cleanupDelay": 30000
      }
    }
  },
  "timeout": 3600000,
  "priority": "high"
}
```

## 分布式执行配置详细说明

### distributed 标签配置

分布式执行是 v3.0.0 的核心特性，允许工作流在多个引擎实例间分布执行，提供高可用性和水平扩展能力。

#### 基础配置参数

```json
{
  "distributed": {
    "enabled": true,                    // 必填，是否启用分布式执行
    "assignmentStrategy": "load-balanced", // 必填，分配策略
    "maxConcurrency": 10,               // 可选，最大并发数，默认：5
    "requiredCapabilities": ["executor1"], // 可选，必需能力列表
    "preferredEngine": "engine-id",     // 可选，首选引擎实例
    "failoverStrategy": "automatic",    // 可选，故障转移策略，默认：automatic
    "lockTimeout": 300000,              // 可选，锁超时时间(ms)，默认：300000
    "heartbeatInterval": 30000,         // 可选，心跳间隔(ms)，默认：30000
    "loadBalanceWeight": 1.0,           // 可选，负载均衡权重，默认：1.0
    "affinityRules": {                  // 可选，亲和性规则
      "nodeAffinity": ["node-id-1"],
      "engineAffinity": ["engine-id-1"],
      "antiAffinity": ["conflicting-task"]
    }
  }
}
```

#### 启用条件和性能影响

**启用条件**：
- 至少有2个活跃的引擎实例
- 工作流包含可分布执行的节点
- 数据库支持分布式锁机制

**性能影响**：
- **正面影响**：并行执行提升吞吐量，故障转移提高可用性
- **负面影响**：网络通信开销，锁竞争可能导致延迟
- **建议**：CPU密集型任务适合分布式，I/O密集型任务需谨慎评估

#### assignmentStrategy 分配策略详解

分配策略决定了工作流节点如何在多个引擎实例间分配执行，是分布式执行的核心机制。

##### 1. load-balanced（负载均衡）
**算法原理**：基于引擎实例的当前负载（CPU、内存、活跃任务数）动态分配任务。

**适用场景**：
- 引擎实例性能相近的同构环境
- 任务执行时间相对均匀
- 需要最大化资源利用率

**配置参数**：
```json
{
  "distributed": {
    "assignmentStrategy": "load-balanced",
    "loadBalanceWeight": 1.0,           // 权重系数，默认：1.0
    "loadMetrics": ["cpu", "memory", "activeWorkflows"], // 负载指标
    "rebalanceInterval": 60000,         // 重平衡间隔(ms)，默认：60000
    "maxLoadThreshold": 0.8             // 最大负载阈值，默认：0.8
  }
}
```

**算法实现**：
1. 收集所有活跃引擎的负载指标
2. 计算综合负载分数：`score = (cpu * 0.4 + memory * 0.3 + activeWorkflows * 0.3) * weight`
3. 选择负载分数最低的引擎实例

##### 2. round-robin（轮询）
**算法原理**：按照固定顺序循环分配任务到各个引擎实例。

**适用场景**：
- 任务执行时间相对固定
- 引擎实例性能相近
- 需要简单可预测的分配逻辑

**配置参数**：
```json
{
  "distributed": {
    "assignmentStrategy": "round-robin",
    "startIndex": 0,                    // 起始索引，默认：0
    "skipUnhealthyEngines": true        // 跳过不健康引擎，默认：true
  }
}
```

##### 3. affinity（亲和性）
**算法原理**：基于节点、数据或引擎的亲和性规则分配任务，优化数据局部性和执行效率。

**适用场景**：
- 有状态的工作流，需要数据局部性
- 特定节点需要在同一引擎执行
- 需要避免某些任务同时执行

**配置参数**：
```json
{
  "distributed": {
    "assignmentStrategy": "affinity",
    "affinityRules": {
      "nodeAffinity": ["related-node-1", "related-node-2"],     // 节点亲和性
      "engineAffinity": ["preferred-engine-id"],                // 引擎亲和性
      "dataAffinity": ["dataset-1", "dataset-2"],              // 数据亲和性
      "antiAffinity": ["conflicting-task"],                     // 反亲和性
      "affinityWeight": 100,                                     // 亲和性权重
      "fallbackStrategy": "load-balanced"                       // 回退策略
    }
  }
}
```

##### 4. random（随机）
**算法原理**：随机选择可用的引擎实例执行任务。

**适用场景**：
- 测试和开发环境
- 任务间无依赖关系
- 需要避免热点问题

**配置参数**：
```json
{
  "distributed": {
    "assignmentStrategy": "random",
    "seed": 12345,                      // 随机种子，可选
    "excludeEngines": ["engine-id-1"]   // 排除的引擎列表
  }
}
```

##### 5. hash（哈希）
**算法原理**：基于工作流ID、节点ID或自定义键的哈希值分配任务，确保相同键的任务总是分配到同一引擎。

**适用场景**：
- 需要会话亲和性的有状态任务
- 数据分片处理
- 缓存优化场景

**配置参数**：
```json
{
  "distributed": {
    "assignmentStrategy": "hash",
    "hashKey": "workflowInstanceId",    // 哈希键：workflowInstanceId, nodeId, custom
    "customHashKey": "${input.userId}", // 自定义哈希键表达式
    "hashAlgorithm": "md5",             // 哈希算法：md5, sha1, sha256
    "consistentHashing": true           // 一致性哈希，默认：false
  }
}
```

#### errorHandling 错误处理配置详解

错误处理是分布式执行中的关键机制，确保系统的健壮性和可恢复性。

##### 错误处理策略

```json
{
  "errorHandling": {
    "strategy": "retry",                // 必填，错误处理策略
    "maxRetries": 3,                   // 可选，最大重试次数，默认：3
    "retryDelay": 5000,                // 可选，重试延迟(ms)，默认：5000
    "backoffStrategy": "exponential",   // 可选，退避策略，默认：exponential
    "maxRetryDelay": 300000,           // 可选，最大重试延迟(ms)，默认：300000
    "onFailure": "continue",           // 可选，失败后行为，默认：continue
    "failoverEnabled": true,           // 可选，是否启用故障转移，默认：true
    "circuitBreaker": {                // 可选，熔断器配置
      "enabled": true,
      "failureThreshold": 5,
      "timeout": 60000,
      "halfOpenMaxCalls": 3
    }
  }
}
```

##### 策略详解

**1. retry（重试策略）**
- 在当前引擎实例重试失败的任务
- 适用于临时性错误（网络抖动、资源不足）

**2. failover（故障转移策略）**
- 将失败任务转移到其他健康的引擎实例
- 适用于引擎实例故障或持续性错误

**3. circuit-breaker（熔断器策略）**
- 当错误率超过阈值时暂停任务执行
- 适用于下游服务不可用的场景

**4. compensate（补偿策略）**
- 执行预定义的补偿操作回滚已完成的步骤
- 适用于需要事务一致性的业务场景

##### 退避策略

**1. linear（线性退避）**
```json
{
  "backoffStrategy": "linear",
  "retryDelay": 5000,        // 每次重试延迟固定5秒
  "maxRetryDelay": 60000
}
```

**2. exponential（指数退避）**
```json
{
  "backoffStrategy": "exponential",
  "retryDelay": 1000,        // 初始延迟1秒
  "backoffMultiplier": 2.0,  // 每次延迟翻倍
  "maxRetryDelay": 60000     // 最大延迟60秒
}
```

**3. jitter（抖动退避）**
```json
{
  "backoffStrategy": "jitter",
  "retryDelay": 5000,
  "jitterRange": 0.1         // 10%的随机抖动
}
```

## Loop 节点深度解析

Loop 节点是工作流中实现循环逻辑的核心组件，支持多种循环类型和复杂的迭代控制。

### nodes 数组结构详解

Loop 节点的 `nodes` 属性是一个数组，每个数组元素代表循环体中的一个任务节点。这种设计有以下优势：

1. **顺序执行保证**：数组中的节点按索引顺序依次执行
2. **依赖关系清晰**：后续节点可以依赖前面节点的输出
3. **灵活的循环体**：支持复杂的多步骤循环逻辑
4. **统一的节点模型**：循环体内的节点与普通节点使用相同的定义格式

```json
{
  "type": "loop",
  "id": "process_users",
  "loopType": "forEach",
  "sourceExpression": "${input.users}",
  "nodes": [
    {
      "type": "task",
      "id": "validate_user",
      "executor": "userValidator",
      "config": {
        "userId": "${$item.id}"
      }
    },
    {
      "type": "task",
      "id": "process_user",
      "executor": "userProcessor",
      "config": {
        "userData": "${$item}",
        "validationResult": "${nodes.validate_user.output}"
      },
      "dependsOn": ["validate_user"]
    }
  ]
}
```

### 循环类型对比分析

#### 1. Dynamic Loop（动态循环）

**定义**：基于运行时数据动态确定循环次数的循环类型。

**适用场景**：
- 循环次数在运行时才能确定
- 需要根据业务逻辑动态调整迭代次数
- 处理可变长度的数据集

**配置示例**：
```json
{
  "type": "loop",
  "id": "dynamic_processing",
  "loopType": "dynamic",
  "maxIterations": 100,
  "condition": "${nodes.check_condition.output.shouldContinue}",
  "nodes": [
    {
      "type": "task",
      "id": "process_batch",
      "executor": "batchProcessor",
      "config": {
        "batchSize": 50,
        "iteration": "${$iteration}"
      }
    },
    {
      "type": "task",
      "id": "check_condition",
      "executor": "conditionChecker",
      "config": {
        "processedCount": "${nodes.process_batch.output.count}"
      }
    }
  ]
}
```

**执行逻辑**：
1. 初始化迭代计数器 `$iteration = 0`
2. 执行 nodes 数组中的所有节点
3. 评估 condition 表达式
4. 如果条件为 true 且未达到 maxIterations，继续下一次迭代
5. 否则结束循环

#### 2. forEach 循环

**定义**：遍历数组或集合中每个元素的循环类型。

**适用场景**：
- 处理数组、列表等集合数据
- 对每个元素执行相同的处理逻辑
- 批量数据处理场景

**配置示例**：
```json
{
  "type": "loop",
  "id": "process_orders",
  "loopType": "forEach",
  "sourceExpression": "${input.orders}",
  "parallel": true,
  "maxConcurrency": 5,
  "nodes": [
    {
      "type": "task",
      "id": "validate_order",
      "executor": "orderValidator",
      "config": {
        "orderId": "${$item.id}",
        "orderData": "${$item}"
      }
    },
    {
      "type": "condition",
      "id": "check_payment",
      "condition": "${nodes.validate_order.output.isValid}",
      "branches": {
        "true": [
          {
            "type": "task",
            "id": "process_payment",
            "executor": "paymentProcessor",
            "config": {
              "amount": "${$item.amount}",
              "paymentMethod": "${$item.paymentMethod}"
            }
          }
        ],
        "false": [
          {
            "type": "task",
            "id": "reject_order",
            "executor": "orderRejecter",
            "config": {
              "orderId": "${$item.id}",
              "reason": "Invalid order data"
            }
          }
        ]
      }
    }
  ]
}
```

**特殊变量**：
- `$item`：当前迭代的元素
- `$index`：当前元素的索引（从0开始）
- `$iteration`：当前迭代次数（从0开始）

#### 3. while 循环

**定义**：基于条件判断的循环类型，在条件为真时持续执行。

**适用场景**：
- 需要基于动态条件控制循环
- 处理不确定次数的重复操作
- 实现轮询或等待逻辑

**配置示例**：
```json
{
  "type": "loop",
  "id": "wait_for_completion",
  "loopType": "while",
  "condition": "${!nodes.check_status.output.isCompleted}",
  "maxIterations": 60,
  "iterationDelay": 5000,
  "nodes": [
    {
      "type": "task",
      "id": "check_status",
      "executor": "statusChecker",
      "config": {
        "jobId": "${input.jobId}",
        "iteration": "${$iteration}"
      }
    },
    {
      "type": "condition",
      "id": "handle_timeout",
      "condition": "${$iteration >= 50}",
      "branches": {
        "true": [
          {
            "type": "task",
            "id": "send_timeout_alert",
            "executor": "alertSender",
            "config": {
              "message": "Job timeout after 50 iterations"
            }
          }
        ]
      }
    }
  ]
}
```

### 循环节点执行逻辑详解

#### 执行流程

1. **初始化阶段**
   - 设置循环变量（$iteration, $item, $index）
   - 评估循环条件或获取源数据
   - 初始化循环上下文

2. **迭代执行阶段**
   ```
   for each iteration:
     1. 更新循环变量
     2. 创建迭代作用域
     3. 按顺序执行 nodes 数组中的节点
     4. 收集节点执行结果
     5. 评估继续条件
     6. 清理迭代作用域
   ```

3. **结果聚合阶段**
   - 收集所有迭代的结果
   - 生成循环节点的最终输出
   - 清理循环上下文

#### 并行执行支持

对于 forEach 循环，支持并行执行多个迭代：

```json
{
  "type": "loop",
  "id": "parallel_processing",
  "loopType": "forEach",
  "sourceExpression": "${input.items}",
  "parallel": true,
  "maxConcurrency": 10,
  "batchSize": 5,
  "nodes": [...]
}
```

**配置参数说明**：
- `parallel`：是否启用并行执行，默认：false
- `maxConcurrency`：最大并发数，默认：CPU核心数
- `batchSize`：批处理大小，默认：1

#### 并行执行机制详解

**1. 资源分配策略**
```json
{
  "parallel": true,
  "maxConcurrency": 8,
  "resourceAllocation": {
    "strategy": "dynamic",           // dynamic, static, adaptive
    "cpuPerIteration": "500m",       // 每个迭代分配的CPU资源
    "memoryPerIteration": "1Gi",     // 每个迭代分配的内存资源
    "diskIOLimit": "100MB/s",        // 磁盘IO限制
    "networkBandwidth": "50MB/s"     // 网络带宽限制
  }
}
```

**2. 同步机制**
- **无锁并发**：使用消息传递而非共享状态
- **结果收集**：通过专用收集器聚合并行结果
- **进度同步**：实时更新整体执行进度

**3. 负载均衡**
```json
{
  "loadBalancing": {
    "enabled": true,
    "strategy": "work-stealing",     // work-stealing, round-robin, least-loaded
    "queueSize": 100,                // 工作队列大小
    "stealThreshold": 0.5,           // 工作窃取阈值
    "rebalanceInterval": 10000       // 重平衡间隔(ms)
  }
}
```

#### 错误处理策略

```json
{
  "type": "loop",
  "id": "robust_processing",
  "loopType": "forEach",
  "sourceExpression": "${input.items}",
  "errorHandling": {
    "strategy": "continue",        // continue, stop, retry
    "maxFailures": 5,             // 最大失败次数
    "failureThreshold": 0.1,      // 失败率阈值
    "onFailure": "log"            // log, skip, compensate
  },
  "nodes": [...]
}
```

## Parallel 节点（并行节点）详细说明

Parallel 节点实现真正的并行执行，允许多个分支同时运行，提高工作流的执行效率。

### 并行分支数组结构详解

#### 为什么使用数组结构

Parallel 节点使用 `branches` 数组定义多个并行分支，每个数组元素代表一个独立的并行分支。这种设计有以下核心原因：

1. **执行隔离**：每个数组元素在独立的执行上下文中运行
2. **资源管理**：可以为每个分支分配独立的资源配额
3. **故障隔离**：一个分支的失败不会影响其他分支的执行
4. **动态扩展**：可以在运行时动态添加或移除分支

#### 完整的并行节点配置

```json
{
  "type": "parallel",
  "id": "advanced_parallel_processing",
  "name": "高级并行处理节点",
  "maxConcurrency": 5,
  "errorHandling": "continue",
  "joinType": "all",
  "timeout": 1800000,
  "distributed": {
    "enabled": true,
    "branchDistribution": "round-robin",
    "affinityRules": {
      "branchAffinity": true,
      "dataLocality": true
    }
  },
  "resourceAllocation": {
    "strategy": "fair-share",
    "cpuPerBranch": "1000m",
    "memoryPerBranch": "2Gi",
    "priorityClass": "high"
  },
  "branches": [
    {
      "id": "data_processing_branch",
      "name": "数据处理分支",
      "priority": 1,
      "resources": {
        "cpu": "2000m",
        "memory": "4Gi"
      },
      "nodes": [
        {
          "type": "task",
          "id": "extract_data",
          "executor": "dataExtractor",
          "config": {
            "source": "${input.dataSource}",
            "format": "json"
          }
        },
        {
          "type": "task",
          "id": "transform_data",
          "executor": "dataTransformer",
          "config": {
            "input": "${nodes.extract_data.output}",
            "rules": "${input.transformRules}"
          },
          "dependsOn": ["extract_data"]
        }
      ]
    },
    {
      "id": "validation_branch",
      "name": "数据验证分支",
      "priority": 2,
      "nodes": [
        {
          "type": "task",
          "id": "validate_schema",
          "executor": "schemaValidator",
          "config": {
            "data": "${input.rawData}",
            "schema": "${input.validationSchema}"
          }
        }
      ]
    },
    {
      "id": "reporting_branch",
      "name": "报告生成分支",
      "priority": 3,
      "condition": "${input.generateReport === true}",
      "nodes": [
        {
          "type": "task",
          "id": "generate_summary",
          "executor": "reportGenerator",
          "config": {
            "template": "summary",
            "includeMetrics": true
          }
        }
      ]
    }
  ]
}
```

**设计优势**：
1. **独立执行**：每个分支独立执行，互不干扰
2. **资源隔离**：分支间资源隔离，避免竞争条件
3. **灵活组合**：支持不同长度和复杂度的分支
4. **统一管理**：所有分支在同一个并行节点中统一管理
5. **条件执行**：支持基于条件的分支执行
6. **优先级控制**：可以设置分支执行优先级

### 并行执行机制深度解析

#### 1. 多个分支同时执行的实现原理

**执行调度器架构**：
```json
{
  "executionScheduler": {
    "type": "thread-pool",           // thread-pool, actor-model, coroutine
    "poolSize": 10,                  // 线程池大小
    "queueCapacity": 100,            // 队列容量
    "keepAliveTime": 60000,          // 线程保活时间
    "rejectionPolicy": "caller-runs" // 拒绝策略
  }
}
```

**分支执行流程**：
1. **分支分发**：主调度器将分支分发到不同的执行器
2. **并发控制**：使用信号量控制最大并发数
3. **状态同步**：通过共享状态管理器同步执行状态
4. **结果收集**：使用 CompletableFuture 收集分支结果

#### 2. 资源分配策略

**公平分配（Fair Share）**：
```json
{
  "resourceAllocation": {
    "strategy": "fair-share",
    "totalCpu": "8000m",
    "totalMemory": "16Gi",
    "distribution": "equal",         // equal, weighted, priority-based
    "reservationRatio": 0.8,         // 资源预留比例
    "overcommitRatio": 1.2           // 超分比例
  }
}
```

**权重分配（Weighted）**：
```json
{
  "resourceAllocation": {
    "strategy": "weighted",
    "weights": {
      "data_processing_branch": 3,
      "validation_branch": 1,
      "reporting_branch": 1
    }
  }
}
```

**优先级分配（Priority-based）**：
```json
{
  "resourceAllocation": {
    "strategy": "priority-based",
    "priorities": {
      "critical": ["data_processing_branch"],
      "high": ["validation_branch"],
      "normal": ["reporting_branch"]
    }
  }
}
```

#### 3. 同步机制详解

**分支间同步点**：
```json
{
  "synchronization": {
    "enabled": true,
    "syncPoints": [
      {
        "id": "data_ready",
        "waitFor": ["data_processing_branch"],
        "notifyTo": ["validation_branch", "reporting_branch"],
        "timeout": 300000
      }
    ],
    "barriers": [
      {
        "id": "all_validation_complete",
        "branches": ["validation_branch"],
        "action": "proceed"
      }
    ]
  }
}
```

**数据共享机制**：
```json
{
  "dataSharing": {
    "enabled": true,
    "sharedVariables": {
      "processedData": {
        "scope": "parallel",
        "type": "object",
        "source": "data_processing_branch.nodes.transform_data.output"
      }
    },
    "lockingStrategy": "read-write-lock"
  }
}
```

### 分支间数据传递详解

#### 1. 数据隔离策略

**完全隔离模式**：
```json
{
  "dataIsolation": {
    "mode": "complete",              // complete, shared, hybrid
    "copyOnWrite": true,             // 写时复制
    "memoryBarrier": true,           // 内存屏障
    "serialization": "json"          // 序列化方式
  }
}
```

**共享内存模式**：
```json
{
  "dataIsolation": {
    "mode": "shared",
    "sharedMemorySize": "1Gi",
    "lockGranularity": "object",     // object, field, collection
    "consistencyLevel": "eventual"   // strong, eventual, weak
  }
}
```

#### 2. 结果合并策略

**聚合合并**：
```json
{
  "resultMerging": {
    "strategy": "aggregate",
    "aggregationRules": {
      "processedCount": "sum",       // sum, max, min, avg, concat
      "errors": "concat",
      "status": "majority",          // majority, unanimous, first
      "metrics": "merge"
    }
  }
}
```

**自定义合并**：
```json
{
  "resultMerging": {
    "strategy": "custom",
    "mergeFunction": "customMerger",
    "mergeOrder": ["data_processing_branch", "validation_branch", "reporting_branch"],
    "conflictResolution": "last-wins"
  }
}
```

#### 3. 跨分支通信

**消息传递**：
```json
{
  "communication": {
    "enabled": true,
    "mechanism": "message-passing",  // message-passing, shared-memory, event-bus
    "channels": [
      {
        "name": "data-ready",
        "from": "data_processing_branch",
        "to": ["validation_branch"],
        "messageType": "notification"
      }
    ],
    "reliability": "at-least-once"   // at-most-once, at-least-once, exactly-once
  }
}
```

### 断点续传配置

```json
{
  "recovery": {
    "enabled": true,
    "checkpointInterval": 60000,
    "maxRecoveryAttempts": 3,
    "recoveryStrategy": "from-last-checkpoint",
    "persistState": true,
    "stateCompression": true
  }
}
```

### 错误处理策略

```json
{
  "errorHandling": {
    "strategy": "retry",           // retry, fail-fast, continue, ignore
    "maxRetries": 3,
    "retryDelay": 5000,
    "backoffMultiplier": 2.0,
    "maxRetryDelay": 60000,
    "onFailure": "continue",       // continue, stop, rollback
    "notifyOnFailure": true,
    "failureThreshold": 0.1
  }
}
```

## 配置参数完整说明

### 工作流级别配置参数

#### 基础配置参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 示例 |
|--------|------|------|--------|------|------|
| `id` | string | 是 | - | 工作流唯一标识符 | `"user-registration-workflow"` |
| `name` | string | 是 | - | 工作流显示名称 | `"用户注册工作流"` |
| `version` | string | 是 | - | 工作流版本号，遵循语义化版本 | `"1.2.3"` |
| `description` | string | 否 | `""` | 工作流详细描述 | `"处理用户注册的完整流程"` |
| `category` | string | 否 | `"general"` | 工作流分类 | `"user-management"` |
| `tags` | string[] | 否 | `[]` | 工作流标签列表 | `["user", "registration", "validation"]` |

#### 执行配置参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 依赖关系 |
|--------|------|------|--------|------|----------|
| `timeout` | number | 否 | `3600000` | 工作流超时时间(ms) | 必须大于所有节点超时时间之和 |
| `retries` | number | 否 | `3` | 最大重试次数 | 与 `retryDelay` 配合使用 |
| `retryDelay` | number | 否 | `60000` | 重试延迟时间(ms) | 与 `retries` 配合使用 |
| `maxConcurrency` | number | 否 | `5` | 最大并发执行节点数 | 受系统资源限制 |
| `priority` | string | 否 | `"normal"` | 执行优先级：`low`, `normal`, `high`, `critical` | 影响调度顺序 |

#### 分布式配置参数详解

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 最佳实践 |
|--------|------|------|--------|------|----------|
| `distributed.enabled` | boolean | 是 | `false` | 是否启用分布式执行 | 多引擎环境下建议启用 |
| `distributed.assignmentStrategy` | string | 是 | `"round-robin"` | 分配策略 | 根据负载特性选择合适策略 |
| `distributed.maxConcurrency` | number | 否 | `10` | 分布式最大并发数 | 不超过引擎实例数×单实例并发数 |
| `distributed.requiredCapabilities` | string[] | 否 | `[]` | 必需的执行器能力列表 | 确保目标引擎具备所需能力 |
| `distributed.preferredEngine` | string | 否 | `null` | 首选引擎实例ID | 用于亲和性调度 |
| `distributed.failoverStrategy` | string | 否 | `"automatic"` | 故障转移策略：`automatic`, `manual`, `disabled` | 生产环境建议使用 `automatic` |
| `distributed.lockTimeout` | number | 否 | `300000` | 分布式锁超时时间(ms) | 应大于最长任务执行时间 |
| `distributed.heartbeatInterval` | number | 否 | `30000` | 心跳检测间隔(ms) | 平衡检测精度和网络开销 |

#### 监控配置参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 性能影响 |
|--------|------|------|--------|------|----------|
| `monitoring.enabled` | boolean | 否 | `true` | 是否启用监控 | 禁用可减少5-10%开销 |
| `monitoring.metricsInterval` | number | 否 | `30000` | 指标收集间隔(ms) | 间隔越短，监控精度越高，开销越大 |
| `monitoring.logLevel` | string | 否 | `"info"` | 日志级别：`debug`, `info`, `warn`, `error` | `debug` 级别会显著增加日志量 |
| `monitoring.customMetrics` | object | 否 | `{}` | 自定义指标定义 | 过多自定义指标会影响性能 |

#### 恢复配置参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 存储要求 |
|--------|------|------|--------|------|----------|
| `recovery.enabled` | boolean | 否 | `true` | 是否启用断点续传 | 需要持久化存储支持 |
| `recovery.checkpointInterval` | number | 否 | `60000` | 检查点保存间隔(ms) | 间隔越短，恢复粒度越细，存储开销越大 |
| `recovery.maxRecoveryAttempts` | number | 否 | `3` | 最大恢复尝试次数 | 避免无限恢复循环 |
| `recovery.recoveryStrategy` | string | 否 | `"from-last-checkpoint"` | 恢复策略 | `from-beginning`, `from-last-checkpoint`, `skip-failed` |
| `recovery.persistState` | boolean | 否 | `true` | 是否持久化状态 | 禁用会失去恢复能力 |
| `recovery.stateCompression` | boolean | 否 | `true` | 状态数据压缩 | 减少存储空间，增加CPU开销 |

### 节点级别配置参数

#### Task 节点配置参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 验证规则 |
|--------|------|------|--------|------|----------|
| `id` | string | 是 | - | 节点唯一标识符 | 工作流内唯一，建议使用kebab-case |
| `name` | string | 否 | `id` | 节点显示名称 | 人类可读的描述性名称 |
| `type` | string | 是 | - | 节点类型：`task`, `loop`, `parallel`, `condition`, `subprocess` | 必须是支持的节点类型 |
| `executor` | string | 是 | - | 执行器名称 | 必须是已注册的执行器 |
| `config` | object | 否 | `{}` | 执行器配置参数 | 根据执行器要求验证 |
| `dependsOn` | string[] | 否 | `[]` | 依赖的节点ID列表 | 不能形成循环依赖 |
| `timeout` | number | 否 | `300000` | 节点执行超时时间(ms) | 应小于工作流总超时时间 |
| `retries` | number | 否 | `3` | 节点重试次数 | 0-10之间的整数 |

#### Loop 节点配置参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 适用循环类型 |
|--------|------|------|--------|------|-------------|
| `loopType` | string | 是 | - | 循环类型：`forEach`, `while`, `times`, `dynamic` | 所有类型 |
| `sourceExpression` | string | 条件 | - | 数据源表达式 | `forEach`, `dynamic` |
| `condition` | string | 条件 | - | 循环条件表达式 | `while`, `dynamic` |
| `count` | number | 条件 | - | 循环次数 | `times` |
| `maxIterations` | number | 否 | `1000` | 最大迭代次数 | 所有类型 |
| `maxConcurrency` | number | 否 | `5` | 最大并发迭代数 | `forEach` |
| `parallel` | boolean | 否 | `false` | 是否并行执行迭代 | `forEach` |
| `batchSize` | number | 否 | `1` | 批处理大小 | `forEach` |
| `iterationDelay` | number | 否 | `0` | 迭代间延迟(ms) | `while`, `times` |

#### Parallel 节点配置参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 约束条件 |
|--------|------|------|--------|------|----------|
| `branches` | array | 是 | - | 并行分支数组 | 至少包含2个分支 |
| `maxConcurrency` | number | 否 | `分支数量` | 最大并发分支数 | 不超过分支总数 |
| `joinType` | string | 否 | `"all"` | 等待策略：`all`, `any`, `majority` | 影响完成条件 |
| `errorHandling` | string | 否 | `"continue"` | 错误处理：`continue`, `stop`, `fail-fast` | 影响失败行为 |
| `timeout` | number | 否 | `1800000` | 并行执行超时时间(ms) | 应大于最长分支执行时间 |

#### Condition 节点配置参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 表达式要求 |
|--------|------|------|--------|------|------------|
| `condition` | string | 是 | - | 条件判断表达式 | 必须返回boolean值 |
| `branches` | object | 是 | - | 分支定义对象 | 必须包含 `true` 和/或 `false` 分支 |
| `defaultBranch` | string | 否 | `"false"` | 默认分支：`true`, `false` | 条件评估异常时使用 |
| `evaluationTimeout` | number | 否 | `10000` | 条件评估超时时间(ms) | 防止表达式执行过久 |

#### Subprocess 节点配置参数

| 参数名 | 类型 | 必填 | 默认值 | 说明 | 获取方式 |
|--------|------|------|--------|------|----------|
| `workflowName` | string | 条件 | - | 子工作流名称 | repository, url 方式必填 |
| `version` | string | 否 | `"latest"` | 子工作流版本 | repository 方式使用 |
| `workflowSource` | object | 否 | `{"type": "repository"}` | 工作流源配置 | 定义获取方式 |
| `inputMapping` | object | 否 | `{}` | 输入参数映射 | 支持表达式和静态值 |
| `outputMapping` | object | 否 | `{}` | 输出参数映射 | 支持路径表达式 |
| `isolationLevel` | string | 否 | `"thread"` | 隔离级别：`thread`, `process`, `container` | 影响资源隔离程度 |
| `inheritContext` | boolean | 否 | `true` | 是否继承父工作流上下文 | 影响变量可见性 |

## 表达式语法

### 变量引用

```javascript
// 输入参数引用
"${input.paramName}"

// 节点输出引用
"${nodes.nodeId.output.fieldName}"

// 循环变量引用
"${$item}"           // 当前循环项
"${$index}"          // 当前索引
"${$total}"          // 总数量
"${$iteration}"      // 迭代次数

// 上下文变量引用
"${context.workflowId}"
"${context.instanceId}"
"${context.engineId}"

// 系统变量引用
"${system.timestamp}"
"${system.uuid}"
"${system.hostname}"
```

### 条件表达式

```javascript
// 比较操作
"nodes.task1.output.status === 'success'"
"nodes.task1.output.count > 100"
"input.mode !== 'test'"

// 逻辑操作
"nodes.task1.output.success && nodes.task2.output.success"
"input.forceSync || nodes.check.output.needsSync"

// 函数调用
"Array.isArray(nodes.fetch.output.items)"
"nodes.fetch.output.items.length > 0"
```

## 最佳实践

### 1. 命名规范

```json
{
  "id": "kebab-case-node-id",
  "name": "人类可读的节点名称",
  "executor": "camelCaseExecutorName"
}
```

### 2. 依赖管理

```json
{
  "dependsOn": ["node1", "node2"],
  "waitFor": "all",  // all, any, none
  "timeout": 300000
}
```

### 3. 资源管理

```json
{
  "resources": {
    "cpu": "1000m",
    "memory": "2Gi",
    "disk": "10Gi"
  },
  "limits": {
    "maxExecutionTime": 3600000,
    "maxMemoryUsage": "4Gi"
  }
}
```

### 4. 监控配置

```json
{
  "monitoring": {
    "enabled": true,
    "metricsInterval": 30000,
    "logLevel": "info",
    "customMetrics": {
      "processedItems": "nodes.*.output.processedCount",
      "errorRate": "nodes.*.output.errorCount / nodes.*.output.totalCount"
    }
  }
}
```

## 实际业务场景使用案例

### 案例1：电商订单处理工作流

这个案例展示了一个完整的电商订单处理流程，包含订单验证、库存检查、支付处理、发货等步骤。

```json
{
  "id": "ecommerce-order-processing",
  "name": "电商订单处理工作流",
  "version": "2.1.0",
  "description": "处理电商平台订单的完整业务流程",
  "config": {
    "timeout": 1800000,
    "retries": 2,
    "distributed": {
      "enabled": true,
      "assignmentStrategy": "load-balanced",
      "maxConcurrency": 15
    },
    "monitoring": {
      "enabled": true,
      "customMetrics": {
        "orderProcessingTime": "nodes.*.output.duration",
        "paymentSuccessRate": "nodes.process-payment.output.successCount / nodes.process-payment.output.totalCount"
      }
    }
  },
  "inputs": {
    "orderId": {
      "type": "string",
      "required": true,
      "description": "订单ID"
    },
    "customerId": {
      "type": "string",
      "required": true,
      "description": "客户ID"
    },
    "items": {
      "type": "array",
      "required": true,
      "description": "订单商品列表"
    },
    "paymentMethod": {
      "type": "string",
      "required": true,
      "description": "支付方式"
    }
  },
  "nodes": [
    {
      "id": "validate-order",
      "name": "订单验证",
      "type": "task",
      "executor": "orderValidator",
      "config": {
        "orderId": "${input.orderId}",
        "customerId": "${input.customerId}",
        "items": "${input.items}",
        "validationRules": ["required_fields", "price_validation", "customer_verification"]
      },
      "timeout": 30000,
      "errorHandling": {
        "strategy": "fail-fast",
        "onFailure": "stop"
      }
    },
    {
      "id": "check-inventory",
      "name": "库存检查",
      "type": "loop",
      "loopType": "forEach",
      "sourceExpression": "${input.items}",
      "parallel": true,
      "maxConcurrency": 5,
      "dependsOn": ["validate-order"],
      "nodes": [
        {
          "id": "check-item-stock",
          "type": "task",
          "executor": "inventoryChecker",
          "config": {
            "productId": "${$item.productId}",
            "quantity": "${$item.quantity}",
            "warehouseId": "${$item.warehouseId || 'default'}"
          }
        }
      ]
    },
    {
      "id": "inventory-decision",
      "name": "库存决策",
      "type": "condition",
      "dependsOn": ["check-inventory"],
      "condition": "${nodes.check-inventory.output.every(item => item.available)}",
      "branches": {
        "true": {
          "id": "sufficient-inventory",
          "nodes": [
            {
              "id": "reserve-inventory",
              "name": "预留库存",
              "type": "task",
              "executor": "inventoryReserver",
              "config": {
                "orderId": "${input.orderId}",
                "items": "${input.items}",
                "reservationTimeout": 1800000
              }
            },
            {
              "id": "process-payment",
              "name": "处理支付",
              "type": "task",
              "executor": "paymentProcessor",
              "config": {
                "orderId": "${input.orderId}",
                "customerId": "${input.customerId}",
                "amount": "${nodes.validate-order.output.totalAmount}",
                "paymentMethod": "${input.paymentMethod}",
                "currency": "CNY"
              },
              "dependsOn": ["reserve-inventory"],
              "timeout": 120000,
              "retries": 2
            },
            {
              "id": "payment-result-check",
              "name": "支付结果检查",
              "type": "condition",
              "dependsOn": ["process-payment"],
              "condition": "${nodes.process-payment.output.status === 'success'}",
              "branches": {
                "true": {
                  "id": "payment-success",
                  "nodes": [
                    {
                      "id": "confirm-inventory",
                      "name": "确认库存扣减",
                      "type": "task",
                      "executor": "inventoryConfirmer",
                      "config": {
                        "orderId": "${input.orderId}",
                        "reservationId": "${nodes.reserve-inventory.output.reservationId}"
                      }
                    },
                    {
                      "id": "create-shipment",
                      "name": "创建发货单",
                      "type": "task",
                      "executor": "shipmentCreator",
                      "config": {
                        "orderId": "${input.orderId}",
                        "items": "${input.items}",
                        "shippingAddress": "${nodes.validate-order.output.shippingAddress}",
                        "priority": "${nodes.validate-order.output.isPremium ? 'high' : 'normal'}"
                      },
                      "dependsOn": ["confirm-inventory"]
                    },
                    {
                      "id": "send-confirmation",
                      "name": "发送确认通知",
                      "type": "parallel",
                      "dependsOn": ["create-shipment"],
                      "branches": [
                        {
                          "id": "email-notification",
                          "nodes": [
                            {
                              "id": "send-email",
                              "type": "task",
                              "executor": "emailSender",
                              "config": {
                                "to": "${nodes.validate-order.output.customerEmail}",
                                "template": "order-confirmation",
                                "data": {
                                  "orderId": "${input.orderId}",
                                  "trackingNumber": "${nodes.create-shipment.output.trackingNumber}"
                                }
                              }
                            }
                          ]
                        },
                        {
                          "id": "sms-notification",
                          "nodes": [
                            {
                              "id": "send-sms",
                              "type": "task",
                              "executor": "smsSender",
                              "config": {
                                "to": "${nodes.validate-order.output.customerPhone}",
                                "message": "您的订单 ${input.orderId} 已确认，预计3-5个工作日送达"
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },
                "false": {
                  "id": "payment-failed",
                  "nodes": [
                    {
                      "id": "release-inventory",
                      "name": "释放库存",
                      "type": "task",
                      "executor": "inventoryReleaser",
                      "config": {
                        "reservationId": "${nodes.reserve-inventory.output.reservationId}"
                      }
                    },
                    {
                      "id": "notify-payment-failure",
                      "name": "支付失败通知",
                      "type": "task",
                      "executor": "notificationSender",
                      "config": {
                        "customerId": "${input.customerId}",
                        "orderId": "${input.orderId}",
                        "type": "payment_failed",
                        "reason": "${nodes.process-payment.output.failureReason}"
                      },
                      "dependsOn": ["release-inventory"]
                    }
                  ]
                }
              }
            }
          ]
        },
        "false": {
          "id": "insufficient-inventory",
          "nodes": [
            {
              "id": "check-alternatives",
              "name": "检查替代方案",
              "type": "subprocess",
              "workflowName": "alternative-product-finder",
              "inputMapping": {
                "unavailableItems": "${nodes.check-inventory.output.filter(item => !item.available)}",
                "customerPreferences": "${nodes.validate-order.output.customerPreferences}"
              },
              "outputMapping": {
                "alternatives": "output.alternatives",
                "hasAlternatives": "output.alternatives.length > 0"
              }
            },
            {
              "id": "handle-shortage",
              "name": "处理缺货",
              "type": "condition",
              "dependsOn": ["check-alternatives"],
              "condition": "${nodes.check-alternatives.output.hasAlternatives}",
              "branches": {
                "true": {
                  "id": "offer-alternatives",
                  "nodes": [
                    {
                      "id": "notify-alternatives",
                      "type": "task",
                      "executor": "customerNotifier",
                      "config": {
                        "customerId": "${input.customerId}",
                        "orderId": "${input.orderId}",
                        "type": "alternative_products",
                        "alternatives": "${nodes.check-alternatives.output.alternatives}"
                      }
                    }
                  ]
                },
                "false": {
                  "id": "backorder-or-cancel",
                  "nodes": [
                    {
                      "id": "create-backorder",
                      "type": "task",
                      "executor": "backorderCreator",
                      "config": {
                        "orderId": "${input.orderId}",
                        "unavailableItems": "${nodes.check-inventory.output.filter(item => !item.available)}",
                        "estimatedRestockDate": "${Date.now() + 7 * 24 * 60 * 60 * 1000}"
                      }
                    }
                  ]
                }
              }
            }
          ]
        }
      }
    }
  ],
  "outputs": {
    "orderStatus": {
      "type": "string",
      "description": "订单最终状态"
    },
    "trackingNumber": {
      "type": "string",
      "description": "物流跟踪号"
    },
    "processingMetrics": {
      "type": "object",
      "description": "处理指标"
    }
  }
}
```

### 案例2：数据ETL处理工作流

这个案例展示了大数据ETL（提取、转换、加载）处理流程，包含数据验证、清洗、转换和加载。

```json
{
  "id": "data-etl-pipeline",
  "name": "数据ETL处理管道",
  "version": "3.0.0",
  "description": "大数据ETL处理的完整管道",
  "config": {
    "timeout": 7200000,
    "distributed": {
      "enabled": true,
      "assignmentStrategy": "hash",
      "hashKey": "${input.dataPartition}",
      "maxConcurrency": 20
    },
    "recovery": {
      "enabled": true,
      "checkpointInterval": 300000
    }
  },
  "inputs": {
    "dataSource": {
      "type": "string",
      "required": true,
      "description": "数据源标识"
    },
    "dataPartition": {
      "type": "string",
      "required": true,
      "description": "数据分区标识"
    },
    "targetSchema": {
      "type": "object",
      "required": true,
      "description": "目标数据模式"
    },
    "batchSize": {
      "type": "number",
      "default": 10000,
      "description": "批处理大小"
    }
  },
  "nodes": [
    {
      "id": "extract-data",
      "name": "数据提取",
      "type": "task",
      "executor": "dataExtractor",
      "config": {
        "source": "${input.dataSource}",
        "partition": "${input.dataPartition}",
        "batchSize": "${input.batchSize}",
        "format": "parquet",
        "compression": "snappy"
      },
      "distributed": {
        "assignmentStrategy": "affinity",
        "affinityRules": {
          "dataAffinity": ["${input.dataPartition}"]
        }
      }
    },
    {
      "id": "validate-data-quality",
      "name": "数据质量验证",
      "type": "parallel",
      "dependsOn": ["extract-data"],
      "branches": [
        {
          "id": "schema-validation",
          "nodes": [
            {
              "id": "validate-schema",
              "type": "task",
              "executor": "schemaValidator",
              "config": {
                "data": "${nodes.extract-data.output.data}",
                "schema": "${input.targetSchema}",
                "strictMode": false
              }
            }
          ]
        },
        {
          "id": "data-profiling",
          "nodes": [
            {
              "id": "profile-data",
              "type": "task",
              "executor": "dataProfiler",
              "config": {
                "data": "${nodes.extract-data.output.data}",
                "metrics": ["nullCount", "uniqueCount", "distribution", "outliers"]
              }
            }
          ]
        },
        {
          "id": "business-rules-validation",
          "nodes": [
            {
              "id": "validate-business-rules",
              "type": "task",
              "executor": "businessRuleValidator",
              "config": {
                "data": "${nodes.extract-data.output.data}",
                "rules": "${input.businessRules || []}"
              }
            }
          ]
        }
      ]
    },
    {
      "id": "data-quality-decision",
      "name": "数据质量决策",
      "type": "condition",
      "dependsOn": ["validate-data-quality"],
      "condition": "${nodes.validate-data-quality.output.schema-validation.isValid && nodes.validate-data-quality.output.data-profiling.qualityScore > 0.8}",
      "branches": {
        "true": {
          "id": "high-quality-processing",
          "nodes": [
            {
              "id": "transform-data",
              "name": "数据转换",
              "type": "loop",
              "loopType": "forEach",
              "sourceExpression": "${nodes.extract-data.output.batches}",
              "parallel": true,
              "maxConcurrency": 8,
              "nodes": [
                {
                  "id": "clean-batch",
                  "type": "task",
                  "executor": "dataCleaner",
                  "config": {
                    "batch": "${$item}",
                    "cleaningRules": {
                      "removeNulls": true,
                      "trimWhitespace": true,
                      "standardizeFormats": true,
                      "deduplication": true
                    }
                  }
                },
                {
                  "id": "enrich-batch",
                  "type": "task",
                  "executor": "dataEnricher",
                  "config": {
                    "batch": "${nodes.clean-batch.output}",
                    "enrichmentSources": ["geo-lookup", "category-mapping"],
                    "cacheEnabled": true
                  },
                  "dependsOn": ["clean-batch"]
                },
                {
                  "id": "transform-batch",
                  "type": "task",
                  "executor": "dataTransformer",
                  "config": {
                    "batch": "${nodes.enrich-batch.output}",
                    "transformations": [
                      {
                        "type": "aggregate",
                        "groupBy": ["category", "region"],
                        "metrics": ["sum", "avg", "count"]
                      },
                      {
                        "type": "pivot",
                        "pivotColumn": "metric_type",
                        "valueColumn": "metric_value"
                      }
                    ]
                  },
                  "dependsOn": ["enrich-batch"]
                }
              ]
            },
            {
              "id": "load-data",
              "name": "数据加载",
              "type": "parallel",
              "dependsOn": ["transform-data"],
              "branches": [
                {
                  "id": "load-to-warehouse",
                  "nodes": [
                    {
                      "id": "load-warehouse",
                      "type": "task",
                      "executor": "warehouseLoader",
                      "config": {
                        "data": "${nodes.transform-data.output}",
                        "table": "${input.targetTable}",
                        "mode": "append",
                        "partitionBy": ["date", "region"]
                      }
                    }
                  ]
                },
                {
                  "id": "load-to-cache",
                  "nodes": [
                    {
                      "id": "load-redis",
                      "type": "task",
                      "executor": "cacheLoader",
                      "config": {
                        "data": "${nodes.transform-data.output}",
                        "keyPattern": "analytics:${input.dataPartition}:*",
                        "ttl": 86400
                      }
                    }
                  ]
                },
                {
                  "id": "update-metadata",
                  "nodes": [
                    {
                      "id": "update-catalog",
                      "type": "task",
                      "executor": "catalogUpdater",
                      "config": {
                        "dataset": "${input.dataPartition}",
                        "schema": "${input.targetSchema}",
                        "statistics": "${nodes.validate-data-quality.output.data-profiling}",
                        "lastUpdated": "${Date.now()}"
                      }
                    }
                  ]
                }
              ]
            }
          ]
        },
        "false": {
          "id": "low-quality-handling",
          "nodes": [
            {
              "id": "data-repair",
              "name": "数据修复",
              "type": "subprocess",
              "workflowName": "data-quality-repair",
              "inputMapping": {
                "rawData": "${nodes.extract-data.output.data}",
                "qualityIssues": "${nodes.validate-data-quality.output}",
                "repairStrategy": "aggressive"
              }
            },
            {
              "id": "quarantine-data",
              "name": "隔离问题数据",
              "type": "task",
              "executor": "dataQuarantiner",
              "config": {
                "data": "${nodes.extract-data.output.data}",
                "issues": "${nodes.validate-data-quality.output}",
                "quarantineLocation": "s3://data-quarantine/${input.dataPartition}/"
              },
              "dependsOn": ["data-repair"]
            }
          ]
        }
      }
    },
    {
      "id": "generate-report",
      "name": "生成处理报告",
      "type": "task",
      "executor": "reportGenerator",
      "dependsOn": ["data-quality-decision"],
      "config": {
        "reportType": "etl-summary",
        "includeMetrics": true,
        "includeQualityScore": true,
        "outputFormat": "json"
      }
    }
  ]
}
```

## 完整示例

### 复杂工作流示例

```json
{
  "id": "complex-data-processing-workflow",
  "name": "复杂数据处理工作流",
  "version": "1.0.0",
  "description": "演示所有节点类型和分布式特性的复杂工作流",
  "config": {
    "timeout": 7200000,
    "retries": 3,
    "distributed": {
      "enabled": true,
      "assignmentStrategy": "load-balanced",
      "maxConcurrency": 20
    },
    "recovery": {
      "enabled": true,
      "checkpointInterval": 60000
    }
  },
  "inputs": {
    "dataSource": {
      "type": "string",
      "required": true,
      "description": "数据源标识"
    },
    "batchSize": {
      "type": "number",
      "default": 1000,
      "description": "批处理大小"
    }
  },
  "nodes": [
    {
      "id": "validate-input",
      "name": "验证输入参数",
      "type": "task",
      "executor": "validateInput",
      "config": {
        "dataSource": "${input.dataSource}",
        "batchSize": "${input.batchSize}"
      }
    },
    {
      "id": "fetch-data",
      "name": "获取数据",
      "type": "task",
      "executor": "fetchData",
      "dependsOn": ["validate-input"],
      "config": {
        "source": "${input.dataSource}",
        "batchSize": "${input.batchSize}"
      }
    },
    {
      "id": "check-data-quality",
      "name": "检查数据质量",
      "type": "condition",
      "dependsOn": ["fetch-data"],
      "condition": "nodes.fetch-data.output.quality > 0.8",
      "branches": {
        "true": {
          "id": "process-high-quality",
          "nodes": [
            {
              "id": "parallel-processing",
              "name": "并行数据处理",
              "type": "parallel",
              "maxConcurrency": 5,
              "branches": [
                {
                  "id": "transform-branch",
                  "nodes": [
                    {
                      "id": "transform-data",
                      "type": "loop",
                      "loopType": "dynamic",
                      "sourceExpression": "nodes.fetch-data.output.batches",
                      "maxConcurrency": 3,
                      "nodes": [
                        {
                          "id": "transform-batch",
                          "type": "task",
                          "executor": "transformBatch",
                          "config": {
                            "batch": "${$item}"
                          }
                        }
                      ]
                    }
                  ]
                },
                {
                  "id": "validate-branch",
                  "nodes": [
                    {
                      "id": "validate-data",
                      "type": "task",
                      "executor": "validateData",
                      "config": {
                        "data": "${nodes.fetch-data.output.data}"
                      }
                    }
                  ]
                }
              ]
            }
          ]
        },
        "false": {
          "id": "handle-low-quality",
          "nodes": [
            {
              "id": "clean-data",
              "type": "subprocess",
              "workflowName": "data-cleaning-workflow",
              "inputMapping": {
                "rawData": "nodes.fetch-data.output.data"
              }
            }
          ]
        }
      }
    },
    {
      "id": "generate-report",
      "name": "生成处理报告",
      "type": "task",
      "executor": "generateReport",
      "dependsOn": ["check-data-quality"],
      "config": {
        "includeMetrics": true,
        "format": "json"
      }
    }
  ]
}
```

## 性能优化建议

### 1. 分布式执行优化

**选择合适的分配策略**：
- **CPU密集型任务**：使用 `load-balanced` 策略，确保负载均匀分布
- **I/O密集型任务**：使用 `affinity` 策略，优化数据局部性
- **有状态任务**：使用 `hash` 策略，确保会话亲和性

**并发控制**：
```json
{
  "distributed": {
    "maxConcurrency": 10,           // 根据系统资源调整
    "loadBalanceWeight": 1.0,       // 根据引擎性能调整权重
    "heartbeatInterval": 30000      // 平衡检测精度和网络开销
  }
}
```

### 2. 循环节点优化

**批处理优化**：
```json
{
  "type": "loop",
  "loopType": "forEach",
  "batchSize": 100,               // 根据数据大小调整
  "parallel": true,
  "maxConcurrency": 5             // 避免过度并发
}
```

**内存管理**：
- 大数据集使用流式处理
- 及时释放不需要的中间结果
- 使用数据分页避免内存溢出

### 3. 错误处理最佳实践

**分层错误处理**：
```json
{
  "errorHandling": {
    "strategy": "retry",
    "maxRetries": 3,
    "backoffStrategy": "exponential",
    "circuitBreaker": {
      "enabled": true,
      "failureThreshold": 5
    }
  }
}
```

**监控和告警**：
- 设置合理的错误率阈值
- 配置级联告警机制
- 实现自动恢复策略

### 4. 资源管理建议

**资源配额**：
```json
{
  "resources": {
    "cpu": "2000m",               // 根据任务复杂度设置
    "memory": "4Gi",              // 预留足够内存空间
    "disk": "10Gi"                // 考虑临时文件存储
  }
}
```

**超时设置**：
- 工作流超时 > 所有节点超时之和
- 节点超时 > 预期执行时间 × 2
- 网络操作设置较短超时

## 故障排查指南

### 1. 常见问题诊断

**分布式执行失败**：
1. 检查引擎实例健康状态
2. 验证网络连接和防火墙设置
3. 确认数据库连接池配置
4. 检查分布式锁超时设置

**循环节点性能问题**：
1. 检查并发设置是否合理
2. 监控内存使用情况
3. 分析数据倾斜问题
4. 优化批处理大小

**子工作流调用失败**：
1. 验证工作流定义是否存在
2. 检查参数映射配置
3. 确认权限和访问控制
4. 监控资源使用情况

### 2. 性能监控指标

**关键指标**：
- 工作流执行时间
- 节点平均执行时间
- 错误率和重试次数
- 资源使用率（CPU、内存、网络）
- 分布式锁等待时间

**告警阈值建议**：
```json
{
  "alerts": {
    "executionTime": {
      "warning": "300s",
      "critical": "600s"
    },
    "errorRate": {
      "warning": "5%",
      "critical": "10%"
    },
    "resourceUsage": {
      "warning": "80%",
      "critical": "95%"
    }
  }
}
```

## 版本升级指南

### 从 v2.x 升级到 v3.0.0

#### 1. 数据库迁移

**表结构变更**：
```sql
-- 添加分布式执行相关字段
ALTER TABLE workflow_definitions
ADD COLUMN distributed_config JSON NULL,
ADD COLUMN recovery_config JSON NULL,
ADD COLUMN monitoring_config JSON NULL;

-- 创建分布式锁表
CREATE TABLE workflow_locks (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    workflow_instance_id VARCHAR(255) NOT NULL,
    node_id VARCHAR(255) NOT NULL,
    engine_id VARCHAR(255) NOT NULL,
    lock_type ENUM('execution', 'resource') NOT NULL,
    acquired_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    INDEX idx_workflow_node (workflow_instance_id, node_id),
    INDEX idx_expires (expires_at)
);
```

#### 2. 配置文件更新

**添加分布式配置**：
```json
{
  "distributed": {
    "enabled": true,
    "assignmentStrategy": "load-balanced",
    "maxConcurrency": 10
  },
  "recovery": {
    "enabled": true,
    "checkpointInterval": 60000
  }
}
```

#### 3. 执行器适配

**能力声明**：
```javascript
class MyExecutor {
  static capabilities = ['data-processing', 'file-operations'];
  static distributedSupport = true;
  static resourceRequirements = {
    cpu: '1000m',
    memory: '2Gi'
  };
}
```

#### 4. 监控集成

**指标配置**：
```json
{
  "monitoring": {
    "enabled": true,
    "customMetrics": {
      "processingRate": "nodes.*.output.itemsProcessed / nodes.*.output.duration",
      "errorRate": "nodes.*.output.errorCount / nodes.*.output.totalCount"
    }
  }
}
```

#### 5. 迁移检查清单

- [ ] 数据库表结构已更新
- [ ] 配置文件已添加新字段
- [ ] 执行器已声明能力和资源需求
- [ ] 监控指标已配置
- [ ] 分布式锁机制已测试
- [ ] 故障转移功能已验证
- [ ] 性能基准测试已完成

## 总结

本指南详细介绍了 Stratix Tasks 插件 v3.0.0 的工作流定义规范，涵盖了：

1. **分布式执行**：多种分配策略、错误处理、故障转移机制
2. **循环节点**：四种循环类型、并行执行、资源管理
3. **并行节点**：分支管理、同步机制、数据传递
4. **子工作流**：生命周期管理、参数映射、隔离策略
5. **配置参数**：完整的参数说明、类型定义、最佳实践

通过合理使用这些特性，可以构建高性能、高可用的分布式工作流系统，满足企业级应用的复杂需求。
