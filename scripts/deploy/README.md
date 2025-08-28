# ObSync 部署脚本使用指南

这是 ObSync 项目的自动化部署脚本，支持多服务器、多模块的灵活部署，包括静态文件、Nginx 配置、SSL 证书和 Docker 化后端应用的完整部署解决方案。

## 🌟 功能特性

- **多服务器支持**: 支持主服务器和备用服务器的独立或同时部署
- **模块化部署**: 支持按模块独立部署，包括 Nginx、SSL、静态文件、Docker 应用等
- **统一容器管理**: 基于统一的 Docker Compose 配置管理所有后端服务
- **独立应用部署**: 支持单独部署 API Gateway、ICA Sync 等应用而不影响其他服务
- **环境管理**: 支持多环境部署 (dev/staging/prod)
- **安全部署**: 包含备份、验证、回滚等安全机制
- **预览模式**: 支持 dry-run 模式预览部署操作
- **详细日志**: 提供详细的部署日志和状态反馈

## 📁 目录结构

```
scripts/deploy/
├── deploy.sh                    # 主部署脚本
├── modules/                     # 部署模块
│   ├── nginx-config.sh         # Nginx 配置部署
│   ├── ssl-certs.sh           # SSL 证书部署
│   ├── static-app.sh          # agendaedu-app 静态文件
│   ├── static-web.sh          # agendaedu-web 静态文件
│   ├── docker-compose.sh      # Docker Compose 配置管理
│   ├── api-gateway.sh         # API Gateway 应用部署
│   ├── icasync.sh             # ICA Sync 应用部署
│   └── backend-apps.sh        # 后端应用统一部署
├── config/                     # 配置文件
│   ├── servers.conf           # 服务器配置
│   └── deploy.conf           # 部署配置
├── docker-compose/             # Docker Compose 配置文件
│   ├── main-server.yml        # 主服务器统一配置
│   └── backup-server.yml      # 备用服务器统一配置
├── nginx/                      # Nginx 配置文件
│   ├── main-server/          # 主服务器配置
│   │   ├── kwps.jlufe.edu.cn
│   │   └── proxy_params
│   └── backup-server/        # 备用服务器配置
│       ├── nginx.conf
│       └── server-2-internal
├── ssl/                       # SSL 证书文件
│   ├── STAR_jlufe_edu_cn.pem
│   └── STAR_jlufe_edu_cn.key
└── README.md                  # 本文件
```

## 🏗️ 部署架构

### 统一 Docker Compose 配置架构

ObSync 采用统一的 Docker Compose 配置架构，每个服务器使用单一的配置文件管理所有 Docker 化应用：

- **主服务器配置**: `/opt/obsync/docker/docker-compose.yml` (来源: `docker-compose/main-server.yml`)
- **备用服务器配置**: `/opt/obsync/docker/docker-compose.yml` (来源: `docker-compose/backup-server.yml`)

### 包含的 Docker 服务

**主服务器服务**:
- `api-gateway-1` - API Gateway 实例 1 (端口 8090)
- `api-gateway-2` - API Gateway 实例 2 (端口 8091)
- `app-icasync` - ICA Sync 应用 (端口 3001)
- `mysql-icasync` - MySQL 数据库 (端口 3306)
- `redis-gateway` - Redis (API Gateway) (端口 6379)
- `redis-icasync` - Redis (ICA Sync) (端口 6380)

**备用服务器服务**:
- `api-gateway-1` - API Gateway 备用实例 1 (端口 8090)
- `api-gateway-2` - API Gateway 备用实例 2 (端口 8091)
- `app-icasync` - ICA Sync 备用应用 (端口 3001)
- `mysql-icasync` - MySQL 备用数据库 (端口 3306)
- `redis-gateway` - Redis 备用 (API Gateway) (端口 6379)
- `redis-icasync` - Redis 备用 (ICA Sync) (端口 6380)

## 🎯 部署模块说明

### 可用模块

#### 静态文件和配置模块
- **nginx** - 部署 Nginx 配置文件
- **ssl** - 部署 SSL 证书文件
- **app** - 编译并部署 agendaedu-app 静态文件
- **web** - 编译并部署 agendaedu-web 静态文件

