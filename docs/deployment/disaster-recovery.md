# 故障转移和恢复机制

## 🔄 故障恢复架构

ObSync 系统采用多层故障恢复机制，确保在各种故障场景下的服务连续性：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   预防性措施    │    │   检测机制      │    │   恢复策略      │
│                │    │                │    │                │
│ • 双服务器部署  │    │ • 健康检查      │    │ • 自动故障转移  │
│ • 负载均衡      │    │ • 监控告警      │    │ • 手动恢复流程  │
│ • 数据备份      │    │ • 日志分析      │    │ • 回滚机制      │
│ • 配置备份      │    │ • 性能监控      │    │ • 数据恢复      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚨 故障场景分析

### 1. 服务级故障

#### API Gateway 故障
**故障现象**：
- HTTP 502/503 错误
- 响应时间超时
- 健康检查失败

**自动恢复机制**：
```yaml
# Docker 自动重启配置
api-gateway:
  restart: unless-stopped
  healthcheck:
    test: ["CMD", "wget", "--spider", "http://localhost:8090/health"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 60s
```

**手动恢复步骤**：
```bash
# 1. 检查容器状态
docker compose ps api-gateway

# 2. 查看容器日志
docker compose logs -f api-gateway

# 3. 重启服务
docker compose restart api-gateway

# 4. 如果重启失败，重新部署
docker compose down api-gateway
docker compose pull api-gateway
docker compose up -d api-gateway
```

#### 后端服务故障
**故障现象**：
- 特定 API 端点不可用
- 数据同步失败
- 业务功能异常

**恢复步骤**：
```bash
# 检查 app-icasync 服务
docker compose logs app-icasync

# 重启服务
docker compose restart app-icasync

# 检查数据库连接
docker compose exec app-icasync ping database-host
```

### 2. 服务器级故障

#### 主服务器故障
**故障现象**：
- 域名无法访问
- SSH 连接失败
- 监控告警

**故障转移流程**：

1. **DNS 切换** (手动操作)
```bash
# 将域名 kwps.jlufe.edu.cn 指向备用服务器
# 120.131.12.6 → 120.131.10.128
```

2. **备用服务器配置调整**
```bash
# 在备用服务器上执行
ssh jlufe_10.128

# 启用完整服务配置
sudo cp /opt/obsync/nginx/server-2-full.conf /etc/nginx/sites-available/kwps.jlufe.edu.cn
sudo ln -sf /etc/nginx/sites-available/kwps.jlufe.edu.cn /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 部署前端静态文件
sudo mkdir -p /var/www/agendaedu-web /var/www/agendaedu-app
# 从备份恢复静态文件...
```

3. **服务验证**
```bash
# 验证服务可用性
curl -I https://kwps.jlufe.edu.cn/health
curl -I https://kwps.jlufe.edu.cn/api/health
```

#### 备用服务器故障
**影响评估**：
- 负载均衡权重调整
- 单点服务风险增加

**处理步骤**：
```bash
# 在主服务器上调整 Nginx 配置
sudo vim /etc/nginx/conf.d/upstream.conf

# 临时移除备用服务器
upstream api_gateway {
    server 172.20.0.20:8090 weight=1 max_fails=3 fail_timeout=30s;
    # server 120.131.10.128:8090 weight=1 max_fails=3 fail_timeout=30s backup;
}

# 重新加载配置
sudo nginx -s reload
```

### 3. 网络故障

#### 服务器间通信故障
**检测方法**：
```bash
# 从主服务器测试到备用服务器
ping 120.131.10.128
telnet 120.131.10.128 8090

# 从备用服务器测试到主服务器
ping 120.131.12.6
```

**恢复步骤**：
```bash
# 检查防火墙规则
sudo iptables -L -n

# 检查网络接口
ip addr show
ip route show

# 重启网络服务
sudo systemctl restart networking
```

## 💾 数据备份和恢复

### 1. 数据备份策略

