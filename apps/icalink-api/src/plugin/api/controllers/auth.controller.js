/**
 * WPS OAuth认证控制器
 * 处理WPS OAuth认证流程，包括重定向、回调和cookie管理
 */
import { JwtUtil } from '../utils/jwt.util.js';
/**
 * 向URL添加查询参数的帮助函数
 * @param baseUrl 基础URL
 * @param params 要添加的参数
 * @returns 处理后的URL
 */
function addUrlParams(baseUrl, params) {
    try {
        const url = new URL(baseUrl);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.set(key, value);
        });
        return url.toString();
    }
    catch (urlError) {
        // 如果baseUrl不是有效的URL，使用简单的字符串拼接
        const separator = baseUrl.includes('?') ? '&' : '?';
        const paramString = Object.entries(params)
            .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
            .join('&');
        return `${baseUrl}${separator}${paramString}`;
    }
}
/**
 * 发起WPS OAuth认证
 */
const handleAuthCode = (options) => async (request, reply) => {
    try {
        const userAuthService = request.diScope.resolve('wasV7UserAuth');
        // 1. 从参数中获取code 和 state
        const { code, state } = request.query;
        // 验证必要参数
        if (!code) {
            request.log.error('缺少授权码');
            return reply.code(400).send({
                success: false,
                error: 'MISSING_CODE',
                message: '缺少授权码'
            });
        }
        if (!state) {
            request.log.error('缺少state参数');
            return reply.code(400).send({
                success: false,
                error: 'MISSING_STATE',
                message: '缺少state参数'
            });
        }
        // 2. 获取当前地址的uri
        const redirectUri = `${options.appUrl}${request.url.split('?')[0]}`;
        let callbackUrl = Buffer.from(state, 'base64').toString('utf8');
        const type = callbackUrl.split('||')[1].split('=')[1];
        callbackUrl = callbackUrl.split('||')[0];
        let userInfo;
        if (type === 'mobile') {
            userInfo = await userAuthService.completeXZUserAuth({
                code
            });
        }
        else {
            userInfo = await userAuthService.completeUserAuth({
                code,
                redirect_uri: redirectUri
            });
        }
        // 3. 将用户信息转换为jwt
        const jwtPayload = JwtUtil.createPayloadFromWpsUser(userInfo);
        const jwtToken = JwtUtil.generateToken(jwtPayload, {
            expiresIn: '29d'
        });
        // 5. 根据获取的userInfo 设置cookie
        // 计算过期时间（29天）
        const expiresIn = 29 * 24 * 60 * 60 * 1000; // 29天，单位毫秒
        const expiresAt = Date.now() + expiresIn;
        // Cookie配置
        const cookieOptions = {
            maxAge: expiresIn,
            httpOnly: true,
            secure: true,
            sameSite: 'lax',
            path: '/'
        };
        // 设置JWT Token cookie (主要认证方式)
        reply.setCookie('wps_jwt_token', jwtToken, cookieOptions);
        console.log('jwtToken', jwtToken);
        // 设置兼容性cookie
        reply.setCookie('wps_auth_expires', expiresAt.toString(), cookieOptions);
        // 记录成功日志
        request.log.info('WPS OAuth认证成功，用户:', {
            userId: userInfo.id,
            name: userInfo.name,
            email: userInfo.email
        });
        // 6. 设置cookie并重定向到callbackurl
        // 处理callbackUrl中可能存在的查询参数
        const redirectUrl = addUrlParams(callbackUrl, { auth_success: 'true' });
        return reply.redirect(redirectUrl);
    }
    catch (error) {
        request.log.error('WPS OAuth认证失败:', error);
        // 尝试解析state获取回调URL
        let callbackUrl = options.appUrl;
        if (request.query.state) {
            try {
                callbackUrl = Buffer.from(request.query.state, 'base64').toString('utf8');
            }
            catch (e) {
                request.log.warn('解析state失败');
            }
        }
        // 处理callbackUrl中可能存在的查询参数并添加错误信息
        const errorRedirectUrl = addUrlParams(callbackUrl, {
            auth_error: 'callback_failed'
        });
        return reply.redirect(errorRedirectUrl);
    }
};
export async function authController(fastify, options) {
    fastify.get('/api/auth/authorization', handleAuthCode(options));
}
//# sourceMappingURL=auth.controller.js.map