#### Docker 应用模块
- **docker-compose** - 部署统一的 Docker Compose 配置文件
- **api-gateway** - 构建并部署 API Gateway 应用
- **icasync** - 构建并部署 ICA Sync 应用
- **backend-apps** - 构建并部署所有后端应用 (API Gateway + ICA Sync)

#### 综合模块
- **all** - 部署所有模块 (推荐的完整部署)

### 目标服务器
- **main** - 主服务器 (120.131.12.6)
- **backup** - 备用服务器 (120.131.10.128)
- **all** - 所有服务器 (默认)

## 📋 命令行语法

```bash
./deploy.sh [选项] [模块...]
```

### 选项参数
- `-s, --server SERVER` - 指定目标服务器 (main|backup|all)
- `-e, --env ENV` - 指定环境 (dev|staging|prod)
- `-f, --force` - 强制部署，跳过确认
- `-d, --dry-run` - 预览模式，不执行实际部署
- `-v, --verbose` - 详细输出
- `-h, --help` - 显示帮助信息

### 模块参数
- `nginx` - 部署 Nginx 配置文件
- `ssl` - 部署 SSL 证书文件
- `app` - 编译并部署 agendaedu-app 静态文件
- `web` - 编译并部署 agendaedu-web 静态文件
- `docker-compose` - 部署统一的 Docker Compose 配置文件
- `api-gateway` - 构建并部署 API Gateway 应用
- `icasync` - 构建并部署 ICA Sync 应用
- `backend-apps` - 构建并部署所有后端应用 (API Gateway + ICA Sync)
- `all` - 部署所有模块

## 🚀 快速开始

### 1. 配置 SSH 别名

首先配置 SSH 别名，编辑 `~/.ssh/config`：

```bash
Host jlufe_12.6
    HostName 120.131.12.6
    User ubuntu
    IdentityFile ~/.ssh/your_key

Host jlufe_10.128
    HostName 120.131.10.128
    User ubuntu
    IdentityFile ~/.ssh/your_key
```

### 2. 检查依赖

确保安装了必要的依赖：

```bash
# 检查必需工具
ssh --version
scp --version
rsync --version
node --version
pnpm --version

# 如果缺少 pnpm
npm install -g pnpm
```

### 3. 验证连接

测试服务器连接：

```bash
ssh jlufe_12.6 "echo 'Main server connected'"
ssh jlufe_10.128 "echo 'Backup server connected'"
```

### 4. 执行部署

```bash
# 进入部署目录
cd scripts/deploy

# 给脚本执行权限
chmod +x deploy.sh

# 查看帮助信息
./deploy.sh --help

# 预览部署操作
./deploy.sh --dry-run all

# 执行实际部署
./deploy.sh all
```

## 📋 详细使用示例

### 基本部署命令

#### 1. 静态文件和配置部署
```bash
# 部署 Nginx 配置到所有服务器
./deploy.sh nginx

# 部署 SSL 证书到主服务器
./deploy.sh -s main ssl

# 编译并部署 App 静态文件
./deploy.sh app

# 编译并部署 Web 静态文件
./deploy.sh web
```

#### 2. Docker 应用部署
```bash
# 部署统一的 Docker Compose 配置
./deploy.sh docker-compose

# 部署 Docker Compose 配置到特定服务器
./deploy.sh -s main docker-compose
./deploy.sh -s backup docker-compose

# 强制重启所有 Docker 服务
./deploy.sh --force docker-compose
```

#### 3. 独立应用部署
```bash
# 部署 API Gateway 应用
./deploy.sh api-gateway

# 部署 ICA Sync 应用
./deploy.sh icasync

# 部署到特定服务器
./deploy.sh -s main api-gateway
./deploy.sh -s backup icasync

# 部署所有后端应用
./deploy.sh backend-apps
```

