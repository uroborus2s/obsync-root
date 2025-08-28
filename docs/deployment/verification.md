# 部署验证和测试步骤

## 🎯 验证目标

确保 ObSync 系统在生产环境中的所有组件都正常工作，包括：
- 服务器基础环境
- 网络连通性和安全配置
- Docker 容器服务
- Nginx 负载均衡和静态文件服务
- API 功能和性能
- 监控和日志系统
- 故障恢复机制

## 📋 验证检查清单

### 1. 基础环境验证

#### 服务器环境检查

```bash
#!/bin/bash
# 基础环境验证脚本
# 文件位置: /opt/obsync/scripts/verify-environment.sh

echo "=== 基础环境验证 ==="

# 检查操作系统
echo "操作系统: $(lsb_release -d | cut -f2)"
echo "内核版本: $(uname -r)"
echo "架构: $(uname -m)"

# 检查必要软件
echo ""
echo "## 软件版本检查"
echo "Docker: $(docker --version 2>/dev/null || echo '未安装')"
echo "Docker Compose: $(docker compose version 2>/dev/null || echo '未安装')"
echo "Nginx: $(nginx -v 2>&1 | head -1 || echo '未安装')"
echo "curl: $(curl --version 2>/dev/null | head -1 || echo '未安装')"

# 检查系统资源
echo ""
echo "## 系统资源"
echo "CPU 核心数: $(nproc)"
echo "内存总量: $(free -h | grep Mem | awk '{print $2}')"
echo "磁盘空间: $(df -h / | awk 'NR==2 {print $4" 可用 / "$2" 总计"}')"

# 检查网络配置
echo ""
echo "## 网络配置"
echo "主机名: $(hostname)"
echo "IP 地址: $(hostname -I | awk '{print $1}')"
echo "DNS 服务器: $(cat /etc/resolv.conf | grep nameserver | head -1)"

# 检查防火墙状态
echo ""
echo "## 防火墙状态"
if command -v ufw >/dev/null 2>&1; then
    echo "UFW 状态: $(sudo ufw status | head -1)"
else
    echo "iptables 规则数: $(sudo iptables -L | wc -l)"
fi

echo ""
echo "基础环境验证完成"
```

#### 目录结构验证

```bash
#!/bin/bash
# 目录结构验证脚本

echo "=== 目录结构验证 ==="

REQUIRED_DIRS=(
    "/opt/obsync"
    "/opt/obsync/scripts"
    "/opt/obsync/backups"
    "/var/log/obsync"
    "/var/www/agendaedu-web"
    "/var/www/agendaedu-app"
    "/etc/nginx/ssl"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ $dir - 存在"
    else
        echo "❌ $dir - 不存在"
    fi
done

# 检查关键文件
REQUIRED_FILES=(
    "/opt/obsync/docker-compose.yml"
    "/opt/obsync/.env"
    "/etc/nginx/sites-available/kwps.jlufe.edu.cn"
    "/etc/nginx/ssl/STAR_jlufe_edu_cn.pem"
    "/etc/nginx/ssl/STAR_jlufe_edu_cn.key"
)

echo ""
echo "## 关键文件检查"
for file in "${REQUIRED_FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file - 存在"
    else
        echo "❌ $file - 不存在"
    fi
done
```

### 2. 网络连通性验证

#### 内外网连通性测试

```bash
#!/bin/bash
# 网络连通性验证脚本

echo "=== 网络连通性验证 ==="

# 外网连通性
echo "## 外网连通性"
if ping -c 3 8.8.8.8 >/dev/null 2>&1; then
    echo "✅ 外网连接正常"
else
    echo "❌ 外网连接异常"
fi

# DNS 解析
echo ""
echo "## DNS 解析"
if nslookup google.com >/dev/null 2>&1; then
    echo "✅ DNS 解析正常"
else
    echo "❌ DNS 解析异常"
fi

# 服务器间连通性 (仅在主服务器执行)
if [ "$(hostname -I | awk '{print $1}')" = "120.131.12.6" ]; then
    echo ""
    echo "## 服务器间连通性"
    if ping -c 3 120.131.10.128 >/dev/null 2>&1; then
        echo "✅ 备用服务器连接正常"
    else
        echo "❌ 备用服务器连接异常"
    fi
    
    # 测试备用服务器 API Gateway 端口
    if nc -z 120.131.10.128 8090 2>/dev/null; then
        echo "✅ 备用服务器 API Gateway 端口可达"
    else
        echo "❌ 备用服务器 API Gateway 端口不可达"
    fi
fi

# 本地端口监听检查
echo ""
echo "## 本地端口监听"
# 主服务器端口
if [ "$(hostname -I | awk '{print $1}')" = "120.131.12.6" ]; then
    EXPECTED_PORTS=(22 80 443 8090)
else
    # 备用服务器端口 (包括 MySQL 代理)
    EXPECTED_PORTS=(22 80 8090 3306)
fi

for port in "${EXPECTED_PORTS[@]}"; do
    if netstat -tlnp | grep ":$port " >/dev/null; then
        echo "✅ 端口 $port 正在监听"
    else
        echo "❌ 端口 $port 未监听"
    fi
done
```

