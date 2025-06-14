#!/bin/bash

# @stratix/agendaedu-web Vite应用部署脚本
# 使用方法: ./deploy.sh [环境] [选项]
# 环境: dev|staging|prod (默认: dev)
# 选项: --build-only, --no-cache, --logs, --static

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
ENVIRONMENT=${1:-dev}
BUILD_ONLY=false
NO_CACHE=false
SHOW_LOGS=false
STATIC_DEPLOY=false

# 解析命令行参数
for arg in "$@"; do
    case $arg in
        --build-only)
            BUILD_ONLY=true
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --logs)
            SHOW_LOGS=true
            shift
            ;;
        --static)
            STATIC_DEPLOY=true
            shift
            ;;
    esac
done

echo -e "${BLUE}🚀 开始部署 @stratix/agendaedu-web 应用...${NC}"
echo -e "${YELLOW}环境: $ENVIRONMENT${NC}"
echo -e "${YELLOW}部署模式: $([ "$STATIC_DEPLOY" = true ] && echo "静态文件" || echo "Docker容器")${NC}"

# 检查必要工具
check_requirements() {
    echo -e "${BLUE}📋 检查系统要求...${NC}"
    
    if ! command -v pnpm &> /dev/null; then
        echo -e "${RED}❌ pnpm 未安装${NC}"
        exit 1
    fi
    
    if [ "$STATIC_DEPLOY" = false ]; then
        if ! command -v docker &> /dev/null; then
            echo -e "${RED}❌ Docker 未安装${NC}"
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            echo -e "${RED}❌ Docker Compose 未安装${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ 系统要求检查通过${NC}"
}

# 设置环境变量
setup_environment() {
    echo -e "${BLUE}🔧 设置环境变量...${NC}"
    
    case $ENVIRONMENT in
        prod)
            export NODE_ENV=production
            export VITE_API_URL=https://chat.whzhsc.cn/api
            export VITE_APP_TITLE="AgendaEdu Web"
            ;;
        staging)
            export NODE_ENV=staging
            export VITE_API_URL=https://chat.whzhsc.cn/api/api
            export VITE_APP_TITLE="AgendaEdu Web (Staging)"
            ;;
        *)
            export NODE_ENV=development
            export VITE_API_URL=http://localhost:3000/api
            export VITE_APP_TITLE="AgendaEdu Web (Dev)"
            ;;
    esac
    
    echo -e "${GREEN}✅ 环境变量设置完成${NC}"
}

# 安装依赖
install_dependencies() {
    echo -e "${BLUE}📦 安装依赖...${NC}"
    pnpm install --frozen-lockfile
    echo -e "${GREEN}✅ 依赖安装完成${NC}"
}

# 构建应用
build_app() {
    echo -e "${BLUE}🔨 构建应用...${NC}"
    
    if [ "$NO_CACHE" = true ]; then
        pnpm run clean
    fi
    
    case $ENVIRONMENT in
        prod)
            pnpm run build:prod
            ;;
        staging)
            pnpm run build:staging
            ;;
        *)
            pnpm run build
            ;;
    esac
    
    echo -e "${GREEN}✅ 应用构建完成${NC}"
}

# 静态文件部署
deploy_static() {
    echo -e "${BLUE}📁 部署静态文件...${NC}"
    
    # 创建部署目录
    DEPLOY_DIR="./deploy-$ENVIRONMENT"
    mkdir -p "$DEPLOY_DIR"
    
    # 复制构建产物
    cp -r dist/* "$DEPLOY_DIR/"
    
    # 创建简单的服务器脚本
    cat > "$DEPLOY_DIR/server.js" << 'EOF'
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 8080;

// 静态文件服务
app.use(express.static('.'));

// SPA路由处理
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
EOF
    
    # 创建package.json
    cat > "$DEPLOY_DIR/package.json" << 'EOF'
{
  "name": "agendaedu-web-static",
  "version": "1.0.0",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
EOF
    
    echo -e "${GREEN}✅ 静态文件部署完成${NC}"
    echo -e "${BLUE}📁 部署目录: $DEPLOY_DIR${NC}"
    echo -e "${BLUE}🚀 启动命令: cd $DEPLOY_DIR && npm install && npm start${NC}"
}

# Docker构建
build_docker() {
    echo -e "${BLUE}🐳 构建Docker镜像...${NC}"
    
    BUILD_ARGS="--build-arg NODE_ENV=$NODE_ENV --build-arg VITE_API_URL=$VITE_API_URL --build-arg VITE_APP_TITLE=$VITE_APP_TITLE"
    
    if [ "$NO_CACHE" = true ]; then
        docker-compose build --no-cache $BUILD_ARGS agendaedu-web
    else
        docker-compose build $BUILD_ARGS agendaedu-web
    fi
    
    echo -e "${GREEN}✅ Docker镜像构建完成${NC}"
}

# 部署服务
deploy_services() {
    echo -e "${BLUE}🚀 部署服务...${NC}"
    
    # 停止现有服务
    docker-compose down
    
    # 启动服务
    docker-compose up -d agendaedu-web
    
    # 等待服务启动
    echo -e "${YELLOW}⏳ 等待服务启动...${NC}"
    sleep 15
    
    # 检查服务状态
    if docker-compose ps agendaedu-web | grep -q "Up"; then
        echo -e "${GREEN}✅ 服务部署成功${NC}"
        
        # 显示服务信息
        echo -e "${BLUE}📊 服务状态:${NC}"
        docker-compose ps agendaedu-web
        
        echo -e "${BLUE}🌐 访问地址:${NC}"
        echo -e "  应用: ${GREEN}http://localhost:8080${NC}"
        echo -e "  健康检查: ${GREEN}http://localhost:8080/health${NC}"
        
    else
        echo -e "${RED}❌ 服务部署失败${NC}"
        docker-compose logs agendaedu-web
        exit 1
    fi
}

# 显示日志
show_logs() {
    if [ "$SHOW_LOGS" = true ]; then
        echo -e "${BLUE}📋 显示服务日志...${NC}"
        docker-compose logs -f agendaedu-web
    fi
}

# 清理函数
cleanup() {
    echo -e "${YELLOW}🧹 清理临时文件...${NC}"
    # 这里可以添加清理逻辑
}

# 主执行流程
main() {
    trap cleanup EXIT
    
    check_requirements
    setup_environment
    install_dependencies
    build_app
    
    if [ "$BUILD_ONLY" = false ]; then
        if [ "$STATIC_DEPLOY" = true ]; then
            deploy_static
        else
            build_docker
            deploy_services
            show_logs
        fi
    else
        echo -e "${GREEN}✅ 仅构建模式完成${NC}"
    fi
}

# 执行主函数
main

echo -e "${GREEN}🎉 部署完成!${NC}" 