#### 4. 推荐的部署顺序
```bash
# 1. 首次完整部署 (推荐)
./deploy.sh all

# 2. 分步骤部署
# 第一步：部署基础配置
./deploy.sh nginx ssl

# 第二步：部署静态文件
./deploy.sh app web

# 第三步：部署 Docker 配置
./deploy.sh docker-compose

# 第四步：部署后端应用
./deploy.sh backend-apps
```

#### 5. 多模块组合部署
```bash
# 部署 Nginx 和 SSL 到主服务器
./deploy.sh -s main nginx ssl

# 部署静态文件到主服务器
./deploy.sh -s main app web

# 部署配置和后端应用
./deploy.sh docker-compose backend-apps

# 部署所有模块到所有服务器
./deploy.sh all
```

#### 6. 指定服务器部署
```bash
# 仅部署到主服务器
./deploy.sh -s main nginx ssl app web docker-compose backend-apps

# 仅部署到备用服务器
./deploy.sh -s backup nginx docker-compose backend-apps

# 部署到所有服务器 (默认)
./deploy.sh nginx docker-compose backend-apps
```

### 高级选项使用

#### 1. 预览模式
```bash
# 预览所有部署操作，不执行实际部署
./deploy.sh --dry-run all

# 预览特定模块部署
./deploy.sh --dry-run -s main nginx ssl

# 预览 + 详细输出
./deploy.sh --dry-run --verbose app web
```

#### 2. 强制部署
```bash
# 跳过确认，直接部署
./deploy.sh --force nginx ssl

# 强制部署所有模块
./deploy.sh --force all

# 强制 + 详细输出
./deploy.sh --force --verbose -s main app web
```

#### 3. 环境指定
```bash
# 指定生产环境
./deploy.sh --env prod all

# 指定开发环境
./deploy.sh --env dev app web

# 指定测试环境
./deploy.sh --env staging nginx
```

### 组合使用示例

#### 1. 完整生产部署
```bash
# 生产环境完整部署 (强制 + 详细输出)
./deploy.sh -e prod -f -v all
```

#### 2. 开发测试部署
```bash
# 开发环境预览部署
./deploy.sh -e dev -d -v nginx ssl

# 开发环境静态文件部署
./deploy.sh -e dev -f app web
```

#### 3. 维护更新部署
```bash
# 仅更新主服务器配置
./deploy.sh -s main -f nginx ssl

# 仅更新静态文件
./deploy.sh -s main -f app web

# 仅更新备用服务器配置
./deploy.sh -s backup -f nginx
```

#### 4. 故障恢复部署
```bash
# 快速恢复主服务器
./deploy.sh -s main -f all

# 快速恢复备用服务器
./deploy.sh -s backup -f nginx
```

## ⚙️ 配置文件说明

### config/servers.conf - 服务器配置
```bash
# 主服务器配置 (使用 SSH 别名)
MAIN_SERVER_HOST="jlufe_12.6"
MAIN_SERVER_USER="ubuntu"
MAIN_SERVER_NAME="主服务器(120.131.12.6)"

# 备用服务器配置 (使用 SSH 别名)
BACKUP_SERVER_HOST="jlufe_10.128"
BACKUP_SERVER_USER="ubuntu"
BACKUP_SERVER_NAME="备用服务器(120.131.10.128)"

# 服务器路径配置
NGINX_SITES_AVAILABLE="/etc/nginx/sites-available"
NGINX_SITES_ENABLED="/etc/nginx/sites-enabled"
NGINX_CONF_DIR="/etc/nginx"
SSL_CERT_DIR="/etc/nginx/ssl"
STATIC_WEB_DIR="/var/www/agendaedu-web"
STATIC_APP_DIR="/var/www/agendaedu-app"
BACKUP_DIR="/opt/obsync/backups"
LOG_DIR="/var/log/obsync"

# SSH 配置
SSH_TIMEOUT="30"
SSH_OPTIONS="-o ConnectTimeout=30 -o ServerAliveInterval=60 -o ServerAliveCountMax=3"
```