#### SSL 证书验证

```bash
#!/bin/bash
# SSL 证书验证脚本

echo "=== SSL 证书验证 ==="

CERT_FILE="/etc/nginx/ssl/STAR_jlufe_edu_cn.pem"
KEY_FILE="/etc/nginx/ssl/STAR_jlufe_edu_cn.key"

# 检查证书文件存在性
if [ -f "$CERT_FILE" ]; then
    echo "✅ SSL 证书文件存在"
    
    # 检查证书有效期
    EXPIRY_DATE=$(openssl x509 -in "$CERT_FILE" -noout -enddate | cut -d= -f2)
    EXPIRY_TIMESTAMP=$(date -d "$EXPIRY_DATE" +%s)
    CURRENT_TIMESTAMP=$(date +%s)
    DAYS_UNTIL_EXPIRY=$(( (EXPIRY_TIMESTAMP - CURRENT_TIMESTAMP) / 86400 ))
    
    echo "证书有效期: $EXPIRY_DATE"
    echo "剩余天数: $DAYS_UNTIL_EXPIRY 天"
    
    if [ $DAYS_UNTIL_EXPIRY -gt 30 ]; then
        echo "✅ 证书有效期充足"
    else
        echo "⚠️  证书即将过期"
    fi
else
    echo "❌ SSL 证书文件不存在"
fi

# 检查私钥文件
if [ -f "$KEY_FILE" ]; then
    echo "✅ SSL 私钥文件存在"
else
    echo "❌ SSL 私钥文件不存在"
fi

# 验证证书和私钥匹配
if [ -f "$CERT_FILE" ] && [ -f "$KEY_FILE" ]; then
    CERT_HASH=$(openssl x509 -noout -modulus -in "$CERT_FILE" | openssl md5)
    KEY_HASH=$(openssl rsa -noout -modulus -in "$KEY_FILE" | openssl md5)
    
    if [ "$CERT_HASH" = "$KEY_HASH" ]; then
        echo "✅ 证书和私钥匹配"
    else
        echo "❌ 证书和私钥不匹配"
    fi
fi
```

### 3. Docker 服务验证

#### 容器状态检查

