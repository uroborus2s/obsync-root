# ICA Link 多实例部署脚本

## 🚀 部署脚本

### 主服务器部署脚本

```bash
#!/bin/bash
# ICA Link 多实例部署脚本 - 主服务器
# 文件位置: /opt/obsync/scripts/deploy-icalink-main.sh

set -e

DEPLOY_DIR="/opt/obsync"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.yml"
ENV_FILE="$DEPLOY_DIR/.env"

echo "=== ICA Link 多实例部署 - 主服务器 ==="

# 检查环境
if [ ! -f "$ENV_FILE" ]; then
    echo "错误: 环境变量文件不存在: $ENV_FILE"
    exit 1
fi

# 加载环境变量
source "$ENV_FILE"

# 拉取最新镜像
echo "拉取 ICA Link 镜像..."
docker compose -f "$COMPOSE_FILE" pull app-icalink-1 app-icalink-2 app-icalink-3

# 停止现有实例
echo "停止现有 ICA Link 实例..."
docker compose -f "$COMPOSE_FILE" down app-icalink-1 app-icalink-2 app-icalink-3

# 启动新实例
echo "启动 ICA Link 实例..."
docker compose -f "$COMPOSE_FILE" up -d app-icalink-1 app-icalink-2 app-icalink-3

# 等待实例启动
echo "等待实例启动..."
sleep 30

# 验证实例状态
echo "验证实例状态..."
ICALINK_PORTS=(3002 3003 3004)
HEALTHY_COUNT=0

for port in "${ICALINK_PORTS[@]}"; do
    if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
        echo "✅ 实例 localhost:$port 启动成功"
        HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
    else
        echo "❌ 实例 localhost:$port 启动失败"
    fi
done

# 检查负载均衡器
echo "检查负载均衡器状态..."
sleep 10
if curl -s -f "http://localhost:8090/icalink/status" >/dev/null 2>&1; then
    LB_STATUS=$(curl -s "http://localhost:8090/icalink/status")
    HEALTHY_INSTANCES=$(echo "$LB_STATUS" | jq -r '.healthyInstances' 2>/dev/null || echo "unknown")
    echo "负载均衡器检测到 $HEALTHY_INSTANCES 个健康实例"
else
    echo "⚠️  负载均衡器状态检查失败"
fi

echo "=== 主服务器部署完成 ==="
echo "健康实例数: $HEALTHY_COUNT/3"

if [ "$HEALTHY_COUNT" -eq 3 ]; then
    echo "✅ 所有实例部署成功"
    exit 0
else
    echo "❌ 部分实例部署失败"
    exit 1
fi
```

### 备用服务器部署脚本

```bash
#!/bin/bash
# ICA Link 多实例部署脚本 - 备用服务器
# 文件位置: /opt/obsync/scripts/deploy-icalink-backup.sh

set -e

DEPLOY_DIR="/opt/obsync"
COMPOSE_FILE="$DEPLOY_DIR/docker-compose.server-2.yml"
ENV_FILE="$DEPLOY_DIR/.env"

echo "=== ICA Link 多实例部署 - 备用服务器 ==="

# 检查环境
if [ ! -f "$ENV_FILE" ]; then
    echo "错误: 环境变量文件不存在: $ENV_FILE"
    exit 1
fi

# 加载环境变量
source "$ENV_FILE"

# 设置服务器标识
export SERVER_ID=server-2
export SERVER_ROLE=secondary

# 拉取最新镜像
echo "拉取 ICA Link 镜像..."
docker compose -f "$COMPOSE_FILE" pull app-icalink-1 app-icalink-2

# 停止现有实例
echo "停止现有 ICA Link 实例..."
docker compose -f "$COMPOSE_FILE" down app-icalink-1 app-icalink-2

# 启动新实例
echo "启动 ICA Link 实例..."
docker compose -f "$COMPOSE_FILE" up -d app-icalink-1 app-icalink-2

# 等待实例启动
echo "等待实例启动..."
sleep 30

# 验证实例状态
echo "验证实例状态..."
ICALINK_PORTS=(3002 3003)
HEALTHY_COUNT=0

for port in "${ICALINK_PORTS[@]}"; do
    if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
        echo "✅ 实例 localhost:$port 启动成功"
        HEALTHY_COUNT=$((HEALTHY_COUNT + 1))
    else
        echo "❌ 实例 localhost:$port 启动失败"
    fi
done

echo "=== 备用服务器部署完成 ==="
echo "健康实例数: $HEALTHY_COUNT/2"

if [ "$HEALTHY_COUNT" -eq 2 ]; then
    echo "✅ 所有实例部署成功"
    exit 0
else
    echo "❌ 部分实例部署失败"
    exit 1
fi
```

## 🔧 管理脚本

### 实例管理脚本