### config/deploy.conf - 部署配置
```bash
# 默认环境
DEFAULT_ENVIRONMENT="prod"

# 静态文件编译配置
NODE_ENV="production"
BUILD_TIMEOUT="600"  # 编译超时时间 (秒)

# agendaedu-web 配置
WEB_SOURCE_DIR="$SCRIPT_DIR/../../apps/agendaedu-web"
WEB_BUILD_DIR="$WEB_SOURCE_DIR/dist"
WEB_BUILD_COMMAND="pnpm run build"
WEB_INSTALL_COMMAND="pnpm install"

# agendaedu-app 配置
APP_SOURCE_DIR="$SCRIPT_DIR/../../apps/agendaedu-app"
APP_BUILD_DIR="$APP_SOURCE_DIR/dist"
APP_BUILD_COMMAND="pnpm run build"
APP_INSTALL_COMMAND="pnpm install"

# SSL 证书配置
SSL_SOURCE_DIR="$SCRIPT_DIR/ssl"
SSL_CERT_FILE="STAR_jlufe_edu_cn.pem"
SSL_KEY_FILE="STAR_jlufe_edu_cn.key"

# Nginx 配置
NGINX_SOURCE_DIR="$SCRIPT_DIR/nginx"
MAIN_SERVER_SITE_NAME="kwps.jlufe.edu.cn"
BACKUP_SERVER_SITE_NAME="server-2-internal"

# 部署选项
BACKUP_ENABLED="true"
VERIFY_DEPLOYMENT="true"
RESTART_SERVICES="true"
```

## 🔧 部署模块详细说明

### nginx-config.sh - Nginx 配置部署
- **功能**: 部署 Nginx 配置文件
- **支持服务器**: 主服务器和备用服务器
- **主服务器部署**:
  - 站点配置文件: `kwps.jlufe.edu.cn`
  - 代理参数文件: `proxy_params`
  - 创建软链接到 sites-enabled
- **备用服务器部署**:
  - 站点配置文件: `server-2-internal`
  - **不修改** `nginx.conf` (保持服务器现有配置)
  - 创建软链接到 sites-enabled
- **验证**: 配置语法检查、服务重载、端口监听检查

### ssl-certs.sh - SSL 证书部署
- **功能**: 部署 SSL 证书文件
- **支持服务器**: 仅主服务器
- **部署文件**:
  - 证书文件: `STAR_jlufe_edu_cn.pem`
  - 私钥文件: `STAR_jlufe_edu_cn.key`
- **验证**: 证书格式检查、有效期检查、证书私钥匹配验证
- **安全**: 自动设置正确的文件权限 (644/600)

### static-app.sh - App 静态文件部署
- **功能**: 编译并部署 agendaedu-app 静态文件
- **支持服务器**: 仅主服务器
- **源码路径**: `apps/agendaedu-app` (相对于项目根目录)
- **编译工具**: pnpm
- **编译命令**: `pnpm run build`
- **部署流程**:
  1. 检查源码目录
  2. 安装依赖 (`pnpm install`)
  3. 编译静态文件 (`pnpm run build`)
  4. 备份现有文件
  5. 同步新文件到服务器 (`/var/www/agendaedu-app`)
  6. 设置文件权限
  7. 验证部署结果
- **验证**: 文件存在性检查、HTTP 访问测试

### static-web.sh - Web 静态文件部署
- **功能**: 编译并部署 agendaedu-web 静态文件
- **支持服务器**: 仅主服务器
- **源码路径**: `apps/agendaedu-web` (相对于项目根目录)
- **编译工具**: pnpm
- **编译命令**: `pnpm run build`
- **部署流程**:
  1. 检查源码目录
  2. 安装依赖 (`pnpm install`)
  3. 编译静态文件 (`pnpm run build`)
  4. 备份现有文件
  5. 同步新文件到服务器 (`/var/www/agendaedu-web`)
  6. 设置文件权限
  7. 验证部署结果
- **验证**: 文件存在性检查、HTTP/HTTPS 访问测试

### docker-compose.sh - Docker Compose 配置管理
- **功能**: 部署统一的 Docker Compose 配置文件
- **支持服务器**: 主服务器和备用服务器
- **配置文件**:
  - 主服务器: `scripts/deploy/docker-compose/main-server.yml`
  - 备用服务器: `scripts/deploy/docker-compose/backup-server.yml`
