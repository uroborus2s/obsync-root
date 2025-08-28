# 生产环境部署架构方案

## 1. 服务器环境概览

### 1.1 服务器配置
- **主服务器**: 120.131.12.6 (SSH: `ssh jlufe_12.6`)
  - 角色: 主要服务节点 + 负载均衡器
  - 软件: Nginx + Docker
  - 域名: kwps.jlufe.edu.cn

- **备用服务器**: 120.131.10.128 (SSH: `ssh jlufe_10.128`)
  - 角色: 备份节点 + 静态文件服务器
  - 软件: Docker + Nginx (备用，平时不启动)

### 1.2 网络架构
```
Internet → kwps.jlufe.edu.cn (主服务器Nginx) → 负载均衡 → 后端服务
                                              ↓
                                         静态文件直接服务
```

## 2. 应用架构设计

### 2.1 前端静态应用
- **agendaedu-web** (Web管理端)
  - 部署路径: `/var/www/agendaedu-web`
  - 访问地址: `https://kwps.jlufe.edu.cn/web/`
  - 部署方式: Nginx静态文件服务

- **agendaedu-app** (移动端应用)
  - 部署路径: `/var/www/agendaedu-app`
  - 访问地址: `https://kwps.jlufe.edu.cn/app/`
  - 部署方式: Nginx静态文件服务

### 2.2 API网关架构
- **api-gateway** 作为统一入口
  - 主服务器实例: `172.20.0.20:8090` (权重3)
  - 备用服务器实例: `10.0.0.102:8090` (权重1, backup)
  - 访问路径: `https://kwps.jlufe.edu.cn/api/*`

### 2.3 后端服务
- **app-icasync** (课程表同步服务)
  - 主服务器: `172.20.0.22:3000`
  - 备用服务器: `10.0.0.103:3000`
  - 仅本地访问，通过api-gateway转发

- **app-icalink** (签到服务)
  - 主服务器: `172.20.0.21:3002`
  - 备用服务器: `10.0.0.104:3002`
  - 仅本地访问，通过api-gateway转发

## 3. 服务器配置步骤

### 3.1 主服务器 (120.131.12.6) 配置

#### 3.1.1 系统环境准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装必要软件
sudo apt install -y nginx docker.io docker-compose-plugin curl wget

# 启动并启用服务
sudo systemctl enable nginx docker
sudo systemctl start nginx docker

# 添加用户到docker组
sudo usermod -aG docker $USER
```

#### 3.1.2 Nginx配置
```bash
# 创建SSL证书目录
sudo mkdir -p /etc/nginx/ssl

# 复制SSL证书
sudo cp scripts/deploy/nginx/STAR_jlufe_edu_cn.pem /etc/nginx/ssl/
sudo cp scripts/deploy/nginx/STAR_jlufe_edu_cn.key /etc/nginx/ssl/
sudo chmod 644 /etc/nginx/ssl/STAR_jlufe_edu_cn.pem
sudo chmod 600 /etc/nginx/ssl/STAR_jlufe_edu_cn.key

# 创建静态文件目录
sudo mkdir -p /var/www/agendaedu-web
sudo mkdir -p /var/www/agendaedu-app
sudo mkdir -p /var/www/error-pages

# 设置权限
sudo chown -R www-data:www-data /var/www/
sudo chmod -R 755 /var/www/

# 部署Nginx配置
sudo cp scripts/deploy/nginx/server-1-nginx.conf /etc/nginx/sites-available/kwps
sudo ln -sf /etc/nginx/sites-available/kwps /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# 测试配置并重启
sudo nginx -t
sudo systemctl reload nginx
```

#### 3.1.3 Docker服务部署
```bash
# 创建部署目录
mkdir -p ~/deploy
cd ~/deploy

# 复制Docker配置
cp scripts/deploy/docker-compose.yml .

# 启动服务
docker compose up -d

# 验证服务状态
docker compose ps
docker compose logs
```

### 3.2 备用服务器 (120.131.10.128) 配置

#### 3.2.1 系统环境准备
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装Docker和Nginx (备用)
sudo apt install -y docker.io docker-compose-plugin nginx

# 启动并启用Docker
sudo systemctl enable docker
sudo systemctl start docker

# 禁用Nginx (平时不启动，仅故障转移时使用)
sudo systemctl disable nginx
sudo systemctl stop nginx

# 添加用户到docker组
sudo usermod -aG docker $USER
```

#### 3.2.2 Docker服务部署
```bash
# 创建备用服务器的docker-compose配置
# 参考scripts/deploy/docker-compose-server2.yml
```

## 4. 网络安全配置

### 4.1 防火墙规则
```bash
# 主服务器防火墙配置
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow from 120.131.10.128 to any port 8090  # 备用服务器访问API网关

# 备用服务器防火墙配置
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow from 120.131.12.6 to any port 8090   # 主服务器访问API网关
sudo ufw allow from 120.131.12.6 to any port 3001   # 主服务器访问icasync
sudo ufw allow from 120.131.12.6 to any port 3002   # 主服务器访问icalink
```

### 4.2 Docker网络隔离
```yaml
# Docker网络配置确保服务间安全通信
networks:
  obsync-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.20.0.0/16
```

### 4.3 Nginx安全配置
- SSL/TLS加密通信
- 安全头设置 (HSTS, X-Frame-Options等)
- 限流配置防止DDoS攻击
- 访问控制和IP白名单