```bash
#!/bin/bash
# ICA Link 实例管理脚本
# 文件位置: /opt/obsync/scripts/manage-icalink.sh

COMPOSE_FILE="/opt/obsync/docker-compose.yml"
ICALINK_SERVICES=("app-icalink-1" "app-icalink-2" "app-icalink-3")

# 显示帮助信息
show_help() {
    echo "ICA Link 实例管理脚本"
    echo ""
    echo "用法: $0 <命令> [实例编号]"
    echo ""
    echo "命令:"
    echo "  status          - 显示所有实例状态"
    echo "  start [N]       - 启动实例 (N=1,2,3 或 all)"
    echo "  stop [N]        - 停止实例 (N=1,2,3 或 all)"
    echo "  restart [N]     - 重启实例 (N=1,2,3 或 all)"
    echo "  logs [N]        - 查看实例日志 (N=1,2,3)"
    echo "  health [N]      - 检查实例健康状态 (N=1,2,3 或 all)"
    echo "  scale <count>   - 扩缩容到指定实例数"
    echo ""
    echo "示例:"
    echo "  $0 status                # 显示所有实例状态"
    echo "  $0 start 1              # 启动实例1"
    echo "  $0 restart all          # 重启所有实例"
    echo "  $0 logs 2               # 查看实例2的日志"
    echo "  $0 scale 2              # 缩容到2个实例"
}

# 获取实例服务名
get_service_name() {
    local instance_num=$1
    if [ "$instance_num" -ge 1 ] && [ "$instance_num" -le 3 ]; then
        echo "app-icalink-$instance_num"
    else
        echo ""
    fi
}

# 显示实例状态
show_status() {
    echo "=== ICA Link 实例状态 ==="
    
    for i in {1..3}; do
        local service="app-icalink-$i"
        local container="obsync-app-icalink-$i-s1"
        local port=$((3001 + i))
        
        # 检查容器状态
        if docker ps | grep "$container" | grep -q "Up"; then
            local status="运行中"
            
            # 检查健康状态
            if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
                local health="健康"
            else
                local health="异常"
            fi
        else
            local status="已停止"
            local health="N/A"
        fi
        
        echo "实例 $i ($service): $status - $health"
    done
    
    # 检查负载均衡器状态
    echo ""
    echo "=== 负载均衡器状态 ==="
    if curl -s -f "http://localhost:8090/icalink/status" >/dev/null 2>&1; then
        curl -s "http://localhost:8090/icalink/status" | jq '.' 2>/dev/null || echo "负载均衡器响应格式错误"
    else
        echo "负载均衡器不可访问"
    fi
}

# 启动实例
start_instance() {
    local target=$1
    
    if [ "$target" = "all" ]; then
        echo "启动所有 ICA Link 实例..."
        docker compose -f "$COMPOSE_FILE" up -d "${ICALINK_SERVICES[@]}"
    else
        local service=$(get_service_name "$target")
        if [ -n "$service" ]; then
            echo "启动实例 $target ($service)..."
            docker compose -f "$COMPOSE_FILE" up -d "$service"
        else
            echo "错误: 无效的实例编号: $target"
            exit 1
        fi
    fi
}

# 停止实例
stop_instance() {
    local target=$1
    
    if [ "$target" = "all" ]; then
        echo "停止所有 ICA Link 实例..."
        docker compose -f "$COMPOSE_FILE" down "${ICALINK_SERVICES[@]}"
    else
        local service=$(get_service_name "$target")
        if [ -n "$service" ]; then
            echo "停止实例 $target ($service)..."
            docker compose -f "$COMPOSE_FILE" stop "$service"
        else
            echo "错误: 无效的实例编号: $target"
            exit 1
        fi
    fi
}

# 重启实例
restart_instance() {
    local target=$1
    
    if [ "$target" = "all" ]; then
        echo "重启所有 ICA Link 实例..."
        docker compose -f "$COMPOSE_FILE" restart "${ICALINK_SERVICES[@]}"
    else
        local service=$(get_service_name "$target")
        if [ -n "$service" ]; then
            echo "重启实例 $target ($service)..."
            docker compose -f "$COMPOSE_FILE" restart "$service"
        else
            echo "错误: 无效的实例编号: $target"
            exit 1
        fi
    fi
}

# 查看日志
show_logs() {
    local target=$1
    local service=$(get_service_name "$target")
    
    if [ -n "$service" ]; then
        echo "查看实例 $target ($service) 日志..."
        docker compose -f "$COMPOSE_FILE" logs -f "$service"
    else
        echo "错误: 无效的实例编号: $target"
        exit 1
    fi
}

# 健康检查
check_health() {
    local target=$1
    
    if [ "$target" = "all" ]; then
        echo "=== 所有实例健康检查 ==="
        for i in {1..3}; do
            local port=$((3001 + i))
            echo -n "实例 $i (localhost:$port): "
            
            if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
                echo "健康"
            else
                echo "异常"
            fi
        done
    else
        local port=$((3001 + target))
        echo -n "实例 $target (localhost:$port): "
        
        if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
            echo "健康"
            curl -s "http://localhost:$port/health" | jq '.' 2>/dev/null || echo "健康检查响应格式错误"
        else
            echo "异常"
        fi
    fi
}

# 扩缩容
scale_instances() {
    local target_count=$1
    
    if [ "$target_count" -lt 1 ] || [ "$target_count" -gt 3 ]; then
        echo "错误: 实例数必须在 1-3 之间"
        exit 1
    fi
    
    echo "扩缩容到 $target_count 个实例..."
    
    # 停止所有实例
    docker compose -f "$COMPOSE_FILE" down "${ICALINK_SERVICES[@]}"
    
    # 启动指定数量的实例
    local services_to_start=()
    for i in $(seq 1 "$target_count"); do
        services_to_start+=("app-icalink-$i")
    done
    
    docker compose -f "$COMPOSE_FILE" up -d "${services_to_start[@]}"
    
    echo "扩缩容完成，当前运行 $target_count 个实例"
}

# 主逻辑
case "$1" in
    "status")
        show_status
        ;;
    "start")
        start_instance "${2:-all}"
        ;;
    "stop")
        stop_instance "${2:-all}"
        ;;
    "restart")
        restart_instance "${2:-all}"
        ;;
    "logs")
        if [ -z "$2" ]; then
            echo "错误: 请指定实例编号"
            show_help
            exit 1
        fi
        show_logs "$2"
        ;;
    "health")
        check_health "${2:-all}"
        ;;
    "scale")
        if [ -z "$2" ]; then
            echo "错误: 请指定目标实例数"
            show_help
            exit 1
        fi
        scale_instances "$2"
        ;;
    *)
        show_help
        ;;
esac
```