- **部署流程**:
  1. 检查本地配置文件语法
  2. 创建服务器目录结构
  3. 备份现有配置
  4. 上传统一配置文件到 `/opt/obsync/docker/docker-compose.yml`
  5. 验证配置文件语法
  6. 可选：重启所有服务 (使用 --force)
- **验证**: 配置语法检查、服务列表显示
- **目标路径**: `/opt/obsync/docker/docker-compose.yml`
- **包含服务**: API Gateway (双实例)、ICA Sync、MySQL、Redis

### api-gateway.sh - API Gateway 应用部署
- **功能**: 构建并部署 API Gateway 应用
- **支持服务器**: 主服务器和备用服务器
- **源码路径**: `apps/api-gateway`
- **构建工具**: Docker + 自定义构建脚本
- **前置条件**: 需要先部署 Docker Compose 配置
- **部署流程**:
  1. 检查本地环境和服务器 Docker Compose 配置
  2. 执行构建脚本生成 Docker 镜像
  3. 推送镜像到 Docker 仓库
  4. 停止现有 API Gateway 容器
  5. 拉取最新镜像并更新配置
  6. 启动 API Gateway 容器
  7. 验证服务状态
- **验证**: 容器状态检查、健康检查端点测试
- **Docker 仓库**: `g-rrng9518-docker.pkg.coding.net/obsync/sync/stratix-gateway`
- **服务端口**: 8090, 8091
- **容器名称**: `api-gateway-1`, `api-gateway-2`

### icasync.sh - ICA Sync 应用部署
- **功能**: 构建并部署 ICA Sync 应用
- **支持服务器**: 主服务器和备用服务器
- **源码路径**: `apps/app-icasync`
- **构建工具**: Docker + 自定义构建脚本
- **前置条件**: 需要先部署 Docker Compose 配置
- **部署流程**:
  1. 检查本地环境和服务器 Docker Compose 配置
  2. 执行构建脚本生成 Docker 镜像
  3. 推送镜像到 Docker 仓库
  4. 停止现有 ICA Sync 容器
  5. 拉取最新镜像并更新配置
  6. 启动 ICA Sync 及其依赖服务 (MySQL, Redis)
  7. 验证服务状态
- **验证**: 容器状态检查、健康检查端点测试
- **Docker 仓库**: `g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icasync`
- **服务端口**: 3001
- **容器名称**: `app-icasync`
- **依赖服务**: MySQL, Redis (自动管理)
- **支持服务器**: 主服务器和备用服务器
- **配置文件**:
  - 主服务器: `scripts/deploy/docker-compose/main-server.yml`
  - 备用服务器: `scripts/deploy/docker-compose/backup-server.yml`
- **部署流程**:
  1. 检查本地配置文件语法
  2. 创建服务器目录结构
  3. 备份现有配置
  4. 上传统一配置文件到 `/opt/obsync/docker/docker-compose.yml`
  5. 验证配置文件语法
  6. 可选：重启所有服务 (使用 --force)
- **验证**: 配置语法检查、服务列表显示
- **目标路径**: `/opt/obsync/docker/docker-compose.yml`

### icasync.sh - ICA Sync 应用部署
- **功能**: 构建并部署 ICA Sync 应用
- **支持服务器**: 主服务器和备用服务器
- **源码路径**: `apps/app-icasync`
- **构建工具**: Docker + 自定义构建脚本
- **部署流程**:
  1. 检查本地环境和服务器 Docker Compose 配置
  2. 执行构建脚本生成 Docker 镜像
  3. 推送镜像到 Docker 仓库
  4. 停止现有 ICA Sync 容器
  5. 拉取最新镜像并更新配置
  6. 启动 ICA Sync 及其依赖服务 (MySQL, Redis)
  7. 验证服务状态
- **验证**: 容器状态检查、健康检查端点测试
- **Docker 仓库**: `g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icasync`
- **服务端口**: 3001
- **依赖服务**: MySQL, Redis (自动管理)