```bash
#!/bin/bash
# Docker 服务验证脚本

echo "=== Docker 服务验证 ==="

COMPOSE_FILE="/opt/obsync/docker-compose.yml"

# 检查 Docker 服务状态
echo "## Docker 服务状态"
if systemctl is-active docker >/dev/null; then
    echo "✅ Docker 服务运行正常"
else
    echo "❌ Docker 服务未运行"
    exit 1
fi

# 检查 Docker Compose 文件
if [ -f "$COMPOSE_FILE" ]; then
    echo "✅ Docker Compose 文件存在"
else
    echo "❌ Docker Compose 文件不存在"
    exit 1
fi

# 验证 Docker Compose 配置
echo ""
echo "## Docker Compose 配置验证"
if docker compose -f "$COMPOSE_FILE" config >/dev/null 2>&1; then
    echo "✅ Docker Compose 配置语法正确"
else
    echo "❌ Docker Compose 配置语法错误"
    docker compose -f "$COMPOSE_FILE" config
fi

# 检查容器状态
echo ""
echo "## 容器状态检查"
EXPECTED_SERVICES=("api-gateway-1" "api-gateway-2" "app-icasync" "app-icalink-1" "app-icalink-2" "app-icalink-3")

for service in "${EXPECTED_SERVICES[@]}"; do
    STATUS=$(docker compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Status}}' 2>/dev/null)

    if [ "$STATUS" = "running" ]; then
        echo "✅ $service 容器运行正常"

        # 检查健康状态
        HEALTH=$(docker compose -f "$COMPOSE_FILE" ps -q "$service" 2>/dev/null | xargs docker inspect --format='{{.State.Health.Status}}' 2>/dev/null)
        if [ "$HEALTH" = "healthy" ] || [ -z "$HEALTH" ]; then
            echo "✅ $service 健康检查通过"
        else
            echo "⚠️  $service 健康检查: $HEALTH"
        fi
    elif [ -n "$STATUS" ]; then
        echo "❌ $service 容器状态异常: $STATUS"
    else
        echo "⚠️  $service 容器不存在或未配置"
    fi
done

echo ""
echo "## API Gateway 多实例检查"

# 检查 API Gateway 实例
API_GATEWAY_PORTS=(8090 8091)
for port in "${API_GATEWAY_PORTS[@]}"; do
    if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
        echo "✅ API Gateway localhost:$port 健康检查通过"
    else
        echo "❌ API Gateway localhost:$port 健康检查失败"
    fi
done

# 检查容器网络
echo ""
echo "## 容器网络检查"
NETWORK_NAME=$(docker compose -f "$COMPOSE_FILE" config | grep -A 5 "networks:" | grep -v "networks:" | head -1 | awk '{print $1}' | sed 's/://')
if [ -n "$NETWORK_NAME" ]; then
    FULL_NETWORK_NAME="obsync_${NETWORK_NAME}"
    if docker network ls | grep "$FULL_NETWORK_NAME" >/dev/null; then
        echo "✅ Docker 网络 $FULL_NETWORK_NAME 存在"
    else
        echo "❌ Docker 网络 $FULL_NETWORK_NAME 不存在"
    fi
fi
```

### 4. Nginx 服务验证

#### Nginx 配置和服务检查

```bash
#!/bin/bash
# Nginx 服务验证脚本

echo "=== Nginx 服务验证 ==="

# 检查 Nginx 服务状态
echo "## Nginx 服务状态"
if systemctl is-active nginx >/dev/null; then
    echo "✅ Nginx 服务运行正常"
else
    echo "❌ Nginx 服务未运行"
fi

# 检查 Nginx 配置语法
echo ""
echo "## Nginx 配置验证"
if nginx -t >/dev/null 2>&1; then
    echo "✅ Nginx 配置语法正确"
else
    echo "❌ Nginx 配置语法错误"
    nginx -t
fi

# 检查站点配置
echo ""
echo "## 站点配置检查"
SITE_CONFIG="/etc/nginx/sites-enabled/kwps.jlufe.edu.cn"
if [ -L "$SITE_CONFIG" ]; then
    echo "✅ 站点配置已启用"
    
    # 检查配置文件目标
    TARGET=$(readlink "$SITE_CONFIG")
    if [ -f "$TARGET" ]; then
        echo "✅ 站点配置文件存在: $TARGET"
    else
        echo "❌ 站点配置文件不存在: $TARGET"
    fi
else
    echo "❌ 站点配置未启用"
fi

# 检查 upstream 配置
echo ""
echo "## 负载均衡配置检查"
if nginx -T 2>/dev/null | grep -q "upstream api_gateway"; then
    echo "✅ API Gateway upstream 配置存在"
else
    echo "❌ API Gateway upstream 配置缺失"
fi

# 测试 HTTP 响应
echo ""
echo "## HTTP 响应测试"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/ 2>/dev/null)
if [ "$HTTP_CODE" = "301" ] || [ "$HTTP_CODE" = "302" ]; then
    echo "✅ HTTP 重定向正常 (状态码: $HTTP_CODE)"
else
    echo "❌ HTTP 响应异常 (状态码: $HTTP_CODE)"
fi

# 测试 HTTPS 响应 (如果证书配置正确)
HTTPS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -k https://localhost/ 2>/dev/null)
if [ "$HTTPS_CODE" = "200" ] || [ "$HTTPS_CODE" = "301" ] || [ "$HTTPS_CODE" = "302" ]; then
    echo "✅ HTTPS 响应正常 (状态码: $HTTPS_CODE)"
else
    echo "❌ HTTPS 响应异常 (状态码: $HTTPS_CODE)"
fi
```

### 5. API 功能验证

#### API 端点测试

