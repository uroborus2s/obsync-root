#!/bin/bash

# 快速部署脚本 - 修复权限问题版本
# 使用方法: ./quick-deploy.sh your-server-ip

set -e

# 配置
SERVER_HOST="${1:-chat.wzhsc.cn}"  # 从命令行参数获取，默认为chat.wzhsc.cn
SERVER_USER="${2:-ecs-user}"
SERVER_PATH="/var/www/app"
TEMP_PATH="/tmp/agendaedu-app-deploy"

echo "🚀 快速部署到服务器: $SERVER_HOST"

# 1. 构建项目
echo "📦 构建项目..."
pnpm run build

# 2. 检查构建结果
if [ ! -f "dist/index.html" ]; then
    echo "❌ 构建失败"
    exit 1
fi

echo "✅ 构建完成"

# 3. 上传文件到临时目录
echo "📤 上传文件到服务器临时目录..."
ssh $SERVER_USER@$SERVER_HOST "rm -rf $TEMP_PATH && mkdir -p $TEMP_PATH"
rsync -avz --delete dist/ $SERVER_USER@$SERVER_HOST:$TEMP_PATH/

# 4. 使用sudo移动文件到目标目录
echo "🔄 移动文件到目标目录..."
ssh $SERVER_USER@$SERVER_HOST "
    # 备份现有文件
    if [ -d '$SERVER_PATH' ]; then
        sudo cp -r '$SERVER_PATH' '$SERVER_PATH.backup.\$(date +%Y%m%d_%H%M%S)' 2>/dev/null || true
    fi
    
    # 创建目标目录
    sudo mkdir -p '$SERVER_PATH'
    
    # 清空目标目录
    sudo rm -rf '$SERVER_PATH'/*
    
    # 移动文件
    sudo cp -r '$TEMP_PATH'/* '$SERVER_PATH'/ 
    
    # 清理临时目录
    rm -rf '$TEMP_PATH'
"

# 5. 设置权限
echo "🔐 设置权限..."
ssh $SERVER_USER@$SERVER_HOST "
    sudo chown -R nginx:nginx $SERVER_PATH
    sudo chmod -R 755 $SERVER_PATH
    sudo find $SERVER_PATH -type f -exec chmod 644 {} \;
"

# 6. 重启nginx
echo "🔄 重启nginx..."
ssh $SERVER_USER@$SERVER_HOST "
    sudo nginx -t && sudo systemctl reload nginx
"

echo "🎉 部署完成！"
echo "📍 访问地址: https://chat.wzhsc.cn/app/" 