## 📊 监控脚本

### 实时监控脚本

```bash
#!/bin/bash
# ICA Link 实时监控脚本
# 文件位置: /opt/obsync/scripts/icalink-monitor-realtime.sh

# 实时监控 ICA Link 实例
monitor_realtime() {
    while true; do
        clear
        echo "=== ICA Link 实时监控 $(date) ==="
        echo ""
        
        # 显示实例状态
        echo "## 实例状态"
        for i in {1..3}; do
            local port=$((3001 + i))
            local container="obsync-app-icalink-$i-s1"
            
            # 检查容器状态
            if docker ps | grep "$container" | grep -q "Up"; then
                local status="🟢 运行"
                
                # 检查健康状态和响应时间
                local start_time=$(date +%s.%N)
                if curl -s -f "http://localhost:$port/health" >/dev/null 2>&1; then
                    local end_time=$(date +%s.%N)
                    local response_time=$(echo "$end_time - $start_time" | bc)
                    local health="🟢 健康 (${response_time}s)"
                else
                    local health="🔴 异常"
                fi
            else
                local status="🔴 停止"
                local health="N/A"
            fi
            
            echo "实例 $i: $status | $health"
        done
        
        echo ""
        echo "## 负载均衡器状态"
        if curl -s -f "http://localhost:8090/icalink/status" >/dev/null 2>&1; then
            local lb_data=$(curl -s "http://localhost:8090/icalink/status")
            local total=$(echo "$lb_data" | jq -r '.totalInstances' 2>/dev/null || echo "N/A")
            local healthy=$(echo "$lb_data" | jq -r '.healthyInstances' 2>/dev/null || echo "N/A")
            echo "总实例数: $total | 健康实例数: $healthy"
        else
            echo "🔴 负载均衡器不可访问"
        fi
        
        echo ""
        echo "按 Ctrl+C 退出监控"
        sleep 5
    done
}

monitor_realtime
```

## 🔄 使用说明

### 部署步骤

1. **主服务器部署**:
   ```bash
   chmod +x /opt/obsync/scripts/deploy-icalink-main.sh
   /opt/obsync/scripts/deploy-icalink-main.sh
   ```

2. **备用服务器部署**:
   ```bash
   chmod +x /opt/obsync/scripts/deploy-icalink-backup.sh
   /opt/obsync/scripts/deploy-icalink-backup.sh
   ```

3. **验证部署**:
   ```bash
   /opt/obsync/scripts/manage-icalink.sh status
   ```

### 日常管理

- **查看状态**: `./manage-icalink.sh status`
- **重启实例**: `./manage-icalink.sh restart 1`
- **查看日志**: `./manage-icalink.sh logs 2`
- **健康检查**: `./manage-icalink.sh health all`
- **扩缩容**: `./manage-icalink.sh scale 2`

### 监控

- **实时监控**: `./icalink-monitor-realtime.sh`
- **定时监控**: 配置 cron 任务执行监控脚本
