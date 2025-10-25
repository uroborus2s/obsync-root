#!/bin/bash
# 网络诊断脚本 - ObSync系统
# 用于诊断504/503错误和网络问题

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

# 检查命令是否存在
check_command() {
    if ! command -v $1 &> /dev/null; then
        print_error "命令 $1 未找到，请先安装"
        return 1
    fi
    return 0
}

# 1. 检查Nginx状态
check_nginx() {
    print_header "1. 检查Nginx状态"
    
    # 检查Nginx进程
    if pgrep nginx > /dev/null; then
        print_success "Nginx进程运行中"
    else
        print_error "Nginx进程未运行"
        return 1
    fi
    
    # 检查Nginx配置
    if nginx -t 2>&1 | grep -q "successful"; then
        print_success "Nginx配置正确"
    else
        print_error "Nginx配置错误"
        nginx -t
        return 1
    fi
    
    # 检查Nginx错误日志
    print_info "最近10条Nginx错误日志:"
    tail -10 /var/log/nginx/error.log 2>/dev/null || print_warning "无法读取Nginx错误日志"
    
    # 统计504错误
    if [ -f /var/log/nginx/access.log ]; then
        local count_504=$(awk '$9 == 504' /var/log/nginx/access.log | wc -l)
        local count_502=$(awk '$9 == 502' /var/log/nginx/access.log | wc -l)
        local count_503=$(awk '$9 == 503' /var/log/nginx/access.log | wc -l)
        
        print_info "错误统计:"
        echo "  504错误: $count_504"
        echo "  502错误: $count_502"
        echo "  503错误: $count_503"
    fi
}

# 2. 检查Docker Swarm服务状态
check_swarm_services() {
    print_header "2. 检查Docker Swarm服务状态"
    
    if ! check_command docker; then
        return 1
    fi
    
    # 检查api-gateway
    print_info "API Gateway服务状态:"
    docker service ps obsync_api-gateway --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}\t{{.Error}}" 2>/dev/null || print_error "无法获取api-gateway状态"
    
    # 检查app-icalink
    print_info "app-icalink服务状态:"
    docker service ps obsync_app-icalink --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}\t{{.Error}}" 2>/dev/null || print_error "无法获取app-icalink状态"
    
    # 检查app-icasync
    print_info "app-icasync服务状态:"
    docker service ps obsync_app-icasync --format "table {{.Name}}\t{{.Node}}\t{{.CurrentState}}\t{{.Error}}" 2>/dev/null || print_error "无法获取app-icasync状态"
}

# 3. 检查网络连接
check_network_connectivity() {
    print_header "3. 检查网络连接"
    
    # 获取api-gateway容器ID
    local gateway_container=$(docker ps -q -f name=obsync_api-gateway | head -1)
    
    if [ -z "$gateway_container" ]; then
        print_error "未找到运行中的api-gateway容器"
        return 1
    fi
    
    print_info "使用容器: $gateway_container"
    
    # DNS解析测试
    print_info "DNS解析测试:"
    if docker exec $gateway_container nslookup app-icalink 2>&1 | grep -q "Address"; then
        print_success "app-icalink DNS解析成功"
        docker exec $gateway_container nslookup app-icalink 2>&1 | grep "Address"
    else
        print_error "app-icalink DNS解析失败"
    fi
    
    # TCP连接测试
    print_info "TCP连接测试:"
    if docker exec $gateway_container nc -zv app-icalink 3000 2>&1 | grep -q "succeeded"; then
        print_success "app-icalink:3000 TCP连接成功"
    else
        print_error "app-icalink:3000 TCP连接失败"
    fi
    
    # HTTP健康检查
    print_info "HTTP健康检查:"
    local health_response=$(docker exec $gateway_container curl -s -o /dev/null -w "%{http_code}" http://app-icalink:3000/health 2>/dev/null)
    
    if [ "$health_response" = "200" ]; then
        print_success "app-icalink健康检查通过 (HTTP $health_response)"
    else
        print_error "app-icalink健康检查失败 (HTTP $health_response)"
    fi
    
    # 网络延迟测试
    print_info "网络延迟测试:"
    docker exec $gateway_container ping -c 5 app-icalink 2>&1 | tail -2
}

# 4. 检查资源使用
check_resource_usage() {
    print_header "4. 检查资源使用"
    
    print_info "容器资源使用情况:"
    docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}" | grep -E "obsync_api-gateway|obsync_app-icalink|obsync_app-icasync"
}

