#!/bin/bash

# WPS Template Docker 构建脚本
# 支持多种构建方式

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认配置
IMAGE_NAME="wps-template"
TAG="latest"
BUILD_METHOD="root" # root | local
PUSH=false
REGISTRY=""

# 显示帮助信息
show_help() {
    echo "WPS Template Docker 构建脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -m, --method METHOD     构建方法 (root|local) [默认: root]"
    echo "  -t, --tag TAG          镜像标签 [默认: latest]"
    echo "  -n, --name NAME        镜像名称 [默认: wps-template]"
    echo "  -p, --push             构建后推送到仓库"
    echo "  -r, --registry URL     Docker 仓库地址"
    echo "  -h, --help             显示此帮助信息"
    echo ""
    echo "构建方法说明:"
    echo "  root   - 使用根目录 Dockerfile (推荐，更高效)"
    echo "  local  - 使用本地 dockerfile (完整功能)"
    echo ""
    echo "示例:"
    echo "  $0 -m root -t v1.0.0"
    echo "  $0 -m local -t latest -p -r registry.example.com"
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--method)
            BUILD_METHOD="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -n|--name)
            IMAGE_NAME="$2"
            shift 2
            ;;
        -p|--push)
            PUSH=true
            shift
            ;;
        -r|--registry)
            REGISTRY="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}错误: 未知参数 $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# 验证构建方法
if [[ "$BUILD_METHOD" != "root" && "$BUILD_METHOD" != "local" ]]; then
    echo -e "${RED}错误: 构建方法必须是 'root' 或 'local'${NC}"
    exit 1
fi

# 构建完整镜像名
FULL_IMAGE_NAME="$IMAGE_NAME:$TAG"
if [[ -n "$REGISTRY" ]]; then
    FULL_IMAGE_NAME="$REGISTRY/$FULL_IMAGE_NAME"
fi

echo -e "${GREEN}开始构建 WPS Template Docker 镜像${NC}"
echo -e "${YELLOW}构建方法: $BUILD_METHOD${NC}"
echo -e "${YELLOW}镜像名称: $FULL_IMAGE_NAME${NC}"

# 根据构建方法执行不同的构建命令
if [[ "$BUILD_METHOD" == "root" ]]; then
    echo -e "${GREEN}使用根目录 Dockerfile 构建...${NC}"
    cd ../../
    docker build \
        --build-arg PACKAGE_NAME=@wps/template \
        -t "$FULL_IMAGE_NAME" \
        -f Dockerfile \
        .
else
    echo -e "${GREEN}使用本地 dockerfile 构建...${NC}"
    cd ../../
    docker build \
        -t "$FULL_IMAGE_NAME" \
        -f apps/template/dockerfile \
        .
fi

echo -e "${GREEN}构建完成！${NC}"

# 推送镜像
if [[ "$PUSH" == true ]]; then
    echo -e "${GREEN}推送镜像到仓库...${NC}"
    docker push "$FULL_IMAGE_NAME"
    echo -e "${GREEN}推送完成！${NC}"
fi

# 显示镜像信息
echo -e "${GREEN}镜像信息:${NC}"
docker images "$FULL_IMAGE_NAME"

echo -e "${GREEN}构建脚本执行完成！${NC}"
echo -e "${YELLOW}运行命令: docker run -p 3000:3000 $FULL_IMAGE_NAME${NC}" 