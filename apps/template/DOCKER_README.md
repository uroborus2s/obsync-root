# @wps/template Docker 部署指南

本文档说明如何将 `@wps/template` 应用打包到 Docker 容器中运行。

## 🏗️ 项目结构

```
obsync-root/                    # monorepo 根目录
├── packages/                   # 内部依赖包
│   ├── core/
│   ├── utils/
│   ├── web/
│   └── ...
├── apps/
│   └── template/              # 目标应用
│       ├── src/
│       ├── package.json
│       ├── dockerfile         # Docker 构建文件
│       ├── docker-compose.yml # Docker Compose 配置
│       └── build-docker.sh    # 构建脚本
└── pnpm-workspace.yaml       # pnpm 工作区配置
```

## 🐳 Docker 构建策略

### 多阶段构建

我们使用多阶段构建来优化镜像大小和构建效率：

1. **base**: 基础镜像，安装 Node.js 和 pnpm
2. **deps**: 安装所有依赖（包括开发依赖）
3. **builder**: 构建应用和所有依赖包
4. **prod-deps**: 只安装生产依赖
5. **runner**: 最终运行镜像

### 处理 Monorepo 依赖

关键点：
- 复制所有 `packages/` 目录的源码
- 使用 `turbo run build --filter=@wps/template...` 构建依赖链
- 在最终镜像中包含构建后的依赖包

## 🚀 快速开始

### 方法一：使用构建脚本（推荐）

```bash
# 进入应用目录
cd apps/template

# 构建镜像
./build-docker.sh

# 构建并指定标签
./build-docker.sh -t v1.0.0

# 构建并推送到仓库
./build-docker.sh -r your-registry.com -t v1.0.0 --push
```

### 方法二：使用 Docker Compose

```bash
# 进入应用目录
cd apps/template

# 构建并启动
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 方法三：直接使用 Docker

```bash
# 从项目根目录构建
docker build -f apps/template/dockerfile -t wps-template .

# 运行容器
docker run -p 3000:3000 wps-template
```

## 📋 构建脚本选项

`build-docker.sh` 支持以下选项：

| 选项 | 说明 | 示例 |
|------|------|------|
| `-t, --tag` | 设置镜像标签 | `-t v1.0.0` |
| `-r, --registry` | 设置镜像仓库地址 | `-r registry.example.com` |
| `--push` | 构建后推送到仓库 | `--push` |
| `-h, --help` | 显示帮助信息 | `-h` |

## 🔧 环境配置

### 环境变量

应用支持以下环境变量：

- `NODE_ENV`: 运行环境 (production/development)
- `PORT`: 应用端口 (默认: 3000)

### 配置文件

确保 `prod.env.json` 文件包含生产环境所需的配置：

```json
{
  "database": {
    "host": "your-db-host",
    "port": 3306,
    "username": "your-username",
    "password": "your-password"
  }
}
```

## 🏥 健康检查

Docker Compose 配置包含健康检查：

```yaml
healthcheck:
  test: ["CMD", "node", "-e", "require('http').get('http://localhost:3000/health', ...)"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

确保你的应用提供 `/health` 端点。

## 📊 监控和日志

### 查看容器状态

```bash
# 查看运行中的容器
docker ps

# 查看容器详细信息
docker inspect wps-template
```

### 查看日志

```bash
# 实时查看日志
docker logs -f wps-template

# 查看最近的日志
docker logs --tail 100 wps-template
```

## 🔍 故障排除

### 常见问题

1. **构建失败 - 找不到依赖包**
   ```bash
   # 确保从项目根目录构建
   cd /path/to/obsync-root
   docker build -f apps/template/dockerfile -t wps-template .
   ```

2. **运行时错误 - 模块找不到**
   ```bash
   # 检查是否正确复制了 packages 目录
   docker run -it wps-template ls -la packages/
   ```

3. **权限问题**
   ```bash
   # 检查文件权限
   ls -la apps/template/build-docker.sh
   # 如果没有执行权限，添加权限
   chmod +x apps/template/build-docker.sh
   ```

### 调试模式

```bash
# 进入容器调试
docker run -it --entrypoint /bin/sh wps-template

# 查看构建过程
docker build --no-cache -f apps/template/dockerfile -t wps-template .
```

## 🚀 生产部署建议

1. **使用多阶段构建**：已在 Dockerfile 中实现
2. **最小化镜像大小**：使用 Alpine Linux 基础镜像
3. **非 root 用户运行**：已配置 `appuser`
4. **健康检查**：已在 Docker Compose 中配置
5. **资源限制**：根据需要在 Docker Compose 中添加资源限制

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 1G
    reservations:
      cpus: '0.5'
      memory: 512M
```

## 📝 版本管理

建议使用语义化版本标签：

```bash
# 开发版本
./build-docker.sh -t dev

# 测试版本
./build-docker.sh -t v1.0.0-beta.1

# 生产版本
./build-docker.sh -t v1.0.0
``` 