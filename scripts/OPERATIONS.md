# 运维操作手册

## 日常运维检查清单

### 每日检查 (Daily Checklist)

- [ ] **服务状态检查**
  ```bash
  # 检查主站点可访问性
  curl -f https://kwps.jlufe.edu.cn/health
  
  # 检查 API 网关状态
  curl -f https://kwps.jlufe.edu.cn/api/health
  
  # 检查备份服务器状态
  curl -f http://10.0.0.164/status
  ```

- [ ] **容器状态检查**
  ```bash
  # Server-1 容器状态
  ssh ubuntu@jlufe_10.128 "sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml ps"

  # Server-2 容器状态
  ssh ubuntu@jlufe_12.6 "sudo docker-compose -f /opt/obsync/docker-compose.server-2.yml ps"
  ```

- [ ] **资源使用检查**
  ```bash
  # 检查磁盘空间
  ssh ubuntu@jlufe_10.128 "df -h"

  # 检查内存使用
  ssh ubuntu@jlufe_10.128 "free -h"

  # 检查 Docker 资源使用
  ssh ubuntu@jlufe_10.128 "sudo docker stats --no-stream"
  ```

- [ ] **日志检查**
  ```bash
  # 检查错误日志
  ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo tail -n 50 /var/log/nginx/kwps_error.log"
  
  # 检查应用错误
  ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker logs --tail 50 obsync-api-gateway-s1 | grep ERROR"
  ```

### 每周检查 (Weekly Checklist)

- [ ] **安全更新检查**
  ```bash
  # 检查系统更新
  ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo apt list --upgradable"
  
  # 检查 Docker 镜像更新
  ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker images | grep obsync"
  ```

- [ ] **备份验证**
  ```bash
  # 检查配置备份
  ssh jlufe_10.128@kwps.jlufe.edu.cn "ls -la /backup/obsync-config-*.tar.gz"
  
  # 检查数据库备份
  ssh jlufe_10.128@kwps.jlufe.edu.cn "ls -la /backup/syncdb-*.sql"
  ```

- [ ] **性能分析**
  ```bash
  # 分析访问日志
  ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo goaccess /var/log/nginx/kwps_access.log --log-format=COMBINED"
  
  # 检查响应时间
  curl -w "@curl-format.txt" -o /dev/null -s "https://kwps.jlufe.edu.cn/api/health"
  ```

### 每月检查 (Monthly Checklist)

- [ ] **SSL 证书检查**
  ```bash
  # 检查证书有效期
  openssl x509 -in /etc/nginx/ssl/STAR_jlufe_edu_cn.pem -noout -dates
  
  # 在线证书检查
  echo | openssl s_client -servername kwps.jlufe.edu.cn -connect kwps.jlufe.edu.cn:443 2>/dev/null | openssl x509 -noout -dates
  ```

- [ ] **容量规划**
  ```bash
  # 分析磁盘使用趋势
  ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo du -sh /var/log/* /opt/obsync/*"
  
  # 分析数据库大小
  mysql -h 120.46.26.206 -u sync_user -p -e "SELECT table_schema AS 'Database', ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'DB Size in MB' FROM information_schema.tables GROUP BY table_schema;"
  ```

## 故障处理流程

### 1. 服务不可访问

**症状**: 网站无法访问，返回 502/503 错误

**排查步骤**:
```bash
# 1. 检查 Nginx 状态
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo systemctl status nginx"

# 2. 检查 Nginx 配置
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo nginx -t"

# 3. 检查上游服务状态
ssh jlufe_10.128@kwps.jlufe.edu.cn "curl -f http://172.20.0.20:8090/health"

# 4. 检查容器状态
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml ps"
```

**解决方案**:
```bash
# 重启 Nginx
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo systemctl restart nginx"

# 重启故障容器
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart api-gateway"

# 如果问题持续，切换到备份服务器
# 临时修改 DNS 或负载均衡配置指向 Server-2
```

### 2. 数据库连接失败

**症状**: 应用日志显示数据库连接错误

**排查步骤**:
```bash
# 1. 检查数据库连通性
telnet 120.46.26.206 3306

# 2. 测试数据库登录
mysql -h 120.46.26.206 -u sync_user -p

# 3. 检查应用配置
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker logs obsync-api-gateway-s1 | grep -i database"
```

**解决方案**:
```bash
# 重启应用服务
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart"

# 如果是配置问题，更新环境变量后重新部署
```

### 3. 内存不足

**症状**: 系统响应缓慢，OOM 错误

**排查步骤**:
```bash
# 1. 检查内存使用
ssh jlufe_10.128@kwps.jlufe.edu.cn "free -h"

# 2. 检查容器内存使用
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker stats --no-stream"

# 3. 检查系统日志
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo dmesg | grep -i 'killed process'"
```

