# 服务监控和日志配置

## 📊 监控架构概览

ObSync 系统采用多层监控策略，确保系统健康状况的实时可见性：

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   系统监控      │    │   应用监控      │    │   业务监控      │
│                │    │                │    │                │
│ • CPU/内存      │    │ • 容器状态      │    │ • API 响应时间  │
│ • 磁盘/网络     │    │ • 健康检查      │    │ • 错误率        │
│ • 负载均衡      │    │ • 日志收集      │    │ • 用户活动      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │   告警系统      │
                    │                │
                    │ • 邮件通知      │
                    │ • 短信告警      │
                    │ • 日志记录      │
                    └─────────────────┘
```

## 🔍 系统级监控

### 1. 系统资源监控

#### 创建系统监控脚本

```bash
#!/bin/bash
# 系统监控脚本
# 文件位置: /opt/obsync/scripts/system-monitor.sh

MONITOR_LOG="/var/log/obsync/system-monitor.log"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90

# 创建日志目录
mkdir -p /var/log/obsync

# 获取系统信息
get_system_info() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # CPU 使用率
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    
    # 内存使用率
    local memory_info=$(free | grep Mem)
    local total_memory=$(echo $memory_info | awk '{print $2}')
    local used_memory=$(echo $memory_info | awk '{print $3}')
    local memory_usage=$(( used_memory * 100 / total_memory ))
    
    # 磁盘使用率
    local disk_usage=$(df -h / | awk 'NR==2 {print $5}' | cut -d'%' -f1)
    
    # 负载平均值
    local load_avg=$(uptime | awk -F'load average:' '{print $2}')
    
    # 网络连接数
    local tcp_connections=$(netstat -an | grep ESTABLISHED | wc -l)
    
    echo "$timestamp,CPU:${cpu_usage}%,Memory:${memory_usage}%,Disk:${disk_usage}%,Load:${load_avg},TCP:${tcp_connections}" >> $MONITOR_LOG
    
    # 检查告警阈值
    check_alerts "$cpu_usage" "$memory_usage" "$disk_usage"
}

# 检查告警
check_alerts() {
    local cpu=$1
    local memory=$2
    local disk=$3
    
    if (( $(echo "$cpu > $ALERT_THRESHOLD_CPU" | bc -l) )); then
        send_alert "CPU 使用率过高: ${cpu}%"
    fi
    
    if [ $memory -gt $ALERT_THRESHOLD_MEMORY ]; then
        send_alert "内存使用率过高: ${memory}%"
    fi
    
    if [ $disk -gt $ALERT_THRESHOLD_DISK ]; then
        send_alert "磁盘使用率过高: ${disk}%"
    fi
}

# 发送告警
send_alert() {
    local message=$1
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "$timestamp ALERT: $message" >> $MONITOR_LOG
    
    # 发送邮件告警 (需要配置邮件服务)
    # echo "$message" | mail -s "ObSync 系统告警" admin@example.com
    
    # 记录到系统日志
    logger -t obsync-monitor "ALERT: $message"
}

# 主函数
main() {
    get_system_info
}

main "$@"
```

#### 设置定时监控

```bash
# 设置脚本权限
chmod +x /opt/obsync/scripts/system-monitor.sh

# 添加到 crontab (每分钟执行一次)
echo "* * * * * /opt/obsync/scripts/system-monitor.sh" | crontab -

# 添加日志轮转配置
sudo tee /etc/logrotate.d/obsync-monitor > /dev/null << EOF
/var/log/obsync/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 root root
}
EOF
```

### 2. Nginx 监控

#### Nginx 状态监控

```bash
#!/bin/bash
# Nginx 监控脚本
# 文件位置: /opt/obsync/scripts/nginx-monitor.sh

NGINX_STATUS_URL="http://localhost/nginx_status"
LOG_FILE="/var/log/obsync/nginx-monitor.log"

