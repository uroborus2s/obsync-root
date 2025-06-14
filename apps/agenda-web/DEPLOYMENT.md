# @stratix/agendaedu-web Vite应用部署指南

## 概述

本文档提供了 `@stratix/agendaedu-web` Vite React应用的完整部署方案，支持Docker容器化部署和静态文件部署两种模式。

## 技术栈

- **前端框架**: React 19 + TypeScript
- **构建工具**: Vite 6.x
- **UI库**: Radix UI + Tailwind CSS
- **状态管理**: React Table
- **部署方式**: Docker + Nginx / 静态文件服务

## 系统要求

### 必需软件
- **Node.js**: >= 22.0.0
- **pnpm**: >= 10.0.0
- **Docker**: >= 20.10.0 (容器化部署)
- **Docker Compose**: >= 2.0.0 (容器化部署)

### 硬件要求
- **内存**: 最少 2GB，推荐 4GB+
- **存储**: 最少 5GB 可用空间
- **CPU**: 2核心以上

## 快速开始

### 1. 进入项目目录

```bash
cd apps/agenda_web
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 配置环境变量

```bash
# 复制环境变量模板
cp env.example .env

# 编辑环境变量
vim .env
```

### 4. 选择部署方式

#### 方式一：Docker容器化部署（推荐）

```bash
# 开发环境
./deploy.sh

# 生产环境
./deploy.sh prod

# 查看日志
./deploy.sh --logs
```

#### 方式二：静态文件部署

```bash
# 构建并生成静态文件
./deploy.sh --static

# 或者分步执行
pnpm run build:prod
```

## 部署方式详解

### Docker容器化部署

#### 优势
- 环境一致性
- 自动化程度高
- 包含Nginx优化配置
- 支持健康检查

#### 使用方法

```bash
# 基础部署
./deploy.sh

# 生产环境部署
./deploy.sh prod

# 仅构建不部署
./deploy.sh --build-only

# 强制重新构建
./deploy.sh --no-cache

# 部署并查看日志
./deploy.sh --logs
```

#### 访问地址
- 应用: http://localhost:8080
- 健康检查: http://localhost:8080/health

### 静态文件部署

#### 优势
- 部署简单
- 资源占用少
- 适合CDN分发
- 成本低

#### 使用方法

```bash
# 生成静态文件
./deploy.sh --static

# 手动构建
pnpm run build:prod

# 预览构建结果
pnpm run preview
```

#### 部署到服务器

```bash
# 1. 构建应用
pnpm run build:prod

# 2. 上传dist目录到服务器
scp -r dist/* user@server:/var/www/html/

# 3. 配置Nginx (参考nginx.conf)
```

## 环境配置

### 开发环境 (.env.development)
```bash
VITE_API_URL=http://localhost:3000/api
VITE_APP_TITLE=AgendaEdu Web (Dev)
VITE_ENABLE_DEBUG=true
```

### 生产环境 (.env.production)
```bash
VITE_API_URL=https://api.yourdomain.com/api
VITE_APP_TITLE=AgendaEdu Web
VITE_ENABLE_DEBUG=false
VITE_ENABLE_ANALYTICS=true
```

### 测试环境 (.env.staging)
```bash
VITE_API_URL=https://staging-api.yourdomain.com/api
VITE_APP_TITLE=AgendaEdu Web (Staging)
VITE_ENABLE_DEBUG=true
```

## 构建优化

### Vite配置优化

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-select'],
          utils: ['clsx', 'tailwind-merge']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
```

### 性能优化建议

1. **代码分割**: 使用动态导入分割路由组件
2. **图片优化**: 使用WebP格式，启用懒加载
3. **缓存策略**: 静态资源设置长期缓存
4. **Gzip压缩**: Nginx启用Gzip压缩

## 监控和日志

### Docker部署监控

```bash
# 查看容器状态
docker-compose ps

# 查看应用日志
docker-compose logs -f agendaedu-web

# 查看资源使用
docker stats agendaedu-web

# 健康检查
curl http://localhost:8080/health
```

### 性能监控

```bash
# 构建分析
pnpm run analyze

# 包大小分析
npx vite-bundle-analyzer dist

# Lighthouse性能测试
npx lighthouse http://localhost:8080
```

## 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 清理缓存重新构建
pnpm run clean
pnpm run build

# 检查TypeScript错误
pnpm run type-check
```

#### 2. 环境变量不生效
```bash
# 确保变量以VITE_开头
VITE_API_URL=http://localhost:3000/api

# 重新构建应用
pnpm run build
```

#### 3. 路由404问题
```bash
# 检查Nginx配置中的try_files设置
try_files $uri $uri/ /index.html;
```

#### 4. API跨域问题
```bash
# 在vite.config.ts中配置代理
server: {
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

### 调试技巧

#### 开发环境调试
```bash
# 启动开发服务器
pnpm run dev

# 启用详细日志
DEBUG=vite:* pnpm run dev
```

#### 生产环境调试
```bash
# 本地预览生产构建
pnpm run preview

# 检查构建产物
ls -la dist/
```

## 部署到云平台

### Vercel部署

```bash
# 安装Vercel CLI
npm i -g vercel

# 部署
vercel --prod
```

### Netlify部署

```bash
# 构建命令
pnpm run build

# 发布目录
dist

# 重定向规则 (_redirects文件)
/*    /index.html   200
```

### AWS S3 + CloudFront

```bash
# 构建应用
pnpm run build

# 上传到S3
aws s3 sync dist/ s3://your-bucket-name --delete

# 清除CloudFront缓存
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

## CI/CD集成

### GitHub Actions示例

```yaml
name: Deploy AgendaEdu Web

on:
  push:
    branches: [main]
    paths: ['apps/agenda_web/**']

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '22'
          
      - name: Install pnpm
        run: corepack enable pnpm
        
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Build application
        run: pnpm run build:web
        env:
          VITE_API_URL: ${{ secrets.VITE_API_URL }}
          
      - name: Deploy to production
        run: |
          cd apps/agenda_web
          ./deploy.sh prod
```

## 安全配置

### 内容安全策略 (CSP)

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;";
```

### 安全头配置

```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
```

## 备份和恢复

### 代码备份
```bash
# Git备份
git push origin main

# 构建产物备份
tar -czf agendaedu-web-$(date +%Y%m%d).tar.gz dist/
```

### 配置备份
```bash
# 环境变量备份
cp .env .env.backup

# Nginx配置备份
cp nginx.conf nginx.conf.backup
```

## 性能基准

### 目标指标
- **首次内容绘制 (FCP)**: < 1.5s
- **最大内容绘制 (LCP)**: < 2.5s
- **首次输入延迟 (FID)**: < 100ms
- **累积布局偏移 (CLS)**: < 0.1

### 优化建议
1. 启用HTTP/2
2. 使用CDN加速
3. 实施服务端渲染 (SSR)
4. 优化图片和字体加载

## 联系支持

如遇到部署问题，请联系：
- 前端团队: frontend@company.com
- 运维支持: devops@company.com
- 文档更新: docs@company.com 