**解决方案**:
```bash
# 重启内存使用过高的容器
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml restart <service-name>"

# 清理系统缓存
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo sync && echo 3 | sudo tee /proc/sys/vm/drop_caches"

# 如果问题持续，考虑增加服务器内存或优化应用配置
```

### 4. 磁盘空间不足

**症状**: 磁盘使用率超过 90%

**排查步骤**:
```bash
# 1. 检查磁盘使用
ssh jlufe_10.128@kwps.jlufe.edu.cn "df -h"

# 2. 查找大文件
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo du -sh /var/log/* | sort -hr"

# 3. 检查 Docker 空间使用
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker system df"
```

**解决方案**:
```bash
# 清理日志文件
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo find /var/log -name '*.log' -mtime +7 -delete"

# 清理 Docker 资源
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker system prune -f"

# 手动轮转日志
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo logrotate -f /etc/logrotate.conf"
```

## 维护操作

### 系统更新

```bash
# 1. 备份当前配置
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo tar -czf /backup/pre-update-$(date +%Y%m%d).tar.gz /opt/obsync /etc/nginx"

# 2. 更新系统包
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo apt update && sudo apt upgrade -y"

# 3. 重启系统 (如需要)
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo reboot"

# 4. 验证服务状态
sleep 60
curl -f https://kwps.jlufe.edu.cn/health
```

### 应用更新

```bash
# 1. 拉取最新镜像
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml pull"

# 2. 滚动更新服务
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml up -d --no-deps api-gateway"

# 3. 验证更新
curl -f https://kwps.jlufe.edu.cn/api/health

# 4. 更新其他服务
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo docker-compose -f /opt/obsync/docker-compose.server-1.yml up -d"
```

### SSL 证书更新

```bash
# 1. 备份旧证书
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo cp /etc/nginx/ssl/STAR_jlufe_edu_cn.pem /etc/nginx/ssl/STAR_jlufe_edu_cn.pem.$(date +%Y%m%d)"

# 2. 上传新证书
scp new_certificate.pem jlufe_10.128@kwps.jlufe.edu.cn:/tmp/
scp new_private_key.key jlufe_10.128@kwps.jlufe.edu.cn:/tmp/

# 3. 安装新证书
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo mv /tmp/new_certificate.pem /etc/nginx/ssl/STAR_jlufe_edu_cn.pem"
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo mv /tmp/new_private_key.key /etc/nginx/ssl/STAR_jlufe_edu_cn.key"
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo chmod 600 /etc/nginx/ssl/STAR_jlufe_edu_cn.key"

# 4. 测试并重载 Nginx
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo nginx -t && sudo systemctl reload nginx"

# 5. 验证新证书
echo | openssl s_client -servername kwps.jlufe.edu.cn -connect kwps.jlufe.edu.cn:443 2>/dev/null | openssl x509 -noout -dates
```

## 监控和告警

### 设置监控脚本

```bash
# 创建监控脚本
cat > /usr/local/bin/obsync-monitor.sh << 'EOF'
#!/bin/bash

# 检查服务状态
if ! curl -f -s https://kwps.jlufe.edu.cn/health > /dev/null; then
    echo "$(date): 主站点不可访问" | tee -a /var/log/obsync-monitor.log
    # 发送告警邮件或短信
fi

# 检查磁盘空间
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 90 ]; then
    echo "$(date): 磁盘使用率过高: ${DISK_USAGE}%" | tee -a /var/log/obsync-monitor.log
fi

# 检查内存使用
MEMORY_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEMORY_USAGE -gt 90 ]; then
    echo "$(date): 内存使用率过高: ${MEMORY_USAGE}%" | tee -a /var/log/obsync-monitor.log
fi
EOF

chmod +x /usr/local/bin/obsync-monitor.sh

# 设置定时任务
echo "*/5 * * * * /usr/local/bin/obsync-monitor.sh" | crontab -
```

### 日志分析

```bash
# 分析访问日志中的错误
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo awk '\$9 >= 400' /var/log/nginx/kwps_access.log | tail -20"

# 统计 API 调用频率
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo awk '{print \$7}' /var/log/nginx/kwps_access.log | grep '/api/' | sort | uniq -c | sort -nr | head -10"

# 分析响应时间
ssh jlufe_10.128@kwps.jlufe.edu.cn "sudo awk '{print \$NF}' /var/log/nginx/kwps_access.log | sort -n | tail -20"
```

## 应急联系

### 联系方式

- **一级故障** (服务完全不可用): 立即联系系统管理员
- **二级故障** (部分功能异常): 2小时内联系技术支持
- **三级故障** (性能问题): 工作时间内联系开发团队

### 升级流程

1. **发现问题** → 记录问题详情和时间
2. **初步排查** → 按照故障处理流程操作
3. **问题升级** → 如无法解决，联系上级支持
4. **问题解决** → 记录解决方案，更新文档
5. **事后分析** → 分析根本原因，制定预防措施

---

*运维手册版本: v1.0*  
*最后更新: 2024年8月11日*
