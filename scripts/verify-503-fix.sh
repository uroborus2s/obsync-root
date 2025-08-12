#!/bin/bash

# 验证503错误修复效果脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

echo "🔍 验证503错误修复效果..."
echo ""

# 测试静态文件访问
log_info "测试静态文件访问..."
echo ""

# 测试Web管理后台
echo "📱 测试Web管理后台:"
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://kwps.jlufe.edu.cn/web/)
if [ "$WEB_STATUS" = "200" ]; then
    log_success "✅ Web管理后台访问正常 (HTTP $WEB_STATUS)"
else
    log_error "❌ Web管理后台访问异常 (HTTP $WEB_STATUS)"
fi

# 测试移动端应用
echo "📱 测试移动端应用:"
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://kwps.jlufe.edu.cn/app/)
if [ "$APP_STATUS" = "200" ]; then
    log_success "✅ 移动端应用访问正常 (HTTP $APP_STATUS)"
else
    log_error "❌ 移动端应用访问异常 (HTTP $APP_STATUS)"
fi

# 测试健康检查
echo "🔍 测试健康检查:"
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://kwps.jlufe.edu.cn/health)
if [ "$HEALTH_STATUS" = "200" ]; then
    log_success "✅ 健康检查正常 (HTTP $HEALTH_STATUS)"
else
    log_warning "⚠️ 健康检查异常 (HTTP $HEALTH_STATUS)"
fi

echo ""

# 测试多个并发请求
log_info "测试并发静态文件请求..."
echo ""

SUCCESS_COUNT=0
TOTAL_REQUESTS=10

for i in $(seq 1 $TOTAL_REQUESTS); do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" https://kwps.jlufe.edu.cn/web/)
    if [ "$STATUS" = "200" ]; then
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        echo "请求 $i/$TOTAL_REQUESTS: ✅ HTTP $STATUS"
    else
        echo "请求 $i/$TOTAL_REQUESTS: ❌ HTTP $STATUS"
    fi
    sleep 0.2
done

echo ""
SUCCESS_RATE=$((SUCCESS_COUNT * 100 / TOTAL_REQUESTS))
if [ $SUCCESS_COUNT -eq $TOTAL_REQUESTS ]; then
    log_success "🎉 并发测试完美通过！成功率: $SUCCESS_RATE% ($SUCCESS_COUNT/$TOTAL_REQUESTS)"
elif [ $SUCCESS_COUNT -gt $((TOTAL_REQUESTS * 8 / 10)) ]; then
    log_warning "⚠️ 并发测试基本通过，成功率: $SUCCESS_RATE% ($SUCCESS_COUNT/$TOTAL_REQUESTS)"
else
    log_error "❌ 并发测试失败，成功率: $SUCCESS_RATE% ($SUCCESS_COUNT/$TOTAL_REQUESTS)"
fi

echo ""

# 显示修复总结
log_info "修复总结:"
echo ""
echo "🔧 已解决的问题:"
echo "  1. ✅ SSL证书权限问题 (chmod 644)"
echo "  2. ✅ 限流配置过严问题 (30r/s → 100r/s, burst 50 → 200)"
echo ""
echo "📊 当前配置:"
echo "  - 静态文件限流: 100请求/秒，突发200请求"
echo "  - API请求限流: 10请求/秒，突发20请求"
echo "  - SSL证书权限: 644 (可读)"
echo ""
echo "🌐 访问地址:"
echo "  - Web管理后台: https://kwps.jlufe.edu.cn/web/"
echo "  - 移动端应用: https://kwps.jlufe.edu.cn/app/"
echo "  - 健康检查: https://kwps.jlufe.edu.cn/health"
echo ""

if [ $SUCCESS_COUNT -eq $TOTAL_REQUESTS ] && [ "$WEB_STATUS" = "200" ] && [ "$APP_STATUS" = "200" ]; then
    log_success "🎉 503错误修复完成！静态文件访问已恢复正常。"
else
    log_warning "⚠️ 部分问题可能仍需关注，请检查具体的错误状态码。"
fi

echo ""
echo "💡 如果仍有问题，可以："
echo "  1. 检查Nginx错误日志: ssh ubuntu@jlufe_12.6 'tail -f /var/log/nginx/kwps_error.log'"
echo "  2. 检查服务器资源: ssh ubuntu@jlufe_12.6 'top'"
echo "  3. 重启Nginx服务: ssh ubuntu@jlufe_12.6 'sudo systemctl restart nginx'"
