#!/bin/bash

# 开发环境启动脚本

echo "🚀 Starting Stratix API Gateway in development mode..."

# 检查 Node.js 版本
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt "22" ]; then
    echo "❌ Node.js version 22 or higher is required. Current version: $(node -v)"
    exit 1
fi

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    if [ -f ".env.example" ]; then
        echo "📋 Creating .env.local from .env.example..."
        cp .env.example .env.local
        echo "✅ Please edit .env.local with your configuration"
    else
        echo "⚠️  No .env.local or .env.example found"
    fi
fi

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# 启动开发服务器
echo "🔧 Starting development server..."
pnpm dev