```bash
#!/bin/bash
# API 功能验证脚本

echo "=== API 功能验证 ==="

# API 基础健康检查
echo "## API 健康检查"
API_ENDPOINTS=(
    "http://localhost:8090/health"
    "http://172.20.0.20:8090/health"
)

for endpoint in "${API_ENDPOINTS[@]}"; do
    RESPONSE=$(curl -s -w "%{http_code}" "$endpoint" 2>/dev/null)
    HTTP_CODE="${RESPONSE: -3}"
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ $endpoint - 正常 (200)"
    else
        echo "❌ $endpoint - 异常 ($HTTP_CODE)"
    fi
done

# 通过 Nginx 代理的 API 测试
echo ""
echo "## Nginx 代理 API 测试"
PROXY_RESPONSE=$(curl -s -w "%{http_code}" "http://localhost/api/health" 2>/dev/null)
PROXY_HTTP_CODE="${PROXY_RESPONSE: -3}"

if [ "$PROXY_HTTP_CODE" = "200" ]; then
    echo "✅ Nginx 代理 API 正常 (200)"
else
    echo "❌ Nginx 代理 API 异常 ($PROXY_HTTP_CODE)"
fi

# API 响应时间测试
echo ""
echo "## API 响应时间测试"
RESPONSE_TIME=$(curl -o /dev/null -s -w "%{time_total}" "http://localhost:8090/health" 2>/dev/null)
echo "API 响应时间: ${RESPONSE_TIME}s"

if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
    echo "✅ API 响应时间正常"
else
    echo "⚠️  API 响应时间较慢"
fi
```

### 6. 静态文件服务验证

#### 前端应用访问测试

```bash
#!/bin/bash
# 静态文件服务验证脚本

echo "=== 静态文件服务验证 ==="

# 检查静态文件目录
echo "## 静态文件目录检查"
STATIC_DIRS=(
    "/var/www/agendaedu-web"
    "/var/www/agendaedu-app"
)

for dir in "${STATIC_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        FILE_COUNT=$(find "$dir" -type f | wc -l)
        echo "✅ $dir - 存在 ($FILE_COUNT 个文件)"
    else
        echo "❌ $dir - 不存在"
    fi
done

# 测试静态文件访问
echo ""
echo "## 静态文件访问测试"
STATIC_URLS=(
    "http://localhost/web/"
    "http://localhost/app/"
)

for url in "${STATIC_URLS[@]}"; do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ $url - 可访问 (200)"
    else
        echo "❌ $url - 访问异常 ($HTTP_CODE)"
    fi
done

# 测试静态资源缓存
echo ""
echo "## 静态资源缓存测试"
CACHE_HEADER=$(curl -s -I "http://localhost/web/" | grep -i "cache-control" || echo "无缓存头")
echo "缓存控制头: $CACHE_HEADER"
```

### 7. 完整系统集成测试

#### 端到端测试脚本

```bash
#!/bin/bash
# 完整系统集成测试脚本

echo "=== 完整系统集成测试 ==="

# 模拟用户访问流程
echo "## 用户访问流程测试"

# 1. 访问根路径，应该重定向到 /web/
echo "1. 测试根路径重定向"
REDIRECT_LOCATION=$(curl -s -I "http://localhost/" | grep -i "location:" | awk '{print $2}' | tr -d '\r')
if [[ "$REDIRECT_LOCATION" == *"/web/"* ]]; then
    echo "✅ 根路径重定向正确"
else
    echo "❌ 根路径重定向异常: $REDIRECT_LOCATION"
fi

# 2. 访问 Web 应用
echo "2. 测试 Web 应用访问"
WEB_RESPONSE=$(curl -s -w "%{http_code}" "http://localhost/web/" 2>/dev/null)
WEB_HTTP_CODE="${WEB_RESPONSE: -3}"
if [ "$WEB_HTTP_CODE" = "200" ]; then
    echo "✅ Web 应用访问正常"
else
    echo "❌ Web 应用访问异常 ($WEB_HTTP_CODE)"
fi

# 3. 测试 API 调用
echo "3. 测试 API 调用"
API_RESPONSE=$(curl -s -w "%{http_code}" "http://localhost/api/health" 2>/dev/null)
API_HTTP_CODE="${API_RESPONSE: -3}"
if [ "$API_HTTP_CODE" = "200" ]; then
    echo "✅ API 调用正常"
else
    echo "❌ API 调用异常 ($API_HTTP_CODE)"
fi

# 4. 测试负载均衡
echo "4. 测试负载均衡"
for i in {1..5}; do
    RESPONSE=$(curl -s "http://localhost/api/health" 2>/dev/null)
    if [[ "$RESPONSE" == *"healthy"* ]]; then
        echo "✅ 负载均衡测试 $i/5 成功"
    else
        echo "❌ 负载均衡测试 $i/5 失败"
    fi
done

echo ""
echo "集成测试完成"
```

