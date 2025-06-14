# 多阶段构建 - 基础镜像
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

# 依赖安装阶段
FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
COPY ../../pnpm-workspace.yaml ../../package.json ../../
COPY ../../packages/*/package.json ../../packages/*/
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
COPY . .
COPY --from=deps /app/node_modules ./node_modules

# 设置环境变量
ARG NODE_ENV=production
ARG VITE_API_URL
ARG VITE_APP_TITLE="AgendaEdu Web"

ENV NODE_ENV=$NODE_ENV
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_TITLE=$VITE_APP_TITLE

# 构建应用
RUN pnpm run build

# 生产运行阶段 - 使用Nginx提供静态文件
FROM nginx:alpine AS runner

# 安装必要工具
RUN apk add --no-cache curl

# 复制自定义Nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

# 复制构建产物到Nginx目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 创建非root用户
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# 设置权限
RUN chown -R nextjs:nodejs /usr/share/nginx/html
RUN chown -R nextjs:nodejs /var/cache/nginx
RUN chown -R nextjs:nodejs /var/log/nginx
RUN chown -R nextjs:nodejs /etc/nginx/conf.d
RUN touch /var/run/nginx.pid
RUN chown -R nextjs:nodejs /var/run/nginx.pid

# 暴露端口
EXPOSE 80

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

# 启动Nginx
CMD ["nginx", "-g", "daemon off;"] 