#!/bin/bash

# Stratix Gateway 高级构建和推送脚本
set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 默认配置
DEFAULT_PROJECT_NAME="app-icasync"
DEFAULT_VERSION="latest"

# 私有仓库配置
REGISTRY="g-rrng9518-docker.pkg.coding.net"
DOCKER_USERNAME="sync-1750080420644"
DOCKER_PASSWORD="483742128078285bba00ae2fae50fe10f8458a26"
NAMESPACE="obsync/sync"

# 支持的平台
PLATFORMS="linux/amd64"
# 如果需要支持多平台，可以启用下面这行
# PLATFORMS="linux/amd64,linux/arm64"

# 显示帮助信息
show_help() {
    echo -e "${BLUE}Stratix Gateway Docker 构建和推送脚本${NC}"
    echo ""
    echo "用法:"
    echo "  $0 [OPTIONS] [PROJECT_NAME] [VERSION]"
    echo ""
    echo "参数:"
    echo "  PROJECT_NAME    项目名称 (默认: ${DEFAULT_PROJECT_NAME})"
    echo "  VERSION         版本标签 (默认: ${DEFAULT_VERSION})"
    echo ""
    echo "选项:"
    echo "  -h, --help      显示帮助信息"
    echo "  --no-cache      禁用构建缓存"
    echo "  --dry-run       仅显示将要执行的命令，不实际执行"
    echo "  --multi-arch    构建多架构镜像 (linux/amd64,linux/arm64)"
    echo "  --latest        同时推送 latest 标签"
    echo ""
    echo "示例:"
    echo "  $0                                    # 使用默认参数"
    echo "  $0 stratix-gateway v1.0.0            # 指定项目和版本"
    echo "  $0 --no-cache stratix-gateway v1.0.0 # 禁用缓存构建"
    echo "  $0 --dry-run stratix-gateway v1.0.0  # 预览命令"
    echo ""
}

# 验证版本格式
validate_version() {
    local version=$1
    if [[ $version == "latest" ]]; then
        return 0
    fi
    
    # 验证语义化版本格式 (如 v1.0.0, 1.0.0, v1.0.0-beta.1 等)
    if [[ $version =~ ^v?[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9]+(\.[0-9]+)?)?$ ]]; then
        return 0
    else
        echo -e "${RED}❌ 版本格式不正确: $version${NC}"
        echo -e "${YELLOW}建议格式: v1.0.0, 1.0.0, v1.0.0-beta.1${NC}"
        return 1
    fi
}

# 记录日志
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# 检查环境
check_environment() {
    log_info "检查环境依赖..."
    
    # 检查 Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    
    # 检查 Docker Buildx
    if ! docker buildx version &> /dev/null; then
        log_error "Docker Buildx 未安装，请先安装 Docker Buildx"
        exit 1
    fi
    
    # 检查项目文件
    if [ ! -f "package.json" ] || [ ! -f "dockerfile" ] || [ ! -f ".npmrc" ]; then
        log_error "请在 app-icasync 项目根目录下运行此脚本"
        log_error "需要的文件: package.json, dockerfile, .npmrc"
        exit 1
    fi
    
    BUILD_CONTEXT="."
    DOCKERFILE_PATH="dockerfile"
    
    # 检查 Docker 守护进程
    if ! docker info &> /dev/null; then
        log_error "Docker 守护进程未运行，请启动 Docker"
        exit 1
    fi
    
    log_success "环境检查通过"
}

# 解析命令行参数
parse_arguments() {
    NO_CACHE=false
    DRY_RUN=false
    MULTI_ARCH=false
    PUSH_LATEST=false
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --no-cache)
                NO_CACHE=true
                shift
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --multi-arch)
                MULTI_ARCH=true
                PLATFORMS="linux/amd64,linux/arm64"
                shift
                ;;
            --latest)
                PUSH_LATEST=true
                shift
                ;;
            -*)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
            *)
                if [ -z "$PROJECT_NAME" ]; then
                    PROJECT_NAME="$1"
                elif [ -z "$VERSION" ]; then
                    VERSION="$1"
                else
                    log_error "过多参数: $1"
                    show_help
                    exit 1
                fi
                shift
                ;;
        esac
    done
    
    # 设置默认值
    PROJECT_NAME=${PROJECT_NAME:-$DEFAULT_PROJECT_NAME}
    VERSION=${VERSION:-$DEFAULT_VERSION}
    
    # 验证版本格式
    if ! validate_version "$VERSION"; then
        exit 1
    fi
}

