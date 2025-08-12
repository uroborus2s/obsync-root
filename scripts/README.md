# 双服务器部署方案文档

## 项目概述

基于 Stratix 框架的课程表同步打卡应用系统，采用双服务器高可用部署架构。

### 核心应用组件

- **@stratix/gateway** - API网关应用 (端口: 8090)
- **@wps/app-icalink** - 签到服务应用 (端口: 3002)
- **@wps/app-icasync** - 课程表同步应用 (端口: 3001)
- **@wps/agendaedu-web** - Web管理后台 (静态文件)
- **@wps/agendaedu-app** - 移动端打卡应用 (静态文件)

### 基础设施架构

```
                    ┌─────────────────┐
                    │   用户访问      │
                    │ kwps.jlufe.edu.cn│
                    └─────────┬───────┘
                              │
                    ┌─────────▼───────┐
                    │   Server-1      │
                    │   主服务器      │
                    │ ┌─────────────┐ │
                    │ │    Nginx    │ │ ← SSL终止 + 负载均衡
                    │ │ 负载均衡器  │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │   Docker    │ │ ← 容器化服务
                    │ │   Services  │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │ 静态文件服务│ │ ← Web/App静态文件
                    │ └─────────────┘ │
                    └─────────┬───────┘
                              │ 内网通信
                    ┌─────────▼───────┐
                    │   Server-2      │
                    │   备份服务器    │
                    │ ┌─────────────┐ │
                    │ │    Nginx    │ │ ← 内网代理
                    │ │  内网代理   │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │   Docker    │ │ ← 备份服务实例
                    │ │   Services  │ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │ 健康检查服务│ │ ← 监控和故障转移
                    │ └─────────────┘ │
                    └─────────────────┘
                              │
                    ┌─────────▼───────┐
                    │   云基础设施    │
                    │ ┌─────────────┐ │
                    │ │ MySQL 数据库│ │
                    │ └─────────────┘ │
                    │ ┌─────────────┐ │
                    │ │ Redis 缓存  │ │
                    │ └─────────────┘ │
                    └─────────────────┘
```

## 部署架构特点

### 1. 高可用性设计

- **双服务器架构**: Server-1 主服务器 + Server-2 备份服务器
- **负载均衡**: Nginx 自动故障转移，主服务器故障时切换到备份服务器
- **健康检查**: 实时监控服务状态，自动故障检测和恢复
- **数据一致性**: 共享云数据库和缓存，确保数据一致性

### 2. 网络架构

- **公网访问**: 仅 Server-1 对外提供服务 (kwps.jlufe.edu.cn)
- **内网通信**: Server-2 仅通过内网 IP 提供服务
- **SSL 终止**: Server-1 处理 HTTPS 加密，内网使用 HTTP 通信
- **路由配置**:
  - `/web` → Web 管理后台静态文件
  - `/app` → 移动端应用静态文件
  - `/api` → API 网关服务 (统一处理所有业务服务请求)
    - `/api/icalink/*` → 签到服务（通过网关转发）
    - `/api/icasync/*` → 课程表同步服务（通过网关转发）
    - `/api/health` → 网关健康检查

### 3. 容器化部署

- **Docker Compose**: 统一管理所有服务容器
- **服务隔离**: 每个应用独立容器，资源隔离
- **自动重启**: 容器故障自动重启
- **日志管理**: 统一日志收集和轮转

## 文件结构

```
scripts/
├── README.md                    # 本文档
├── .env.example                 # 环境变量配置示例
├── docker-compose.yml           # 通用 Docker Compose 配置
├── docker-compose.server-1.yml  # Server-1 专用配置
├── docker-compose.server-2.yml  # Server-2 专用配置
├── deploy.sh                    # 主部署脚本
├── deploy-static.sh             # 静态文件部署脚本
├── healthcheck.sh               # 健康检查脚本
├── logrotate.conf               # 日志轮转配置
└── nginx/
    ├── server-1-nginx.conf      # Server-1 Nginx 配置
    ├── server-2-nginx.conf      # Server-2 Nginx 配置
    ├── STAR_jlufe_edu_cn.pem    # SSL 证书
    └── STAR_jlufe_edu_cn.key    # SSL 私钥
```

## 快速部署

### 1. 环境准备

