import { asFunction, Lifetime } from 'awilix';
import { JwtUtil } from '../utils/jwt.util.js';
/**
 * 不需要认证的接口白名单
 */
const WHITELIST_PATHS = [
    '/api/auth/authorization', // OAuth认证回调接口
    '/health', // 健康检查接口
    '/api/health' // API健康检查接口
];
/**
 * 检查路径是否在白名单中
 * @param path 请求路径
 * @returns 是否在白名单中
 */
function isWhitelistPath(path) {
    return WHITELIST_PATHS.some((whitelistPath) => {
        // 支持精确匹配和前缀匹配
        return path === whitelistPath || path.startsWith(whitelistPath + '/');
    });
}
/**
 * 认证中间件 - 检查JWT令牌
 */
async function authMiddleware(request, reply) {
    try {
        // 检查是否为白名单接口
        if (isWhitelistPath(request.url.split('?')[0])) {
            request.log.debug(`跳过认证检查: ${request.url}`);
            return;
        }
        // 检查JWT令牌
        const jwtToken = request.cookies['wps_jwt_token'];
        console.log('jwtToken_request', jwtToken);
        if (!jwtToken) {
            request.log.warn(`未认证访问: ${request.url}`);
            return reply.code(401).send({
                success: false,
                error: 'UNAUTHENTICATED',
                message: '用户未认证，请先登录'
            });
        }
        // 验证JWT令牌
        const verifyResult = JwtUtil.verifyToken(jwtToken);
        if (!verifyResult.valid || !verifyResult.payload) {
            request.log.warn(`无效令牌访问: ${request.url}, 错误: ${verifyResult.error}`);
            // JWT令牌无效，清除相关cookie
            reply.clearCookie('wps_jwt_token').clearCookie('wps_auth_expires');
            return reply.code(401).send({
                success: false,
                error: 'TOKEN_INVALID',
                message: `令牌无效: ${verifyResult.error}`
            });
        }
        // 检查令牌是否即将过期（7天内）
        if (JwtUtil.isTokenExpiringSoon(jwtToken)) {
            request.log.info(`用户令牌即将过期: ${verifyResult.payload.userId}`);
            // 可以在这里添加令牌刷新逻辑
        }
        // 注册UserService到DI容器 - SCOPED生命周期
        request.diScope.register({
            userPayload: asFunction(() => verifyResult.payload, {
                lifetime: Lifetime.SCOPED
            })
        });
        request.log.debug(`认证成功: ${verifyResult.payload.userId} - ${request.url}`);
    }
    catch (error) {
        request.log.error('认证中间件错误:', {
            error: error instanceof Error ? error.message : String(error),
            url: request.url,
            method: request.method
        });
        return reply.code(500).send({
            success: false,
            error: 'AUTH_MIDDLEWARE_ERROR',
            message: '认证验证失败'
        });
    }
}
/**
 * 注册认证钩子
 * @param fastify Fastify实例
 * @param options 插件参数
 */
export async function apiOnRequest(fastify, options) {
    // 为所有请求添加认证中间件
    fastify.addHook('onRequest', authMiddleware);
    // 添加请求日志
    fastify.addHook('onRequest', async (request, reply) => {
        request.log.info(`${request.method} ${request.url}`, {
            userAgent: request.headers['user-agent'],
            ip: request.ip,
            referer: request.headers.referer
        });
    });
    // 添加响应时间记录
    fastify.addHook('onRequest', async (request, reply) => {
        request.startTime = Date.now();
    });
    fastify.addHook('onSend', async (request, reply, payload) => {
        const startTime = request.startTime;
        if (startTime) {
            const responseTime = Date.now() - startTime;
            reply.header('X-Response-Time', `${responseTime}ms`);
            if (responseTime > 1000) {
                // 超过1秒的请求记录警告
                request.log.warn(`慢请求: ${request.method} ${request.url} - ${responseTime}ms`);
            }
        }
        return payload;
    });
}
//# sourceMappingURL=onRequest.js.map