# 获取 Nginx 状态
get_nginx_status() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if curl -s $NGINX_STATUS_URL > /dev/null; then
        local status_info=$(curl -s $NGINX_STATUS_URL)
        local active_connections=$(echo "$status_info" | grep "Active connections" | awk '{print $3}')
        local accepts=$(echo "$status_info" | awk 'NR==3 {print $1}')
        local handled=$(echo "$status_info" | awk 'NR==3 {print $2}')
        local requests=$(echo "$status_info" | awk 'NR==3 {print $3}')
        
        echo "$timestamp,Active:$active_connections,Accepts:$accepts,Handled:$handled,Requests:$requests" >> $LOG_FILE
        
        # 检查连接数是否异常
        if [ $active_connections -gt 1000 ]; then
            echo "$timestamp ALERT: Nginx 活跃连接数过高: $active_connections" >> $LOG_FILE
        fi
    else
        echo "$timestamp ERROR: 无法获取 Nginx 状态" >> $LOG_FILE
    fi
}

get_nginx_status
```

## 🐳 Docker 容器监控

### 1. 容器健康监控

#### 容器状态检查脚本

```bash
#!/bin/bash
# Docker 容器监控脚本
# 文件位置: /opt/obsync/scripts/docker-monitor.sh

COMPOSE_FILE="/opt/obsync/docker-compose.yml"
LOG_FILE="/var/log/obsync/docker-monitor.log"
SERVICES=("api-gateway" "app-icasync")

# 检查容器状态
check_container_status() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    for service in "${SERVICES[@]}"; do
        local container_status=$(docker compose -f $COMPOSE_FILE ps -q $service | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null)
        local container_health=$(docker compose -f $COMPOSE_FILE ps -q $service | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null)
        
        if [ "$container_status" = "running" ]; then
            if [ "$container_health" = "healthy" ] || [ -z "$container_health" ]; then
                echo "$timestamp,$service,Status:running,Health:${container_health:-unknown}" >> $LOG_FILE
            else
                echo "$timestamp,$service,Status:running,Health:$container_health" >> $LOG_FILE
                send_container_alert "$service" "健康检查失败: $container_health"
            fi
        else
            echo "$timestamp,$service,Status:$container_status,Health:unknown" >> $LOG_FILE
            send_container_alert "$service" "容器状态异常: $container_status"
        fi
    done
}

# 检查容器资源使用
check_container_resources() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    for service in "${SERVICES[@]}"; do
        local container_id=$(docker compose -f $COMPOSE_FILE ps -q $service)
        if [ -n "$container_id" ]; then
            local stats=$(docker stats --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}" $container_id | tail -n 1)
            local cpu_usage=$(echo $stats | awk '{print $1}' | sed 's/%//')
            local memory_usage=$(echo $stats | awk '{print $2}')
            
            echo "$timestamp,$service,CPU:${cpu_usage}%,Memory:$memory_usage" >> $LOG_FILE
            
            # 检查资源使用是否过高
            if (( $(echo "$cpu_usage > 90" | bc -l) )); then
                send_container_alert "$service" "CPU 使用率过高: ${cpu_usage}%"
            fi
        fi
    done
}

# 发送容器告警
send_container_alert() {
    local service=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "$timestamp ALERT: $service - $message" >> $LOG_FILE
    logger -t obsync-docker "ALERT: $service - $message"
}

# 主函数
main() {
    check_container_status
    check_container_resources
}

main "$@"
```

### 2. 应用健康检查

#### API 健康检查脚本

```bash
#!/bin/bash
# API 健康检查脚本
# 文件位置: /opt/obsync/scripts/api-health-check.sh

API_ENDPOINTS=(
    "http://localhost:8090/health"
    "http://172.20.0.20:8090/health"
)

LOG_FILE="/var/log/obsync/api-health.log"

# 检查 API 健康状态
check_api_health() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    for endpoint in "${API_ENDPOINTS[@]}"; do
        local response_time=$(curl -o /dev/null -s -w "%{time_total}" --max-time 10 "$endpoint" 2>/dev/null)
        local http_code=$(curl -o /dev/null -s -w "%{http_code}" --max-time 10 "$endpoint" 2>/dev/null)
        
        if [ "$http_code" = "200" ]; then
            echo "$timestamp,$endpoint,Status:OK,ResponseTime:${response_time}s" >> $LOG_FILE
            
            # 检查响应时间是否过长
            if (( $(echo "$response_time > 5.0" | bc -l) )); then
                send_api_alert "$endpoint" "响应时间过长: ${response_time}s"
            fi
        else
            echo "$timestamp,$endpoint,Status:ERROR,HttpCode:$http_code" >> $LOG_FILE
            send_api_alert "$endpoint" "API 不可用: HTTP $http_code"
        fi
    done
}