#### 数据库备份
```bash
#!/bin/bash
# 数据库备份脚本
# 文件位置: /opt/obsync/scripts/backup-database.sh

BACKUP_DIR="/opt/obsync/backups/database"
DATE=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库 (根据实际数据库类型调整)
# MySQL 示例
mysqldump -h localhost -u backup_user -p'backup_password' \
  --single-transaction --routines --triggers \
  syncdb > $BACKUP_DIR/syncdb_$DATE.sql

# 压缩备份文件
gzip $BACKUP_DIR/syncdb_$DATE.sql

# 清理旧备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "数据库备份完成: syncdb_$DATE.sql.gz"
```

#### 配置文件备份
```bash
#!/bin/bash
# 配置备份脚本
# 文件位置: /opt/obsync/scripts/backup-config.sh

BACKUP_DIR="/opt/obsync/backups/config"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份关键配置文件
tar -czf $BACKUP_DIR/config_$DATE.tar.gz \
  /opt/obsync/docker-compose.yml \
  /opt/obsync/.env \
  /etc/nginx/sites-available/kwps.jlufe.edu.cn \
  /etc/nginx/conf.d/ \
  /etc/nginx/ssl/ \
  /opt/obsync/scripts/

echo "配置备份完成: config_$DATE.tar.gz"
```

#### 静态文件备份
```bash
#!/bin/bash
# 静态文件备份脚本
# 文件位置: /opt/obsync/scripts/backup-static.sh

BACKUP_DIR="/opt/obsync/backups/static"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 备份前端静态文件
tar -czf $BACKUP_DIR/static_$DATE.tar.gz \
  /var/www/agendaedu-web/ \
  /var/www/agendaedu-app/

echo "静态文件备份完成: static_$DATE.tar.gz"
```

### 2. 自动备份配置

```bash
# 设置定时备份任务
sudo crontab -e

# 每天凌晨 2 点备份数据库
0 2 * * * /opt/obsync/scripts/backup-database.sh >> /var/log/obsync/backup.log 2>&1

# 每天凌晨 3 点备份配置文件
0 3 * * * /opt/obsync/scripts/backup-config.sh >> /var/log/obsync/backup.log 2>&1

# 每周日凌晨 4 点备份静态文件
0 4 * * 0 /opt/obsync/scripts/backup-static.sh >> /var/log/obsync/backup.log 2>&1
```

### 3. 数据恢复流程

#### 数据库恢复
```bash
#!/bin/bash
# 数据库恢复脚本
# 文件位置: /opt/obsync/scripts/restore-database.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: $0 <backup_file.sql.gz>"
    exit 1
fi

echo "开始恢复数据库: $BACKUP_FILE"

# 解压备份文件
gunzip -c $BACKUP_FILE > /tmp/restore.sql

# 恢复数据库
mysql -h localhost -u restore_user -p'restore_password' syncdb < /tmp/restore.sql

# 清理临时文件
rm /tmp/restore.sql

echo "数据库恢复完成"
```

#### 配置恢复
```bash
#!/bin/bash
# 配置恢复脚本
# 文件位置: /opt/obsync/scripts/restore-config.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "用法: $0 <config_backup.tar.gz>"
    exit 1
fi

echo "开始恢复配置: $BACKUP_FILE"

# 创建临时目录
TEMP_DIR=$(mktemp -d)
tar -xzf $BACKUP_FILE -C $TEMP_DIR

# 恢复配置文件
sudo cp -r $TEMP_DIR/opt/obsync/* /opt/obsync/
sudo cp -r $TEMP_DIR/etc/nginx/* /etc/nginx/

# 重新加载服务
sudo nginx -t && sudo systemctl reload nginx
docker compose -f /opt/obsync/docker-compose.yml up -d

# 清理临时目录
rm -rf $TEMP_DIR

echo "配置恢复完成"
```

## 🔧 故障排查工具

### 1. 快速诊断脚本