### backend-apps.sh - 后端应用统一部署
- **功能**: 统一构建并部署所有后端应用
- **支持服务器**: 主服务器和备用服务器
- **前置条件**: 需要先部署 Docker Compose 配置
- **包含应用**:
  - **API Gateway**: `apps/api-gateway` → 端口 8090,8091
  - **ICA Sync**: `apps/app-icasync` → 端口 3001
- **部署流程**:
  1. 检查所有应用的本地环境
  2. 检查服务器 Docker Compose 配置
  3. 顺序构建所有应用的 Docker 镜像
  4. 推送镜像到 Docker 仓库
  5. 停止现有应用容器
  6. 拉取最新镜像并更新配置
  7. 启动新的应用容器
  8. 验证所有服务状态
- **验证**: 每个应用独立的容器状态检查和健康检查
- **Docker 仓库**:
  - API Gateway: `g-rrng9518-docker.pkg.coding.net/obsync/sync/stratix-gateway`
  - ICA Sync: `g-rrng9518-docker.pkg.coding.net/obsync/sync/app-icasync`
- **依赖服务**: MySQL, Redis (通过统一配置管理)
- **优势**: 一次性更新所有后端应用，确保版本一致性

## 🛡️ 安全特性和验证机制

### 1. 自动备份机制
- **配置文件备份**: 部署前自动备份现有配置文件
- **静态文件备份**: 部署前自动备份现有静态文件
- **时间戳命名**: 备份文件使用时间戳命名，便于识别和恢复
- **备份位置**: 服务器 `/opt/obsync/backups/` 目录
- **保留策略**: 可配置备份文件保留天数

### 2. 部署前验证
- **SSH 连接验证**: 部署前检查所有目标服务器连接状态
- **依赖检查**: 验证本地必需工具 (ssh, scp, rsync, node, pnpm, docker)
- **源码检查**: 验证源码目录和构建脚本存在性
- **SSL 证书验证**: 检查证书格式、有效期、证书私钥匹配
- **Docker 环境检查**: 验证 Docker 服务运行状态和镜像仓库连接
- **Docker Compose 配置检查**: 验证服务器上的统一配置文件存在性

### 3. 部署后验证
- **配置语法检查**: Nginx 配置语法验证 (`nginx -t`)
- **服务状态检查**: 验证 Nginx 服务运行状态
- **端口监听检查**: 验证 HTTP/HTTPS 端口监听状态
- **访问测试**: HTTP/HTTPS 健康检查端点测试
- **文件完整性**: 验证部署文件存在性和权限设置
- **Docker 容器验证**: 检查容器运行状态和健康检查
- **Docker 服务验证**: 验证 API Gateway、ICA Sync 等应用的健康状态
- **依赖服务验证**: 检查 MySQL、Redis 等依赖服务的连接状态

### 4. 错误处理和恢复
- **详细日志**: 彩色输出，清晰的成功/警告/错误标识
- **失败停止**: 遇到错误自动停止，防止级联故障
- **强制模式**: 可选的强制继续模式 (`--force`)
- **预览模式**: 干运行模式预览所有操作 (`--dry-run`)
- **回滚准备**: 保留备份文件，便于手动回滚

### 5. 权限和安全
- **最小权限**: 文件设置适当的权限 (644/600/755)
- **用户权限**: 使用 ubuntu 用户权限，避免 root 操作
- **SSH 密钥**: 使用 SSH 密钥认证，避免密码传输
- **访问控制**: 备用服务器配置 IP 白名单访问控制

## 🔍 故障排查指南

### 常见问题和解决方案

#### 1. SSH 连接问题
```bash
# 问题：无法连接到服务器
# 解决：检查 SSH 配置和密钥

# 检查 SSH 配置文件
cat ~/.ssh/config

# 测试连接
ssh jlufe_12.6 "echo 'Main server connected'"
ssh jlufe_10.128 "echo 'Backup server connected'"

# 检查 SSH 密钥
ssh-add -l

# 重新加载 SSH 密钥
ssh-add ~/.ssh/your_private_key
```