# 发送 API 告警
send_api_alert() {
    local endpoint=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    echo "$timestamp ALERT: $endpoint - $message" >> $LOG_FILE
    logger -t obsync-api "ALERT: $endpoint - $message"
}

check_api_health
```

## 📝 日志管理

### 1. 集中日志配置

#### 日志收集配置

```bash
# 创建日志目录结构
sudo mkdir -p /var/log/obsync/{nginx,docker,application,system}
sudo chown -R syslog:adm /var/log/obsync
sudo chmod -R 755 /var/log/obsync

# 配置 rsyslog 收集应用日志
sudo tee /etc/rsyslog.d/50-obsync.conf > /dev/null << EOF
# ObSync 应用日志配置
:programname, isequal, "obsync-monitor" /var/log/obsync/system/monitor.log
:programname, isequal, "obsync-docker" /var/log/obsync/docker/container.log
:programname, isequal, "obsync-api" /var/log/obsync/application/api.log
& stop
EOF

# 重启 rsyslog 服务
sudo systemctl restart rsyslog
```

#### Docker 日志配置

```yaml
# Docker Compose 日志配置
services:
  api-gateway:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "20"
        labels: "service=api-gateway,environment=production"
  
  app-icasync:
    logging:
      driver: "json-file"
      options:
        max-size: "100m"
        max-file: "20"
        labels: "service=app-icasync,environment=production"