```bash
#!/bin/bash
# 系统诊断脚本
# 文件位置: /opt/obsync/scripts/diagnose.sh

echo "=== ObSync 系统诊断报告 ==="
echo "时间: $(date)"
echo ""

# 系统基本信息
echo "## 系统信息"
echo "主机名: $(hostname)"
echo "运行时间: $(uptime -p)"
echo "负载: $(uptime | awk -F'load average:' '{print $2}')"
echo "内存: $(free -h | grep Mem | awk '{print "使用 "$3" / 总计 "$2}')"
echo "磁盘: $(df -h / | awk 'NR==2 {print "使用 "$3" / 总计 "$2" ("$5")"}')"
echo ""

# 网络连通性
echo "## 网络连通性"
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    echo "外网连接: 正常"
else
    echo "外网连接: 异常"
fi

if ping -c 1 120.131.10.128 > /dev/null 2>&1; then
    echo "备用服务器连接: 正常"
else
    echo "备用服务器连接: 异常"
fi
echo ""

# 服务状态
echo "## 服务状态"
echo "Nginx: $(systemctl is-active nginx)"
echo "Docker: $(systemctl is-active docker)"
echo ""

# 容器状态
echo "## 容器状态"
docker compose -f /opt/obsync/docker-compose.yml ps
echo ""

# API 健康检查
echo "## API 健康检查"
if curl -s http://localhost:8090/health > /dev/null; then
    echo "API Gateway: 正常"
else
    echo "API Gateway: 异常"
fi
echo ""

# 最近错误日志
echo "## 最近错误 (最近10条)"
echo "Nginx 错误:"
tail -n 5 /var/log/nginx/kwps_error.log 2>/dev/null || echo "无错误日志"
echo ""
echo "系统错误:"
tail -n 5 /var/log/syslog | grep -i error | tail -n 5 || echo "无系统错误"
```

### 2. 性能分析工具

```bash
#!/bin/bash
# 性能分析脚本
# 文件位置: /opt/obsync/scripts/performance-analysis.sh

echo "=== 性能分析报告 ==="
echo "时间: $(date)"
echo ""

# CPU 使用情况
echo "## CPU 使用情况"
echo "CPU 使用率: $(top -bn1 | grep "Cpu(s)" | awk '{print $2}')"
echo "负载平均值: $(uptime | awk -F'load average:' '{print $2}')"
echo ""

# 内存使用情况
echo "## 内存使用情况"
free -h
echo ""

# 磁盘 I/O
echo "## 磁盘使用情况"
df -h
echo ""
echo "磁盘 I/O:"
iostat -x 1 1 2>/dev/null || echo "iostat 未安装"
echo ""

# 网络连接
echo "## 网络连接"
echo "活跃连接数: $(netstat -an | grep ESTABLISHED | wc -l)"
echo "监听端口:"
netstat -tlnp | grep -E ':(22|80|443|8090|3001|3002)'
echo ""

# 容器资源使用
echo "## 容器资源使用"
docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.BlockIO}}"
```

## 📋 故障恢复检查清单

### 故障发生时

- [ ] 确认故障范围和影响
- [ ] 检查监控告警信息
- [ ] 查看相关日志文件
- [ ] 执行快速诊断脚本
- [ ] 尝试自动恢复机制
- [ ] 如需要，执行手动恢复

### 恢复后验证

- [ ] 验证所有服务正常运行
- [ ] 检查 API 端点可用性
- [ ] 验证前端应用访问
- [ ] 检查数据一致性
- [ ] 确认监控系统正常
- [ ] 更新故障记录

### 预防措施

- [ ] 定期测试备份恢复流程
- [ ] 更新故障恢复文档
- [ ] 进行故障演练
- [ ] 检查监控告警配置
- [ ] 验证自动化脚本
- [ ] 培训运维人员

## 📞 应急联系

### 故障上报流程

1. **立即响应** (5分钟内)
   - 确认故障并开始处理
   - 通知相关人员

2. **初步处理** (15分钟内)
   - 执行快速恢复措施
   - 收集故障信息

3. **详细分析** (1小时内)
   - 分析根本原因
   - 制定完整恢复方案

4. **后续跟进** (24小时内)
   - 完成故障修复
   - 更新文档和流程

### 联系信息

- **技术负责人**: [联系方式]
- **系统管理员**: [联系方式]
- **网络管理员**: [联系方式]
- **应急热线**: [24小时联系方式]

## 🔄 下一步

完成故障恢复配置后，请继续：
1. [部署验证](./verification.md)
2. 定期进行故障演练
3. 更新和完善恢复流程