#### 2. 编译失败问题
```bash
# 问题：静态文件编译失败
# 解决：检查 Node.js 和 pnpm 环境

# 检查版本
node --version    # 建议 >= 16.x
pnpm --version    # 建议 >= 7.x

# 安装 pnpm (如果缺少)
npm install -g pnpm

# 手动测试编译
cd apps/agendaedu-web
pnpm install
pnpm run build

cd ../agendaedu-app
pnpm install
pnpm run build
```

#### 3. 权限问题
```bash
# 问题：脚本无法执行或文件权限错误
# 解决：设置正确的文件权限

# 给脚本执行权限
chmod +x scripts/deploy/deploy.sh
chmod +x scripts/deploy/modules/*.sh

# 检查文件权限
ls -la scripts/deploy/
ls -la scripts/deploy/modules/
```

#### 4. 配置文件问题
```bash
# 问题：配置文件路径或内容错误
# 解决：验证配置文件

# 检查服务器配置
cat scripts/deploy/config/servers.conf

# 检查部署配置
cat scripts/deploy/config/deploy.conf

# 验证源码路径
ls -la apps/agendaedu-web/package.json
ls -la apps/agendaedu-app/package.json
```

#### 5. 服务器端问题
```bash
# 问题：Nginx 配置错误或服务异常
# 解决：在服务器上检查状态

# 登录服务器检查
ssh jlufe_12.6

# 检查 Nginx 状态
sudo systemctl status nginx

# 检查 Nginx 配置
sudo nginx -t

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/error.log

# 检查端口监听
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### 调试技巧

#### 1. 使用预览模式
```bash
# 预览所有操作，不执行实际部署
./deploy.sh --dry-run all

# 预览特定模块
./deploy.sh --dry-run -s main nginx ssl
```

#### 2. 使用详细输出
```bash
# 显示详细的执行过程
./deploy.sh --verbose app web

# 组合使用预览和详细输出
./deploy.sh --dry-run --verbose all
```

#### 3. 分步调试
```bash
# 逐个模块测试
./deploy.sh --dry-run nginx
./deploy.sh --dry-run ssl
./deploy.sh --dry-run app
./deploy.sh --dry-run web

# 逐个服务器测试
./deploy.sh --dry-run -s main nginx
./deploy.sh --dry-run -s backup nginx
```

## 📈 最佳实践

### 1. 部署前准备
- ✅ 确认所有服务器 SSH 连接正常
- ✅ 验证源码目录和配置文件完整性
- ✅ 使用 `--dry-run` 预览所有部署操作
- ✅ 确保有足够的磁盘空间和权限

### 2. 推荐部署顺序
```bash
# 1. 先部署基础配置
./deploy.sh -s main nginx ssl

# 2. 再部署静态文件
./deploy.sh -s main app web

# 3. 最后部署备用服务器
./deploy.sh -s backup nginx
```

### 3. 生产环境部署
```bash
# 生产环境建议使用强制模式，避免交互确认
./deploy.sh --env prod --force all

# 或者分步部署，便于问题定位
./deploy.sh --env prod --force -s main nginx ssl
./deploy.sh --env prod --force -s main app web
./deploy.sh --env prod --force -s backup nginx
```

### 4. 部署后验证
- ✅ 检查 Nginx 服务状态
- ✅ 测试网站 HTTP/HTTPS 访问
- ✅ 查看服务器错误日志
- ✅ 验证负载均衡状态

### 5. 回滚准备
- ✅ 记录部署时间和版本
- ✅ 保留备份文件位置信息
- ✅ 准备快速回滚命令

## 📞 技术支持

### 获取帮助
```bash
# 查看完整帮助信息
./deploy.sh --help

# 查看当前配置
cat config/servers.conf
cat config/deploy.conf
```

### 问题报告
如遇到问题，请提供以下信息：
1. 执行的完整命令
2. 错误输出信息
3. 服务器环境信息 (OS, Nginx 版本等)
4. 相关日志文件内容

### 日志文件位置
- **本地日志**: 脚本执行过程中的控制台输出
- **服务器日志**: `/var/log/nginx/error.log`
- **部署日志**: `/var/log/obsync/nginx-deploy.log`
- **备份文件**: `/opt/obsync/backups/`

## 📚 快速参考

### 常用命令速查

#### 完整部署
```bash
# 生产环境完整部署
./deploy.sh --env prod --force all

