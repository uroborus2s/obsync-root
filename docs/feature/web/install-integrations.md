# 安装 @stratix/web 集成插件依赖

本文档介绍如何安装 @stratix/web 中使用的各种集成插件依赖，这些依赖用于支持 HTTPS、CORS、压缩、Swagger 文档和静态文件服务等功能。

## 安装全部集成依赖

如果你计划使用 @stratix/web 的所有集成功能，可以一次性安装所有依赖：

```bash
# 使用 npm
npm install @fastify/cors @fastify/compress @fastify/helmet @fastify/static @fastify/swagger @fastify/swagger-ui

# 使用 yarn
yarn add @fastify/cors @fastify/compress @fastify/helmet @fastify/static @fastify/swagger @fastify/swagger-ui

# 使用 pnpm
pnpm add @fastify/cors @fastify/compress @fastify/helmet @fastify/static @fastify/swagger @fastify/swagger-ui
```

## 按需安装依赖

如果你只需要使用部分集成功能，可以只安装相应的依赖：

### CORS 支持

```bash
npm install @fastify/cors
```

### 压缩支持

```bash
npm install @fastify/compress
```

### 安全头部 (Helmet) 支持

```bash
npm install @fastify/helmet
```

### 静态文件服务

```bash
npm install @fastify/static
```

### Swagger API 文档

```bash
npm install @fastify/swagger @fastify/swagger-ui
```

## 验证依赖安装

安装完成后，你可以通过以下命令验证依赖是否已正确安装：

```bash
npm list @fastify/cors @fastify/compress @fastify/helmet @fastify/static @fastify/swagger @fastify/swagger-ui
```

## 注意事项

1. @stratix/web 插件会根据你的配置动态加载这些依赖，如果你没有安装某个依赖但在配置中启用了相应功能，启动时会出现错误。

2. 确保安装的依赖版本与 @stratix/web 兼容，建议参考 @stratix/web 的 package.json 中的 peerDependencies 字段。

3. 如果使用的是 monorepo 架构，确保依赖安装在正确的包中，或者配置了工作区依赖共享。 