## 5. 负载均衡配置

### 5.1 API网关负载均衡
```nginx
upstream api_gateway {
    server 172.20.0.20:8090 weight=3 max_fails=3 fail_timeout=30s;
    server 10.0.0.102:8090 weight=1 max_fails=3 fail_timeout=30s backup;
    
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}
```

### 5.2 健康检查机制
- Docker容器健康检查
- Nginx upstream健康检查
- 应用级健康检查端点

### 5.3 故障转移策略
- 主服务器故障时自动切换到备用服务器
- 服务恢复后自动切回主服务器
- 优雅的服务降级机制

## 6. 监控和日志

### 6.1 日志配置
```bash
# 创建日志目录
sudo mkdir -p /var/log/nginx
sudo mkdir -p /var/log/docker

# 配置日志轮转
sudo cp scripts/deploy/logrotate.conf /etc/logrotate.d/obsync
```

### 6.2 监控指标
- 服务器资源使用率 (CPU, 内存, 磁盘)
- 应用响应时间和错误率
- 网络连接状态
- Docker容器状态

### 6.3 告警机制
- 服务不可用告警
- 资源使用率过高告警
- 错误率异常告警
- SSL证书过期提醒

## 7. 部署验证步骤

### 7.1 服务可用性验证
```bash
# 检查Nginx状态
sudo systemctl status nginx
curl -I https://kwps.jlufe.edu.cn/health

# 检查Docker服务
docker compose ps
curl http://localhost:8090/health

# 检查静态文件服务
curl -I https://kwps.jlufe.edu.cn/web/
curl -I https://kwps.jlufe.edu.cn/app/

# 检查API服务
curl https://kwps.jlufe.edu.cn/api/health
```

### 7.2 负载均衡验证
```bash
# 测试API网关负载均衡
for i in {1..10}; do
  curl -s https://kwps.jlufe.edu.cn/api/health | grep -o '"instanceId":"[^"]*"'
done
```

### 7.3 故障转移验证
```bash
# 模拟主服务器API网关故障
docker compose stop api-gateway

# 验证请求是否转发到备用服务器
curl https://kwps.jlufe.edu.cn/api/health

# 恢复服务
docker compose start api-gateway
```

## 8. 维护和更新

### 8.1 应用更新流程
1. 构建新版本镜像
2. 推送到镜像仓库
3. 使用滚动更新部署
4. 验证新版本功能
5. 清理旧版本镜像

### 8.2 配置更新流程
1. 备份现有配置
2. 部署新配置
3. 验证配置语法
4. 重新加载服务
5. 验证服务正常

### 8.3 SSL证书更新
1. 获取新证书
2. 备份旧证书
3. 部署新证书
4. 验证证书有效性
5. 重新加载Nginx

## 9. 故障恢复方案

### 9.1 服务器故障
- 主服务器故障: DNS切换到备用服务器
- 备用服务器故障: 移除备用upstream配置

### 9.2 应用故障
- 容器重启策略: `unless-stopped`
- 健康检查失败自动重启
- 多实例部署保证可用性

### 9.3 数据备份
- 定期备份配置文件
- 定期备份应用数据
- 异地备份策略

## 10. 性能优化

### 10.1 Nginx优化
- Gzip压缩
- 静态文件缓存
- 连接池配置
- 限流配置

### 10.2 Docker优化
- 资源限制配置
- 镜像优化
- 网络优化
- 存储优化

### 10.3 应用优化
- 连接池配置
- 缓存策略
- 异步处理
- 数据库优化

## 11. 部署脚本使用指南

### 11.1 自动化部署脚本
```bash
# 完整部署
./docs/deployment-scripts/deploy-production.sh

# 仅部署主服务器
./docs/deployment-scripts/deploy-production.sh --server1-only

# 仅更新Docker服务
./docs/deployment-scripts/deploy-production.sh --docker-only

# 预演模式
./docs/deployment-scripts/deploy-production.sh --dry-run
```

### 11.2 监控系统设置
```bash
# 安装监控系统
./docs/deployment-scripts/monitoring-setup.sh

# 查看监控仪表板
ssh ubuntu@jlufe_12.6 'sudo /usr/local/bin/monitoring-dashboard.sh'
```

### 11.3 故障恢复
```bash
# 备份配置
./docs/deployment-scripts/backup-restore.sh --backup

# 恢复配置
./docs/deployment-scripts/backup-restore.sh --restore
```

## 12. 运维手册

### 12.1 日常检查清单
- [ ] 检查服务器资源使用率
- [ ] 检查应用健康状态
- [ ] 检查日志错误信息
- [ ] 检查SSL证书有效期
- [ ] 检查备份完整性

### 12.2 应急响应流程
1. **服务不可用**
   - 检查服务器状态
   - 检查网络连接
   - 重启相关服务
   - 切换到备用服务器

2. **性能问题**
   - 检查资源使用率
   - 分析日志文件
   - 优化配置参数
   - 扩容服务器资源

3. **安全事件**
   - 隔离受影响系统
   - 分析攻击来源
   - 修复安全漏洞
   - 更新安全策略

### 12.3 定期维护任务
- **每日**: 检查系统状态、备份数据
- **每周**: 更新系统补丁、清理日志
- **每月**: 检查SSL证书、性能优化
- **每季度**: 灾难恢复演练、安全审计
