# iCalink Sync Docker 构建指南

本文档说明如何使用Docker构建和推送iCalink Sync镜像到私有仓库。

## 📋 前提条件

### 系统要求
- Docker 20.10.0+
- Docker Buildx (多平台构建支持)
- Bash shell

### 验证环境
```bash
# 检查Docker版本
docker --version

# 检查Docker Buildx
docker buildx version

# 检查Docker守护进程
docker info
```

## 🚀 快速开始

### 1. 基本构建和推送
```bash
# 进入项目目录
cd apps/icalink-sync

# 使用默认配置构建并推送
./build.sh

# 指定版本号
./build.sh icalink-sync v1.0.0
```

### 2. 预览模式（不实际执行）
```bash
# 查看将要执行的命令
./build.sh --dry-run

# 预览指定版本的构建
./build.sh --dry-run icalink-sync v1.0.0
```

## 🔧 构建选项

### 命令行参数
```bash
./build.sh [OPTIONS] [PROJECT_NAME] [VERSION]
```

**参数说明：**
- `PROJECT_NAME`: 项目名称（默认: icalink-sync）
- `VERSION`: 版本标签（默认: latest）

**选项说明：**
- `-h, --help`: 显示帮助信息
- `--no-cache`: 禁用构建缓存
- `--dry-run`: 仅显示命令，不实际执行
- `--multi-arch`: 构建多架构镜像（linux/amd64,linux/arm64）
- `--latest`: 同时推送latest标签

### 使用示例

```bash
# 1. 基本使用
./build.sh

# 2. 指定版本
./build.sh icalink-sync v1.2.3

# 3. 禁用缓存构建
./build.sh --no-cache

# 4. 多架构构建
./build.sh --multi-arch

# 5. 同时推送latest标签
./build.sh --latest icalink-sync v1.0.0

# 6. 组合选项
./build.sh --no-cache --multi-arch --latest icalink-sync v1.0.0
```

## 📦 镜像信息

### 仓库配置
- **Registry**: g-rrng9518-docker.pkg.coding.net
- **Namespace**: obsync/sync
- **完整镜像名**: g-rrng9518-docker.pkg.coding.net/obsync/sync/icalink-sync

### 支持的平台
- **默认**: linux/amd64
- **多架构**: linux/amd64, linux/arm64（使用--multi-arch选项）

### 镜像标签
- 指定版本：如 v1.0.0, 1.2.3
- latest：最新版本（使用--latest选项或version=latest）

## 🔍 构建过程

### 1. 环境检查
脚本会自动检查：
- Docker是否安装
- Docker Buildx是否可用
- 必要文件是否存在（package.json, dockerfile, .npmrc）
- Docker守护进程是否运行

### 2. 登录私有仓库
自动登录到CODING制品库：
```bash
echo 'PASSWORD' | docker login -u 'USERNAME' --password-stdin 'REGISTRY'
```

### 3. 设置构建器
创建并使用多架构构建器：
```bash
docker buildx create --name multiarch --use --bootstrap
docker buildx use multiarch
```

### 4. 执行构建
使用Docker Buildx进行多平台构建：
```bash
docker buildx build \
  --platform linux/amd64 \
  --tag g-rrng9518-docker.pkg.coding.net/obsync/sync/icalink-sync:v1.0.0 \
  --push \
  --file dockerfile \
  .
```

### 5. 验证镜像
构建完成后验证镜像信息：
```bash
docker buildx imagetools inspect IMAGE_NAME
```

## 📁 文件结构

构建需要以下文件：
```
apps/icalink-sync/
├── package.json          # 项目配置
├── tsconfig.json         # TypeScript配置
├── tsconfig.build.json   # 构建专用TypeScript配置
├── dockerfile            # Docker构建文件
├── .npmrc               # npm私有仓库配置
├── build.sh             # 构建脚本
└── src/                 # 源代码目录
```

## 🐛 故障排除

### 常见问题

**1. Docker守护进程未运行**
```bash
# 启动Docker Desktop或Docker服务
sudo systemctl start docker  # Linux
# 或启动Docker Desktop应用    # macOS/Windows
```

**2. 权限问题**
```bash
# 给脚本添加执行权限
chmod +x build.sh

# 检查Docker权限
docker ps
```

**3. 网络问题**
```bash
# 检查网络连接
ping g-rrng9518-docker.pkg.coding.net

# 检查Docker登录
docker login g-rrng9518-docker.pkg.coding.net
```

**4. 构建失败**
```bash
# 查看详细错误信息
./build.sh --no-cache

# 检查dockerfile语法
docker build --no-cache -f dockerfile .
```

### 调试技巧

```bash
# 1. 使用dry-run模式查看命令
./build.sh --dry-run

# 2. 手动执行单个步骤
docker buildx build --platform linux/amd64 -t test-image .

# 3. 检查镜像层
docker history IMAGE_NAME

# 4. 进入容器调试
docker run -it --entrypoint sh IMAGE_NAME
```

## 📚 相关文档

- [Docker官方文档](https://docs.docker.com/)
- [Docker Buildx文档](https://docs.docker.com/buildx/)
- [CODING制品库文档](https://help.coding.net/docs/artifacts/intro.html)

## 🆘 获取帮助

如果遇到问题：
1. 查看构建日志中的错误信息
2. 使用`--dry-run`模式检查命令
3. 检查网络连接和权限设置
4. 参考故障排除部分
