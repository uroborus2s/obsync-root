# 工作流定义DSL设计方案

## 概述

@stratix/tasks 工作流定义DSL（Domain Specific Language）是一套基于JSON的声明式语法，用于定义复杂的工作流程。DSL支持串行/并行执行、条件分支、循环控制、子流程调用等高级特性。

## 设计原则

1. **声明式语法**：描述"做什么"而不是"怎么做"
2. **类型安全**：基于TypeScript提供完整的类型定义
3. **可组合性**：支持节点嵌套和流程复用
4. **可扩展性**：支持自定义节点类型和执行器
5. **可读性**：语法简洁明了，易于理解和维护

## 核心概念

### 1. 工作流定义结构

```typescript
interface WorkflowDefinition {
  // 基本信息
  name: string;
  description?: string;
  version: string;
  
  // 输入输出定义
  inputs?: InputDefinition[];
  outputs?: OutputDefinition[];
  
  // 流程节点
  nodes: NodeDefinition[];
  
  // 流程配置
  config?: WorkflowConfig;
}
```

### 2. 节点类型系统

```typescript
type NodeType = 
  | 'task'        // 任务节点
  | 'parallel'    // 并行节点
  | 'condition'   // 条件节点
  | 'loop'        // 循环节点
  | 'subprocess'  // 子流程节点
  | 'wait'        // 等待节点
  | 'webhook'     // Webhook节点
  | 'timer'       // 定时器节点;
```

## DSL语法规范

### 1. 基础任务节点

```json
{
  "type": "task",
  "id": "send_email",
  "name": "发送邮件",
  "executor": "emailExecutor",
  "config": {
    "to": "{{ inputs.email }}",
    "subject": "欢迎注册",
    "template": "welcome"
  },
  "retry": {
    "maxAttempts": 3,
    "backoff": "exponential"
  },
  "timeout": "30s"
}
```

### 2. 并行执行节点

```json
{
  "type": "parallel",
  "id": "parallel_tasks",
  "name": "并行处理",
  "branches": [
    {
      "id": "branch_1",
      "nodes": [
        {
          "type": "task",
          "id": "task_1",
          "executor": "dataProcessor",
          "config": { "type": "validation" }
        }
      ]
    },
    {
      "id": "branch_2", 
      "nodes": [
        {
          "type": "task",
          "id": "task_2",
          "executor": "notificationSender",
          "config": { "channel": "sms" }
        }
      ]
    }
  ],
  "joinType": "all" // all, any, first
}
```

### 3. 条件分支节点

```json
{
  "type": "condition",
  "id": "check_user_type",
  "name": "检查用户类型",
  "condition": "{{ inputs.userType === 'premium' }}",
  "branches": {
    "true": [
      {
        "type": "task",
        "id": "premium_welcome",
        "executor": "premiumService"
      }
    ],
    "false": [
      {
        "type": "task", 
        "id": "basic_welcome",
        "executor": "basicService"
      }
    ]
  }
}
```

### 4. 循环节点

```json
{
  "type": "loop",
  "id": "process_items",
  "name": "批量处理",
  "loopType": "forEach", // forEach, while, times
  "collection": "{{ inputs.items }}",
  "itemVariable": "item",
  "indexVariable": "index",
  "nodes": [
    {
      "type": "task",
      "id": "process_item",
      "executor": "itemProcessor",
      "config": {
        "data": "{{ item }}",
        "index": "{{ index }}"
      }
    }
  ],
  "parallel": true, // 是否并行执行
  "maxConcurrency": 5
}
```

### 5. 子流程节点

```json
{
  "type": "subprocess",
  "id": "user_onboarding",
  "name": "用户入职流程",
  "workflowName": "user-onboarding",
  "version": "1.0.0",
  "inputs": {
    "userId": "{{ inputs.userId }}",
    "department": "{{ inputs.department }}"
  },
  "waitForCompletion": true
}
```

### 6. 等待节点

```json
{
  "type": "wait",
  "id": "wait_approval",
  "name": "等待审批",
  "waitType": "event", // event, time, condition
  "event": "approval_completed",
  "timeout": "7d",
  "timeoutAction": "fail" // fail, continue, retry
}
```

## 表达式系统

### 1. 变量引用

```javascript
// 输入参数
{{ inputs.paramName }}

// 节点输出
{{ nodes.nodeId.output.fieldName }}

// 上下文变量
{{ context.variableName }}

// 系统变量
{{ system.timestamp }}
{{ system.workflowId }}
{{ system.instanceId }}
```

### 2. 函数调用

```javascript
// 字符串函数
{{ inputs.name | upper }}
{{ inputs.email | lower }}

// 数学函数
{{ inputs.price | multiply(1.1) }}
{{ inputs.items | length }}

// 日期函数
{{ system.timestamp | formatDate('YYYY-MM-DD') }}
{{ inputs.date | addDays(7) }}

// 条件函数
{{ inputs.age | gte(18) }}
{{ inputs.status | in(['active', 'pending']) }}
```

### 3. 复杂表达式

```javascript
// 逻辑运算
{{ inputs.age >= 18 && inputs.verified === true }}

// 三元运算
{{ inputs.type === 'premium' ? 'VIP' : 'Standard' }}

// 对象访问
{{ inputs.user.profile.email }}

// 数组操作
{{ inputs.items[0].name }}
{{ inputs.tags | join(', ') }}
```

## 完整示例

### 用户注册工作流