### 8. MySQL 代理验证 (仅备用服务器)

#### MySQL 代理连接测试

```bash
#!/bin/bash
# MySQL 代理验证脚本 (仅在备用服务器执行)

echo "=== MySQL 代理验证 ==="

# 检查当前服务器是否为备用服务器
CURRENT_IP=$(hostname -I | awk '{print $1}')
if [ "$CURRENT_IP" != "120.131.10.128" ]; then
    echo "此脚本仅在备用服务器 (120.131.10.128) 上执行"
    exit 0
fi

# 检查 Nginx Stream 模块
echo "## Nginx Stream 模块检查"
if nginx -V 2>&1 | grep -q "with-stream"; then
    echo "✅ Nginx Stream 模块已启用"
else
    echo "❌ Nginx Stream 模块未启用"
fi

# 检查 MySQL 代理端口监听
echo ""
echo "## MySQL 代理端口检查"
if netstat -tlnp | grep ":3306 " >/dev/null; then
    echo "✅ MySQL 代理端口 3306 正在监听"

    # 检查监听进程
    LISTEN_PROCESS=$(netstat -tlnp | grep ":3306 " | awk '{print $7}' | cut -d'/' -f2)
    echo "监听进程: $LISTEN_PROCESS"
else
    echo "❌ MySQL 代理端口 3306 未监听"
fi

# 测试 MySQL 代理连接
echo ""
echo "## MySQL 代理连接测试"
# 使用 telnet 测试连接 (不需要 MySQL 客户端)
if command -v telnet >/dev/null 2>&1; then
    if timeout 5 telnet localhost 3306 </dev/null >/dev/null 2>&1; then
        echo "✅ MySQL 代理连接测试成功"
    else
        echo "❌ MySQL 代理连接测试失败"
    fi
else
    # 使用 nc 作为替代
    if command -v nc >/dev/null 2>&1; then
        if nc -z localhost 3306 2>/dev/null; then
            echo "✅ MySQL 代理连接测试成功 (nc)"
        else
            echo "❌ MySQL 代理连接测试失败 (nc)"
        fi
    else
        echo "⚠️  无法测试 MySQL 连接 (缺少 telnet 或 nc 工具)"
    fi
fi

# 检查 Nginx 错误日志中的 MySQL 代理错误
echo ""
echo "## MySQL 代理错误日志检查"
MYSQL_ERROR_LOG="/var/log/nginx/mysql_proxy_error.log"
if [ -f "$MYSQL_ERROR_LOG" ]; then
    ERROR_COUNT=$(wc -l < "$MYSQL_ERROR_LOG")
    echo "MySQL 代理错误日志行数: $ERROR_COUNT"

    if [ $ERROR_COUNT -gt 0 ]; then
        echo "最近的错误 (最多5行):"
        tail -n 5 "$MYSQL_ERROR_LOG"
    else
        echo "✅ 无 MySQL 代理错误"
    fi
else
    echo "⚠️  MySQL 代理错误日志文件不存在"
fi

# 测试从外部访问 MySQL 代理 (如果配置了外部访问)
echo ""
echo "## 外部 MySQL 代理访问测试"
EXTERNAL_IP="120.131.10.128"
if nc -z $EXTERNAL_IP 3306 2>/dev/null; then
    echo "✅ 外部 MySQL 代理访问正常"
else
    echo "❌ 外部 MySQL 代理访问失败"
fi

echo ""
echo "MySQL 代理验证完成"
```

### 9. ICA Link 多实例验证

#### ICA Link 多实例部署验证

