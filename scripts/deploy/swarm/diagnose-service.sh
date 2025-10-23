#!/bin/bash

# Docker Swarm 服务诊断脚本
# 用于诊断服务 DNS 解析和网络连接问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 默认参数
STACK_NAME="${1:-obsync}"
SERVICE_NAME="${2:-app-icalink}"
NETWORK_NAME="${3:-obsync-overlay}"

echo "=========================================="
echo "Docker Swarm 服务诊断工具"
echo "=========================================="
echo "Stack: $STACK_NAME"
echo "Service: $SERVICE_NAME"
echo "Network: $NETWORK_NAME"
echo "=========================================="
echo ""

# 1. 检查 Stack 是否存在
log_info "1. 检查 Stack 是否存在..."
if docker stack ls | grep -q "$STACK_NAME"; then
    log_success "Stack '$STACK_NAME' 存在"
else
    log_error "Stack '$STACK_NAME' 不存在"
    log_info "请先部署 Stack: docker stack deploy -c stack.yml $STACK_NAME"
    exit 1
fi
echo ""

# 2. 检查服务列表
log_info "2. 检查所有服务..."
docker service ls --filter "label=com.docker.stack.namespace=$STACK_NAME"
echo ""

# 3. 检查目标服务是否存在
log_info "3. 检查服务 '${STACK_NAME}_${SERVICE_NAME}' 是否存在..."
FULL_SERVICE_NAME="${STACK_NAME}_${SERVICE_NAME}"
if docker service ls --format "{{.Name}}" | grep -q "^${FULL_SERVICE_NAME}$"; then
    log_success "服务 '$FULL_SERVICE_NAME' 存在"
else
    log_error "服务 '$FULL_SERVICE_NAME' 不存在"
    log_info "可用的服务:"
    docker service ls --filter "label=com.docker.stack.namespace=$STACK_NAME" --format "  - {{.Name}}"
    exit 1
fi
echo ""

# 4. 检查服务状态
log_info "4. 检查服务实例状态..."
docker service ps "$FULL_SERVICE_NAME" --no-trunc
echo ""

# 5. 检查服务副本数
log_info "5. 检查服务副本数..."
REPLICAS=$(docker service ls --filter "name=$FULL_SERVICE_NAME" --format "{{.Replicas}}")
log_info "副本状态: $REPLICAS"
if echo "$REPLICAS" | grep -q "0/"; then
    log_error "服务没有运行中的副本!"
    log_info "查看服务日志以了解失败原因:"
    docker service logs "$FULL_SERVICE_NAME" --tail 50
    exit 1
fi
echo ""

# 6. 检查网络
log_info "6. 检查网络 '${STACK_NAME}_${NETWORK_NAME}' 是否存在..."
FULL_NETWORK_NAME="${STACK_NAME}_${NETWORK_NAME}"
if docker network ls --format "{{.Name}}" | grep -q "^${FULL_NETWORK_NAME}$"; then
    log_success "网络 '$FULL_NETWORK_NAME' 存在"
else
    log_error "网络 '$FULL_NETWORK_NAME' 不存在"
    log_info "可用的网络:"
    docker network ls --filter "label=com.docker.stack.namespace=$STACK_NAME" --format "  - {{.Name}}"
    exit 1
fi
echo ""

# 7. 检查网络详情
log_info "7. 检查网络详情..."
docker network inspect "$FULL_NETWORK_NAME" --format '{{json .Containers}}' | jq -r 'to_entries[] | "  - \(.value.Name) (\(.value.IPv4Address))"' 2>/dev/null || \
    docker network inspect "$FULL_NETWORK_NAME" --format '{{range .Containers}}  - {{.Name}} ({{.IPv4Address}}){{"\n"}}{{end}}'
echo ""

# 8. 检查 Secret
log_info "8. 检查相关 Secret..."
SECRET_NAME="${SERVICE_NAME}_config"
if docker secret ls --format "{{.Name}}" | grep -q "^${SECRET_NAME}$"; then
    log_success "Secret '$SECRET_NAME' 存在"
else
    log_warn "Secret '$SECRET_NAME' 不存在"
    log_info "可能需要创建 Secret: echo '<config>' | docker secret create $SECRET_NAME -"
fi
echo ""

# 9. 测试 DNS 解析
log_info "9. 测试 DNS 解析..."
API_GATEWAY_CONTAINER=$(docker ps -q -f "name=${STACK_NAME}_api-gateway" | head -n 1)
if [ -n "$API_GATEWAY_CONTAINER" ]; then
    log_info "从 api-gateway 容器测试 DNS 解析..."
    
    # 测试 nslookup
    if docker exec "$API_GATEWAY_CONTAINER" nslookup "$SERVICE_NAME" 2>/dev/null; then
        log_success "DNS 解析成功: $SERVICE_NAME"
    else
        log_error "DNS 解析失败: $SERVICE_NAME"
        log_info "尝试使用完整服务名..."
        if docker exec "$API_GATEWAY_CONTAINER" nslookup "$FULL_SERVICE_NAME" 2>/dev/null; then
            log_warn "完整服务名可以解析,但短名称不行"
            log_info "可能需要在配置中使用完整服务名: $FULL_SERVICE_NAME"
        fi
    fi
else
    log_warn "未找到 api-gateway 容器,跳过 DNS 测试"
fi
echo ""

# 10. 测试网络连接
log_info "10. 测试网络连接..."
if [ -n "$API_GATEWAY_CONTAINER" ]; then
    log_info "从 api-gateway 容器测试连接到 $SERVICE_NAME:3000..."
    
    # 测试 ping
    if docker exec "$API_GATEWAY_CONTAINER" ping -c 3 "$SERVICE_NAME" 2>/dev/null; then
        log_success "Ping 成功: $SERVICE_NAME"
    else
        log_warn "Ping 失败 (可能容器禁用了 ICMP)"
    fi
    
    # 测试 wget/curl
    if docker exec "$API_GATEWAY_CONTAINER" wget --spider --timeout=5 "http://${SERVICE_NAME}:3000/health" 2>/dev/null; then
        log_success "HTTP 连接成功: http://${SERVICE_NAME}:3000/health"
    elif docker exec "$API_GATEWAY_CONTAINER" curl -f --max-time 5 "http://${SERVICE_NAME}:3000/health" 2>/dev/null; then
        log_success "HTTP 连接成功: http://${SERVICE_NAME}:3000/health"
    else
        log_error "HTTP 连接失败: http://${SERVICE_NAME}:3000/health"
        log_info "检查服务是否正常监听 3000 端口"
    fi
else
    log_warn "未找到 api-gateway 容器,跳过连接测试"
fi
echo ""

# 11. 查看服务日志
log_info "11. 查看服务最近日志 (最后 20 行)..."
docker service logs "$FULL_SERVICE_NAME" --tail 20
echo ""

# 12. 总结
echo "=========================================="
log_info "诊断完成!"
echo "=========================================="
log_info "如果发现问题,请根据上述输出进行修复"
log_info "常见解决方案:"
echo "  1. 服务未启动: docker service scale ${FULL_SERVICE_NAME}=3"
echo "  2. Secret 缺失: docker secret create ${SECRET_NAME} <config_file>"
echo "  3. 重新部署: docker stack deploy -c stack.yml $STACK_NAME"
echo "  4. 查看详细日志: docker service logs ${FULL_SERVICE_NAME} --follow"
echo "=========================================="