```bash
# 1. 克隆项目代码
git clone <repository-url>
cd obsync-root

# 2. 配置环境变量
cp scripts/.env.example scripts/.env
# 编辑 .env 文件，填入实际配置

# 3. 确保 SSL 证书文件存在
ls scripts/nginx/STAR_jlufe_edu_cn.*
```

### 2. 一键部署

```bash
# 部署到两台服务器
./scripts/deploy.sh

# 仅部署到 Server-1
./scripts/deploy.sh --server1

# 仅部署到 Server-2
./scripts/deploy.sh --server2

# 强制部署（跳过确认）
./scripts/deploy.sh --force
```

### 3. 静态文件部署

```bash
# 构建并部署前端应用
./scripts/deploy-static.sh

# 仅构建
./scripts/deploy-static.sh --build

# 仅部署
./scripts/deploy-static.sh --deploy
```

## 详细部署步骤

### Server-1 (主服务器) 部署

1. **系统准备**
   ```bash
   # 更新系统
   sudo apt update && sudo apt upgrade -y
   
   # 安装必要软件
   sudo apt install -y curl wget git
   ```

2. **Docker 安装**
   ```bash
   # 安装 Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo usermod -aG docker $USER
   
   # 安装 Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

3. **Nginx 安装和配置**
   ```bash
   # 安装 Nginx
   sudo apt install -y nginx
   
   # 配置 Nginx
   sudo cp scripts/nginx/server-1-nginx.conf /etc/nginx/sites-available/obsync
   sudo ln -sf /etc/nginx/sites-available/obsync /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   
   # 配置 SSL 证书
   sudo mkdir -p /etc/nginx/ssl
   sudo cp scripts/nginx/STAR_jlufe_edu_cn.* /etc/nginx/ssl/
   sudo chmod 600 /etc/nginx/ssl/STAR_jlufe_edu_cn.key
   
   # 测试配置
   sudo nginx -t
   ```

4. **服务部署**
   ```bash
   # 创建部署目录
   sudo mkdir -p /opt/obsync
   sudo cp -r scripts/* /opt/obsync/
   
   # 启动服务
   cd /opt/obsync
   sudo docker-compose -f docker-compose.server-1.yml up -d
   
   # 启动 Nginx
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

### Server-2 (备份服务器) 部署

1. **系统准备** (同 Server-1)

2. **Docker 安装** (同 Server-1)

3. **Nginx 配置**
   ```bash
   # 安装 Nginx
   sudo apt install -y nginx
   
   # 配置 Nginx (内网配置)
   sudo cp scripts/nginx/server-2-nginx.conf /etc/nginx/sites-available/obsync
   sudo ln -sf /etc/nginx/sites-available/obsync /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   
   # 测试配置
   sudo nginx -t
   ```

4. **服务部署**
   ```bash
   # 创建部署目录
   sudo mkdir -p /opt/obsync
   sudo cp -r scripts/* /opt/obsync/
   
   # 启动服务
   cd /opt/obsync
   sudo docker-compose -f docker-compose.server-2.yml up -d
   
   # 启动 Nginx
   sudo systemctl enable nginx
   sudo systemctl start nginx
   ```

## 服务管理

### 查看服务状态

```bash
# 查看所有容器状态
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml ps

# 查看服务日志
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml logs -f

# 查看特定服务日志
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml logs -f api-gateway
```

### 重启服务

```bash
# 重启所有服务
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart

# 重启特定服务
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart api-gateway

# 重新部署服务
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml down
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml pull
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml up -d
```

### 更新服务

```bash
# 拉取最新镜像
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml pull

# 重新创建容器
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml up -d --force-recreate
```

## 监控和维护

### 健康检查

```bash
# 检查主站点
curl -f https://kwps.jlufe.edu.cn/health

# 检查 API 网关
curl -f https://kwps.jlufe.edu.cn/api/health

# 检查 Server-2 状态
curl -f http://10.0.0.164/status
```

### 日志管理

```bash
# 查看 Nginx 访问日志
sudo tail -f /var/log/nginx/kwps_access.log

# 查看 Nginx 错误日志
sudo tail -f /var/log/nginx/kwps_error.log

# 查看应用日志
sudo docker logs -f obsync-api-gateway-s1
```

### 性能监控

```bash
# 查看系统资源使用
htop

# 查看 Docker 资源使用
sudo docker stats

# 查看 Nginx 状态
curl http://localhost/nginx_status
```

## 故障处理

### 常见问题

1. **服务无法启动**
   ```bash
   # 检查端口占用
   sudo netstat -tlnp | grep :8090
   
   # 检查 Docker 服务
   sudo systemctl status docker
   
   # 查看容器日志
   sudo docker logs obsync-api-gateway-s1
   ```

2. **SSL 证书问题**
   ```bash
   # 检查证书文件
   sudo ls -la /etc/nginx/ssl/
   
   # 测试证书
   openssl x509 -in /etc/nginx/ssl/STAR_jlufe_edu_cn.pem -text -noout
   ```

3. **负载均衡问题**
   ```bash
   # 测试上游服务器
   curl -f http://172.20.0.20:8090/health
   curl -f http://10.0.2.101:8090/health
   
   # 检查 Nginx 配置
   sudo nginx -t
   ```

### 故障恢复

1. **服务故障恢复**
   ```bash
   # 重启故障服务
   sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart <service-name>
   
   # 如果容器无法启动，重新创建
   sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml up -d --force-recreate <service-name>
   ```

2. **数据库连接故障**
   ```bash
   # 检查数据库连接
   mysql -h 120.46.26.206 -u sync_user -p
   
   # 检查网络连通性
   telnet 120.46.26.206 3306
   ```

3. **完整系统恢复**
   ```bash
   # 停止所有服务
   sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml down
   
   # 清理容器和网络
   sudo docker system prune -f
   
   # 重新部署
   ./scripts/deploy.sh --force
   ```

## 安全配置

### 防火墙设置

```bash
# Server-1 防火墙配置
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Server-2 防火墙配置 (仅内网)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow from 10.0.0.0/8 to any port 80  # 内网 HTTP
sudo ufw enable
```

### SSL 证书更新

```bash
# 备份旧证书
sudo cp /etc/nginx/ssl/STAR_jlufe_edu_cn.pem /etc/nginx/ssl/STAR_jlufe_edu_cn.pem.bak

# 更新证书
sudo cp new_certificate.pem /etc/nginx/ssl/STAR_jlufe_edu_cn.pem
sudo cp new_private_key.key /etc/nginx/ssl/STAR_jlufe_edu_cn.key
sudo chmod 600 /etc/nginx/ssl/STAR_jlufe_edu_cn.key

# 测试并重载 Nginx
sudo nginx -t && sudo systemctl reload nginx
```

## 备份和恢复

### 配置备份

```bash
# 备份配置文件
sudo tar -czf /backup/obsync-config-$(date +%Y%m%d).tar.gz /opt/obsync /etc/nginx/sites-available/obsync

# 备份数据库 (如果需要)
mysqldump -h 120.46.26.206 -u sync_user -p syncdb > /backup/syncdb-$(date +%Y%m%d).sql
```

### 配置恢复

```bash
# 恢复配置文件
sudo tar -xzf /backup/obsync-config-20240101.tar.gz -C /

# 重启服务
sudo systemctl reload nginx
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart
```

## 性能优化

### 系统调优

```bash
# 调整 Docker 资源限制
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml up -d --scale api-gateway=2

# 优化 Nginx 配置
sudo vim /etc/nginx/nginx.conf
# 调整 worker_processes, worker_connections 等参数

# 系统内核参数优化
echo 'net.core.somaxconn = 65535' | sudo tee -a /etc/sysctl.conf
echo 'net.ipv4.tcp_max_syn_backlog = 65535' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### 缓存优化

```bash
# Redis 缓存监控
redis-cli -h 10.0.2.212 -p 6379 info memory

# 清理缓存
redis-cli -h 10.0.2.212 -p 6379 flushdb
```

## 扩展部署

### 水平扩展

如需增加更多服务器实例：

1. **复制 Server-2 配置**
2. **修改 IP 地址配置**
3. **更新 Server-1 负载均衡配置**
4. **添加健康检查**

### 垂直扩展

```bash
# 增加容器资源限制
# 编辑 docker-compose.yml 中的 resources 配置
sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml up -d --force-recreate
```

## 联系信息

- **技术支持**: 系统管理员
- **紧急联系**: 运维团队
- **文档更新**: 开发团队
- **项目仓库**: obsync-root

---

*最后更新: 2024年8月11日*
