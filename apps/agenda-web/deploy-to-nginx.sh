#!/bin/bash

# Vite应用部署到Nginx脚本
# 使用方法: ./deploy-to-nginx.sh

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 开始部署Vite应用到Nginx...${NC}"

# 检查是否有构建产物
check_build() {
    echo -e "${BLUE}📋 检查构建产物...${NC}"
    
    if [ ! -d "dist" ]; then
        echo -e "${RED}❌ dist目录不存在，请先运行构建命令${NC}"
        echo -e "${YELLOW}💡 运行: pnpm run build${NC}"
        exit 1
    fi
    
    if [ ! -f "dist/index.html" ]; then
        echo -e "${RED}❌ index.html不存在${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 构建产物检查通过${NC}"
}

# 备份现有文件
backup_existing() {
    echo -e "${BLUE}💾 备份现有文件...${NC}"
    
    if [ -d "/var/www/html" ] && [ "$(ls -A /var/www/html)" ]; then
        BACKUP_DIR="/var/www/html.backup.$(date +%Y%m%d_%H%M%S)"
        sudo cp -r /var/www/html "$BACKUP_DIR"
        echo -e "${GREEN}✅ 备份完成: $BACKUP_DIR${NC}"
    else
        echo -e "${YELLOW}ℹ️  没有现有文件需要备份${NC}"
    fi
}

# 部署静态文件
deploy_files() {
    echo -e "${BLUE}📁 部署静态文件...${NC}"
    
    # 创建目录
    sudo mkdir -p /var/www/html
    
    # 清空现有文件
    sudo rm -rf /var/www/html/*
    
    # 复制新文件
    sudo cp -r dist/* /var/www/html/
    
    # 设置权限
    sudo chown -R www-data:www-data /var/www/html
    sudo chmod -R 755 /var/www/html
    
    echo -e "${GREEN}✅ 文件部署完成${NC}"
}

# 配置Nginx
configure_nginx() {
    echo -e "${BLUE}⚙️  配置Nginx...${NC}"
    
    # 复制配置文件
    if [ -f "nginx-deploy.conf" ]; then
        sudo cp nginx-deploy.conf /etc/nginx/sites-available/agendaedu-web
        
        # 启用站点
        sudo ln -sf /etc/nginx/sites-available/agendaedu-web /etc/nginx/sites-enabled/
        
        # 禁用默认站点 (可选)
        if [ -f "/etc/nginx/sites-enabled/default" ]; then
            sudo rm -f /etc/nginx/sites-enabled/default
        fi
        
        echo -e "${GREEN}✅ Nginx配置完成${NC}"
    else
        echo -e "${YELLOW}⚠️  nginx-deploy.conf不存在，跳过配置${NC}"
    fi
}

# 测试Nginx配置
test_nginx() {
    echo -e "${BLUE}🧪 测试Nginx配置...${NC}"
    
    if sudo nginx -t; then
        echo -e "${GREEN}✅ Nginx配置测试通过${NC}"
    else
        echo -e "${RED}❌ Nginx配置测试失败${NC}"
        exit 1
    fi
}

# 重载Nginx
reload_nginx() {
    echo -e "${BLUE}🔄 重载Nginx...${NC}"
    
    if sudo systemctl reload nginx; then
        echo -e "${GREEN}✅ Nginx重载成功${NC}"
    else
        echo -e "${RED}❌ Nginx重载失败${NC}"
        exit 1
    fi
}

# 验证部署
verify_deployment() {
    echo -e "${BLUE}✅ 验证部署...${NC}"
    
    # 等待服务启动
    sleep 2
    
    # 检查HTTP响应
    if curl -s -o /dev/null -w "%{http_code}" http://localhost/ | grep -q "200"; then
        echo -e "${GREEN}✅ 部署验证成功${NC}"
        echo -e "${BLUE}🌐 访问地址: http://localhost${NC}"
        echo -e "${BLUE}❤️  健康检查: http://localhost/health${NC}"
    else
        echo -e "${RED}❌ 部署验证失败${NC}"
        echo -e "${YELLOW}💡 请检查Nginx日志: sudo tail -f /var/log/nginx/error.log${NC}"
    fi
}

# 显示部署信息
show_info() {
    echo -e "${BLUE}📊 部署信息:${NC}"
    echo -e "  静态文件目录: /var/www/html"
    echo -e "  Nginx配置: /etc/nginx/sites-available/agendaedu-web"
    echo -e "  访问日志: /var/log/nginx/agendaedu-access.log"
    echo -e "  错误日志: /var/log/nginx/agendaedu-error.log"
    
    # 显示文件统计
    FILE_COUNT=$(find /var/www/html -type f | wc -l)
    TOTAL_SIZE=$(du -sh /var/www/html | cut -f1)
    echo -e "  文件数量: $FILE_COUNT"
    echo -e "  总大小: $TOTAL_SIZE"
}

# 主执行流程
main() {
    check_build
    backup_existing
    deploy_files
    configure_nginx
    test_nginx
    reload_nginx
    verify_deployment
    show_info
}

# 显示帮助
show_help() {
    echo "Vite应用部署到Nginx脚本"
    echo ""
    echo "使用方法:"
    echo "  $0              # 执行完整部署"
    echo "  $0 --help       # 显示帮助信息"
    echo ""
    echo "前置条件:"
    echo "  1. 已安装Nginx"
    echo "  2. 已构建Vite应用 (dist目录存在)"
    echo "  3. 具有sudo权限"
    echo ""
    echo "部署步骤:"
    echo "  1. 检查构建产物"
    echo "  2. 备份现有文件"
    echo "  3. 部署静态文件"
    echo "  4. 配置Nginx"
    echo "  5. 测试并重载配置"
    echo "  6. 验证部署结果"
}

# 检查参数
if [[ "$1" == "--help" || "$1" == "-h" ]]; then
    show_help
    exit 0
fi

# 执行主函数
main

echo -e "${GREEN}🎉 部署完成!${NC}" 