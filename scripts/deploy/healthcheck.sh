#!/bin/sh

# Server-2 健康检查脚本
# 监控本地服务状态并与主服务器通信

# 配置
PRIMARY_SERVER=${PRIMARY_SERVER:-"10.0.0.102"}
CHECK_INTERVAL=${CHECK_INTERVAL:-30}
LOG_FILE="/app/logs/healthcheck.log"

# 服务列表
SERVICES="api-gateway:8090 app-icalink:3002 app-icasync:3001"

# 日志函数
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [HEALTHCHECK] $1" | tee -a "$LOG_FILE"
}

# 检查单个服务
check_service() {
    local service_name=$1
    local port=$2
    local url="http://172.20.0.$(echo $service_name | sed 's/.*-//')0:$port/health"
    
    if [ "$service_name" = "api-gateway" ]; then
        url="http://172.20.0.20:$port/health"
    elif [ "$service_name" = "app-icalink" ]; then
        url="http://172.20.0.21:$port/health"
    elif [ "$service_name" = "app-icasync" ]; then
        url="http://172.20.0.22:$port/health"
    fi
    
    if curl -s -f --max-time 5 "$url" > /dev/null 2>&1; then
        echo "healthy"
    else
        echo "unhealthy"
    fi
}

# 检查主服务器连通性
check_primary_server() {
    if ping -c 1 -W 3 "$PRIMARY_SERVER" > /dev/null 2>&1; then
        echo "reachable"
    else
        echo "unreachable"
    fi
}

# 生成状态报告
generate_status_report() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local primary_status=$(check_primary_server)
    
    echo "{"
    echo "  \"timestamp\": \"$timestamp\","
    echo "  \"server\": \"server-2\","
    echo "  \"primary_server_status\": \"$primary_status\","
    echo "  \"services\": {"
    
    local first=true
    for service in $SERVICES; do
        local service_name=$(echo $service | cut -d: -f1)
        local port=$(echo $service | cut -d: -f2)
        local status=$(check_service $service_name $port)
        
        if [ "$first" = true ]; then
            first=false
        else
            echo ","
        fi
        
        echo "    \"$service_name\": \"$status\""
    done
    
    echo "  }"
    echo "}"
}

# 主循环
main() {
    log "健康检查服务启动"
    log "检查间隔: ${CHECK_INTERVAL}秒"
    log "主服务器: $PRIMARY_SERVER"
    
    while true; do
        # 生成状态报告
        status_report=$(generate_status_report)
        
        # 记录状态
        echo "$status_report" > /tmp/server2_status.json
        
        # 检查是否有服务异常
        unhealthy_count=$(echo "$status_report" | grep -c "unhealthy" || true)
        
        if [ "$unhealthy_count" -gt 0 ]; then
            log "发现 $unhealthy_count 个异常服务"
            log "$status_report"
        fi
        
        # 检查主服务器状态
        primary_status=$(check_primary_server)
        if [ "$primary_status" = "unreachable" ]; then
            log "警告: 主服务器不可达"
        fi
        
        sleep "$CHECK_INTERVAL"
    done
}

# 信号处理
trap 'log "健康检查服务停止"; exit 0' TERM INT

# 启动
main