```bash
#!/bin/bash
# ICA Link 多实例验证脚本

echo "=== ICA Link 多实例验证 ==="

# 定义实例端口
ICALINK_PORTS=(3002 3003 3004)
EXPECTED_INSTANCES=3

echo "## ICA Link 实例状态检查"

# 检查每个实例的容器状态
for i in $(seq 1 $EXPECTED_INSTANCES); do
    CONTAINER_NAME="obsync-app-icalink-$i-s1"

    if docker ps | grep "$CONTAINER_NAME" | grep -q "Up"; then
        echo "✅ 容器 $CONTAINER_NAME 运行正常"
    else
        echo "❌ 容器 $CONTAINER_NAME 未运行"
    fi
done

echo ""
echo "## ICA Link 端口监听检查"

# 检查端口监听
for port in "${ICALINK_PORTS[@]}"; do
    if netstat -tlnp | grep "127.0.0.1:$port " >/dev/null; then
        echo "✅ 端口 $port 正在监听"
    else
        echo "❌ 端口 $port 未监听"
    fi
done

echo ""
echo "## ICA Link 健康检查"

# 检查每个实例的健康状态
HEALTHY_COUNT=0
for port in "${ICALINK_PORTS[@]}"; do
    if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
        echo "✅ 实例 localhost:$port 健康检查通过"
        HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
    else
        echo "❌ 实例 localhost:$port 健康检查失败"
    fi
done

echo ""
echo "## 负载均衡验证"

# 通过 API Gateway 测试负载均衡
if curl -s -f "http://localhost:8090/icalink/status" >/dev/null 2>&1; then
    echo "✅ API Gateway ICA Link 负载均衡状态端点可访问"

    # 获取负载均衡状态
    LB_STATUS=$(curl -s "http://localhost:8090/icalink/status")
    TOTAL_INSTANCES=$(echo "$LB_STATUS" | jq -r '.totalInstances' 2>/dev/null || echo "unknown")
    HEALTHY_INSTANCES=$(echo "$LB_STATUS" | jq -r '.healthyInstances' 2>/dev/null || echo "unknown")

    echo "负载均衡状态: $HEALTHY_INSTANCES/$TOTAL_INSTANCES 实例健康"

    if [ "$HEALTHY_INSTANCES" = "$EXPECTED_INSTANCES" ]; then
        echo "✅ 所有实例都通过负载均衡器健康检查"
    else
        echo "⚠️  部分实例未通过负载均衡器健康检查"
    fi
else
    echo "❌ API Gateway ICA Link 负载均衡状态端点不可访问"
fi

echo ""
echo "## 负载分发测试"

# 测试负载分发
echo "执行负载分发测试 (发送10个请求)..."
INSTANCE_RESPONSES=()

for i in {1..10}; do
    RESPONSE=$(curl -s -H "X-Test-Request: $i" "http://localhost:8090/icalink/health" 2>/dev/null)
    INSTANCE_ID=$(echo "$RESPONSE" | jq -r '.instance.id' 2>/dev/null || echo "unknown")
    INSTANCE_RESPONSES+=("$INSTANCE_ID")
done

# 统计实例分发情况
echo "实例分发统计:"
printf '%s\n' "${INSTANCE_RESPONSES[@]}" | sort | uniq -c | while read count instance; do
    echo "  实例 $instance: $count 次请求"
done

# 检查是否有负载分发
UNIQUE_INSTANCES=$(printf '%s\n' "${INSTANCE_RESPONSES[@]}" | sort | uniq | wc -l)
if [ "$UNIQUE_INSTANCES" -gt 1 ]; then
    echo "✅ 负载均衡正常工作，请求分发到多个实例"
else
    echo "⚠️  所有请求都分发到同一个实例，请检查负载均衡配置"
fi

echo ""
echo "## 故障转移测试"

# 模拟实例故障
if [ ${#ICALINK_PORTS[@]} -gt 1 ]; then
    FIRST_PORT=${ICALINK_PORTS[0]}
    echo "模拟停止实例 localhost:$FIRST_PORT..."

    # 停止第一个实例
    docker stop "obsync-app-icalink-1-s1" >/dev/null 2>&1

    # 等待健康检查更新
    sleep 35

    # 测试服务是否仍然可用
    if curl -s -f "http://localhost:8090/icalink/health" >/dev/null 2>&1; then
        echo "✅ 故障转移成功，服务仍然可用"
    else
        echo "❌ 故障转移失败，服务不可用"
    fi

    # 重新启动实例
    echo "重新启动实例..."
    docker start "obsync-app-icalink-1-s1" >/dev/null 2>&1
    sleep 10

    echo "故障转移测试完成"
else
    echo "⚠️  只有一个实例，跳过故障转移测试"
fi

echo ""
echo "## 性能基准测试"

# 简单的性能测试
echo "执行性能基准测试 (100个并发请求)..."
if command -v ab >/dev/null 2>&1; then
    ab -n 100 -c 10 "http://localhost:8090/icalink/health" 2>/dev/null | grep -E "(Requests per second|Time per request)" || echo "性能测试执行失败"
else
    echo "⚠️  Apache Bench (ab) 未安装，跳过性能测试"
fi

echo ""
echo "=== ICA Link 多实例验证完成 ==="
echo "健康实例数: $HEALTHY_COUNT/$EXPECTED_INSTANCES"

if [ "$HEALTHY_COUNT" -eq "$EXPECTED_INSTANCES" ]; then
    echo "✅ 所有 ICA Link 实例验证通过"
else
    echo "❌ 部分 ICA Link 实例验证失败"
fi
```