```json
{
  "name": "user-registration",
  "description": "用户注册完整流程",
  "version": "1.0.0",
  "inputs": [
    {
      "name": "email",
      "type": "string",
      "required": true,
      "validation": "email"
    },
    {
      "name": "userType", 
      "type": "string",
      "enum": ["basic", "premium"],
      "default": "basic"
    }
  ],
  "outputs": [
    {
      "name": "userId",
      "type": "string"
    },
    {
      "name": "status",
      "type": "string"
    }
  ],
  "nodes": [
    {
      "type": "task",
      "id": "validate_email",
      "name": "验证邮箱",
      "executor": "emailValidator",
      "config": {
        "email": "{{ inputs.email }}"
      }
    },
    {
      "type": "condition",
      "id": "check_existing_user",
      "name": "检查用户是否存在",
      "condition": "{{ nodes.validate_email.output.exists === false }}",
      "branches": {
        "true": [
          {
            "type": "parallel",
            "id": "create_user_parallel",
            "name": "并行创建用户",
            "branches": [
              {
                "id": "create_account",
                "nodes": [
                  {
                    "type": "task",
                    "id": "create_user",
                    "executor": "userCreator",
                    "config": {
                      "email": "{{ inputs.email }}",
                      "type": "{{ inputs.userType }}"
                    }
                  }
                ]
              },
              {
                "id": "send_welcome",
                "nodes": [
                  {
                    "type": "task",
                    "id": "send_welcome_email",
                    "executor": "emailSender",
                    "config": {
                      "to": "{{ inputs.email }}",
                      "template": "welcome"
                    }
                  }
                ]
              }
            ],
            "joinType": "all"
          }
        ],
        "false": [
          {
            "type": "task",
            "id": "handle_existing_user",
            "executor": "errorHandler",
            "config": {
              "error": "User already exists"
            }
          }
        ]
      }
    }
  ],
  "config": {
    "timeout": "5m",
    "retryPolicy": {
      "maxAttempts": 3,
      "backoff": "exponential"
    },
    "errorHandling": "fail-fast"
  }
}
```

## 类型定义

### 核心类型接口

```typescript
// 工作流定义
export interface WorkflowDefinition {
  name: string;
  description?: string;
  version: string;
  inputs?: InputDefinition[];
  outputs?: OutputDefinition[];
  nodes: NodeDefinition[];
  config?: WorkflowConfig;
}

// 输入定义
export interface InputDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  required?: boolean;
  default?: any;
  validation?: string;
  enum?: any[];
  description?: string;
}

// 输出定义
export interface OutputDefinition {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description?: string;
  source: string; // 表达式，指向数据源
}

// 节点定义基类
export interface BaseNodeDefinition {
  type: NodeType;
  id: string;
  name: string;
  description?: string;
  dependsOn?: string[];
  condition?: string; // 执行条件表达式
  timeout?: string;
  retry?: RetryConfig;
}

// 任务节点
export interface TaskNodeDefinition extends BaseNodeDefinition {
  type: 'task';
  executor: string;
  config: Record<string, any>;
}

// 并行节点
export interface ParallelNodeDefinition extends BaseNodeDefinition {
  type: 'parallel';
  branches: ParallelBranch[];
  joinType: 'all' | 'any' | 'first';
  maxConcurrency?: number;
}

// 条件节点
export interface ConditionNodeDefinition extends BaseNodeDefinition {
  type: 'condition';
  condition: string;
  branches: {
    true: NodeDefinition[];
    false?: NodeDefinition[];
  };
}

// 循环节点
export interface LoopNodeDefinition extends BaseNodeDefinition {
  type: 'loop';
  loopType: 'forEach' | 'while' | 'times';
  collection?: string; // forEach时的集合表达式
  condition?: string; // while时的条件表达式
  times?: number; // times时的次数
  itemVariable?: string;
  indexVariable?: string;
  nodes: NodeDefinition[];
  parallel?: boolean;
  maxConcurrency?: number;
}

// 子流程节点
export interface SubprocessNodeDefinition extends BaseNodeDefinition {
  type: 'subprocess';
  workflowName: string;
  version?: string;
  inputs: Record<string, any>;
  waitForCompletion?: boolean;
}

// 等待节点
export interface WaitNodeDefinition extends BaseNodeDefinition {
  type: 'wait';
  waitType: 'event' | 'time' | 'condition';
  event?: string;
  duration?: string;
  condition?: string;
  timeoutAction?: 'fail' | 'continue' | 'retry';
}

// 联合类型
export type NodeDefinition =
  | TaskNodeDefinition
  | ParallelNodeDefinition
  | ConditionNodeDefinition
  | LoopNodeDefinition
  | SubprocessNodeDefinition
  | WaitNodeDefinition;

// 重试配置
export interface RetryConfig {
  maxAttempts: number;
  backoff: 'fixed' | 'linear' | 'exponential';
  delay?: string;
  maxDelay?: string;
}

// 工作流配置
export interface WorkflowConfig {
  timeout?: string;
  retryPolicy?: RetryConfig;
  errorHandling?: 'fail-fast' | 'continue' | 'rollback';
  concurrency?: number;
  priority?: number;
}

// 并行分支
export interface ParallelBranch {
  id: string;
  name?: string;
  nodes: NodeDefinition[];
}
```

## 验证规则

1. **语法验证**：JSON Schema验证DSL结构
2. **语义验证**：检查节点引用、变量使用等
3. **循环检测**：防止无限循环和死锁
4. **资源验证**：检查执行器是否存在

## 扩展机制

1. **自定义节点类型**：支持插件定义新的节点类型
2. **自定义函数**：支持注册自定义表达式函数
3. **自定义验证器**：支持自定义输入验证规则