# 5. 检查服务日志
check_service_logs() {
    print_header "5. 检查服务日志"
    
    print_info "API Gateway最近10条错误日志:"
    docker service logs obsync_api-gateway --tail 10 2>&1 | grep -E "error|Error|ERROR|timeout|Timeout|TIMEOUT|503|504" || print_success "未发现错误日志"
    
    print_info "app-icalink最近10条错误日志:"
    docker service logs obsync_app-icalink --tail 10 2>&1 | grep -E "error|Error|ERROR|timeout|Timeout|TIMEOUT|503|504" || print_success "未发现错误日志"
}

# 6. 检查IPVS负载均衡
check_ipvs() {
    print_header "6. 检查IPVS负载均衡"
    
    if ! check_command ipvsadm; then
        print_warning "ipvsadm未安装，跳过IPVS检查"
        return 0
    fi
    
    print_info "IPVS规则:"
    sudo ipvsadm -Ln 2>/dev/null || print_warning "无法获取IPVS规则（需要root权限）"
}

# 7. 检查Docker网络
check_docker_network() {
    print_header "7. 检查Docker Overlay网络"
    
    print_info "obsync-overlay网络信息:"
    docker network inspect obsync-overlay --format '{{json .}}' 2>/dev/null | jq -r '.Containers | to_entries[] | "\(.value.Name): \(.value.IPv4Address)"' 2>/dev/null || print_warning "无法获取网络信息（需要安装jq）"
}

# 8. 性能测试
performance_test() {
    print_header "8. 性能测试"
    
    # 获取api-gateway容器ID
    local gateway_container=$(docker ps -q -f name=obsync_api-gateway | head -1)
    
    if [ -z "$gateway_container" ]; then
        print_error "未找到运行中的api-gateway容器"
        return 1
    fi
    
    print_info "测试app-icalink响应时间 (10次请求):"
    
    for i in {1..10}; do
        local start=$(date +%s%N)
        docker exec $gateway_container curl -s -o /dev/null http://app-icalink:3000/health 2>/dev/null
        local end=$(date +%s%N)
        local duration=$(( (end - start) / 1000000 ))
        
        if [ $duration -lt 100 ]; then
            echo -e "  请求 $i: ${GREEN}${duration}ms${NC}"
        elif [ $duration -lt 500 ]; then
            echo -e "  请求 $i: ${YELLOW}${duration}ms${NC}"
        else
            echo -e "  请求 $i: ${RED}${duration}ms${NC}"
        fi
    done
}

# 9. 生成诊断报告
generate_report() {
    print_header "9. 生成诊断报告"
    
    local report_file="/tmp/obsync-diagnostics-$(date +%Y%m%d_%H%M%S).txt"
    
    {
        echo "ObSync系统诊断报告"
        echo "生成时间: $(date)"
        echo "========================================"
        echo ""
        
        echo "1. 系统信息"
        echo "主机名: $(hostname)"
        echo "内核版本: $(uname -r)"
        echo "Docker版本: $(docker --version)"
        echo ""
        
        echo "2. 服务状态"
        docker service ls
        echo ""
        
        echo "3. 容器资源使用"
        docker stats --no-stream
        echo ""
        
        echo "4. 最近的错误日志"
        echo "--- API Gateway ---"
        docker service logs obsync_api-gateway --tail 50 2>&1 | grep -E "error|Error|ERROR"
        echo ""
        echo "--- app-icalink ---"
        docker service logs obsync_app-icalink --tail 50 2>&1 | grep -E "error|Error|ERROR"
        echo ""
        
    } > "$report_file"
    
    print_success "诊断报告已生成: $report_file"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "╔════════════════════════════════════════╗"
    echo "║   ObSync 网络诊断工具 v1.0             ║"
    echo "║   Network Diagnostics Tool             ║"
    echo "╚════════════════════════════════════════╝"
    echo -e "${NC}"
    
    # 执行所有检查
    check_nginx
    check_swarm_services
    check_network_connectivity
    check_resource_usage
    check_service_logs
    check_ipvs
    check_docker_network
    performance_test
    generate_report
    
    print_header "诊断完成"
    print_info "如果发现问题，请查看详细日志或联系技术支持"
}

# 运行主函数
main "$@"