# 执行命令 (支持 dry-run 模式)
execute_command() {
    local cmd="$1"
    local description="$2"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${YELLOW}[DRY-RUN] $description${NC}"
        echo -e "${YELLOW}命令: $cmd${NC}"
        echo ""
    else
        log_info "$description"
        eval "$cmd"
    fi
}

# 主函数
main() {
    # 解析参数
    parse_arguments "$@"
    
    # 构建镜像名称
    IMAGE_NAME="${REGISTRY}/${NAMESPACE}/${PROJECT_NAME}"
    FULL_IMAGE_NAME="${IMAGE_NAME}:${VERSION}"
    
    echo -e "${BLUE}🚀 Stratix Gateway Docker 构建和推送${NC}"
    echo "======================================"
    echo -e "${BLUE}📦 项目名称:${NC} ${PROJECT_NAME}"
    echo -e "${BLUE}🏷️  版本标签:${NC} ${VERSION}"
    echo -e "${BLUE}🎯 目标平台:${NC} ${PLATFORMS}"
    echo -e "${BLUE}🏭 镜像地址:${NC} ${FULL_IMAGE_NAME}"
    echo -e "${BLUE}🔧 构建选项:${NC} 缓存=$([ "$NO_CACHE" = true ] && echo "禁用" || echo "启用"), 预览模式=$([ "$DRY_RUN" = true ] && echo "启用" || echo "禁用")"
    echo ""
    
    # 检查环境
    if [ "$DRY_RUN" = false ]; then
        check_environment
    fi
    
    # 登录到私有仓库
    execute_command \
        "echo '${DOCKER_PASSWORD}' | docker login -u '${DOCKER_USERNAME}' --password-stdin '${REGISTRY}'" \
        "登录到 CODING 制品库"
    
    # 设置构建器
    execute_command \
        "docker buildx ls | grep -q 'multiarch' || docker buildx create --name multiarch --use --bootstrap" \
        "设置多架构构建器"
    
    execute_command \
        "docker buildx use multiarch" \
        "切换到多架构构建器"
    
    # 构建命令参数
    BUILD_ARGS="--platform ${PLATFORMS}"
    BUILD_ARGS+=" --tag ${FULL_IMAGE_NAME}"
    
    if [ "$PUSH_LATEST" = true ] || [ "$VERSION" = "latest" ]; then
        BUILD_ARGS+=" --tag ${IMAGE_NAME}:latest"
    fi
    
    if [ "$NO_CACHE" = true ]; then
        BUILD_ARGS+=" --no-cache"
    fi
    
    if [ "$DRY_RUN" = false ]; then
        BUILD_ARGS+=" --push"
    fi
    
    BUILD_ARGS+=" --file ${DOCKERFILE_PATH} ${BUILD_CONTEXT}"
    
    # 执行构建
    execute_command \
        "docker buildx build ${BUILD_ARGS}" \
        "构建并推送 Docker 镜像"
    
    if [ "$DRY_RUN" = false ]; then
        # 验证镜像
        log_info "验证镜像信息..."
        docker buildx imagetools inspect "${FULL_IMAGE_NAME}"
        
        log_success "构建推送完成！"
        echo ""
        echo -e "${GREEN}📋 镜像信息:${NC}"
        echo "  • 完整名称: ${FULL_IMAGE_NAME}"
        if [ "$PUSH_LATEST" = true ] || [ "$VERSION" = "latest" ]; then
            echo "  • 最新标签: ${IMAGE_NAME}:latest"
        fi
        echo "  • 支持平台: ${PLATFORMS}"
        echo ""
        echo -e "${GREEN}📡 部署命令示例:${NC}"
        echo "  docker pull ${FULL_IMAGE_NAME}"
        echo "  docker run -d -p 3000:3000 --name ${PROJECT_NAME} ${FULL_IMAGE_NAME}"
    fi
}

# 错误处理
trap 'log_error "脚本执行失败，退出码: $?"' ERR

# 执行主函数
main "$@" 