## 📊 验证报告生成

### 自动化验证脚本

```bash
#!/bin/bash
# 完整验证脚本
# 文件位置: /opt/obsync/scripts/full-verification.sh

REPORT_FILE="/opt/obsync/verification-report-$(date +%Y%m%d_%H%M%S).txt"

echo "=== ObSync 系统部署验证报告 ===" > $REPORT_FILE
echo "验证时间: $(date)" >> $REPORT_FILE
echo "服务器: $(hostname) ($(hostname -I | awk '{print $1}'))" >> $REPORT_FILE
echo "" >> $REPORT_FILE

# 执行所有验证脚本
VERIFICATION_SCRIPTS=(
    "/opt/obsync/scripts/verify-environment.sh"
    "/opt/obsync/scripts/verify-network.sh"
    "/opt/obsync/scripts/verify-docker.sh"
    "/opt/obsync/scripts/verify-nginx.sh"
    "/opt/obsync/scripts/verify-api.sh"
    "/opt/obsync/scripts/verify-static.sh"
    "/opt/obsync/scripts/verify-mysql-proxy.sh"
    "/opt/obsync/scripts/verify-integration.sh"
)

for script in "${VERIFICATION_SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        echo "执行验证: $script" >> $REPORT_FILE
        bash "$script" >> $REPORT_FILE 2>&1
        echo "" >> $REPORT_FILE
    fi
done

# 生成验证摘要
echo "=== 验证摘要 ===" >> $REPORT_FILE
SUCCESS_COUNT=$(grep -c "✅" "$REPORT_FILE")
WARNING_COUNT=$(grep -c "⚠️" "$REPORT_FILE")
ERROR_COUNT=$(grep -c "❌" "$REPORT_FILE")

echo "成功项目: $SUCCESS_COUNT" >> $REPORT_FILE
echo "警告项目: $WARNING_COUNT" >> $REPORT_FILE
echo "错误项目: $ERROR_COUNT" >> $REPORT_FILE

if [ $ERROR_COUNT -eq 0 ]; then
    echo "✅ 系统验证通过" >> $REPORT_FILE
else
    echo "❌ 系统验证失败，请检查错误项目" >> $REPORT_FILE
fi

echo "" >> $REPORT_FILE
echo "验证报告已生成: $REPORT_FILE"
cat "$REPORT_FILE"
```

## ✅ 验证通过标准

### 必须通过的检查项

- [ ] 所有必要软件已安装并正常运行
- [ ] 网络连通性正常，防火墙配置正确
- [ ] SSL 证书有效且配置正确
- [ ] 所有 Docker 容器运行正常且健康检查通过
- [ ] Nginx 配置正确且负载均衡工作正常
- [ ] API 端点可访问且响应时间正常
- [ ] 静态文件服务正常
- [ ] MySQL 代理服务正常 (备用服务器)
- [ ] 监控和日志系统工作正常

### 可接受的警告项

- [ ] 证书有效期少于 90 天但大于 30 天
- [ ] API 响应时间在 2-5 秒之间
- [ ] 系统资源使用率在 70-85% 之间
- [ ] 部分非关键监控指标异常

### 必须修复的错误项

- [ ] 任何服务无法启动或运行异常
- [ ] 网络连接失败或端口不可达
- [ ] SSL 证书过期或配置错误
- [ ] API 端点返回错误状态码
- [ ] 静态文件无法访问
- [ ] 安全配置缺失或错误

## 🔄 验证后续步骤

1. **验证通过**: 系统可以投入生产使用
2. **部分警告**: 制定改进计划，定期检查
3. **存在错误**: 必须修复所有错误后重新验证
4. **定期验证**: 建议每月执行一次完整验证

验证完成后，系统即可正式投入生产使用。建议定期执行验证脚本以确保系统持续稳定运行。