# 预览完整部署
./deploy.sh --dry-run all
```

#### 单独部署
```bash
# 仅部署配置文件
./deploy.sh nginx ssl

# 仅部署静态文件
./deploy.sh app web

# 仅部署到主服务器
./deploy.sh -s main nginx ssl app web

# 仅部署到备用服务器
./deploy.sh -s backup nginx
```

#### 调试和测试
```bash
# 预览模式
./deploy.sh --dry-run [模块]

# 详细输出
./deploy.sh --verbose [模块]

# 强制部署
./deploy.sh --force [模块]

# 查看帮助
./deploy.sh --help
```

## 🏗️ 新架构部署最佳实践

### 推荐的部署顺序

#### 首次完整部署
```bash
# 1. 部署基础配置和静态文件
./deploy.sh nginx ssl app web

# 2. 部署 Docker Compose 统一配置
./deploy.sh docker-compose

# 3. 部署所有后端应用
./deploy.sh backend-apps

# 或者一次性完整部署
./deploy.sh all
```

#### 日常更新部署
```bash
# 仅更新单个应用 (推荐)
./deploy.sh api-gateway
./deploy.sh icasync

# 更新所有后端应用
./deploy.sh backend-apps

# 仅更新 Docker 配置
./deploy.sh docker-compose
```

#### 故障恢复部署
```bash
# 强制重新部署配置
./deploy.sh --force docker-compose

# 强制重新部署应用
./deploy.sh --force backend-apps
```

### 部署架构说明

#### 统一 Docker Compose 管理
- **每个服务器一个配置文件**: `/opt/obsync/docker/docker-compose.yml`
- **所有 Docker 服务统一管理**: API Gateway、ICA Sync、MySQL、Redis
- **网络和存储卷统一配置**: 确保服务间通信和数据持久化

#### 独立应用部署
- **不影响其他服务**: 单独更新 API Gateway 或 ICA Sync
- **自动依赖管理**: 自动启动所需的依赖服务
- **版本控制**: 每个应用独立的版本标签和镜像管理

### 文件路径速查

#### 本地文件
- 部署脚本: `scripts/deploy/deploy.sh`
- 服务器配置: `scripts/deploy/config/servers.conf`
- 部署配置: `scripts/deploy/config/deploy.conf`
- Nginx 配置: `scripts/deploy/nginx/`
- SSL 证书: `scripts/deploy/ssl/`
- Docker 配置: `scripts/deploy/docker-compose/`
- 源码目录: `apps/agendaedu-web/`, `apps/agendaedu-app/`, `apps/api-gateway/`, `apps/app-icasync/`

#### 服务器文件
- Nginx 配置: `/etc/nginx/sites-available/`
- SSL 证书: `/etc/nginx/ssl/`
- 静态文件: `/var/www/agendaedu-web/`, `/var/www/agendaedu-app/`
- Docker 配置: `/opt/obsync/docker/docker-compose.yml`
- 备份文件: `/opt/obsync/backups/`
- 日志文件: `/var/log/nginx/`, `/var/log/obsync/`

### 服务器信息速查

#### 主服务器 (120.131.12.6)
- SSH 别名: `jlufe_12.6`
- 用户: `ubuntu`
- 服务: Nginx + SSL + 静态文件 + Docker 应用
- 域名: `kwps.jlufe.edu.cn`
- Docker 服务: API Gateway (8090,8091), ICA Sync (3001), MySQL (3306), Redis (6379,6380)

#### 备用服务器 (120.131.10.128)
- SSH 别名: `jlufe_10.128`
- 用户: `ubuntu`
- 服务: Nginx 代理 + Docker 应用
- 配置: 仅站点配置，nginx.conf 保持不变
- Docker 服务: API Gateway (8090,8091), ICA Sync (3001), MySQL (3306), Redis (6379,6380)

---

**📝 注意**: 本文档基于当前脚本版本编写，如有更新请及时同步文档内容。
