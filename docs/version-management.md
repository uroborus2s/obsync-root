# API Gateway 版本管理系统

## 概述

API Gateway 现在支持灵活的版本管理策略，可以从 `package.json` 获取版本号，同时推送具体版本和 latest 标签，并在部署时使用具体版本号进行精确的版本控制。

## 版本策略

### 1. 版本生成策略

#### auto (推荐默认)
```bash
# 格式: v{package.json版本}-{git_hash}
# 示例: v1.0.0-abc123
```
- 结合 package.json 版本和 Git 提交哈希
- 既有语义化版本，又有唯一性标识
- 便于版本追踪和问题定位

#### package
```bash
# 格式: v{package.json版本}
# 示例: v1.0.0
```
- 直接使用 package.json 中的 version 字段
- 适合正式发布版本
- 需要手动更新 package.json 版本

#### timestamp
```bash
# 格式: v{YYYYMMDD}_{HHMMSS}_{git_hash}
# 示例: v20250824_141617_abc123
```
- 基于时间戳的版本格式
- 适合开发和测试环境
- 自动生成，无需手动维护

#### latest
```bash
# 格式: latest
```
- 使用 Docker 的 latest 标签
- 适合开发环境快速迭代

### 2. 推送策略

#### 同时推送版本号和 latest (推荐)
```bash
# 推送两个标签
docker push image:v1.0.0
docker push image:latest
```
- 便于版本追踪和快速部署
- latest 始终指向最新版本
- 可以回滚到任意历史版本

#### 仅推送版本号
```bash
# 仅推送具体版本
docker push image:v1.0.0
```
- 严格的版本控制
- 避免 latest 标签的不确定性

### 3. 部署策略

#### 使用具体版本号 (推荐)
```bash
# 拉取具体版本
docker pull image:v1.0.0
```
- 精确的版本控制
- 便于问题追踪和回滚
- 部署结果可预测

#### 使用 latest 标签
```bash
# 拉取最新版本
docker pull image:latest
```
- 快速获取最新版本
- 适合开发环境

## 配置选项

### 部署配置文件 (scripts/deploy/config/deploy.conf)

```bash
# 版本生成策略
API_GATEWAY_VERSION_STRATEGY="auto"  # auto, package, timestamp, latest

# 版本推送策略
API_GATEWAY_PUSH_LATEST="true"      # true: 同时推送版本号和latest, false: 仅推送版本号

# 部署标签策略
API_GATEWAY_DEPLOY_TAG_STRATEGY="version"  # version: 使用具体版本号, latest: 使用latest标签
```

## 使用方法

### 1. 更新版本号

#### 手动更新 package.json
```json
{
  "name": "@stratix/gateway",
  "version": "1.0.1",
  ...
}
```

#### 使用 npm 命令
```bash
cd apps/api-gateway

# 补丁版本 (1.0.0 -> 1.0.1)
npm version patch

# 次要版本 (1.0.1 -> 1.1.0)
npm version minor

# 主要版本 (1.1.0 -> 2.0.0)
npm version major
```

### 2. 构建镜像

#### 使用配置的默认策略
```bash
cd apps/api-gateway
./build.sh
```

#### 指定版本策略
```bash
# 使用 package.json 版本
./build.sh --use-package

# 使用时间戳版本
./build.sh --timestamp

# 使用 auto 策略
./build.sh stratix-gateway auto

# 手动指定版本
./build.sh stratix-gateway v1.2.3
```

### 3. 部署应用

#### 标准部署
```bash
# 使用配置的策略部署
./scripts/deploy/deploy.sh api-gateway
```

#### 预览部署
```bash
# 查看部署计划
./scripts/deploy/deploy.sh --dry-run api-gateway
```

### 4. 版本查询

部署完成后，系统会自动显示当前部署的版本信息：

```bash
✅ [API-GATEWAY] API Gateway Docker 镜像拉取完成
[API-GATEWAY] 当前部署版本: v1.0.0-abc123

# 验证阶段也会显示版本信息
[API-GATEWAY] 查询当前部署版本...
✅ [API-GATEWAY] 当前部署版本: v1.0.0-abc123
```

## 版本文件

### 本地版本文件
- `apps/api-gateway/.last_version`: 记录最后构建的版本号
- `/tmp/api_gateway_version_tag`: 临时版本标签文件

### 服务器版本文件
- `/opt/obsync/docker/.api_gateway_deployed_version`: 记录当前部署的版本号

## 最佳实践

### 开发环境
```bash
# 使用 auto 策略，便于开发调试
API_GATEWAY_VERSION_STRATEGY="auto"
API_GATEWAY_PUSH_LATEST="true"
API_GATEWAY_DEPLOY_TAG_STRATEGY="version"
```

### 测试环境
```bash
# 使用 package 策略，便于测试验证
API_GATEWAY_VERSION_STRATEGY="package"
API_GATEWAY_PUSH_LATEST="true"
API_GATEWAY_DEPLOY_TAG_STRATEGY="version"
```

### 生产环境
```bash
# 使用 package 策略，严格版本控制
API_GATEWAY_VERSION_STRATEGY="package"
API_GATEWAY_PUSH_LATEST="true"
API_GATEWAY_DEPLOY_TAG_STRATEGY="version"

# 发布流程
# 1. 更新 package.json 版本
# 2. 构建并推送镜像
# 3. 部署到生产环境
# 4. 验证部署结果
```

## 版本回滚

如果需要回滚到之前的版本：

1. 查看历史版本
```bash
# 查看 Docker 仓库中的历史版本
docker search g-rrng9518-docker.pkg.coding.net/obsync/sync/stratix-gateway
```

2. 手动指定版本部署
```bash
# 修改 Docker Compose 文件中的镜像标签
# 或者重新构建指定版本的镜像
```

## 故障排除

### 版本获取失败
- 检查 package.json 文件是否存在
- 检查 version 字段格式是否正确
- 确保在正确的项目目录下执行命令

### 构建失败
- 检查 Docker 服务是否运行
- 检查网络连接和仓库权限
- 查看构建日志中的具体错误信息

### 部署版本不匹配
- 检查版本文件是否正确生成
- 确认镜像是否成功推送到仓库
- 验证部署配置中的版本策略设置
