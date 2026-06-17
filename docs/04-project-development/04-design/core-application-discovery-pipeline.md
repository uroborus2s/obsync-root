# Core 应用发现管道设计

- 文档编号：`DESIGN-CORE-DISCOVERY-20260617`
- 模块：`@stratix/core`
- 设计目标：单一应用级 discovery 管道

## 总体设计

```mermaid
flowchart LR
  A["Stratix.run(options)"] --> B["ApplicationBootstrap.bootstrap"]
  B --> C["validateConfiguration"]
  C --> D["runApplicationDiscovery"]
  D --> E["ApplicationDiscoveryPipeline.scan"]
  E --> F["ApplicationDiscoveryPipeline.analyze"]
  F --> G["ApplicationDiscoveryPipeline.registerComponent"]
  G --> H["Awilix container"]
  G --> I["Fastify routes"]
```

## 管道职责

| 阶段 | 输入 | 输出 | 失败策略 |
|---|---|---|---|
| scan | `rootDir`、`patterns`、`directories`、`exclude` | `LoadedModule[]` | 模块加载失败抛 `DiscoveryError` |
| analyze | 模块导出对象 | `ComponentMetadata | null` | 非 Stratix 组件跳过 |
| register | 组件元数据、容器、Fastify | DI token、路由数量 | 重复 token 或注册失败抛 `RegistrationError` |
| route binding | 控制器路由元数据 | Fastify route | handler 不存在抛 `RegistrationError` |

## 显式组件规则

应用级 discovery 只处理以下元数据：

| 装饰器 | 组件类型 | 默认生命周期 |
|---|---|---|
| `@Service()` | `service` | `SINGLETON` |
| `@Repository()` | `repository` | `SINGLETON` |
| `@Component()` | 自定义 component | `SINGLETON` |
| `@Controller()` | `controller` | `SCOPED` |
| `@Executor()` | `executor` | `SINGLETON` |

普通 class 不注册。这样可以让代码扫描结果可审计，避免目录命名或导出顺序造成隐式行为。

## DI token 规则

默认 token 使用类名首字母小写：

| 类名 | token |
|---|---|
| `UserService` | `userService` |
| `HealthController` | `healthController` |
| `OrderRepository` | `orderRepository` |

重复 token 是配置错误，必须失败。

## 请求作用域

每个请求创建 Awilix scope，并注册：

- `request`
- `reply`
- `requestId`
- `logger`
- `diScope`

控制器 handler 从请求 scope 解析 controller，因此 controller 可以接收 request-scoped token。

## 与插件级 AutoDI 的边界

| 层级 | 入口 | 配置字段 | 适用场景 |
|---|---|---|---|
| 应用级 | `ApplicationDiscoveryPipeline` | `config.discovery` | 应用源码中的 service/controller/repository/executor |
| 插件级 | `withRegisterAutoDI` | 插件自身 `AutoDIConfig` | 生态插件内部模块注册 |

两者不共享配置字段，不互相兜底。插件级能力仍然保留，但它不再承担应用级 discovery 的职责。

