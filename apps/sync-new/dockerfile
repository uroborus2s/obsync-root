# 多阶段构建 - 基础镜像
FROM node:2-alpine AS base
RUN npm install -g pnpm turbo
WORKDIR /app

# 依赖裁剪阶段（使用 turbo prune）
FROM base AS pruner
COPY . .
RUN turbo prune --scope=@wps/template --docker

# 依赖安装阶段
FROM base AS installer
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml
RUN pnpm install --frozen-lockfile

# 构建阶段
FROM base AS builder
COPY --from=pruner /app/out/full/ .
COPY --from=installer /app/node_modules ./node_modules
RUN turbo run build --filter=@wps/template

# 生产运行阶段
FROM node:20-alpine AS runner
WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 创建非root用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 appuser

# 复制构建产物和依赖
COPY --from=builder --chown=appuser:nodejs /app/apps/template/dist ./dist
COPY --from=builder --chown=appuser:nodejs /app/apps/template/package.json ./package.json

# 安装生产依赖
RUN npm install -g pnpm && \
    pnpm install --prod --frozen-lockfile && \
    pnpm store prune

USER appuser

EXPOSE 3000

CMD ["node", "dist/index.js"]