```

### 2. 日志轮转配置

```bash
# 创建日志轮转配置
sudo tee /etc/logrotate.d/obsync > /dev/null << EOF
/var/log/obsync/*/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 syslog adm
    postrotate
        /bin/kill -HUP \`cat /var/run/rsyslogd.pid 2> /dev/null\` 2> /dev/null || true
    endscript
}

/var/log/nginx/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 www-data adm
    sharedscripts
    prerotate
        if [ -d /etc/logrotate.d/httpd-prerotate ]; then \
            run-parts /etc/logrotate.d/httpd-prerotate; \
        fi
    endscript
    postrotate
        invoke-rc.d nginx rotate >/dev/null 2>&1
    endscript
}
EOF
```

## 📈 性能监控

### 1. 性能指标收集

#### 性能监控脚本

```bash
#!/bin/bash
# 性能监控脚本
# 文件位置: /opt/obsync/scripts/performance-monitor.sh

METRICS_LOG="/var/log/obsync/performance-metrics.log"

# 收集性能指标
collect_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # API 响应时间测试
    local api_response_time=$(curl -o /dev/null -s -w "%{time_total}" http://localhost:8090/health)
    
    # 数据库连接测试 (如果有直接访问)
    # local db_response_time=$(mysql -h localhost -u user -p'password' -e "SELECT 1;" 2>/dev/null | wc -l)
    
    # Nginx 请求处理时间 (从访问日志分析)
    local nginx_avg_response=$(tail -n 100 /var/log/nginx/kwps_access.log | awk '{print $NF}' | awk '{sum+=$1; count++} END {if(count>0) print sum/count; else print 0}')
    
    # 系统负载
    local load_1min=$(uptime | awk -F'load average:' '{print $2}' | awk -F',' '{print $1}' | xargs)
    
    echo "$timestamp,API_ResponseTime:${api_response_time}s,Nginx_AvgResponse:${nginx_avg_response}s,Load_1min:$load_1min" >> $METRICS_LOG
}

collect_metrics
```

### 3. ICA Link 多实例监控

#### ICA Link 实例监控脚本

```bash
#!/bin/bash
# ICA Link 多实例监控脚本
# 文件位置: /opt/obsync/scripts/icalink-monitor.sh

METRICS_LOG="/var/log/obsync/icalink-metrics.log"
ICALINK_PORTS=(3002 3003 3004)

# 收集 ICA Link 实例指标
collect_icalink_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "## ICA Link 实例监控 - $timestamp" >> $METRICS_LOG

    for port in "${ICALINK_PORTS[@]}"; do
        local instance_id="icalink-$(echo $port | sed 's/300//')"

        # 检查实例健康状态
        if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
            local health_status="healthy"

            # 获取详细健康信息
            local health_data=$(curl -s "http://localhost:$port/health" 2>/dev/null)
            local uptime=$(echo "$health_data" | jq -r '.instance.uptime' 2>/dev/null || echo "unknown")
            local memory_used=$(echo "$health_data" | jq -r '.instance.memory.heapUsed' 2>/dev/null || echo "unknown")
            local memory_total=$(echo "$health_data" | jq -r '.instance.memory.heapTotal' 2>/dev/null || echo "unknown")

            # 测试响应时间
            local response_time=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost:$port/health" 2>/dev/null)

            echo "$timestamp,$instance_id,Status:$health_status,ResponseTime:${response_time}s,Uptime:${uptime}s,Memory:$memory_used/$memory_total" >> $METRICS_LOG
        else
            echo "$timestamp,$instance_id,Status:unhealthy,ResponseTime:timeout,Uptime:unknown,Memory:unknown" >> $METRICS_LOG
        fi
    done

    # 检查负载均衡器状态
    if curl -s -f "http://localhost:8090/icalink/status" >/dev/null 2>&1; then
        local lb_status=$(curl -s "http://localhost:8090/icalink/status" 2>/dev/null)
        local total_instances=$(echo "$lb_status" | jq -r '.totalInstances' 2>/dev/null || echo "unknown")
        local healthy_instances=$(echo "$lb_status" | jq -r '.healthyInstances' 2>/dev/null || echo "unknown")

        echo "$timestamp,load-balancer,TotalInstances:$total_instances,HealthyInstances:$healthy_instances" >> $METRICS_LOG
    else
        echo "$timestamp,load-balancer,Status:unavailable" >> $METRICS_LOG
    fi
}

# 检查实例异常
check_icalink_alerts() {
    local unhealthy_count=0
    local slow_response_count=0

    for port in "${ICALINK_PORTS[@]}"; do
        local instance_id="icalink-$(echo $port | sed 's/300//')"

        # 检查健康状态
        if ! curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
            unhealthy_count=$((unhealthy_count + 1))
            send_icalink_alert "$instance_id" "实例不健康或无响应"
        else
            # 检查响应时间
            local response_time=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost:$port/health" 2>/dev/null)
            if (( $(echo "$response_time > 2.0" | bc -l) )); then
                slow_response_count=$((slow_response_count + 1))
                send_icalink_alert "$instance_id" "响应时间过慢: ${response_time}s"
            fi
        fi
    done

    # 检查整体服务可用性
    if [ $unhealthy_count -ge 2 ]; then
        send_icalink_alert "icalink-cluster" "多个实例不健康，服务可用性受影响"
    fi
}

# 发送 ICA Link 告警
send_icalink_alert() {
    local instance=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "$timestamp ALERT: $instance - $message" >> $METRICS_LOG
    logger -t obsync-icalink "ALERT: $instance - $message"

    # 发送邮件告警 (如果配置了邮件服务)
    # echo "$message" | mail -s "ICA Link 告警: $instance" admin@example.com
}

# 主函数
main() {
    collect_icalink_metrics
    check_icalink_alerts
}

main "$@"
```

#### 负载均衡监控

```bash
#!/bin/bash
# 负载均衡监控脚本
# 文件位置: /opt/obsync/scripts/lb-monitor.sh

LB_LOG="/var/log/obsync/load-balancer.log"

# 监控负载分发
monitor_load_distribution() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')

    echo "## 负载分发监控 - $timestamp" >> $LB_LOG

    # 发送测试请求并统计分发情况
    local test_requests=20
    local instance_counts=()

    for i in $(seq 1 $test_requests); do
        local response=$(curl -s -H "X-Monitor-Test: $i" "http://localhost:8090/icalink/health" 2>/dev/null)
        local instance_id=$(echo "$response" | jq -r '.instance.id' 2>/dev/null || echo "unknown")

        # 统计实例分发
        instance_counts["$instance_id"]=$((${instance_counts["$instance_id"]} + 1))
    done

    # 记录分发统计
    for instance in "${!instance_counts[@]}"; do
        local count=${instance_counts[$instance]}
        local percentage=$((count * 100 / test_requests))
        echo "$timestamp,LoadDistribution,$instance:${count}次(${percentage}%)" >> $LB_LOG
    done

    # 检查分发均匀性
    local max_count=0
    local min_count=$test_requests

    for count in "${instance_counts[@]}"; do
        if [ $count -gt $max_count ]; then
            max_count=$count
        fi
        if [ $count -lt $min_count ]; then
            min_count=$count
        fi
    done

    local distribution_variance=$((max_count - min_count))
    local acceptable_variance=$((test_requests / 4))  # 25% 的差异是可接受的

    if [ $distribution_variance -gt $acceptable_variance ]; then
        echo "$timestamp ALERT: 负载分发不均匀，最大差异: $distribution_variance 次请求" >> $LB_LOG
    else
        echo "$timestamp INFO: 负载分发正常，差异: $distribution_variance 次请求" >> $LB_LOG
    fi
}

monitor_load_distribution
```

### 2. 监控仪表板

#### 简单的监控报告生成

```bash
#!/bin/bash
# 监控报告生成脚本
# 文件位置: /opt/obsync/scripts/generate-report.sh

REPORT_FILE="/var/log/obsync/daily-report-$(date +%Y%m%d).txt"

generate_daily_report() {
    echo "=== ObSync 系统日报 $(date +%Y-%m-%d) ===" > $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 系统概况
    echo "## 系统概况" >> $REPORT_FILE
    echo "服务器运行时间: $(uptime -p)" >> $REPORT_FILE
    echo "当前负载: $(uptime | awk -F'load average:' '{print $2}')" >> $REPORT_FILE
    echo "内存使用: $(free -h | grep Mem | awk '{print $3"/"$2}')" >> $REPORT_FILE
    echo "磁盘使用: $(df -h / | awk 'NR==2 {print $5}')" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 容器状态
    echo "## 容器状态" >> $REPORT_FILE
    docker compose -f /opt/obsync/docker-compose.yml ps >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # 错误统计
    echo "## 错误统计" >> $REPORT_FILE
    echo "Nginx 错误日志 (最近24小时):" >> $REPORT_FILE
    grep "$(date +%d/%b/%Y)" /var/log/nginx/kwps_error.log | wc -l >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    # API 健康状态
    echo "## API 健康状态" >> $REPORT_FILE
    curl -s http://localhost:8090/health && echo " - API Gateway: 正常" >> $REPORT_FILE || echo " - API Gateway: 异常" >> $REPORT_FILE
    echo "" >> $REPORT_FILE
    
    echo "报告生成时间: $(date)" >> $REPORT_FILE
}

generate_daily_report

# 发送报告 (可选)
# mail -s "ObSync 日报 $(date +%Y-%m-%d)" admin@example.com < $REPORT_FILE
```

## 🔔 告警配置

### 1. 邮件告警设置

```bash
# 安装邮件服务
sudo apt install mailutils postfix

# 配置 Postfix (选择 Internet Site)
sudo dpkg-reconfigure postfix

# 测试邮件发送
echo "测试邮件" | mail -s "测试" admin@example.com
```

### 2. 告警规则配置

```bash
# 创建告警配置文件
cat > /opt/obsync/config/alert-rules.conf << EOF
# ObSync 告警规则配置

# 系统资源告警阈值
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
LOAD_THRESHOLD=5.0

# API 响应时间告警阈值
API_RESPONSE_THRESHOLD=5.0

# 容器重启次数告警阈值
CONTAINER_RESTART_THRESHOLD=3

# 告警接收邮箱
ALERT_EMAIL="admin@example.com"

# 告警冷却时间 (分钟)
ALERT_COOLDOWN=30
EOF
```

## 📋 监控检查清单

### 日常检查项目

- [ ] 系统资源使用率 (CPU、内存、磁盘)
- [ ] 容器运行状态和健康检查
- [ ] API 响应时间和可用性
- [ ] Nginx 访问和错误日志
- [ ] 数据库连接状态
- [ ] SSL 证书有效期
- [ ] 备份任务执行状态

### 定期维护任务

- [ ] 清理旧日志文件
- [ ] 更新监控脚本
- [ ] 检查告警配置
- [ ] 验证备份恢复流程
- [ ] 性能基线更新

## 🔄 下一步

完成监控配置后，请继续：
1. [故障恢复机制](./disaster-recovery.md)
2. [部署验证](./verification.md)
